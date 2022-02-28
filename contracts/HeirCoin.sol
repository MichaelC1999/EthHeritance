// SPDX-License-IDentifier: MIT OR Apache-2.0
pragma solidity ^0.8.4;

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

contract HeirCoin is ERC20Standard {
    string public constant symbol = "HEIR";
    string public constant name = "HeirCoin";
    uint8 public constant decimals = 10;

    uint private constant __totalSupply = 100000000000000000000;

    mapping (address => uint) private __balanceOf;
    mapping (address => mapping (address => uint)) private __allowances;

    constructor() {
        __balanceOf[msg.sender] = __totalSupply;
    }

    function totalSupply() public view override returns (uint _totalSupply) {
        _totalSupply = __totalSupply;
    }

    function balanceOf(address _addr) public view override returns (uint _totalSupply) {
        return __balanceOf[_addr];
    }

    function transfer(address _to, uint _value) public override returns (bool success) {
        if (_value > 0 && _value <= balanceOf(msg.sender)) {
            __balanceOf[msg.sender] -= _value;
            __balanceOf[_to] += _value;
            emit Transfer(msg.sender, _to, _value);
            return true;
        }
        return false;
    }

    function transferFrom(address _from, address _to, uint _value) public override returns (bool success) {
        if (__allowances[_from][msg.sender] > 0 && _value > 0 && 
        __allowances[_from][msg.sender] >= _value &&
        !isContract(_to)) {
            __balanceOf[_from] -= _value;
            __balanceOf[_to] += _value;
            emit Transfer(_from, _to, _value);
            return true;
        }
        return false;
    }

    function isContract(address _addr) public view returns (bool) {
        uint codeSize;
        assembly {
            codeSize := extcodesize(_addr)
        }
        return codeSize > 0;
    }

    function approve(address _spender, uint _value) external override returns (bool success) {
        __allowances[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function allowance(address _owner, address _spender) external view override returns (uint remaining) {
        return __allowances[_owner][_spender];
    }
}