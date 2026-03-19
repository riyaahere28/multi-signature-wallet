
# 🔐 Multi-Signature Wallet on Stellar (Soroban)

## 📌 Project Description

This project implements a **Multi-Signature Wallet Smart Contract** using **Soroban (Stellar Smart Contracts)**.  
It enhances security by requiring multiple authorized accounts to approve transactions before execution.

---

## ⚙️ What it does

The smart contract allows a group of predefined wallet owners to collectively manage funds or actions.

Instead of relying on a single private key, this wallet:
- Requires multiple approvals (signatures)
- Verifies authorized owners
- Executes actions only when the required threshold is met

---

## ✨ Features

- 👥 **Multiple Owners Support**
  - Define multiple wallet owners at initialization

- 🔢 **Custom Signature Threshold**
  - Set minimum number of approvals required

- 🔐 **Secure Execution**
  - Validates signers using `require_auth()`

- ⚡ **Flexible Action Execution**
  - Can be extended to support token transfers, contract calls, etc.

- 📦 **On-chain Storage**
  - Stores owners and threshold securely on Stellar ledger

---

## 🚀 Deployed Smart Contract Link

👉 https://lab.stellar.org/smart-contracts/contract-explorer?$=network$id=testnet&label=Testnet&horizonUrl=https:////horizon-testnet.stellar.org&rpcUrl=https:////soroban-testnet.stellar.org&passphrase=Test%20SDF%20Network%20/;%20September%202015;&smartContracts$explorer$contractId=CDZ555QUW4GITZJ6A6WUAJUQNMBMLPTNMUCNG4LNLHFQ6P57FI6VEWGD;; 
=======
# multi-signature-wallet
80f481822d6047df7836972b6a3dc789eea1413e
