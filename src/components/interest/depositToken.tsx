import { useEffect, useState, useCallback } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { fetchAllConfigsOnChain } from "./fetchallaccounts.tsx";
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
import { uploadHf } from "./hf.tsx";

// Interfaces
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

// const TOKEN_DECIMALS = 9;
const DISPLAY_DECIMALS = 6; // For user input display

export default function ConfigList() {
    const wallet = useAnchorWallet();
    const [configs, setConfigs] = useState<Config[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [depositAmounts, setDepositAmounts] = useState<DepositAmounts>({});
    const [transactionStates, setTransactionStates] = useState<TransactionStates>({});
    const [error, setError] = useState<string | null>(null);


    // Helper function to update transaction state for a specific token
    const updateTransactionState = useCallback((tokenMint: string, updates: Partial<TransactionStates[string]>) => {
        setTransactionStates(prev => ({
            ...prev,
            [tokenMint]: {
                ...prev[tokenMint],
                ...updates
            }
        }));
    }, []);

    // Helper function to get transaction state for a token
    const getTransactionState = useCallback((tokenMint: string) => {
        return transactionStates[tokenMint] || {
            isLoading: false,
            txSig: null,
            error: null
        };
    }, [transactionStates]);

    // Helper function to validate and parse amount input
    const parseAmountInput = (value: string): BN | null => {
        const numValue = Number(value);
        if (isNaN(numValue) || numValue < 0) return null;

        try {
            // Convert to the smallest unit (using DISPLAY_DECIMALS for precision)
            const rawAmount = new BN(Math.floor(numValue * Math.pow(10, DISPLAY_DECIMALS)));
            return rawAmount;
        } catch (error) {
            return null;
        }
    };

    const CreateDeposit = async (config: Config) => {
        if (!wallet || !wallet.publicKey || !wallet.signTransaction) {
            console.error("Wallet not connected or invalid");
            return;
        }

        const program = getProgram(wallet);
        if (!program) {
            console.error("Program not initialized");
            return;
        }

        const depositAmount = depositAmounts[config.tokenMint];
        if (!depositAmount || depositAmount.isZero()) {
            updateTransactionState(config.tokenMint, {
                error: "Please enter a valid amount"
            });
            return;
        }

        updateTransactionState(config.tokenMint, {
            isLoading: true,
            error: null,
            txSig: null
        });

        const takerPublicKey = wallet.publicKey;
        const tokenMint = new PublicKey(config.tokenMint);
        const configPublicKey = new PublicKey(config.publicKey);

        try {
            const vaultATA = await getAssociatedTokenAddress(
                tokenMint,
                configPublicKey,
                true,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );

            console.log("vaultATA", vaultATA.toBase58());

            const userTokenAccount = await getAssociatedTokenAddress(tokenMint, takerPublicKey);
            console.log("usertoken", userTokenAccount.toBase58());
            const [depositPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from("deposit"), takerPublicKey.toBuffer(), tokenMint.toBuffer()],
                program.programId
            );
            console.log("dep", depositPDA.toBase58());
            const [userPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from("user"), takerPublicKey.toBuffer(), tokenMint.toBuffer()],
                program.programId
            );
            console.log("user", userPDA.toBase58());
            const connection = (program.provider as AnchorProvider).connection;

            // Check if user token account exists, create if not
            const userTokenAccountInfo = await connection.getAccountInfo(userTokenAccount);
            if (!userTokenAccountInfo) {
                const ix = createAssociatedTokenAccountInstruction(
                    takerPublicKey,
                    userTokenAccount,
                    takerPublicKey,
                    tokenMint
                );

                const tx = new Transaction().add(ix);
                const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
                tx.recentBlockhash = blockhash;
                tx.lastValidBlockHeight = lastValidBlockHeight;
                tx.feePayer = wallet.publicKey;

                const signedTx = await wallet.signTransaction(tx);
                const sig = await connection.sendRawTransaction(signedTx.serialize());
                await connection.confirmTransaction({
                    blockhash,
                    lastValidBlockHeight,
                    signature: sig
                });
                console.log("Created associated token account:", sig);
            }

            const transaction = await program.methods
                .depositCollateral(depositAmount)
                .accountsStrict({
                    user: wallet.publicKey,
                    tokenMint,
                    userTokenAccount,
                    userData: userPDA,
                    deposit: depositPDA,
                    config: configPublicKey,
                    vault: vaultATA,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                })
                .transaction();

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
            transaction.recentBlockhash = blockhash;
            transaction.lastValidBlockHeight = lastValidBlockHeight;
            transaction.feePayer = wallet.publicKey;

            const signedTx = await wallet.signTransaction(transaction);
            const sig = await connection.sendRawTransaction(signedTx.serialize());
            await connection.confirmTransaction({
                blockhash,
                lastValidBlockHeight,
                signature: sig
            });

            const depositData = await program.account.deposit.fetch(depositPDA);
            console.log("Deposited successfully:", depositData.configAccount.toBase58());

            updateTransactionState(config.tokenMint, {
                isLoading: false,
                txSig: sig,
                error: null
            });

            // Clear the amount input after successful deposit
            setDepositAmounts(prev => ({
                ...prev,
                [config.tokenMint]: new BN(0)
            }));

            const hfbn = await uploadHf(takerPublicKey, tokenMint, program);

            await program.methods.temp(hfbn).accountsStrict({
                user: takerPublicKey,
                userData: userPDA,
                tokenMint: tokenMint

            }).rpc();

            try {
                const updatedConfigs = await fetchAllConfigsOnChain(wallet);
                setConfigs(updatedConfigs);
            } catch (e) {
                console.error("Failed to refresh configs:", e);
            }

        } catch (error) {
            console.error("Transaction failed:", error);
            updateTransactionState(config.tokenMint, {
                isLoading: false,
                error: error instanceof Error ? error.message : "Transaction failed"
            });
        }
    };

    // Handle amount input change
    const handleAmountChange = (tokenMint: string, value: string) => {
        const parsedAmount = parseAmountInput(value);
        if (parsedAmount !== null) {
            setDepositAmounts(prev => ({
                ...prev,
                [tokenMint]: parsedAmount
            }));
        }

        // Clear any previous error for this token
        updateTransactionState(tokenMint, { error: null });
    };

    // Load configs
    useEffect(() => {
        const loadConfigs = async () => {
            if (!wallet) return;

            setIsLoading(true);
            setError(null);

            try {
                const configs = await fetchAllConfigsOnChain(wallet);
                console.log('Fetched configs:', configs);
                setConfigs(configs);
            } catch (e) {
                console.error("Failed to fetch configs:", e);
                setError("Failed to load token configurations. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };

        loadConfigs();
    }, [wallet]);

    if (!wallet) {
        return (
            <div className="min-h-screen bg-black p-4">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-xl font-bold mb-4 text-white-900">Available Tokens</h2>
                    <p className="text-white-600">Please connect your wallet to view available tokens.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black p-4">
            <div className="max-w-4xl mx-auto">
                <h2 className="text-xl font-bold mb-4 text-white-900">Available Tokens</h2>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center py-8 bg-black">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <span className="ml-2 text-white-700">Loading tokens...</span>
                    </div>
                ) : configs.length === 0 ? (
                    <div className="text-center py-8 bg-black">
                        <p className="text-white-600">No token configurations found.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {configs.map((config) => {
                            const txState = getTransactionState(config.tokenMint);
                            const currentAmount = depositAmounts[config.tokenMint] || new BN(0);
                            const displayAmount = currentAmount.div(new BN(Math.pow(10, DISPLAY_DECIMALS))).toString();

                            return (
                                <div key={config.publicKey} className="border border-gray-200 rounded-lg p-4 bg-black shadow-sm">
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-semibold text-lg text-white-900">Token Details</h3>
                                        </div>
                                        <p className="text-sm text-white-600 break-all mb-2">
                                            <span className="font-medium">Token Mint:</span> {config.tokenMint}
                                        </p>
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-white-700 mb-2">
                                            Deposit Amount
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            min="0"
                                            value={(Number(displayAmount.toString())).toString()}
                                            placeholder="Enter amount to deposit"
                                            onChange={(e) => handleAmountChange(config.tokenMint, e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                            disabled={txState.isLoading}
                                        />
                                    </div>

                                    {/* {txState.error && (
                                        <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">
                                            {txState.error}
                                        </div>
                                    )} */}

                                    <button
                                        onClick={() => CreateDeposit(config)}
                                        disabled={txState.isLoading || currentAmount.isZero()}
                                        className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${txState.isLoading || currentAmount.isZero()
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : 'bg-blue-500 text-white hover:bg-blue-600'
                                            }`}
                                    >
                                        {txState.isLoading ? (
                                            <div className="flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Processing...
                                            </div>
                                        ) : (
                                            'Deposit'
                                        )}
                                    </button>

                                    {txState.txSig && (
                                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                                            <p className="text-sm text-green-800 font-medium mb-2">
                                                ✅ Transaction Successful!
                                            </p>
                                            <a
                                                href={`https://explorer.solana.com/tx/${txState.txSig}?cluster=devnet`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
                                            >
                                                View on Solana Explorer
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