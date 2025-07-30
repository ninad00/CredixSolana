import { useEffect, useState, useCallback } from "react";
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
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Zap, Coins, CheckCircle, AlertCircle as AlertCircleIcon, Loader2 } from 'lucide-react';

// --- Interfaces ---
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
    userData: User;
    uniqueKey: string;
}
interface DepositState {
    debtToCover: BN;
    isProcessing: boolean;
    txSig: string | null;
    error: string | null;
}

// --- Helper Functions ---
const parseAmountInput = (val: string): BN => {
    const parsed = parseFloat(val);
    if (isNaN(parsed) || parsed < 0) return new BN(0);
    return new BN(Math.floor(parsed * 1e6));
};

const formatTokenAmount = (amount: string | BN): string => {
    const bn = typeof amount === 'string' ? new BN(amount) : amount;
    const divisor = new BN(10).pow(new BN(6));
    const quotient = bn.div(divisor);
    const remainder = bn.mod(divisor);
    if (remainder.isZero()) return quotient.toString();
    const remainderStr = remainder.toString().padStart(6, '0').replace(/0+$/, '');
    return `${quotient.toString()}.${remainderStr || '0'}`;
};

const formatAddress = (address: string) => `${address.slice(0, 4)}...${address.slice(-4)}`;

// --- UI Components ---
const LoadingSkeleton = () => (
    <div className="space-y-6">
        {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-gray-900/50 border-gray-800 rounded-xl p-6 space-y-4 animate-pulse">
                <div className="h-6 bg-gray-700 rounded w-1/2"></div>
                <div className="h-20 bg-gray-700 rounded"></div>
                <div className="h-12 bg-gray-700 rounded"></div>
            </div>
        ))}
    </div>
);

const EmptyState = () => (
    <div className="text-center py-24">
        <div className="mx-auto w-16 h-16 bg-gray-900 border-2 border-gray-800 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-500" />
        </div>
        <h3 className="text-xl font-semibold text-white">All Positions Are Healthy</h3>
        <p className="text-gray-500 mt-2">There are currently no positions eligible for liquidation.</p>
    </div>
);

