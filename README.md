# 🕸️ Polkadot Dust Staker

A lightweight Polkadot-based project that collects **dust tokens** (small, leftover balances) and automatically **stakes** them using the Polkadot SDK — without smart contracts.

---

##  Overview

Many wallets and users accumulate tiny amounts of tokens ("dust") that are often too small to use or trade. This project provides a way to:

- Detect and collect dust tokens
-  Batch or auto-consolidate them
-  Stake them directly via the Polkadot SDK (Substrate RPCs)
- Track staked balances and rewards

No smart contracts. Just raw Polkadot SDK power.

---

## Tech Stack

- **Rust + Polkadot SDK (Substrate API)**
- CLI / service-based logic
- JSON-RPC interaction with a Polkadot full node or public endpoint
- No on-chain logic (everything runs off-chain)

---

##  Features

-  **Dust Detection**: Scans accounts for balances below a configurable threshold.
-  **Batch Handling**: Collects small balances and consolidates them.
-  **Native Staking**: Uses staking APIs to nominate and stake dust tokens.
-  **Balance Tracking**: Optionally monitors rewards or slashing events.
-  **Secure Key Handling**: Uses local keypairs or injected wallets.

---

## ⚙️ Installation

```bash
git clone https://github.com/JojoFlex1/stake/tree/main
cd stake ,cd client
npm install
npm run dev
