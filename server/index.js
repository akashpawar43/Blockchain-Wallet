import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import { ethers, formatEther } from 'ethers';
import { TronWeb } from 'tronweb';
import fs from 'fs';

const app = express();
app.use(bodyParser.json());

const WALLET_STORE = './wallets.json';
function loadWallets() {
    try {
        return JSON.parse(fs.readFileSync(WALLET_STORE, 'utf8') || '{}');
    } catch (e) {
        return {};
    }
}
function saveWallets(obj) {
    fs.writeFileSync(WALLET_STORE, JSON.stringify(obj, null, 2));
}

/* ---------- Ethereum setup ---------- */
const ethProvider = new ethers.JsonRpcProvider(process.env.ETH_RPC);
const ETH_CHAIN_ID = process.env.ETH_CHAIN_ID ? parseInt(process.env.ETH_CHAIN_ID) : 1;

/* Minimal ERC20 ABI (transfer, decimals, balanceOf) */
const ERC20_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address to, uint amount) returns (bool)"
];

/* ---------- Tron setup ---------- */
const tronweb = new TronWeb({
    fullHost: process.env.TRON_FULLNODE || "https://api.trongrid.io",
});
// const tronweb = new TronWeb({
//     fullHost: process.env.TRON_FULLNODE,
//     // solidityNode: process.env.TRON_SOLIDITY_NODE,
//     // eventServer: process.env.TRON_EVENT_NODE,
//     // privateKey: null // private key not provided globally — we will pass per-wallet
// });

/* ---------- Utilities ---------- */
function newEthereumWallet() {
    const wallet = ethers.Wallet.createRandom();
    return {
        type: 'ethereum',
        address: wallet.address,
        privateKey: wallet.privateKey
    };
}
async function newTronWallet() {
    const account = await TronWeb.createAccount();
    return {
        type: 'tron',
        address: account.address.base58,   // Tron base58 address
        privateKey: account.privateKey
    };
}

/* ---------- Endpoints ---------- */

/* Create wallet (type: 'ethereum' or 'tron') */
app.post('/wallet/create', async (req, res) => {
    const { type } = req.body;
    if (!type || !['ethereum', 'tron'].includes(type)) {
        return res.status(400).json({ error: "type required: 'ethereum' or 'tron'" });
    }

    const wallets = loadWallets();
    let w;
    if (type === 'ethereum') w = newEthereumWallet();
    else w = await newTronWallet();

    // Save (demo): store by address
    wallets[w.address] = w;
    saveWallets(wallets);

    // return address only (not private key) unless explicitly requested (for demo we include it)
    return res.json({ address: w.address, privateKey: w.privateKey });
});

async function getTronTransactions(address) {
    try {
        const response = await axios.get('https://apilist.tronscanapi.com/api/transaction', {
            params: { address }
        })

        return response.data
    } catch (error) {
        throw error;
    }
}

// get all transcation based on type and address
app.get("/wallet/transactions/:address", async (req, res) => {
    try {
        const { type } = req.query;
        const { address } = req.params;
        if (!type || !['tron', 'ethereum'].includes(type)) {
            return res.status(400).json({
                error: "ethereum or tron type required"
            })
        }

        let data;
        if (type === 'tron') {
            data = await getTronTransactions(address);
        }

        return res.json(data)
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

/* Get ETH/Token balance for an Ethereum address */
app.get('/ethereum/balance/:address', async (req, res) => {
    try {
        const address = req.params.address;
        const ethBalance = await ethProvider.getBalance(address);
        return res.json({
            address,
            ethBalanceWei: ethBalance.toString(),
            ethBalance: formatEther(ethBalance)
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/* Get ERC20 token balance (generic) */
app.get('/ethereum/erc20/balance', async (req, res) => {
    try {
        const { address, contractAddress } = req.query;
        if (!address || !contractAddress) return res.status(400).json({ error: 'address & contractAddress query params required' });

        const token = new ethers.Contract(contractAddress, ERC20_ABI, ethProvider);
        const [decimals, rawBal, symbol] = await Promise.all([
            token.decimals(),
            token.balanceOf(address),
            token.symbol().catch(() => null)
        ]);
        return res.json({
            address, contractAddress,
            symbol,
            decimals: decimals,
            rawBalance: rawBal.toString(),
            humanBalance: formatEther(rawBal, decimals)
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/* Get TRX balance */
app.get('/tron/balance/:address', async (req, res) => {
    try {
        const address = req.params.address;
        const balanceSun = await tronweb.trx.getBalance(address); // returns SUN (1 TRX = 1e6 sun)
        return res.json({
            address,
            balanceSun,
            balanceTRX: (balanceSun / 1e6).toString()
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/* Get TRC20 token balance (generic) */
app.get('/tron/trc20/balance', async (req, res) => {
    try {
        const { address, contractAddress } = req.query;
        if (!address || !contractAddress) return res.status(400).json({ error: 'address & contractAddress required' });

        const contract = await tronweb.contract().at(contractAddress);
        const raw = await contract.balanceOf(address).call(); // BigNumber as string
        // Many TRC20 tokens have 6 decimals (USDT on Tron is 6) but check token.decimals()
        let decimals = 6;
        try {
            const d = await contract.decimals().call();
            decimals = parseInt(d);
        } catch (e) {
            // keep fallback
        }
        const human = (BigInt(raw.toString()) / BigInt(10 ** decimals)).toString();
        return res.json({ address, contractAddress, raw: raw.toString(), decimals, humanBalance: human });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/* Simple listing of stored wallets (demo) */
app.get('/wallets', (req, res) => {
    const wallets = loadWallets();
    // For safety, do not return private keys in production.
    const clean = Object.values(wallets).map(w => ({ address: w.address, type: w.type }));
    res.json(clean);
});

/* Start server */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`DApp wallet server running on port ${PORT}`);
});