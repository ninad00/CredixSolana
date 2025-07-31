import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { fetchAlldeposits, fetchAllUsersOnChain } from "./fetchallaccounts.tsx";
import { DSC_MINT, getProgram } from "../../../anchor/src/source.ts";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
// import { createMemoInstruction } from "@solana/spl-memo";
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
import { Wallet, PiggyBank, RefreshCw, CheckCircle } from 'lucide-react';

// --- Interfaces (unchanged) ---
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
    mintAmount: BN;
    withdrawAmount: BN;
    isProcessing: boolean;
    processingAction: 'mint' | 'withdraw' | 'hf' | null;
    txSig: string | null;
    error: string | null;
}

// --- Helper Functions (unchanged) ---
const parseAmountInput = (val: string): BN => {
    const parsed = parseFloat(val);
    if (isNaN(parsed) || parsed < 0) return new BN(0);
    // Assuming 6 decimals for this example
    return new BN(Math.floor(parsed * 1e6));
};

const tokenNames: Record<string, string> = {
    "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr": "EURC",
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU": "USDC",
};

const formatTokenMint = (tokenMint: string) => {
    const name = tokenNames[tokenMint];
    return name ? `${name} (${tokenMint.slice(0, 4)}...${tokenMint.slice(-4)})` : `${tokenMint.slice(0, 4)}...${tokenMint.slice(-4)}`;
}

// --- UI Components ---
const LoadingSkeleton = () => (
    <div className="space-y-6">
        {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-gray-900/50 border-gray-800 rounded-xl p-6 space-y-4 animate-pulse">
                <div className="h-6 bg-gray-700 rounded w-1/3"></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-12 bg-gray-700 rounded"></div>
                    <div className="h-12 bg-gray-700 rounded"></div>
                </div>
                <div className="h-10 bg-gray-700 rounded w-full"></div>
            </div>
        ))}
    </div>
);

function EmptyState() {
    const navigate = useNavigate();
    
    return (
        <div className="text-center py-24">
            <div className="mx-auto w-16 h-16 bg-gray-900 border-2 border-gray-800 rounded-full flex items-center justify-center mb-4">
                <PiggyBank className="h-8 w-8 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-white">No Deposits Found</h3>
            <p className="text-gray-500 mt-2">Get started by depositing collateral on the main page.</p>
            <Button onClick={() => navigate('/deposit')} variant="outline" className="mt-6 border-gray-700 hover:bg-gray-800">
                Make a Deposit
            </Button>
        </div>
    );
}

const HealthFactorDisplay = ({ hf }: { hf: string }) => {
    if (hf === "18446744073709551615") {
        return <span className="text-green-400 font-semibold">Infinite</span>;
    }
    const hfValue = parseFloat(hf) / 1e6;
    const color = hfValue > 1.5 ? 'text-green-400' : hfValue > 1.1 ? 'text-yellow-400' : 'text-red-400';
    return <span className={`${color} font-semibold`}>{hfValue.toFixed(4)}</span>;
};


