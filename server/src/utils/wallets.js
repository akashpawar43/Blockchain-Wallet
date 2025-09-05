import fs from 'fs';

const WALLET_STORE = './wallets.json';

export function loadWallets() {
    try {
        return JSON.parse(fs.readFileSync(WALLET_STORE, 'utf8') || '{}');
    } catch (e) {
        return {};
    }
}

export function saveWallets(obj) {
    fs.writeFileSync(WALLET_STORE, JSON.stringify(obj, null, 2));
}