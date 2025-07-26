import { useEffect, useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { fetchAlldeposits, fetchAllUsersOnChain } from "./fetchallaccounts.tsx";
import { DSC_MINT, getProgram } from "../../../anchor/src/source.ts";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import BN from "bn.js";
import {
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getPriceForMint } from "../providers/tp.ts";
import { uploadHf } from "./hf.tsx";

interface Deposit {
    publicKey: string;
    user: string;
    tokenMint: string;
    tokenAmt: string;
    configAccount: string;
    bump: number;
}

interface User {
    publicKey: string;
    user: string;
    borrowedAmount: string;
    primaryToken: string;
    hf: string;
    tokenBalance: string;
    bump: number;
}

interface CombinedDepositData {
    deposit: Deposit;
    userData: User | null;
    uniqueKey: string;
}

interface DepositState {
    debtToCover: BN;
    isProcessing: boolean;
    txSig: string | null;
    error: string | null;
}

const parseAmountInput = (val: string): BN => {
    const parsed = parseFloat(val);
    if (isNaN(parsed) || parsed < 0) return new BN(0);
    return new BN(Math.floor(parsed * 1e6));
};

export default function LiquidationList() {
    const dscAddress = DSC_MINT;
    const wallet = useAnchorWallet();

    const [combinedData, setCombinedData] = useState<CombinedDepositData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [prices, setPrices] = useState<Record<string, number>>({});
    const [depositStates, setDepositStates] = useState<Record<string, DepositState>>({});

    const updateDepositState = (uniqueKey: string, updates: Partial<DepositState>) => {
        setDepositStates(prev => ({
            ...prev,
            [uniqueKey]: { ...prev[uniqueKey], ...updates }
        }));
    };

    const liquidate = async (deposit: Deposit, uniqueKey: string) => {
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

        try {
            const liquidator = wallet.publicKey;
            const user = new PublicKey(deposit.user);
            const tokenMint = new PublicKey(deposit.tokenMint);
            const dscMint = new PublicKey(dscAddress);

            const [enginePDA] = PublicKey.findProgramAddressSync([Buffer.from("engine")], program.programId);
            const [userPDA] = PublicKey.findProgramAddressSync([Buffer.from("user"), user.toBuffer(), tokenMint.toBuffer()], program.programId);
            const [pricePDA] = PublicKey.findProgramAddressSync([Buffer.from("price"), tokenMint.toBuffer()], program.programId);
            const [configPDA] = PublicKey.findProgramAddressSync([Buffer.from("config"), tokenMint.toBuffer()], program.programId);
            const [depositPDA] = PublicKey.findProgramAddressSync([Buffer.from("deposit"), user.toBuffer(), tokenMint.toBuffer()], program.programId);

            const conn = (program.provider as AnchorProvider).connection;

            const vaultATA = await getAssociatedTokenAddress(tokenMint, configPDA, true);
            const liquidatorTokenAccount = await getAssociatedTokenAddress(tokenMint, liquidator);
            // const userDSCAccount = await getAssociatedTokenAddress(dscMint, user);
            const liquidatorDSCAccount = await getAssociatedTokenAddress(dscMint, liquidator);

            const pricex = await getPriceForMint(tokenMint.toBase58());
            const bnPrice = BN.isBN(pricex) ? pricex : new BN(pricex);

            const info = await conn.getAccountInfo(liquidatorDSCAccount);
            if (!info) {
                const ix = createAssociatedTokenAccountInstruction(liquidator, liquidatorDSCAccount, liquidator, dscMint);
                const tx = new Transaction().add(ix);
                const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("finalized");
                tx.recentBlockhash = blockhash;
                tx.lastValidBlockHeight = lastValidBlockHeight;
                tx.feePayer = liquidator;
                const signed = await wallet.signTransaction(tx);
                const sig = await conn.sendRawTransaction(signed.serialize());
                await conn.confirmTransaction({ blockhash, lastValidBlockHeight, signature: sig });
            }

            console.log("Liquidator DSC ATA:", liquidatorDSCAccount.toBase58());
            const bal = await conn.getTokenAccountBalance(liquidatorDSCAccount);
            console.log("DSC Balance:", bal.value.amount);


            const info2 = await conn.getAccountInfo(liquidatorTokenAccount);
            if (!info2) {
                const ix = createAssociatedTokenAccountInstruction(liquidator, liquidatorTokenAccount, liquidator, tokenMint);
                const tx = new Transaction().add(ix);
                const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("finalized");
                tx.recentBlockhash = blockhash;
                tx.lastValidBlockHeight = lastValidBlockHeight;
                tx.feePayer = liquidator;
                const signed = await wallet.signTransaction(tx);
                const sig = await conn.sendRawTransaction(signed.serialize());
                await conn.confirmTransaction({ blockhash, lastValidBlockHeight, signature: sig });
            }
            const temp = new BN(6000);
            const sig = await program.methods.liquidateUser(state.debtToCover, bnPrice).accountsStrict({
                engine: enginePDA,
                userData: userPDA,
                deposit: depositPDA,
                liquidator: wallet.publicKey,
                tokenMint,
                config: configPDA,
                vault: vaultATA,
                liquidatorTokenAccount,
                dscMint,
                liquidatorDscAccount: liquidatorDSCAccount,
                price: pricePDA,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            }).rpc();

            updateDepositState(uniqueKey, {
                isProcessing: false,
                txSig: sig
            });

            const hfbn = await uploadHf(user, tokenMint, program);

            await program.methods.temp(hfbn).accountsStrict({
                user: user,
                userData: userPDA,
                tokenMint: tokenMint

            }).rpc();
            updateDepositState(uniqueKey, {
                isProcessing: false,
                txSig: sig
            });
        } catch (e) {
            console.error("Liquidation error:", e);
            updateDepositState(uniqueKey, {
                isProcessing: false,
                error: e instanceof Error ? e.message : "Unknown error occurred"
            });
        }
    };

    useEffect(() => {
        const loadData = async () => {
            if (!wallet) return;
            setIsLoading(true);

            try {
                const [deposits, users] = await Promise.all([
                    fetchAlldeposits(wallet),
                    fetchAllUsersOnChain(wallet)
                ]);

                console.log("Raw deposits:", deposits);
                console.log("Raw users:", users);

                const seen = new Set();
                const uniqueDeposits = deposits.filter(d => {
                    const key = `${d.user}_${d.tokenMint}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });

                const seenKeys = new Set();
                const uniqueUsers = users.filter(u => {
                    if (seenKeys.has(u.publicKey)) return false;
                    seenKeys.add(u.publicKey);
                    return true;
                });



                console.log("Unique deposits:", uniqueDeposits);
                console.log("Unique users:", uniqueUsers);

                const userMap = new Map<string, User>();
                uniqueUsers.forEach(user => {
                    userMap.set(user.primaryToken, user);
                });

                const combined: CombinedDepositData[] = uniqueDeposits.map((deposit, index) => {
                    const matchingUser = userMap.get(deposit.tokenMint) || null;
                    const uniqueKey = `${deposit.publicKey}_${index}`;

                    console.log(`Deposit ${deposit.publicKey}:`, {
                        tokenMint: deposit.tokenMint,
                        matchingUser: matchingUser ? matchingUser.publicKey : 'None',
                        uniqueKey
                    });

                    return {
                        deposit,
                        userData: matchingUser,
                        uniqueKey
                    };
                }).filter(({ userData }) => {
                    if (!userData) return false;
                    const hfValue = parseFloat(userData.hf) / 1000000;
                    return hfValue < 1 && userData.hf !== "18446744073709551615";
                });

                console.log("Combined data (HF < 1):", combined);
                setCombinedData(combined);

                const initialStates: Record<string, DepositState> = {};
                combined.forEach(({ uniqueKey }) => {
                    initialStates[uniqueKey] = {
                        debtToCover: new BN(0),
                        isProcessing: false,
                        txSig: null,
                        error: null
                    };
                });
                setDepositStates(initialStates);

                const uniqueTokenMints = Array.from(new Set(uniqueDeposits.map(dep => dep.tokenMint)));
                const priceMap: Record<string, number> = {};

                for (const tokenMint of uniqueTokenMints) {
                    try {
                        const pricex = await getPriceForMint(tokenMint);
                        priceMap[tokenMint] = Number(pricex.toString());
                    } catch (e) {
                        console.error(`Error fetching price for ${tokenMint}:`, e);
                        priceMap[tokenMint] = 0;
                    }
                }
                setPrices(priceMap);
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
                <h1 className="text-2xl font-semibold text-white mb-8">Liquidation List (Health Factor less than 1)</h1>

                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-600 border-t-white"></div>
                        <span className="ml-3 text-gray-300">Loading...</span>
                    </div>
                ) : combinedData.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-gray-400">No deposits found with Health Factor less than 1</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {combinedData.map(({ deposit, userData, uniqueKey }) => {
                            const state = depositStates[uniqueKey];
                            if (!state || !userData) return null;

                            return (
                                <div key={uniqueKey} className="bg-gray-900 rounded-lg border border-gray-700 p-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Deposit Info */}
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Deposit</h3>
                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-xs text-gray-500">User</p>
                                                    <p className="text-sm font-mono text-gray-200">{formatTokenMint(deposit.user)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Token</p>
                                                    <p className="text-sm font-mono text-gray-200">{formatTokenMint(deposit.tokenMint)}</p>
                                                </div>
                                                {/* <div>
                                                    <p className="text-xs text-gray-500">Amount</p>
                                                    <p className="text-sm text-gray-200">{(parseFloat(deposit.tokenAmt) / 1000000).toFixed(6)}</p>
                                                </div> */}
                                                <div>
                                                    <p className="text-xs text-gray-500">Price</p>
                                                    <p className="text-sm text-gray-200">
                                                        ${prices[deposit.tokenMint]
                                                            ? (prices[deposit.tokenMint] / 10000).toFixed(4)
                                                            : "Loading..."}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Account Status */}
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Account</h3>
                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-xs text-gray-500">Borrowed</p>
                                                    <p className="text-sm text-gray-200">{(parseFloat(userData.borrowedAmount) / 1000000).toFixed(6)}</p>
                                                </div>
                                                {/* <div>
                                                    <p className="text-xs text-gray-500">To liquidate</p>
                                                    <p className="text-sm text-gray-200">{((Number(userData.tokenBalance) * (prices[deposit.tokenMint] / 10000)) - Number(userData.borrowedAmount)) / 1000000}</p>
                                                </div> */}
                                                <div>
                                                    <p className="text-xs text-gray-500">Balance</p>
                                                    <p className="text-sm text-gray-200">{(parseFloat(userData.tokenBalance) / 1000000).toFixed(6)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Health Factor</p>
                                                    <p className="text-sm text-gray-200">
                                                        {(parseFloat(userData.hf) / 1000000).toFixed(6)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Actions</h3>
                                            <div className="space-y-3">
                                                <div>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        min="0"
                                                        value={(Number(state.debtToCover.toString()) / 1e6).toString()}

                                                        placeholder="Mint amount"
                                                        onChange={(e) => {
                                                            updateDepositState(uniqueKey, {
                                                                debtToCover: parseAmountInput(e.target.value)
                                                            });
                                                        }}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                                        disabled={state.isProcessing}
                                                    />
                                                    <button
                                                        className="w-full mt-1 px-3 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                                        onClick={() => liquidate(deposit, uniqueKey)}
                                                        disabled={!wallet?.publicKey || state.isProcessing || state.debtToCover.eq(new BN(0))}
                                                    >
                                                        {state.isProcessing ? "Processing..." : "Liquidate"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status Messages
                                    {state.error && (
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
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}