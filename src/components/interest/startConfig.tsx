import { useState } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { getProgram } from "../../../anchor/src/source.ts";
import {
    PublicKey,
    SystemProgram,
    Transaction,
} from "@solana/web3.js";
import {
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import BN from "bn.js";
import { getPriceForMint } from "../providers/tp.ts";

export default function CreateToken() {
    const wallet = useAnchorWallet();
    const { connection } = useConnection();

    const [tokenMint, setTokenMint] = useState("");
    const [price, setPrice] = useState(new BN(0));

    const [isLoading, setIsLoading] = useState(false);
    const [txSig, setTxSig] = useState<string | null>(null);

    const handleTokenMintInput = (event: React.ChangeEvent<HTMLInputElement>) => {
        setTokenMint(event.target.value);
    };

    const onClick = async () => {
        if (!wallet || !connection) return;

        try {
            const program = getProgram(wallet);
            if (!program) throw new Error("Failed to load program.");

            const mint = new PublicKey(tokenMint);

            if (!PublicKey.isOnCurve(mint)) {
                throw new Error("Invalid mint address.");
            }

            const [configPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from("config"), mint.toBuffer()],
                program.programId
            );

            const [pricePDA] = PublicKey.findProgramAddressSync(
                [Buffer.from("price"), mint.toBuffer()],
                program.programId
            );

            const existingConfig = await connection.getAccountInfo(configPDA);
            if (existingConfig !== null) {
                throw new Error("Config account already initialized for this token mint.");
            }

            const vaultATA = await getAssociatedTokenAddress(
                mint,
                configPDA,
                true,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );

            setIsLoading(true);
            setTxSig(null);

            const pricex = await getPriceForMint(tokenMint);
            console.log("Fetched price:", pricex.toString());

            // Defensive: Ensure BN instance
            const bnPrice = BN.isBN(pricex) ? pricex : new BN(pricex);

            setPrice(bnPrice);


            const tx = await program.methods
                .startToken(bnPrice)
                .accountsStrict({
                    config: configPDA,
                    price: pricePDA,
                    tokenMint: mint,
                    vault: vaultATA,
                    admin: wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                })
                .transaction();

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
            tx.recentBlockhash = blockhash;
            tx.lastValidBlockHeight = lastValidBlockHeight;
            tx.feePayer = wallet.publicKey;

            const signedTx = await wallet.signTransaction(tx);
            const sig = await connection.sendRawTransaction(signedTx.serialize());
            await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature: sig });

            const configData = await program.account.config.fetch(configPDA);
            const priceData = await program.account.price.fetch(pricePDA);
            console.log("Config account created:", configData);
            console.log("Price account created:", priceData);

            setTxSig(sig);
        } catch (error) {
            console.error("Transaction failed:", error);
            // alert(error instanceof Error ? error.message : "Unknown error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="Create card p-4 max-w-md mx-auto">
            <h2 className="text-2xl font-semibold mb-4">Create Config</h2>
            <input
                type="text"
                value={tokenMint}
                placeholder="Token Mint Address"
                onChange={handleTokenMintInput}
                className="mb-2 p-2 border w-full rounded"
            />
            <button
                onClick={onClick}
                disabled={!wallet?.publicKey || isLoading}
                className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50 w-full"
            >
                {isLoading ? "Creating..." : "Create Config Account"}
            </button>
            {txSig && (
                <p className="mt-4 text-sm">
                    View on Explorer:{" "}
                    <a
                        href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                    >
                        {txSig}
                    </a>
                </p>
            )}
        </div>
    );
}
