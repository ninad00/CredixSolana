import { useEffect, useState, useCallback } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { fetchAllConfigsOnChain } from "./fetchallaccounts.tsx";
import { getProgram } from "../../../anchor/src/source.ts";
import { PublicKey, SystemProgram, Transaction, SendTransactionError } from "@solana/web3.js";
import BN from "bn.js";
import {
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { AnchorProvider } from "@coral-xyz/anchor";
import { uploadHf } from "./hf.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins, ExternalLink, CheckCircle, AlertCircle, Loader2, Wallet } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';

// --- Interfaces ---
interface Config {
    publicKey: string;
    tokenMint: string;
    totalLiq: string;
    totalCollected: string;
    vault: string;
    authority: string;
    bump: number;
}
interface DepositAmounts {
    [tokenMint: string]: BN;
}
interface TransactionStates {
    [tokenMint: string]: {
        isLoading: boolean;
        txSig: string | null;
        error: string | null;
    };
}

// --- Constants & Helpers ---
const DISPLAY_DECIMALS = 6;

const parseAmountInput = (value: string): BN | null => {
    if (!value) return new BN(0);
    try {
        const parts = value.split('.');
        const integerPart = new BN(parts[0] || 0);
        let fractionalPart = new BN(0);
        if (parts[1]) {
            const fractionalStr = parts[1].slice(0, DISPLAY_DECIMALS).padEnd(DISPLAY_DECIMALS, '0');
            fractionalPart = new BN(fractionalStr);
        }
        const multiplier = new BN(10).pow(new BN(DISPLAY_DECIMALS));
        return integerPart.mul(multiplier).add(fractionalPart);
    } catch (error) {
        return null;
    }
};

const formatAmountForDisplay = (amount: BN): string => {
    if (amount.isZero()) return '';
    const divisor = new BN(10).pow(new BN(DISPLAY_DECIMALS));
    const quotient = amount.div(divisor);
    const remainder = amount.mod(divisor);
    if (remainder.isZero()) return quotient.toString();
    const remainderStr = remainder.toString().padStart(DISPLAY_DECIMALS, '0').replace(/0+$/, '');
    return `${quotient.toString()}.${remainderStr || '0'}`;
};

// --- UI Components ---
const LoadingSkeleton = () => (
    <div className="space-y-6">
        {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-gray-900/50 border-gray-800 rounded-xl p-6 space-y-4 animate-pulse">
                <div className="h-6 bg-gray-700 rounded w-1/2"></div>
                <div className="h-12 bg-gray-700 rounded"></div>
                <div className="h-10 bg-gray-700 rounded w-full"></div>
            </div>
        ))}
    </div>
);