// --- Main Component ---
export default function LiquidatePositions() {
    const dscAddress = DSC_MINT;
    const wallet = useAnchorWallet();
    const [combinedData, setCombinedData] = useState<CombinedDepositData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [prices, setPrices] = useState<Record<string, number>>({});
    const [depositStates, setDepositStates] = useState<Record<string, DepositState>>({});

    const updateDepositState = useCallback((uniqueKey: string, updates: Partial<DepositState>) => {
        setDepositStates(prev => ({ ...prev, [uniqueKey]: { ...prev[uniqueKey], ...updates } }));
    }, []);

    const liquidate = async (deposit: Deposit, uniqueKey: string) => {
        if (!wallet?.publicKey || !wallet.signTransaction) return;
        const state = depositStates[uniqueKey];
        if (!state || state.isProcessing) return;
        updateDepositState(uniqueKey, { isProcessing: true, error: null, txSig: null });
        const program = getProgram(wallet);
        if (!program) {
            updateDepositState(uniqueKey, { isProcessing: false, error: "Program not available" });
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
            const sig = await program.methods.liquidateUser(state.debtToCover, bnPrice).accountsStrict({
                engine: enginePDA, userData: userPDA, deposit: depositPDA, liquidator: wallet.publicKey,
                tokenMint, config: configPDA, vault: vaultATA, liquidatorTokenAccount,
                dscMint, liquidatorDscAccount: liquidatorDSCAccount, price: pricePDA,
                systemProgram: SystemProgram.programId, tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            }).rpc();
            const hfbn = await uploadHf(user, tokenMint, program);
            await program.methods.temp(hfbn).accountsStrict({ user, userData: userPDA, tokenMint }).rpc();
            updateDepositState(uniqueKey, { isProcessing: false, txSig: sig });
        } catch (e) {
            console.error("Liquidation error:", e);
            updateDepositState(uniqueKey, { isProcessing: false, error: e instanceof Error ? e.message : "Unknown error occurred" });
        }
    };

    useEffect(() => {
        if (!wallet) return;
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [deposits, users] = await Promise.all([fetchAlldeposits(wallet), fetchAllUsersOnChain(wallet)]);
                const seen = new Set();
                const uniqueDeposits = deposits.filter(d => {
                    const key = `${d.user}_${d.tokenMint}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
                const userMap = new Map<string, User>();
                users.forEach(user => {
                    const key = `${user.user}_${user.primaryToken}`;
                    // Simple map by user+token should be sufficient
                    userMap.set(key, user);
                });
                const combined: CombinedDepositData[] = uniqueDeposits.map((deposit, index) => ({
                    deposit,
                    userData: userMap.get(`${deposit.user}_${deposit.tokenMint}`) || null,
                    uniqueKey: `${deposit.publicKey}_${index}`
                })).filter(({ userData }) => {
                    if (!userData) return false;
                    const hfValue = parseFloat(userData.hf) / 1e6;
                    return hfValue < 1 && userData.hf !== "18446744073709551615";
                }) as CombinedDepositData[];

                setCombinedData(combined);
                const initialStates: Record<string, DepositState> = {};
                combined.forEach(({ uniqueKey }) => {
                    initialStates[uniqueKey] = { debtToCover: new BN(0), isProcessing: false, txSig: null, error: null };
                });
                setDepositStates(initialStates);
                const uniqueTokenMints = Array.from(new Set(combined.map(c => c.deposit.tokenMint)));
                const priceMap: Record<string, number> = {};
                for (const tokenMint of uniqueTokenMints) {
                    try {
                        const pricex = await getPriceForMint(tokenMint);
                        priceMap[tokenMint] = Number(pricex.toString());
                    } catch (e) { priceMap[tokenMint] = 0; }
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

    const listVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    return (
        <div className="w-full bg-gray-950 text-white min-h-screen">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-white">Liquidate Positions</h1>
                    <p className="text-lg text-gray-400 mt-2">Browse and liquidate undercollateralized positions to earn a bonus.</p>
                </motion.div>

                {isLoading ? <LoadingSkeleton /> : combinedData.length === 0 ? <EmptyState /> : (
                    <motion.div className="space-y-6" variants={listVariants} initial="hidden" animate="visible">
                        {combinedData.map(({ deposit, userData, uniqueKey }) => {
                            const state = depositStates[uniqueKey];
                            if (!state) return null;

                            return (
                                <Card key={uniqueKey} className="bg-gray-900/50 border-gray-800 overflow-hidden">
                                    <CardHeader>
                                        <CardTitle className="text-xl text-white flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="p-2 bg-red-600/20 border border-red-500/30 rounded-md">
                                                    <AlertTriangle className="h-5 w-5 text-red-400" />
                                                </span>
                                                {`User: ${formatAddress(deposit.user)}`}
                                            </div>
                                            <span className="text-sm font-mono text-gray-400">{formatAddress(deposit.tokenMint)}</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-900 border border-gray-800 rounded-lg p-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm text-gray-400">Health Factor</span>
                                                <span className="font-mono text-lg text-red-400 font-bold">{(parseFloat(userData.hf) / 1e6).toFixed(4)}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm text-gray-400">Collateral</span>
                                                <span className="font-mono text-lg text-white">{formatTokenAmount(userData.tokenBalance)}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm text-gray-400">Debt (DSC)</span>
                                                <span className="font-mono text-lg text-white">{formatTokenAmount(userData.borrowedAmount)}</span>
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <Input
                                                type="number" step="any" min="0"
                                                value={(Number(state.debtToCover.toString()) / 1e6).toString()}
                                                onChange={(e) => updateDepositState(uniqueKey, { debtToCover: parseAmountInput(e.target.value) })}
                                                placeholder="Amount of debt to cover"
                                                disabled={state.isProcessing}
                                                className="bg-gray-800 border-gray-700 h-12 text-lg pr-28"
                                            />
                                            <Button
                                                className="absolute top-1.5 right-1.5 h-9 bg-red-600 hover:bg-red-700 text-white"
                                                onClick={() => liquidate(deposit, uniqueKey)}
                                                disabled={!wallet?.publicKey || state.isProcessing || state.debtToCover.eq(new BN(0))}
                                            >
                                                {state.isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Liquidate'}
                                            </Button>
                                        </div>

                                        <AnimatePresence>
                                            {state.error && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                                    className="bg-red-900/30 text-red-400 text-sm p-3 border border-red-800 rounded-md flex items-start gap-2">
                                                    <AlertCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                    <span><strong>Error:</strong> {state.error}</span>
                                                </motion.div>
                                            )}
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
