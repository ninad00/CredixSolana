import { AnchorProvider, IdlAccounts, Program, Idl } from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import InterestIDL from '../target/idl/interest.json'
import type { Interest } from '../target/types/interest.ts'
import { AnchorWallet, } from '@solana/wallet-adapter-react'
export { Interest, InterestIDL }

export const DSC_MINT = "EyF4B3dcWnahy4VAKU54b2MbDdTRboF6LUBpTjaRbqGZ";

export const CLUSTER_URL = "https://api.devnet.solana.com";
export const Interest_PROGRAM_ID = new PublicKey(InterestIDL.address);
export const COMMITMENT: AnchorProvider["opts"] = {
  preflightCommitment: "processed",
  commitment: "confirmed"
};


export function getProgram(anchorWallet: AnchorWallet | null): Program<Interest> | null {
  if (!anchorWallet) return null;
  const connection = new Connection(CLUSTER_URL, COMMITMENT.preflightCommitment);
  const provider = new AnchorProvider(connection, anchorWallet);
  return new Program(InterestIDL as Idl, provider);
}

export type DepositData = IdlAccounts<Interest>["deposit"];
export type ConfigData = IdlAccounts<Interest>["config"];