// --- Main Component ---
export default function DepositCollateral() {
    const wallet = useAnchorWallet();
    const [configs, setConfigs] = useState<Config[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [depositAmounts, setDepositAmounts] = useState<DepositAmounts>({});
    const [transactionStates, setTransactionStates] = useState<TransactionStates>({});
    const [error, setError] = useState<string | null>(null);

    const updateTransactionState = useCallback((tokenMint: string, updates: Partial<TransactionStates[string]>) => {
        setTransactionStates(prev => ({ ...prev, [tokenMint]: { ...prev[tokenMint], ...updates } }));
    }, []);

    const getTransactionState = useCallback((tokenMint: string) => {
        return transactionStates[tokenMint] || { isLoading: false, txSig: null, error: null };
    }, [transactionStates]);

    const handleDeposit = async (config: Config) => {
        if (!wallet?.publicKey) return;
        const program = getProgram(wallet);
        if (!program) return;

        const depositAmount = depositAmounts[config.tokenMint];
        if (!depositAmount || depositAmount.isZero()) {
            updateTransactionState(config.tokenMint, { error: "Please enter a valid amount" });
            return;
        }

        updateTransactionState(config.tokenMint, { isLoading: true, error: null, txSig: null });

        try {
            const takerPublicKey = wallet.publicKey;
            const tokenMint = new PublicKey(config.tokenMint);
            const configPublicKey = new PublicKey(config.publicKey);
            const vaultATA = await getAssociatedTokenAddress(tokenMint, configPublicKey, true);
            const connection = (program.provider as AnchorProvider).connection;
            const userTokenAccount = await getAssociatedTokenAddress(tokenMint, takerPublicKey);
            
            // Check if user has the token account
            const tokenAccountInfo = await connection.getAccountInfo(userTokenAccount);
            if (!tokenAccountInfo) {
                updateTransactionState(config.tokenMint, { 
                    isLoading: false, 
                    error: `Token account ${userTokenAccount.toString()} does not exist. Please ensure you have some tokens to deposit.` 
                });
                return;
            }
            
            // Get token balance
            const tokenBalance = await connection.getTokenAccountBalance(userTokenAccount);
            console.log('Token balance:', {
                mint: tokenMint.toString(),
                userTokenAccount: userTokenAccount.toString(),
                balance: tokenBalance.value.uiAmount,
                decimals: tokenBalance.value.decimals,
                requestedAmount: depositAmount.toString(),
                requestedUiAmount: Number(depositAmount) / Math.pow(10, tokenBalance.value.decimals)
            });
            
            if (new BN(tokenBalance.value.amount).lt(depositAmount)) {
                updateTransactionState(config.tokenMint, { 
                    isLoading: false, 
                    error: `Insufficient balance. You have ${tokenBalance.value.uiAmount} tokens but trying to deposit ${Number(depositAmount) / Math.pow(10, tokenBalance.value.decimals)}` 
                });
                return;
            }
            
            const [depositPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from("deposit"), takerPublicKey.toBuffer(), tokenMint.toBuffer()], 
                program.programId
            );
            const [userPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from("user"), takerPublicKey.toBuffer(), tokenMint.toBuffer()], 
                program.programId
            );
            
            console.log('Program addresses:', {
                depositPDA: depositPDA.toString(),
                userPDA: userPDA.toString(),
                vaultATA: vaultATA.toString()
            });

            const userTokenAccountInfo = await connection.getAccountInfo(userTokenAccount);
            if (!userTokenAccountInfo) {
                const ix = createAssociatedTokenAccountInstruction(takerPublicKey, userTokenAccount, takerPublicKey, tokenMint);
                const tx = new Transaction().add(ix);
                const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
                tx.recentBlockhash = blockhash;
                tx.lastValidBlockHeight = lastValidBlockHeight;
                tx.feePayer = wallet.publicKey;
                const signedTx = await wallet.signTransaction(tx);
                await connection.sendRawTransaction(signedTx.serialize());
            }

            const transaction = await program.methods
                .depositCollateral(depositAmount)
                .accountsStrict({
                    user: wallet.publicKey, tokenMint, userTokenAccount, userData: userPDA,
                    deposit: depositPDA, config: configPublicKey, vault: vaultATA,
                    tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                }).transaction();

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
            transaction.recentBlockhash = blockhash;
            transaction.lastValidBlockHeight = lastValidBlockHeight;
            transaction.feePayer = wallet.publicKey;

            const signedTx = await wallet.signTransaction(transaction);
            const sig = await connection.sendRawTransaction(signedTx.serialize());
            await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature: sig });

            updateTransactionState(config.tokenMint, { isLoading: false, txSig: sig });
            setDepositAmounts(prev => ({ ...prev, [config.tokenMint]: new BN(0) }));

            const hfbn = await uploadHf(takerPublicKey, tokenMint, program);
            await program.methods.temp(hfbn).accountsStrict({ user: takerPublicKey, userData: userPDA, tokenMint }).rpc();
            
        } catch (err) {
            console.error("Transaction failed:", err);
            let errorMessage = "An unknown error occurred.";
            if (err instanceof SendTransactionError) {
                const logs = err.logs || [];
                if (logs.some(log => log.includes("insufficient funds"))) {
                    errorMessage = "Transaction failed due to insufficient funds. Please check your token balance.";
                } else {
                    errorMessage = "Transaction simulation failed. See console for details.";
                }
            } else if (err instanceof Error) {
                errorMessage = err.message;
            }
            updateTransactionState(config.tokenMint, { isLoading: false, error: errorMessage });
        }
    };

    const handleAmountChange = (tokenMint: string, value: string) => {
        const parsedAmount = parseAmountInput(value);
        if (parsedAmount !== null) {
            setDepositAmounts(prev => ({ ...prev, [tokenMint]: parsedAmount }));
        }
        updateTransactionState(tokenMint, { error: null });
    };

    useEffect(() => {
        if (!wallet) return;
        const loadConfigs = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const configsData = await fetchAllConfigsOnChain(wallet);
                setConfigs(configsData);
            } catch (e) {
                setError("Failed to load token configurations. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };
        loadConfigs();
    }, [wallet]);

    const listVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    if (!wallet) {
        return (
             <div className="w-full bg-gray-950 text-white min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto w-16 h-16 bg-gray-900 border-2 border-gray-800 rounded-full flex items-center justify-center mb-4">
                        <Wallet className="h-8 w-8 text-gray-600" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-white">Connect Wallet</h2>
                    <p className="text-gray-400">Please connect your wallet to deposit collateral.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-gray-950 text-white min-h-screen">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-white">Deposit Collateral</h1>
                    <p className="text-lg text-gray-400 mt-2">Select a token and deposit funds to use as collateral.</p>
                </motion.div>

                {error && (
                    <div className="bg-red-900/30 text-red-400 text-sm p-3 border border-red-800 rounded-md flex items-start gap-2 mb-6">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span><strong>Error:</strong> {error}</span>
                    </div>
                )}

                {isLoading ? <LoadingSkeleton /> : configs.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-gray-400">No token configurations found.</p>
                    </div>
                ) : (
                    <motion.div className="space-y-6" variants={listVariants} initial="hidden" animate="visible">
                        {configs.map((config) => {
                            const txState = getTransactionState(config.tokenMint);
                            const currentAmount = depositAmounts[config.tokenMint] || new BN(0);
                            const displayAmount = formatAmountForDisplay(currentAmount);

                            return (
                                <Card key={config.publicKey} className="bg-gray-900/50 border-gray-800 overflow-hidden">
                                    <CardHeader>
                                        <CardTitle className="text-xl text-white flex items-center gap-3">
                                            <span className="p-2 bg-purple-600/20 border border-purple-500/30 rounded-md">
                                                <Coins className="h-5 w-5 text-purple-400" />
                                            </span>
                                            <span className="break-all">{config.tokenMint}</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="relative">
                                            <Input
                                                type="number" step="any" min="0"
                                                value={displayAmount}
                                                placeholder="0.00"
                                                onChange={(e) => handleAmountChange(config.tokenMint, e.target.value)}
                                                disabled={txState.isLoading}
                                                className="bg-gray-800 border-gray-700 h-12 text-lg"
                                            />
                                        </div>
                                        <Button
                                            className="w-full h-11 text-base bg-purple-600 hover:bg-purple-700 text-white"
                                            onClick={() => handleDeposit(config)}
                                            disabled={txState.isLoading || currentAmount.isZero()}
                                        >
                                            {txState.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Deposit Collateral'}
                                        </Button>

                                        <AnimatePresence>
                                            {txState.error && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                                    className="bg-red-900/30 text-red-400 text-sm p-3 border border-red-800 rounded-md flex items-start gap-2">
                                                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                    <span><strong>Error:</strong> {txState.error}</span>
                                                </motion.div>
                                            )}
                                            {txState.txSig && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                                    className="bg-green-900/30 text-green-400 text-sm p-3 border border-green-800 rounded-md flex items-start gap-2">
                                                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                    <div className="flex-grow min-w-0">
                                                        <strong>Success:</strong>
                                                        <a href={`https://explorer.solana.com/tx/${txState.txSig}?cluster=devnet`} target="_blank" rel="noreferrer"
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
