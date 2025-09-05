import { ethers } from 'ethers';
import { TronWeb } from 'tronweb';

export function newEthereumWallet() {
    const wallet = ethers.Wallet.createRandom();
    return {
        type: 'ethereum',
        address: wallet.address,
        privateKey: wallet.privateKey
    };
}

export async function newTronWallet() {
    const account = await TronWeb.createAccount();
    return {
        type: 'tron',
        address: account.address.base58,   // Tron base58 address
        privateKey: account.privateKey
    };
}