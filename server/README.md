# 🔐 Blockchain Wallet – Backend

A RESTful API built with **Node.js**, **Express**, **tronweb**, and **ethers** for managing wallet, transaction, and balance.

---

## 🚀 Features

- Create Tron/Ethereum Wallet
- View Transactions using address
- View Balance

---

## 🧰 Tech Stack

- **Node.js** + **Express** – Backend server
- **tronweb** – Tron Wallet
- **ethers** – Ethereum Wallet
- **Dotenv** – Environment config

---

## 📂 Project Setup

### 1. Clone the repo

```bash
git clone https://github.com/akashpawar43/Blockchain-Wallet.git
cd Blockchain-Wallet
```

### 2. Install dependencies
```
npm install
```

### 3. Create .env file
```
PORT=3000

# Ethereum
ETH_RPC=https://mainnet.infura.io/v3/your_key   # or Alchemy / other provider
ETH_CHAIN_ID=1

# Tron
TRON_FULLNODE=https://api.trongrid.io
TRON_SOLIDITY_NODE=https://api.trongrid.io
TRON_EVENT_NODE=https://api.trongrid.io

# Optional: a default private key for testing (DO NOT USE MAINNET KEY IN PROD)
DEFAULT_PRIVATE_KEY=0x...your_test_private_key_here
```

### 4. Migrate and generate Prisma client
```
npm run dev
```
