import { useEffect, useState, useCallback } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { fetchAllLqdeposits, fetchAllLPsOnChain } from "./fetchallaccounts.tsx";
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
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, PiggyBank, PieChart, TrendingUp, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

// --- Interfaces ---
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
    isProcessing: boolean;
    txSig: string | null;
    error: string | null;
}
interface ConfigInfo {
    totalLiq: string;
    totalCollected: string;
}

// --- Constants ---
const TOKEN_DECIMALS = 6;

// --- Helper Functions ---
const formatTokenAmount = (amount: string | BN | number): string => {
    try {
        const bn = typeof amount === 'number' ? new BN(amount) : (typeof amount === 'string' ? new BN(amount) : amount);
        const divisor = new BN(10).pow(new BN(TOKEN_DECIMALS));
        const quotient = bn.div(divisor);
        const remainder = bn.mod(divisor);
        if (remainder.isZero()) {
            return quotient.toString();
        }
        const remainderStr = remainder.toString().padStart(TOKEN_DECIMALS, '0').replace(/0+$/, '');
        return `${quotient.toString()}.${remainderStr || '0'}`;
    } catch (error) {
        return '0.00';
    }
};

const formatTokenMint = (tokenMint: string) => `${tokenMint.slice(0, 4)}...${tokenMint.slice(-4)}`;

// --- UI Components ---
const LoadingSkeleton = () => (
    <div className="space-y-6">
        {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-gray-900/50 border-gray-800 rounded-xl p-6 space-y-4 animate-pulse">
                <div className="h-6 bg-gray-700 rounded w-1/3"></div>
                <div className="h-24 bg-gray-700 rounded"></div>
                <div className="h-10 bg-gray-700 rounded w-full"></div>
            </div>
        ))}
    </div>
);

const EmptyState = () => (
    <div className="text-center py-24">
        <div className="mx-auto w-16 h-16 bg-gray-900 border-2 border-gray-800 rounded-full flex items-center justify-center mb-4">
            <PiggyBank className="h-8 w-8 text-gray-600" />
        </div>
        <h3 className="text-xl font-semibold text-white">No Liquidity Positions Found</h3>
        <p className="text-gray-500 mt-2">You have not provided liquidity to any pools yet.</p>
    </div>
);

