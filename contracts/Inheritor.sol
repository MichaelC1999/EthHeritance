//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

interface ERC20Standard {
    function totalSupply() external view returns (uint256);
    function balanceOf(address _owner) external view returns (uint256 balance);
    function transfer(address _to, uint256 value) external returns (bool success);
    function transferFrom(address _from, address _to, uint256 value) external returns (bool success);
    function approve(address _spender, uint256 value) external returns (bool success);
    function allowance(address _owner, address _spender) external view returns (uint256 remaining);
    event Transfer(address indexed _from, address indexed _to, uint256 value);
    event Approval(address indexed _owner, address indexed _spender, uint256 _value);
}

contract Inheritor {
    address public payoutToken;
    mapping(address => uint) public depositedValue;
    mapping(address => mapping(address => uint)) public depositorToHeirs;
    mapping(address => address[]) public depositorToHeirsList;
    mapping(address => mapping(address => uint)) public heirToDepositors;
    mapping(address => address[]) public heirToDepositorList;
    mapping(address => uint) public disburseTriggered;
    mapping(address => uint) public lastCheckIn;
    mapping(address => uint) public interval;
    mapping(address => uint) public rewardBalance;
    mapping(address => uint) dividedDepoValue;
    mapping(address => uint) public dividedRewardValue;
    mapping(address => uint) public depoToHeirsListLength;
    uint interestRateBySecond = 50;

    event LateTriggerNotice (
        string msg,
        uint lastCheckinTime
    );

    constructor(address BankToken) {
        payoutToken = BankToken;
    }

    function listHeirs(address depo) external view returns(address[] memory) {
        address[] memory heirs =  depositorToHeirsList[depo];
        return heirs;
    }

    function listDepos(address heir) external view returns (address[] memory) {
        address[] memory depos = heirToDepositorList[heir];
        return depos;
    }

    function initialDeposit(address[] calldata heirs, uint initInterval) external payable {
        require(!(depoToHeirsListLength[msg.sender] > 0) && !(disburseTriggered[msg.sender] > 0) && initInterval > 0, "Used sending address or interval err");
        disburseTriggered[msg.sender] = 0;
        interval[msg.sender] = initInterval;
        rewardBalance[msg.sender] = 1;
        lastCheckIn[msg.sender] = block.timestamp;
        depositedValue[msg.sender] += msg.value;
        addHeirs(heirs, true);
    }

    function deposit() external payable {
        require(depoToHeirsListLength[msg.sender] > 0 && disburseTriggered[msg.sender] == 0, "Cannot make additional deposit.");
        checkInReward();
        depositedValue[msg.sender] += msg.value;
    }

    function earlyWithdrawl() external {
        require(depositedValue[msg.sender] > 0 && !(disburseTriggered[msg.sender] > 0), "Address has no deposit");
        rewardBalance[msg.sender] = 0;
        disburseTriggered[msg.sender] = block.timestamp;
        payable(address(msg.sender)).transfer(depositedValue[msg.sender]);
        depositedValue[msg.sender] = 0;
        for (uint i = 0; i < depoToHeirsListLength[msg.sender]; i++) {
            address currHeir = depositorToHeirsList[msg.sender][i];
            heirToDepositorList[currHeir][heirToDepositors[currHeir][msg.sender]] = address(0);
            heirToDepositors[currHeir][msg.sender] = 0;
            depositorToHeirsList[msg.sender][depositorToHeirs[msg.sender][currHeir]] = address(0);
            heirToDepositors[currHeir][msg.sender] = 0;
        }
        depoToHeirsListLength[msg.sender] = 0;
        delete depositorToHeirsList[msg.sender];
        delete interval[msg.sender];
    }

    function checkInReward() public {
        require(!(disburseTriggered[msg.sender] > 0), "Disburse was triggered");
        uint differenceTime = block.timestamp - lastCheckIn[msg.sender];
        uint accumulated = differenceTime * interestRateBySecond * depositedValue[msg.sender];
        rewardBalance[msg.sender] = rewardBalance[msg.sender] + accumulated;
        if (lastCheckIn[msg.sender] + interval[msg.sender] < block.timestamp) {
            rewardBalance[msg.sender] = (rewardBalance[msg.sender]/5)*4;
            emit LateTriggerNotice(
                "Check in late, reward deducted",
                lastCheckIn[msg.sender]
            );
        }
        lastCheckIn[msg.sender] = block.timestamp;
    }

    function readDepositedValues(address[] calldata depos) public view returns (uint[] memory, uint[] memory, uint[] memory, address[] memory) {
        uint[] memory values = new uint[](depos.length);
        uint[] memory latestCheckIns = new uint[](depos.length);
        uint[] memory intervals = new uint[](depos.length);
        address[] memory correspondingAddr = new address[](depos.length);
        for (uint i = 0; i < depos.length; i++) {
            values[i] = (depositedValue[depos[i]])/depoToHeirsListLength[depos[i]];
            latestCheckIns[i] = lastCheckIn[depos[i]];
            correspondingAddr[i] = (depos[i]);
            intervals[i] = interval[depos[i]];
        }
        return (values, latestCheckIns, intervals, correspondingAddr);
    }

    function payout(address depositor) external {
        require(lastCheckIn[depositor] + interval[depositor] <= block.timestamp, "Not enough time since last check in");
        if (disburseTriggered[depositor] == 0) {
            disburseTriggered[depositor] = block.timestamp;
            dividedDepoValue[depositor] = depositedValue[depositor]/depoToHeirsListLength[depositor];
            rewardBalance[depositor] = (rewardBalance[depositor] + (block.timestamp - lastCheckIn[depositor]) * interestRateBySecond * depositedValue[depositor]);
            dividedRewardValue[depositor] = rewardBalance[depositor]/depoToHeirsListLength[depositor];
        }
        payable(address(msg.sender)).transfer(dividedDepoValue[depositor]);
        ERC20Standard(payoutToken).transfer(msg.sender, dividedRewardValue[depositor]/1000000000000);
        depositedValue[depositor] -= dividedDepoValue[depositor];
        rewardBalance[depositor] -= dividedRewardValue[depositor];
        heirToDepositorList[msg.sender][heirToDepositors[msg.sender][depositor]] = address(0);
        heirToDepositors[msg.sender][depositor] = 0;
        depositorToHeirsList[depositor][depositorToHeirs[depositor][msg.sender]] = address(0);
        heirToDepositors[msg.sender][depositor] = 0;
        depoToHeirsListLength[depositor] = depoToHeirsListLength[depositor] - 1;
        if (depoToHeirsListLength[depositor] == 0) {
            delete depositorToHeirsList[depositor];
            delete interval[depositor];
            delete rewardBalance[depositor];
            delete depoToHeirsListLength[depositor];
            delete dividedRewardValue[depositor];
            delete dividedDepoValue[depositor];
        }
    }

    function addHeirs(address[] calldata heirs, bool calledInternal) public {
        require(depositedValue[msg.sender] > 0 && disburseTriggered[msg.sender] == 0, "Depositor not yet initiated");
        if (calledInternal == false) {
            checkInReward();
        }

        for (uint i = 0; i < heirs.length; i++) {
            address currHeir = heirs[i];
            if (heirToDepositors[currHeir][msg.sender] == 0 && msg.sender != currHeir) {
                heirToDepositors[currHeir][msg.sender] = heirToDepositorList[currHeir].length;
                heirToDepositorList[currHeir].push(msg.sender);
                depositorToHeirs[msg.sender][currHeir] = depositorToHeirsList[msg.sender].length;
                depositorToHeirsList[msg.sender].push(currHeir);
                depoToHeirsListLength[msg.sender] += 1;
            }
        }
    }

    function removeHeir(address toDel) external {
        require(disburseTriggered[msg.sender] == 0, "Disburse triggered, cannot edit heirs");
        checkInReward();
        depositorToHeirsList[msg.sender][depositorToHeirs[msg.sender][toDel]] = address(0);
        depositorToHeirs[msg.sender][toDel] = 0;
        depoToHeirsListLength[msg.sender] = depoToHeirsListLength[msg.sender] - 1;
        heirToDepositorList[toDel][heirToDepositors[toDel][msg.sender]] = address(0);
        heirToDepositors[toDel][msg.sender] = 0;
    }
}
