// SPDX-License-Identifier: None
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/Create2.sol";
import "./MultiSigWallet.sol";


contract WalletFactory {

    event WalletDeployed(address addr);

    function createAccount(
        address _entryPoint,
        address _ownerOne,
        address _ownerTwo,
        uint256 salt
    ) public returns (MultiSigWallet ret) {
        //用create2确定性计算地址
        address addr = computeAddress(_entryPoint, _ownerOne, _ownerTwo, salt);
        uint256 codeSize = addr.code.length;
        //如果合约已部署过，就不再处理
        if (codeSize > 0) {
            return MultiSigWallet(payable(addr));
        }
        //反之Create2部署
        ret = new MultiSigWallet{salt:bytes32(salt)}(_entryPoint, _ownerOne, _ownerTwo);
        emit WalletDeployed(address(ret));
    }


    function computeAddress(
        address _entryPoint,
        address _ownerOne,
        address _ownerTwo,
        uint256 salt
    ) public view returns (address) {
        bytes memory initCode = abi.encodePacked(type(MultiSigWallet).creationCode, abi.encode(_entryPoint, _ownerOne, _ownerTwo));
        return
            Create2.computeAddress(
                bytes32(salt),
                keccak256(initCode),
                address(this)
            );
    }
}