// --- Main Component ---
export default function RedeemLiquidityList() {
    const wallet = useAnchorWallet();
    const [combinedData, setCombinedData] = useState<CombinedDepositData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [depositStates, setDepositStates] = useState<Record<string, DepositState>>({});
    const [configValues, setConfigValues] = useState<Record<string, ConfigInfo>>({});

    const updateDepositState = useCallback((uniqueKey: string, updates: Partial<DepositState>) => {
        setDepositStates(prev => ({ ...prev, [uniqueKey]: { ...prev[uniqueKey], ...updates } }));
    }, []);

    const withdrawCollateral = async (deposit: Deposit, uniqueKey: string) => {
        if (!wallet?.publicKey || !wallet.signTransaction) return;
        const state = depositStates[uniqueKey];
        if (!state || state.isProcessing) return;
        updateDepositState(uniqueKey, { isProcessing: true, error: null, txSig: null });
        const program = getProgram(wallet);
        if (!program) {
            updateDepositState(uniqueKey, { isProcessing: false, error: "Program not available" });
            return;
        }
        const conn = (program.provider as AnchorProvider).connection;
        try {
            const taker = wallet.publicKey;
            const tokenMint = new PublicKey(deposit.tokenMint);
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
                user: taker, lpData: lpPDA, tokenMint, liqDeposit: depositPDA,
                config: configPDA, vault: vaultATA, userTokenAccount,
                systemProgram: SystemProgram.programId,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                tokenProgram: TOKEN_PROGRAM_ID,
            }).rpc();
            updateDepositState(uniqueKey, { isProcessing: false, txSig: sig });
        } catch (e) {
            console.error("Withdraw error:", e);
            updateDepositState(uniqueKey, { isProcessing: false, error: e instanceof Error ? e.message : "Unknown error occurred" });
        }
    };

    useEffect(() => {
        if (!wallet) return;
        const program = getProgram(wallet);
        if (!program) {
            console.error("Program not available");
            setIsLoading(false);
            return;
        }
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [deposits, users] = await Promise.all([fetchAllLqdeposits(wallet), fetchAllLPsOnChain(wallet)]);
                const myDeposits = deposits.filter(d => d.user === wallet.publicKey!.toBase58());
                const myUsers = users.filter(u => u.user === wallet.publicKey!.toBase58());
                const uniqueDeposits = myDeposits.filter((d, i, self) => i === self.findIndex(dep => dep.publicKey === d.publicKey));
                const uniqueUsers = myUsers.filter((u, i, self) => i === self.findIndex(usr => usr.publicKey === u.publicKey));
                const userMap = new Map<string, Lp>();
                uniqueUsers.forEach(user => userMap.set(user.token, user));
                const combined: CombinedDepositData[] = uniqueDeposits.map((deposit, index) => ({
                    deposit,
                    userData: userMap.get(deposit.tokenMint) || null,
                    uniqueKey: `${deposit.publicKey}_${index}`
                }));

                const configPromises = uniqueDeposits.map(async (deposit) => {
                    try {
                        const tokenMint = new PublicKey(deposit.tokenMint);
                        const [configPDA] = PublicKey.findProgramAddressSync([Buffer.from("config"), tokenMint.toBuffer()], program.programId);
                        const configInfo = await program.account.config.fetch(configPDA);
                        return { tokenMint: deposit.tokenMint, totalLiq: configInfo.totalLiq.toString(), totalCollected: configInfo.totalCollected.toString() };
                    } catch (e) {
                        return { tokenMint: deposit.tokenMint, totalLiq: "0", totalCollected: "0" };
                    }
                });

                const configResults = await Promise.all(configPromises);
                const configMap: Record<string, ConfigInfo> = {};
                configResults.forEach(result => { configMap[result.tokenMint] = { totalLiq: result.totalLiq, totalCollected: result.totalCollected }; });

                setConfigValues(configMap);
                setCombinedData(combined);
                const initialStates: Record<string, DepositState> = {};
                combined.forEach(({ uniqueKey }) => { initialStates[uniqueKey] = { isProcessing: false, txSig: null, error: null }; });
                setDepositStates(initialStates);
            } catch (e) {
                console.error("Error loading data:", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [wallet]);

    const listVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    return (
        <div className="w-full bg-gray-950 text-white min-h-screen">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-white">My Liquidity Positions</h1>
                    <p className="text-lg text-gray-400 mt-2">View and redeem your provided liquidity and earnings.</p>
                </motion.div>

                {isLoading ? <LoadingSkeleton /> : combinedData.length === 0 ? <EmptyState /> : (
                    <motion.div className="space-y-6" variants={listVariants} initial="hidden" animate="visible">
                        {combinedData.map(({ deposit, userData, uniqueKey }) => {
                            const configInfo = configValues[deposit.tokenMint];
                            const state = depositStates[uniqueKey];
                            if (!state || !configInfo || !userData) return null;

                            const totalLiq = parseFloat(configInfo.totalLiq);
                            const myDeposit = parseFloat(userData.tokenAmt);
                            const myShare = totalLiq > 0 ? (myDeposit / totalLiq) : 0;
                            const myEarnings = myShare * parseFloat(configInfo.totalCollected);

                            return (
                                <Card key={uniqueKey} className="bg-gray-900/50 border-gray-800 overflow-hidden">
                                    <CardHeader>
                                        <CardTitle className="text-xl text-white flex items-center gap-3">
                                            <span className="p-2 bg-purple-600/20 border border-purple-500/30 rounded-md">
                                                <Coins className="h-5 w-5 text-purple-400" />
                                            </span>
                                            {`Position: ${formatTokenMint(deposit.tokenMint)}`}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-900 border border-gray-800 rounded-lg p-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm text-gray-400 flex items-center gap-2"><PiggyBank className="h-4 w-4" />My Deposit</span>
                                                <span className="font-mono text-lg text-white">{formatTokenAmount(userData.tokenAmt)}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm text-gray-400 flex items-center gap-2"><PieChart className="h-4 w-4" />Pool Share</span>
                                                <span className="font-mono text-lg text-white">{(myShare * 100).toFixed(4)}%</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm text-gray-400 flex items-center gap-2"><TrendingUp className="h-4 w-4" />My Earnings</span>
                                                <span className="font-mono text-lg text-green-400">{formatTokenAmount(myEarnings)}</span>
                                            </div>
                                        </div>

                                        <Button
                                            className="w-full h-11 text-base bg-purple-600 hover:bg-purple-700 text-white"
                                            onClick={() => withdrawCollateral(deposit, uniqueKey)}
                                            disabled={!wallet?.publicKey || state.isProcessing}
                                        >
                                            {state.isProcessing ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                'Redeem All Liquidity'
                                            )}
                                        </Button>

                                        <AnimatePresence>
                                            {/* {state.error && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                                    className="bg-red-900/30 text-red-400 text-sm p-3 border border-red-800 rounded-md flex items-start gap-2">
                                                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                    <span><strong>Error:</strong> {state.error}</span>
                                                </motion.div>
                                            )} */}
                                            {state.txSig && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                                    className="bg-green-900/30 text-green-400 text-sm p-3 border border-green-800 rounded-md flex items-start gap-2">
                                                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                    <div className="flex-grow">
                                                        <strong>Success:</strong>
                                                        <a href={`https://explorer.solana.com/tx/${state.txSig}?cluster=devnet`} target="_blank" rel="noreferrer"
                                                            className="ml-2 text-purple-400 hover:text-purple-300 underline break-all">
                                                            View Transaction
                                                        </a>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
