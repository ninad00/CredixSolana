import { useEffect, useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { fetchAlldeposits, fetchAllUsersOnChain } from "./fetchallaccounts.tsx";
import { DSC_MINT, getProgram } from "../../../anchor/src/source.ts";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { createMemoInstruction } from "@solana/spl-memo";
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
    mintAmount: BN;
    withdrawAmount: BN;
    isProcessing: boolean;
    txSig: string | null;
    error: string | null;
}

const parseAmountInput = (val: string): BN => {
    const parsed = parseFloat(val);
    if (isNaN(parsed) || parsed < 0) return new BN(0);
    return new BN(Math.floor(parsed * 1e6));
};

const toDecimal = (bn: BN, scale: number) =>
    (bn.toNumber() / scale).toFixed(4);

export default function DepositList() {
    const dscAddress = DSC_MINT;
    const wallet = useAnchorWallet();

    const [combinedData, setCombinedData] = useState<CombinedDepositData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [prices, setPrices] = useState<Record<string, number>>({});
    const [depositStates, setDepositStates] = useState<Record<string, DepositState>>({});
    const [healthFactors, setHealthFactors] = useState<Record<string, BN>>({});

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

            // tx1.add(createMemoInstruction( `unique-${Date.now()}`,[wallet.publicKey]));

            // console.log("TX1 Base64:", tx1.serialize().toString("base64"));
            const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
            console.log("blockhash", blockhash);
            tx1.recentBlockhash = blockhash;
            tx1.lastValidBlockHeight = lastValidBlockHeight;
            tx1.feePayer = taker;
            const signed = await wallet.signTransaction(tx1);
            const sig = await conn.sendRawTransaction(signed.serialize());
            await conn.confirmTransaction({ blockhash, lastValidBlockHeight, signature: sig });

            updateDepositState(uniqueKey, {
                isProcessing: false,
                txSig: sig
            });

            const hfbn = await uploadHf(taker, tokenMint, program);
            const tx2 = await program.methods.temp(hfbn).accountsStrict({
                user: taker,
                userData: userPDA,
                tokenMint: tokenMint

            }).transaction();

            const { blockhash: blockhash2, lastValidBlockHeight: lastValidBlockHeight2 } = await conn.getLatestBlockhash("confirmed");
            console.log("blockhash2", blockhash2);
            tx2.recentBlockhash = blockhash2;
            tx2.lastValidBlockHeight = lastValidBlockHeight2;
            tx2.feePayer = taker;
            const signed2 = await wallet.signTransaction(tx2);
            const sig2 = await conn.sendRawTransaction(signed2.serialize());
            await conn.confirmTransaction({ blockhash: blockhash2, lastValidBlockHeight: lastValidBlockHeight2, signature: sig2 });
            updateDepositState(uniqueKey, {
                isProcessing: false,
                txSig: sig2
            });
        } catch (e) {
            console.error("Mint DSC error:", e);
            updateDepositState(uniqueKey, {
                isProcessing: false,
                error: e instanceof Error ? e.message : "Unknown error occurred"
            });
        }
    };

    const getHf = async (deposit: Deposit, uniqueKey: string) => {
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
            const taker = wallet.publicKey;
            const tokenMint = new PublicKey(deposit.tokenMint);
            const [enginePDA] = PublicKey.findProgramAddressSync([Buffer.from("engine")], program.programId);
            const [userPDA] = PublicKey.findProgramAddressSync([Buffer.from("user"), taker.toBuffer(), tokenMint.toBuffer()], program.programId);
            const [pricePDA] = PublicKey.findProgramAddressSync([Buffer.from("price"), tokenMint.toBuffer()], program.programId);
            const [depositPDA] = PublicKey.findProgramAddressSync([Buffer.from("deposit"), taker.toBuffer(), tokenMint.toBuffer()], program.programId);

            // const pricex = await getPriceForMint(tokenMint.toBase58());
            // const bnPrice = BN.isBN(pricex) ? pricex : new BN(pricex);
            // const temp = new BN(6000);

            // const sig = await program.methods.getHf(bnPrice).accountsStrict({
            //     user: taker,
            //     userData: userPDA,
            //     engine: enginePDA,
            //     tokenMint,
            //     price: pricePDA,
            //     systemProgram: SystemProgram.programId,
            //     tokenProgram: TOKEN_PROGRAM_ID,
            // }).rpc();

            // updateDepositState(uniqueKey, {
            //     isProcessing: false,
            //     txSig: sig
            // });

            const HF_BN = await uploadHf(taker, tokenMint, program);

            await program.methods.temp(HF_BN).accountsStrict({
                user: taker,
                userData: userPDA,
                tokenMint
            }).rpc();
        } catch (e) {
            console.error("health_factor error :", e);
            updateDepositState(uniqueKey, {
                isProcessing: false,
                error: e instanceof Error ? e.message : "Unknown error occurred"
            });
        }
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
            console.log(blockhash);
            transaction.recentBlockhash = blockhash;
            transaction.lastValidBlockHeight = lastValidBlockHeight;
            transaction.feePayer = wallet.publicKey;

            const signedTx = await wallet.signTransaction(transaction);
            const sig = await conn.sendRawTransaction(signedTx.serialize());
            await conn.confirmTransaction({
                blockhash,
                lastValidBlockHeight,
                signature: sig
            });

            updateDepositState(uniqueKey, {
                isProcessing: false,
                txSig: sig
            });


            const hfbn = await uploadHf(taker, tokenMint, program);

            await program.methods.temp(hfbn).accountsStrict({
                user: taker,
                userData: userPDA,
                tokenMint: tokenMint

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
            setIsLoading(true);

            try {
                // Fetch both deposits and users
                const [deposits, users] = await Promise.all([
                    fetchAlldeposits(wallet),
                    fetchAllUsersOnChain(wallet)
                ]);

                console.log("Raw deposits:", deposits);
                console.log("Raw users:", users);

                // Filter for current user's data
                const myDeposits = deposits.filter(d => d.user === wallet.publicKey!.toBase58());
                const myUsers = users.filter(u => u.user === wallet.publicKey!.toBase58());

                console.log("My deposits:", myDeposits);
                console.log("My users:", myUsers);

                // Remove duplicates from deposits based on publicKey
                const uniqueDeposits = myDeposits.filter((deposit, index, self) =>
                    index === self.findIndex(d => d.publicKey === deposit.publicKey)
                );

                // Remove duplicates from users based on publicKey
                const uniqueUsers = myUsers.filter((user, index, self) =>
                    index === self.findIndex(u => u.publicKey === user.publicKey)
                );

                console.log("Unique deposits:", uniqueDeposits);
                console.log("Unique users:", uniqueUsers);

                // Create a Map for faster user lookups
                const userMap = new Map<string, User>();
                uniqueUsers.forEach(user => {
                    // Use token mint as key since user data is per token mint
                    userMap.set(user.primaryToken, user);
                });

                // Combine deposit data with user data
                const combined: CombinedDepositData[] = uniqueDeposits.map((deposit, index) => {
                    // Find matching user data by token mint
                    const matchingUser = userMap.get(deposit.tokenMint) || null;

                    // Create unique key using deposit publicKey + index for safety
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
                });

                console.log("Combined data:", combined);
                setCombinedData(combined);

                // Initialize deposit states using unique keys
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

                // Fetch prices for unique token mints
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
                            const state = depositStates[uniqueKey];
                            const currentHf = healthFactors[uniqueKey];
                            if (!state) return null;

                            return (
                                <div key={uniqueKey} className="bg-gray-900 rounded-lg border border-gray-700 p-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Deposit Info */}
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Deposit</h3>
                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-xs text-gray-500">Token</p>
                                                    <p className="text-sm font-mono text-gray-200">{formatTokenMint(deposit.tokenMint)}</p>
                                                </div>
                                                {/* <div>
                                                    <p className="text-xs text-gray-500">Health Factor </p>
                                                    <p className="text-sm text-gray-200">{userData?.hf}</p>
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
                                            {userData ? (
                                                <div className="space-y-2">
                                                    <div>
                                                        <p className="text-xs text-gray-500">Borrowed</p>
                                                        <p className="text-sm text-gray-200">{(parseFloat(userData.borrowedAmount) / 1000000).toFixed(6)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Balance</p>
                                                        <p className="text-sm text-gray-200">{(parseFloat(userData.tokenBalance) / 1000000).toFixed(6)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Health Factor</p>
                                                        <p className="text-sm text-gray-200">
                                                            {userData.hf === "18446744073709551615" ? "Infinite" : (parseFloat(userData.hf) / 1000000).toFixed(6)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-500">No account data</p>
                                            )}
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
                                                        value={(Number(state.mintAmount.toString()) / 1e6).toString()}

                                                        placeholder="Mint amount"
                                                        onChange={(e) => {
                                                            updateDepositState(uniqueKey, {
                                                                mintAmount: parseAmountInput(e.target.value)
                                                            });
                                                        }}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                                        disabled={state.isProcessing}
                                                    />
                                                    <button
                                                        className="w-full mt-1 px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                                        onClick={() => mintDSC(deposit, uniqueKey)}
                                                        disabled={!wallet?.publicKey || state.isProcessing || state.mintAmount.eq(new BN(0))}
                                                    >
                                                        {state.isProcessing ? "Processing..." : "Mint DSC"}
                                                    </button>
                                                </div>

                                                <div>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        min="0"
                                                        value={(Number(state.withdrawAmount.toString()) / 1e6).toString()}

                                                        placeholder="Withdraw amount"
                                                        onChange={(e) => {
                                                            updateDepositState(uniqueKey, {
                                                                withdrawAmount: parseAmountInput(e.target.value)
                                                            });
                                                        }}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                                                        disabled={state.isProcessing}
                                                    />
                                                    <button
                                                        className="w-full mt-1 px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                                        onClick={() => withdrawCollateral(deposit, uniqueKey)}
                                                        disabled={!wallet?.publicKey || state.isProcessing}
                                                    >
                                                        {state.isProcessing ? "Processing..." : "Withdraw"}
                                                    </button>
                                                </div>

                                                <button
                                                    className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                                    onClick={() => getHf(deposit, uniqueKey)}
                                                    disabled={!wallet?.publicKey || state.isProcessing}
                                                >
                                                    {state.isProcessing ? "Processing..." : "Update HF"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status Messages */}
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
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}