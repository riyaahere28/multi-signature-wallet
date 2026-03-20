"use client";

import {
  Contract,
  Networks,
  TransactionBuilder,
  Keypair,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
  rpc,
} from "@stellar/stellar-sdk";
import {
  isConnected,
  getAddress,
  signTransaction as freighterSignTx,
  setAllowed,
  isAllowed,
  requestAccess,
} from "@stellar/freighter-api";

// ============================================================
// CONSTANTS — Update these for your contract
// ============================================================

/** Your deployed Soroban contract ID */
export const CONTRACT_ADDRESS =
  "CBPJOABUYXRTGPJ5E2CT27ATLSC56PWJPQD3ZSTGZQURYRDZ3AHT3ZXS";

/** Network passphrase (testnet by default) */
export const NETWORK_PASSPHRASE = Networks.TESTNET;

/** Soroban RPC URL */
export const RPC_URL = "https://soroban-testnet.stellar.org";

/** Horizon URL */
export const HORIZON_URL = "https://horizon-testnet.stellar.org";

/** Network name for Freighter */
export const NETWORK = "TESTNET";

// ============================================================
// RPC Server Instance
// ============================================================

const server = new rpc.Server(RPC_URL);

// ============================================================
// Wallet Helpers
// ============================================================

export async function checkConnection(): Promise<boolean> {
  const result = await isConnected();
  return result.isConnected;
}

export async function connectWallet(): Promise<string> {
  const connResult = await isConnected();
  if (!connResult.isConnected) {
    throw new Error("Freighter extension is not installed or not available.");
  }

  const allowedResult = await isAllowed();
  if (!allowedResult.isAllowed) {
    await setAllowed();
    await requestAccess();
  }

  const { address } = await getAddress();
  if (!address) {
    throw new Error("Could not retrieve wallet address from Freighter.");
  }
  return address;
}

export async function getWalletAddress(): Promise<string | null> {
  try {
    const connResult = await isConnected();
    if (!connResult.isConnected) return null;

    const allowedResult = await isAllowed();
    if (!allowedResult.isAllowed) return null;

    const { address } = await getAddress();
    return address || null;
  } catch {
    return null;
  }
}

// ============================================================
// Contract Interaction Helpers
// ============================================================

/**
 * Build, simulate, and optionally sign + submit a Soroban contract call.
 *
 * @param method   - The contract method name to invoke
 * @param params   - Array of xdr.ScVal parameters for the method
 * @param caller   - The public key (G...) of the calling account
 * @param sign     - If true, signs via Freighter and submits. If false, only simulates.
 * @returns        The result of the simulation or submission
 */
export async function callContract(
  method: string,
  params: xdr.ScVal[] = [],
  caller: string,
  sign: boolean = true
): Promise<unknown> {
  const contract = new Contract(CONTRACT_ADDRESS);
  const account = await server.getAccount(caller);

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...params))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(
      `Simulation failed: ${(simulated as rpc.Api.SimulateTransactionErrorResponse).error}`
    );
  }

  if (!sign) {
    return simulated;
  }

  const prepared = rpc.assembleTransaction(tx, simulated).build();

  const { signedTxXdr } = await freighterSignTx(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  const txToSubmit = TransactionBuilder.fromXDR(
    signedTxXdr,
    NETWORK_PASSPHRASE
  );

  const result = await server.sendTransaction(txToSubmit);

  if (result.status === "ERROR") {
    throw new Error(`Transaction submission failed: ${result.status}`);
  }

  let getResult = await server.getTransaction(result.hash);
  while (getResult.status === "NOT_FOUND") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    getResult = await server.getTransaction(result.hash);
  }

  if (getResult.status === "FAILED") {
    throw new Error("Transaction failed on chain.");
  }

  return getResult;
}

/**
 * Read-only contract call (does not require signing).
 */
export async function readContract(
  method: string,
  params: xdr.ScVal[] = [],
  caller?: string
) {
  const account =
    caller || Keypair.random().publicKey();
  const sim = await callContract(method, params, account, false);
  if (
    rpc.Api.isSimulationSuccess(sim as rpc.Api.SimulateTransactionResponse) &&
    (sim as rpc.Api.SimulateTransactionSuccessResponse).result
  ) {
    return scValToNative(
      (sim as rpc.Api.SimulateTransactionSuccessResponse).result!.retval
    );
  }
  return null;
}

// ============================================================
// ScVal Conversion Helpers
// ============================================================

export function toScValString(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: "string" });
}

export function toScValU32(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: "u32" });
}

export function toScValI128(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "i128" });
}

export function toScValAddress(address: string): xdr.ScVal {
  return new Address(address).toScVal();
}

export function toScValBool(value: boolean): xdr.ScVal {
  return nativeToScVal(value, { type: "bool" });
}

// ============================================================
// Multi-Sig Wallet — Contract Methods
// ============================================================

/**
 * Create a new multisig wallet.
 * Calls: create_wallet(wallet_id: String, signers: Vec<Address>, threshold: u32)
 */
export async function createWallet(
  caller: string,
  walletId: string,
  signers: string[],
  threshold: number
) {
  const signerScVals = signers.map((s) => toScValAddress(s));
  return callContract(
    "create_wallet",
    [
      toScValString(walletId),
      nativeToScVal(signerScVals, { type: "vec<address>" }),
      toScValU32(threshold),
    ],
    caller,
    true
  );
}

/**
 * Get wallet details (read-only).
 * Calls: get_wallet(wallet_id: String) -> Wallet
 */
export async function getWallet(walletId: string, caller?: string) {
  return readContract("get_wallet", [toScValString(walletId)], caller);
}

/**
 * Get all wallet IDs (read-only).
 * Calls: get_wallets() -> Vec<String>
 */
export async function getWallets(caller?: string) {
  return readContract("get_wallets", [], caller);
}

/**
 * Propose a transfer from a multisig wallet.
 * Calls: propose(wallet_id: String, target: Address, amount: i128) -> u32
 */
export async function proposeTransfer(
  caller: string,
  walletId: string,
  target: string,
  amount: bigint
) {
  return callContract(
    "propose",
    [
      toScValString(walletId),
      toScValAddress(target),
      toScValI128(amount),
    ],
    caller,
    true
  );
}

/**
 * Get a transaction by wallet ID and index (read-only).
 * Calls: get_transaction(wallet_id: String, tx_index: u32) -> Transaction
 */
export async function getTransaction(
  walletId: string,
  txIndex: number,
  caller?: string
) {
  return readContract(
    "get_transaction",
    [toScValString(walletId), toScValU32(txIndex)],
    caller
  );
}

/**
 * Get transaction count for a wallet (read-only).
 * Calls: get_transaction_count(wallet_id: String) -> u32
 */
export async function getTransactionCount(
  walletId: string,
  caller?: string
) {
  return readContract("get_transaction_count", [toScValString(walletId)], caller);
}

/**
 * Sign a transaction (requires auth from the signer).
 * Calls: sign(wallet_id: String, tx_index: u32, signer: Address)
 */
export async function signTransaction(
  caller: string,
  walletId: string,
  txIndex: number,
  signer: string
) {
  return callContract(
    "sign",
    [
      toScValString(walletId),
      toScValU32(txIndex),
      toScValAddress(signer),
    ],
    caller,
    true
  );
}

export { nativeToScVal, scValToNative, Address, xdr };