// --- Main Deposit List Component ---
export default function DepositList() {

    // --- State and Hooks (unchanged) ---
    const dscAddress = DSC_MINT;
    const wallet = useAnchorWallet();
    const [combinedData, setCombinedData] = useState<CombinedDepositData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [prices, setPrices] = useState<Record<string, number>>({});
    const [depositStates, setDepositStates] = useState<Record<string, DepositState>>({});

    // --- Logic Functions (unchanged, with minor state updates) ---
    const updateDepositState = (uniqueKey: string, updates: Partial<DepositState>) => {
        setDepositStates(prev => ({
            ...prev,
            [uniqueKey]: { ...prev[uniqueKey], ...updates }
        }));
    };

    const mintDSC = async (deposit: Deposit, uniqueKey: string) => {
        if (!wallet?.publicKey || !wallet.signTransaction) return;
        const state = depositStates[uniqueKey];
        if (!state || state.isProcessing) return;
        updateDepositState(uniqueKey, { isProcessing: true, processingAction: 'mint', error: null, txSig: null });
        const program = getProgram(wallet);
        if (!program) {
            updateDepositState(uniqueKey, { isProcessing: false, processingAction: null, error: "Program not available" });
            return;
        }
        try {
            const taker = wallet.publicKey;
            const tokenMint = new PublicKey(deposit.tokenMint);
            const dscMint = new PublicKey(dscAddress);
            const [enginePDA] = PublicKey.findProgramAddressSync([Buffer.from("engine")], program.programId);
            const [userPDA] = PublicKey.findProgramAddressSync([Buffer.from("user"), taker.toBuffer(), tokenMint.toBuffer()], program.programId);
            const [pricePDA] = PublicKey.findProgramAddressSync([Buffer.from("price"), tokenMint.toBuffer()], program.programId);
            const [configPDA] = PublicKey.findProgramAddressSync([Buffer.from("config"), tokenMint.toBuffer()], program.programId);
            const [depositPDA] = PublicKey.findProgramAddressSync([Buffer.from("deposit"), taker.toBuffer(), tokenMint.toBuffer()], program.programId);
            const conn = (program.provider as AnchorProvider).connection;
            const userDSCAccount = await getAssociatedTokenAddress(dscMint, taker);
            const info = await conn.getAccountInfo(userDSCAccount);
            if (!info) {
                const ix = createAssociatedTokenAccountInstruction(taker, userDSCAccount, taker, dscMint);
                const tx = new Transaction().add(ix);
                const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("finalized");
                tx.recentBlockhash = blockhash;
                tx.lastValidBlockHeight = lastValidBlockHeight;
                tx.feePayer = taker;
                const signed = await wallet.signTransaction(tx);
                const sig = await conn.sendRawTransaction(signed.serialize());
                await conn.confirmTransaction({ blockhash, lastValidBlockHeight, signature: sig });
            }
            const pricex = await getPriceForMint(tokenMint.toBase58());
            const bnPrice = BN.isBN(pricex) ? pricex : new BN(pricex);
            const tx1 = await program.methods.mintDsc(state.mintAmount, bnPrice).accountsStrict({
                engine: enginePDA,
                userData: userPDA,
                tokenMint,
                user: taker,
                dscMint,
                deposit: depositPDA,
                config: configPDA,
                price: pricePDA,
                userDscAccount: userDSCAccount,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            }).transaction();
            const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
            tx1.recentBlockhash = blockhash;
            tx1.lastValidBlockHeight = lastValidBlockHeight;
            tx1.feePayer = taker;
            const signed = await wallet.signTransaction(tx1);
            const sig = await conn.sendRawTransaction(signed.serialize());
            await conn.confirmTransaction({ blockhash, lastValidBlockHeight, signature: sig });
            const hfbn = await uploadHf(taker, tokenMint, program);
            const tx2 = await program.methods.temp(hfbn).accountsStrict({
                user: taker,
                userData: userPDA,
                tokenMint: tokenMint
            }).transaction();
            const { blockhash: blockhash2, lastValidBlockHeight: lastValidBlockHeight2 } = await conn.getLatestBlockhash("confirmed");
            tx2.recentBlockhash = blockhash2;
            tx2.lastValidBlockHeight = lastValidBlockHeight2;
            tx2.feePayer = taker;
            const signed2 = await wallet.signTransaction(tx2);
            const sig2 = await conn.sendRawTransaction(signed2.serialize());
            await conn.confirmTransaction({ blockhash: blockhash2, lastValidBlockHeight: lastValidBlockHeight2, signature: sig2 });
            updateDepositState(uniqueKey, { isProcessing: false, processingAction: null, txSig: sig2 });
        } catch (e) {
            console.error("Mint DSC error:", e);
            updateDepositState(uniqueKey, { isProcessing: false, processingAction: null, error: e instanceof Error ? e.message : "Unknown error" });
        }
    };

    const withdrawCollateral = async (deposit: Deposit, uniqueKey: string) => {
        if (!wallet?.publicKey || !wallet.signTransaction) return;
        const state = depositStates[uniqueKey];
        if (!state || state.isProcessing) return;
        updateDepositState(uniqueKey, { isProcessing: true, processingAction: 'withdraw', error: null, txSig: null });
        const program = getProgram(wallet);
        if (!program) {
            updateDepositState(uniqueKey, { isProcessing: false, processingAction: null, error: "Program not available" });
            return;
        }
        try {
            const taker = wallet.publicKey;
            const tokenMint = new PublicKey(deposit.tokenMint);
            const dscMint = new PublicKey(dscAddress);
            const [enginePDA] = PublicKey.findProgramAddressSync([Buffer.from("engine")], program.programId);
            const [userPDA] = PublicKey.findProgramAddressSync([Buffer.from("user"), taker.toBuffer(), tokenMint.toBuffer()], program.programId);
            const [pricePDA] = PublicKey.findProgramAddressSync([Buffer.from("price"), tokenMint.toBuffer()], program.programId);
            const [configPDA] = PublicKey.findProgramAddressSync([Buffer.from("config"), tokenMint.toBuffer()], program.programId);
            const [depositPDA] = PublicKey.findProgramAddressSync([Buffer.from("deposit"), taker.toBuffer(), tokenMint.toBuffer()], program.programId);
            const conn = (program.provider as AnchorProvider).connection;
            const vaultATA = await getAssociatedTokenAddress(tokenMint, configPDA, true);
            const userTokenAccount = await getAssociatedTokenAddress(tokenMint, taker);
            const userDSCAccount = await getAssociatedTokenAddress(dscMint, taker);
            const pricex = await getPriceForMint(tokenMint.toBase58());
            const bnPrice = BN.isBN(pricex) ? pricex : new BN(pricex);
            const info = await conn.getAccountInfo(userDSCAccount);
            if (!info) {
                const ix = createAssociatedTokenAccountInstruction(taker, userDSCAccount, taker, dscMint);
                const tx = new Transaction().add(ix);
                const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("finalized");
                tx.recentBlockhash = blockhash;
                tx.lastValidBlockHeight = lastValidBlockHeight;
                tx.feePayer = taker;
                const signed = await wallet.signTransaction(tx);
                const sig = await conn.sendRawTransaction(signed.serialize());
                await conn.confirmTransaction({ blockhash, lastValidBlockHeight, signature: sig });
            }
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
            const transaction = await program.methods.withdrawCollateral(state.withdrawAmount, bnPrice).accountsStrict({
                user: taker,
                userData: userPDA,
                engine: enginePDA,
                tokenMint,
                dscMint,
                deposit: depositPDA,
                price: pricePDA,
                config: configPDA,
                vault: vaultATA,
                userTokenAccount,
                userDscAccount: userDSCAccount,
                systemProgram: SystemProgram.programId,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                tokenProgram: TOKEN_PROGRAM_ID,
            }).transaction();
            const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
            transaction.recentBlockhash = blockhash;
            transaction.lastValidBlockHeight = lastValidBlockHeight;
            transaction.feePayer = wallet.publicKey;
            const signedTx = await wallet.signTransaction(transaction);
            const sig = await conn.sendRawTransaction(signedTx.serialize());
            await conn.confirmTransaction({ blockhash, lastValidBlockHeight, signature: sig });
            const hfbn = await uploadHf(taker, tokenMint, program);
            await program.methods.temp(hfbn).accountsStrict({
                user: taker,
                userData: userPDA,
                tokenMint: tokenMint
            }).rpc();
            updateDepositState(uniqueKey, { isProcessing: false, processingAction: null, txSig: sig });
        } catch (e) {
            console.error("Withdraw error:", e);
            updateDepositState(uniqueKey, { isProcessing: false, processingAction: null, error: e instanceof Error ? e.message : "Unknown error" });
        }
    };

    const getHf = async (deposit: Deposit, uniqueKey: string) => {
        if (!wallet?.publicKey || !wallet.signTransaction) return;
        const state = depositStates[uniqueKey];
        if (!state || state.isProcessing) return;
        updateDepositState(uniqueKey, { isProcessing: true, processingAction: 'hf', error: null, txSig: null });
        const program = getProgram(wallet);
        if (!program) {
            updateDepositState(uniqueKey, { isProcessing: false, processingAction: null, error: "Program not available" });
            return;
        }
        try {
            const taker = wallet.publicKey;
            const tokenMint = new PublicKey(deposit.tokenMint);
            const [userPDA] = PublicKey.findProgramAddressSync([Buffer.from("user"), taker.toBuffer(), tokenMint.toBuffer()], program.programId);
            const HF_BN = await uploadHf(taker, tokenMint, program);
            await program.methods.temp(HF_BN).accountsStrict({
                user: taker,
                userData: userPDA,
                tokenMint
            }).rpc();
            updateDepositState(uniqueKey, { isProcessing: false, processingAction: null, txSig: "Health Factor Updated" });
        } catch (e) {
            console.error("health_factor error :", e);
            updateDepositState(uniqueKey, { isProcessing: false, processingAction: null, error: e instanceof Error ? e.message : "Unknown error" });
        }
    };

    // --- Data Fetching useEffect (unchanged) ---
    useEffect(() => {
        const loadData = async () => {
            if (!wallet) return;
            setIsLoading(true);
            try {
                const [deposits, users] = await Promise.all([fetchAlldeposits(wallet), fetchAllUsersOnChain(wallet)]);
                const myDeposits = deposits.filter(d => d.user === wallet.publicKey!.toBase58());
                const myUsers = users.filter(u => u.user === wallet.publicKey!.toBase58());
                const uniqueDeposits = myDeposits.filter((deposit, index, self) => index === self.findIndex(d => d.publicKey === deposit.publicKey));
                const uniqueUsers = myUsers.filter((user, index, self) => index === self.findIndex(u => u.publicKey === user.publicKey));
                const userMap = new Map<string, User>();
                uniqueUsers.forEach(user => { userMap.set(user.primaryToken, user); });
                const combined: CombinedDepositData[] = uniqueDeposits.map((deposit, index) => {
                    const matchingUser = userMap.get(deposit.tokenMint) || null;
                    const uniqueKey = `${deposit.publicKey}_${index}`;
                    return { deposit, userData: matchingUser, uniqueKey };
                });
                setCombinedData(combined);
                const initialStates: Record<string, DepositState> = {};
                combined.forEach(({ uniqueKey }) => {
                    initialStates[uniqueKey] = {
                        mintAmount: new BN(0),
                        withdrawAmount: new BN(0),
                        isProcessing: false,
                        processingAction: null,
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

    // --- Render Logic ---
    const listVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    return (
        <div className="w-full bg-gray-950 text-white min-h-screen">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-12"
                >
                    <h1 className="text-4xl md:text-5xl font-bold text-white">
                        My Positions
                    </h1>
                    <p className="text-lg text-gray-400 mt-2">
                        Manage your deposited collateral, mint DSC, and monitor your account health.
                    </p>
                </motion.div>

                {isLoading ? (
                    <LoadingSkeleton />
                ) : combinedData.length === 0 ? (
                    <EmptyState />
                ) : (
                    <motion.div
                        className="space-y-6"
                        variants={listVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {combinedData.map(({ deposit, userData, uniqueKey }) => {
                            const state = depositStates[uniqueKey];
                            if (!state) return null;

                            return (
                                <Card key={uniqueKey} className="bg-gray-900/50 border-gray-800 overflow-hidden">
                                    <CardHeader className="!pb-4">
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-xl text-white flex items-center gap-3">
                                                <span className="p-2 bg-purple-600/20 border border-purple-500/30 rounded-md">
                                                    <Wallet className="h-5 w-5 text-purple-400" />
                                                </span>
                                                {`Position: ${formatTokenMint(deposit.tokenMint)}`}
                                            </CardTitle>
                                            <Button
                                                variant="ghost" size="icon"
                                                onClick={() => getHf(deposit, uniqueKey)}
                                                disabled={!wallet?.publicKey || state.isProcessing}
                                            >
                                                <RefreshCw className={`h-4 w-4 text-gray-400 ${state.isProcessing && state.processingAction === 'hf' ? 'animate-spin' : ''}`} />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                        {/* Stats Section */}
                                        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4">
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-gray-400">Collateral Balance</span>
                                                <span className="font-mono text-lg text-white">{(parseFloat(userData?.tokenBalance || '0') / 1e6).toFixed(4)}</span>
                                            </div>
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-gray-400">DSC Borrowed</span>
                                                <span className="font-mono text-lg text-white">{(parseFloat(userData?.borrowedAmount || '0') / 1e6).toFixed(4)}</span>
                                            </div>
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-gray-400">Health Factor</span>
                                                <HealthFactorDisplay hf={userData?.hf || '0'} />
                                            </div>
                                            <div className="flex justify-between items-baseline pt-2 border-t border-gray-800">
                                                <span className="text-gray-400">Token Price</span>
                                                <span className="font-mono text-lg text-white">${prices[deposit.tokenMint] ? (prices[deposit.tokenMint] / 1e4).toFixed(4) : "0.00"}</span>
                                            </div>
                                        </div>

                                        {/* Actions Section */}
                                        <div className="space-y-4">
                                            {/* Mint Action */}
                                            <div className="relative">
                                                <Input
                                                    type="number" step="any" min="0"
                                                    value={(Number(state.mintAmount.toString()) / 1e6).toString()}
                                                    onChange={(e) => updateDepositState(uniqueKey, { mintAmount: parseAmountInput(e.target.value) })}
                                                    placeholder="0.00"
                                                    disabled={state.isProcessing}
                                                    className="bg-gray-800 border-gray-700 h-12 text-lg pr-28"
                                                />
                                                <Button
                                                    className="absolute top-1.5 right-1.5 h-9 bg-green-600 hover:bg-green-700 text-white"
                                                    onClick={() => mintDSC(deposit, uniqueKey)}
                                                    disabled={!wallet?.publicKey || state.isProcessing || state.mintAmount.eq(new BN(0))}
                                                >
                                                    {state.isProcessing && state.processingAction === 'mint' ? 'Minting...' : 'Mint DSC'}
                                                </Button>
                                            </div>
                                            {/* Withdraw Action */}
                                            <div className="relative">
                                                <Input
                                                    type="number" step="any" min="0"
                                                    value={(Number(state.withdrawAmount.toString()) / 1e6).toString()}
                                                    onChange={(e) => updateDepositState(uniqueKey, { withdrawAmount: parseAmountInput(e.target.value) })}
                                                    placeholder="0.00"
                                                    disabled={state.isProcessing}
                                                    className="bg-gray-800 border-gray-700 h-12 text-lg pr-32"
                                                />
                                                <Button
                                                    variant="destructive"
                                                    className="absolute top-1.5 right-1.5 h-9 bg-red-600 hover:bg-red-700"
                                                    onClick={() => withdrawCollateral(deposit, uniqueKey)}
                                                    disabled={!wallet?.publicKey || state.isProcessing || state.withdrawAmount.eq(new BN(0))}
                                                >
                                                    {state.isProcessing && state.processingAction === 'withdraw' ? 'Withdrawing...' : 'Withdraw'}
                                                </Button>
                                            </div>
                                            {/* Get HF Action */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <Button
                                                    variant="outline"
                                                    className="h-12 bg-blue-600 hover:bg-blue-700 text-white"
                                                    onClick={() => getHf(deposit, uniqueKey)}
                                                    disabled={!wallet?.publicKey || state.isProcessing}
                                                >
                                                    {state.isProcessing && state.processingAction === 'hf' ? 'Refreshing...' : 'Get HF'}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="h-12 bg-purple-600 hover:bg-purple-700 text-white"
                                                    onClick={() => getHf(deposit, uniqueKey)}
                                                    disabled={!wallet?.publicKey || state.isProcessing}
                                                >
                                                    {state.isProcessing && state.processingAction === 'hf' ? 'Refreshing...' : 'Refresh All'}
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>

                                    {/* Status Messages */}
                                    <AnimatePresence>
                                        {/* {state.error && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="bg-red-900/30 text-red-400 text-sm mt-4 mx-6 mb-6 p-3 border border-red-800 rounded-md flex items-start gap-2"
                                            >
                                                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                <span><strong>Error:</strong> {state.error}</span>
                                            </motion.div>
                                        )} */}
                                        {state.txSig && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="bg-green-900/30 text-green-400 text-sm mt-4 mx-6 mb-6 p-3 border border-green-800 rounded-md flex items-start gap-2"
                                            >
                                                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                <span>
                                                    <strong>Success:</strong>
                                                    {state.txSig === "Health Factor Updated" ? (
                                                        <span className="ml-1">Health Factor Refreshed</span>
                                                    ) : (
                                                        <a
                                                            className="ml-2 text-purple-400 hover:text-purple-300 underline"
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            href={`https://explorer.solana.com/tx/${state.txSig}?cluster=devnet`}
                                                        >
                                                            View Transaction
                                                        </a>
                                                    )}
                                                </span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Card>
                            );
                        })}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
