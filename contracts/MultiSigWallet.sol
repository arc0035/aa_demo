// SPDX-License-Identifier: None
pragma solidity ^0.8.17;

import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
    BaseAccount里已经实现了validateUserOp的验证
    我们只需要继承BaseAccount，专注于实现自己的逻辑即可，主要是：
    1)_validateSignature() 和 entryPoint()
    2)其他业务逻辑，例如向其他账户发起转账或调用等
*/
contract MultiSigWallet is BaseAccount{
    using ECDSA for bytes32;
    address private entryPointAddress;
    address public ownerOne;
    address public ownerTwo;

    constructor(address _entryPoint, address _ownerOne, address _ownerTwo){
        entryPointAddress = _entryPoint;
        ownerOne = _ownerOne;
        ownerTwo = _ownerTwo;
    }

    /**
    必须实现的部分
    */
    function _validateSignature(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal view override returns (uint256 validationData) {
        (userOp, userOpHash);

        bytes32 hash = userOpHash.toEthSignedMessageHash();
        //解码出签名
        (bytes memory signatureOne, bytes memory signatureTwo) = abi.decode(
            userOp.signature,
            (bytes, bytes)
        );
        //签名恢复出地址
        address recoveryOne = hash.recover(signatureOne);
        address recoveryTwo = hash.recover(signatureTwo);
        //地址和存储的地址比较
        bool ownerOneCheck = ownerOne == recoveryOne;
        bool ownerTwoCheck = ownerTwo == recoveryTwo;

        if (ownerOneCheck && ownerTwoCheck) return 0;
        //验签失败不要报错，返回错误码，让EntryPoint去处理
        return SIG_VALIDATION_FAILED;
    }

    function entryPoint() public view override returns (IEntryPoint){
        return IEntryPoint(entryPointAddress);
    }

    /**自己的业务逻辑
    */

    //收款
    receive() external payable{

    }

    //提款
    function withdraw(address payable to, uint256 value) public  {
        require(to != address(0), "Invalid withdraw target");
        _requireFromEntryPoint();
        to.transfer(value);
    }

    //可以借助该函数向其他地址发起转账或调用
    function execute(address payable target, uint256 value, bytes calldata data) external {
        _requireFromEntryPoint();
        (bool success, ) = target.call{value: value}(data);
        require(success, "account: execution failed");
    }

}