//
/**
 * 1. yarn add @account-abstraction/sdk
 * 2. extend https://github.com/eth-infinitism/bundler/blob/main/packages/sdk/src/BaseAccountAPI.ts
    and implement 4 abstract functions.
    ps: This is different from that of in Trampoline, trampoline uses some states
    in trampoline and uses ethers v5.
*/
import { BaseAccountAPI } from "@account-abstraction/sdk";
import { BaseWallet ,Wallet, BaseContract, solidityPacked, arrayify, AbiCoder} from "ethers";

const FACTORY_INTERFACES = [
    "function createAccount(address, address,address,uint256) public returns(address)"
]

const ACCOUNT_INTERFACES = [
    "function execute(address,uint256,bytes) external",
    "function getNonce() external view returns (uint256)"];

class MultiSigAPI extends BaseAccountAPI{

    constructor(provider, factory, entryPoint, private1, private2) {  // Constructor
        super({
            provider,//用于和链交互
            entryPointAddress: entryPoint,
            overheads: {
                //see https://github.com/eth-infinitism/bundler/blob/main/packages/sdk/src/calcPreVerificationGas.ts
                sigSize: 320 //需要额外的gasLimit
            }
        });
        this.factory_address = factory;
        this.entryPoint = entryPoint;
        this.private1 = private1;
        this.private2 = private2;
    }

    /**
     * return the value to put into the "initCode" field, if the contract is not yet deployed.
     * this value holds the "factory" address, followed by this account's information
     */
    //initcode = factory_addr + callDataOf
    async getAccountInitCode(){
        // const salt = ethers.BigNumber.from(ethers.utils.randomBytes(32));
        const salt = 0x1234;

        const signer1 = new BaseWallet(this.private1);
        const signer2 = new BaseWallet(this.private2);

        const factoryContract = await this._getFactoryContractForCall();
        const factoryCallData = factoryContract.interface.encodeFunctionData("createAccount", 
        [
            this.entryPoint,
            signer1.address,
            signer2.address,
            salt
        ]);

        const initCode = solidityPacked(['address', 'bytes'], [this.factory_address, factoryCallData]);
        return initCode;
    }
    /**
     * return current account's nonce.
     */
    async getNonce(){
        if (await this.checkAccountPhantom()) {
            return 0n;
        }
        const accountContract = await this._getAccountContractForCall();
        const nonce = await accountContract.getNonce();
        return nonce;
    }
    /**
     * encode the call from entryPoint through our account to the target contract.
     * @param target
     * @param value
     * @param data
     */
    async encodeExecute(target, value, data) {
        if (target == await this.getAccountAddress()){
            return data;//比如调用withdraw
        } else{//例如去调用或转账其他账户，则需要通过execute去发起调用
            const accountContract = await this._getAccountContractForCall();
            accountContract.interface.encodeFunctionData
            return accountContract.interface.encodeFunctionData(
                "execute",
                [
                    target,
                    value,
                    data
                ]
            );
        }
    }
    /**
     * sign a userOp's hash (userOpHash).
     * @param userOpHash
     */
    async signUserOpHash(userOpHash) {
        let messageHashBytes = arrayify(userOpHash)

        const signer1 = new BaseWallet(this.private1);
        const signer2 = new BaseWallet(this.private2);

        const signature1 = signer1.signMessage(messageHashBytes);
        const signature2 = signer2.signMessage(messageHashBytes);
        const abiCoder = AbiCoder.defaultAbiCoder();
        return abiCoder.encode(['bytes', 'bytes'], [signature1, signature2]);
    }






    async _getFactoryContractForCall(){
        const factoryContract = new BaseContract(this.factory_address, FACTORY_INTERFACES, Wallet.createRandom());
        return factoryContract;
    }

    async _getAccountContractForCall() {
        //getAccountAddress 会通过staticCall去链上获取
        const address = await this.getAccountAddress();
        const accountContract = new BaseContract(address, ACCOUNT_INTERFACES, Wallet.createRandom());
        return accountContract;
    }
}