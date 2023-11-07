// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

error Raffle__NotEnoughETHEntered();
error Raffle__WinnerTransferFaild();
error Raffle__NotOpen();
error Raffle__UpKeepNotNeeded(
    uint256 balance,
    uint256 numberOfPlayers,
    uint256 raffleState
);
error Raffle__NotOwner();

contract Raffle is VRFConsumerBaseV2, AutomationCompatibleInterface {
    enum RaffleState {
        Open,
        Calculating
    }

    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callBackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint16 private constant NUMBER_OF_WORDS = 1;
    RaffleState private s_raffleState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;
    address private immutable i_owner;

    address payable private s_recentWinner;

    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    modifier onlyOwner {
        if(msg.sender != i_owner) revert Raffle__NotOwner();
        _;
    }

    constructor(
        address vrfCoordinatorV2,
        uint256 entranceFee,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callBackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callBackGasLimit = callBackGasLimit;
        s_raffleState = RaffleState.Open;
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
        i_owner = msg.sender;
    }

    function enterRaffle() public payable {
        if (msg.value < i_entranceFee) revert Raffle__NotEnoughETHEntered();

        if (s_raffleState != RaffleState.Open) revert Raffle__NotOpen();

        s_players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
    }

    function performUpkeep(bytes calldata /* performData */) external override {

        (bool upKeepNeed,) = checkUpkeep("");
        if(!upKeepNeed) revert Raffle__UpKeepNotNeeded(
            address(this).balance,
            s_players.length,
            uint256(s_raffleState)
        );

        s_raffleState = RaffleState.Calculating;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callBackGasLimit,
            NUMBER_OF_WORDS
        );
        emit RequestedRaffleWinner(requestId);
    }

    function fulfillRandomWords(
        uint256 /*requestId*/,
        uint256[] memory randomWords
    ) internal override {

        uint256 indexOfWinner = randomWords[0] % s_players.length;
        s_recentWinner = s_players[indexOfWinner];
        //reset
        s_raffleState = RaffleState.Open;
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;

        (bool successCall, ) = s_recentWinner.call{value: address(this).balance}("");
        if (!successCall) revert Raffle__WinnerTransferFaild();

        emit WinnerPicked(s_recentWinner);
    }

    function checkUpkeep(bytes memory /* checkData */) public view override
        returns (bool upKeepNeed, bytes memory /* performData */) {

        bool isOpen = (s_raffleState == RaffleState.Open);
        bool timePased = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool has_players = (s_players.length > 0);
        bool has_balance = (address(this).balance > 0);
        upKeepNeed = (isOpen && timePased && has_players && has_balance);
        return (upKeepNeed, "0x");
    }

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getNumberOfPlayers() public view returns(uint256) {
        return s_players.length;
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getLatestTimeStamp() public view returns(uint256) {
        return s_lastTimeStamp;
    }

    function getNumerOfWords() public pure returns(uint256) {
        return NUMBER_OF_WORDS;
    }

    function getRequestConfirmations() public pure returns(uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getInterval() public view returns(uint256) {
        return i_interval;
    }

    function getOwner() public view returns(address) {
        return i_owner;
    }
}