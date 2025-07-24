import { useEffect, useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { fetchAlldeposits, fetchAllLPsOnChain, fetchAllLqdeposits } from "./fetchallaccounts.tsx";
import { getProgram } from "../../../anchor/src/source.ts";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import BN from "bn.js";
import {
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { AnchorProvider } from "@coral-xyz/anchor";

interface Deposit {
    publicKey: string;
    user: string;
    tokenMint: string;
    tokenAmt: string;
    configAccount: string;
    bump: number;
}

interface Lp {
    publicKey: string;
    user: string;
    tokenAmt: string;
    token: string;
    bump: number;
}

interface CombinedDepositData {
    deposit: Deposit;
    userData: Lp | null;
    uniqueKey: string;
}

interface DepositState {
    mintAmount: BN;
    withdrawAmount: BN;
    isProcessing: boolean;
    txSig: string | null;
    error: string | null;
}

const parseAmountInput = (val: string): BN => {
    const parsed = parseFloat(val);
    if (isNaN(parsed) || parsed < 0) return new BN(0);
    return new BN(Math.floor(parsed * 1e9));
};

export default function DepositList() {
    // const dscAddress = "BqkcJ3E4BYh3rztj8m1X1ZJDY2CJJBtHdd9aX8jYh6oe";
    const wallet = useAnchorWallet();

    const [combinedData, setCombinedData] = useState<CombinedDepositData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [depositStates, setDepositStates] = useState<Record<string, DepositState>>({});
    const [configValues, setConfigValues] = useState<Record<string, { totalLiq: string, totalCollected: string }>>({});

    const updateDepositState = (uniqueKey: string, updates: Partial<DepositState>) => {
        setDepositStates(prev => ({
            ...prev,
            [uniqueKey]: { ...prev[uniqueKey], ...updates }
        }));
    };

    const withdrawCollateral = async (deposit: Deposit, uniqueKey: string) => {
        if (!wallet?.publicKey || !wallet.signTransaction) return;

        const state = depositStates[uniqueKey];
        if (!state || state.isProcessing) return;

        updateDepositState(uniqueKey, {
            isProcessing: true,
            error: null,
            txSig: null
        });

        const program = getProgram(wallet);
        if (!program) {
            updateDepositState(uniqueKey, {
                isProcessing: false,
                error: "Program not available"
            });
            return;
        }
        const conn = (program.provider as AnchorProvider).connection;

        try {
            const taker = wallet.publicKey;
            const tokenMint = new PublicKey(deposit.tokenMint);
            // const dscMint = new PublicKey(dscAddress);

            const [lpPDA] = PublicKey.findProgramAddressSync([Buffer.from("lp"), taker.toBuffer(), tokenMint.toBuffer()], program.programId);
            const [configPDA] = PublicKey.findProgramAddressSync([Buffer.from("config"), tokenMint.toBuffer()], program.programId);
            const [depositPDA] = PublicKey.findProgramAddressSync([Buffer.from("liq_deposit"), taker.toBuffer(), tokenMint.toBuffer()], program.programId);

            const vaultATA = await getAssociatedTokenAddress(tokenMint, configPDA, true);
            const userTokenAccount = await getAssociatedTokenAddress(tokenMint, taker);

            const info2 = await conn.getAccountInfo(userTokenAccount);
            if (!info2) {
                const ix = createAssociatedTokenAccountInstruction(taker, userTokenAccount, taker, tokenMint);
                const tx = new Transaction().add(ix);
                const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("finalized");
                tx.recentBlockhash = blockhash;
                tx.lastValidBlockHeight = lastValidBlockHeight;
                tx.feePayer = taker;
                const signed = await wallet.signTransaction(tx);
                const sig = await conn.sendRawTransaction(signed.serialize());
                await conn.confirmTransaction({ blockhash, lastValidBlockHeight, signature: sig });
            }

            const sig = await program.methods.redeemLiquidity().accountsStrict({
                user: taker,
                lpData: lpPDA,
                tokenMint,
                liqDeposit: depositPDA,
                config: configPDA,
                vault: vaultATA,
                userTokenAccount,
                systemProgram: SystemProgram.programId,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                tokenProgram: TOKEN_PROGRAM_ID,
            }).rpc();

            updateDepositState(uniqueKey, {
                isProcessing: false,
                txSig: sig
            });
        } catch (e) {
            console.error("Withdraw error:", e);
            updateDepositState(uniqueKey, {
                isProcessing: false,
                error: e instanceof Error ? e.message : "Unknown error occurred"
            });
        }
    };

    useEffect(() => {
        const loadData = async () => {
            if (!wallet) return;

            const program = getProgram(wallet);
            if (!program) {
                console.error("Program not available");
                setIsLoading(false);
                return;
            }

            setIsLoading(true);

            try {
                const [deposits, users] = await Promise.all([
                    fetchAllLqdeposits(wallet),
                    fetchAllLPsOnChain(wallet)
                ]);

                const myDeposits = deposits.filter(d => d.user === wallet.publicKey!.toBase58());
                const myUsers = users.filter(u => u.user === wallet.publicKey!.toBase58());

                const uniqueDeposits = myDeposits.filter((deposit, index, self) =>
                    index === self.findIndex(d => d.publicKey === deposit.publicKey)
                );

                const uniqueUsers = myUsers.filter((user, index, self) =>
                    index === self.findIndex(u => u.publicKey === user.publicKey)
                );

                const userMap = new Map<string, Lp>();
                uniqueUsers.forEach(user => {
                    userMap.set(user.token, user);
                });

                const combined: CombinedDepositData[] = uniqueDeposits.map((deposit, index) => {
                    const matchingUser = userMap.get(deposit.tokenMint) || null;
                    const uniqueKey = `${deposit.publicKey}_${index}`;
                    return {
                        deposit,
                        userData: matchingUser,
                        uniqueKey
                    };
                });

                // Fetch config info for each unique token mint
                const configPromises = uniqueDeposits.map(async (deposit) => {
                    try {
                        const tokenMint = new PublicKey(deposit.tokenMint);
                        const [configPDA] = PublicKey.findProgramAddressSync([Buffer.from("config"), tokenMint.toBuffer()], program.programId);
                        const configInfo = await program.account.config.fetch(configPDA);
                        return {
                            tokenMint: deposit.tokenMint,
                            totalLiq: configInfo.totalLiq.toString(),
                            totalCollected: configInfo.totalCollected.toString()
                        };
                    } catch (e) {
                        console.error(`Error fetching config for ${deposit.tokenMint}:`, e);
                        return {
                            tokenMint: deposit.tokenMint,
                            totalLiq: "0",
                            totalCollected: "0"
                        };
                    }
                });

                const configResults = await Promise.all(configPromises);
                const configMap: Record<string, { totalLiq: string, totalCollected: string }> = {};
                configResults.forEach(result => {
                    configMap[result.tokenMint] = {
                        totalLiq: result.totalLiq,
                        totalCollected: result.totalCollected
                    };
                });

                setConfigValues(configMap);
                setCombinedData(combined);

                const initialStates: Record<string, DepositState> = {};
                combined.forEach(({ uniqueKey }) => {
                    initialStates[uniqueKey] = {
                        mintAmount: new BN(0),
                        withdrawAmount: new BN(0),
                        isProcessing: false,
                        txSig: null,
                        error: null
                    };
                });
                setDepositStates(initialStates);

            } catch (e) {
                console.error("Error loading data:", e);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [wallet]);

    const formatTokenMint = (tokenMint: string) => {
        return `${tokenMint.slice(0, 8)}...${tokenMint.slice(-8)}`;
    };

    return (
        <div className="min-h-screen bg-black">
            <div className="max-w-4xl mx-auto p-6">
                <h1 className="text-2xl font-semibold text-white mb-8">Deposits</h1>

                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-600 border-t-white"></div>
                        <span className="ml-3 text-gray-300">Loading...</span>
                    </div>
                ) : combinedData.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-gray-400">No deposits found</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {combinedData.map(({ deposit, userData, uniqueKey }) => {
                            const configInfo = configValues[deposit.tokenMint];
                            const interest = (Number(configInfo.totalCollected) * Number(userData?.tokenAmt) / Number(configInfo.totalLiq));
                            const state = depositStates[uniqueKey];
                            if (!state) return null;

                            return (
                                <div key={uniqueKey} className="bg-gray-900 rounded-lg border border-gray-700 p-6">
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Deposit</h3>
                                        <p className="text-sm font-mono text-gray-200">{formatTokenMint(deposit.tokenMint)}</p>

                                        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Account</h3>
                                        <p className="text-sm font-mono text-gray-200">{formatTokenMint(deposit.publicKey)}</p>

                                        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Vault Stats</h3>
                                        {configInfo ? (
                                            <div className="space-y-1">
                                                <p className="text-sm text-gray-300">Total Liquidity: {(parseFloat(configInfo.totalLiq) / 1e6).toFixed(6)}</p>
                                                <p className="text-sm text-gray-300">Total interest: {interest / 1e6}</p>
                                                <p className="text-sm text-gray-300">Total Collected: {(parseFloat(configInfo.totalCollected) / 1e6).toFixed(6)}</p>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500">Loading stats...</p>
                                        )}

                                        {userData ? (
                                            <div>
                                                <p className="text-xs text-gray-500">Liq Provided</p>
                                                <p className="text-sm text-gray-200">{(parseFloat(userData.tokenAmt) / 1e6).toFixed(6)}</p>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500">No account data</p>
                                        )}

                                        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Actions</h3>
                                        <button
                                            className="w-full mt-1 px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                            onClick={() => withdrawCollateral(deposit, uniqueKey)}
                                            disabled={!wallet?.publicKey || state.isProcessing}
                                        >
                                            {state.isProcessing ? "Processing..." : "Redeem Liquidity"}
                                        </button>

                                        {/* {state.error && (
                                            <div className="mt-4 p-3 bg-red-900/20 border border-red-700 text-red-400 rounded-md text-sm">
                                                <strong>Error:</strong> {state.error}
                                            </div>
                                        )} */}

                                        {state.txSig && (
                                            <div className="mt-4 p-3 bg-green-900/20 border border-green-700 text-green-400 rounded-md text-sm">
                                                <strong>Success:</strong>
                                                <a
                                                    className="ml-2 text-blue-400 hover:text-blue-300 underline"
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    href={`https://explorer.solana.com/tx/${state.txSig}?cluster=devnet`}
                                                >
                                                    View Transaction
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}