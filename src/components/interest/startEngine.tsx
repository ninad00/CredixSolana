import { useState, useEffect } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { DSC_MINT, getProgram } from "../../../anchor/src/source.ts";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BN from "bn.js";


const toDecimal = (bn: BN, scale: number) =>
    (bn.toNumber() / scale).toFixed(4);

export default function StartEngine() {
    const dscAddress = DSC_MINT;
    // const pdaengine = "GdmkUhUt2vwWq4hj9YVPT16osChw8ZN4BbrQsiFfQqZc";
    const wallet = useAnchorWallet();
    const { connection } = useConnection();
    const [isLoading, setIsLoading] = useState(false);
    const [liqthresh, setliqthresh] = useState(new BN(0));
    const [liqbonus, setliqbonus] = useState(new BN(0));
    const [fee_percent, setfee_percent] = useState(new BN(0));
    const [healthfac, setHealthfac] = useState(new BN(0));


    const [engineData, setEngineData] = useState<null | {
        authority: string;
        dscMint: string;
        liquidationThreshold: BN;
        minHealthFactor: BN;
        liquidationBonus: BN;
        feePercent: BN;
    }>(null);



    useEffect(() => {
        if (!wallet) return;

        const fetchEngine = async () => {
            try {
                const program = getProgram(wallet);
                if (!program) return;

                const [enginePDA] = PublicKey.findProgramAddressSync(
                    [Buffer.from("engine")],
                    program.programId
                );
                console.log(enginePDA.toBase58());

                const account = await connection.getAccountInfo(enginePDA);
                if (account === null) return;

                const engine = await program.account.engine.fetch(enginePDA);
                console.log(engine.minHealthFactor.toString());

                setEngineData({
                    authority: engine.authority.toBase58(),
                    dscMint: engine.dscMint.toBase58(),
                    liquidationThreshold: engine.liquidationThreshold,
                    minHealthFactor: engine.minHealthFactor,
                    liquidationBonus: engine.liquidationBonus,
                    feePercent: engine.feePercent,
                });
            } catch (err) {
                console.error("Failed to fetch engine:", err);
            }
        };

        fetchEngine();
    }, [wallet]);

    const onClick = async () => {
        if (!wallet) return;

        try {
            const program = getProgram(wallet);
            if (!program) return;

            const dscmint = new PublicKey(dscAddress);
            if (!PublicKey.isOnCurve(dscmint)) {
                throw new Error("Invalid mint address.");
            }

            const [enginePDA] = PublicKey.findProgramAddressSync(
                [Buffer.from("engine")],
                program.programId
            );
            console.log(enginePDA.toBase58());

            const accountInfo = await connection.getAccountInfo(enginePDA);
            if (accountInfo !== null) {
                throw new Error("Engine account already initialized for this token mint.");
            }

            setIsLoading(true);

            const transaction = await program.methods
                .startEngine(liqthresh, healthfac, liqbonus, fee_percent)
                .accountsStrict({
                    engine: enginePDA,
                    authority: wallet.publicKey,
                    dscMint: dscmint,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
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
                signature: sig,
            });

            const engine = await program.account.engine.fetch(enginePDA);
            setEngineData({
                authority: engine.authority.toBase58(),
                dscMint: engine.dscMint.toBase58(),
                liquidationThreshold: engine.liquidationThreshold,
                minHealthFactor: engine.minHealthFactor,
                liquidationBonus: engine.liquidationBonus,
                feePercent: engine.feePercent,
            });
        } catch (error) {
            console.error("Transaction failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="Create card p-4">
            <h2 className="text-2xl font-semibold mb-4">Create Engine</h2>

            <input
                type="number"
                step="0.000001"
                min="0"
                value={liqthresh.toNumber() / 1_000_000}
                onChange={(e) => {
                    const val = e.target.value;
                    const parsed = parseFloat(val);
                    if (!isNaN(parsed) && parsed >= 0) {
                        const bnVal = new BN(Math.floor(parsed * 1_000_000));
                        setliqthresh(bnVal);
                    }
                }}
                placeholder="Enter liquidation threshold (e.g. 85 for 85%)"
                className="p-2 border mb-2 w-full"
            />

            <input
                type="number"
                step="0.000001"
                min="0"
                value={healthfac.toNumber() / 1_000_000}
                onChange={(e) => {
                    const val = e.target.value;
                    const parsed = parseFloat(val);
                    if (!isNaN(parsed) && parsed >= 0) {
                        const bnVal = new BN(Math.floor(parsed * 1_000_000));
                        setHealthfac(bnVal);
                    }
                }}
                placeholder="Enter liquidation threshold (e.g. 85 for 85%)"
                className="p-2 border mb-2 w-full"
            />

            <input
                type="number"
                step="0.000001"
                min="0"
                value={liqbonus.toNumber() / 1_000_000}
                onChange={(e) => {
                    const val = e.target.value;
                    const parsed = parseFloat(val);
                    if (!isNaN(parsed) && parsed >= 0) {
                        const bnVal = new BN(Math.floor(parsed * 1_000_000));
                        setliqbonus(bnVal);
                    }
                }}
                placeholder="Enter liquidation bonus (e.g. 5 for 5%)"
                className="p-2 border mb-2 w-full"
            />

            <input
                type="number"
                step="0.000001"
                min="0"
                value={fee_percent.toNumber() / 1_000_000}
                onChange={(e) => {
                    const val = e.target.value;
                    const parsed = parseFloat(val);
                    if (!isNaN(parsed) && parsed >= 0) {
                        const bnVal = new BN(Math.floor(parsed * 1_000_000));
                        setfee_percent(bnVal);
                    }
                }}
                placeholder="Enter liquidation threshold (e.g. 85 for 85%)"
                className="p-2 border mb-2 w-full"
            />

            <button
                onClick={onClick}
                disabled={!wallet?.publicKey || isLoading}
                className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            >
                {isLoading ? "Creating..." : "Start Engine"}
            </button>

            {engineData && (
                <div className="mt-4 p-4 border rounded bg-black text-white border-gray-700">
                    <h3 className="text-lg font-bold mb-2">Engine Data</h3>
                    <p><strong>Min Health Factor:</strong> {toDecimal(engineData.minHealthFactor, 1_000_000)}</p>
                    <p><strong>Liquidation Threshold:</strong> {toDecimal(engineData.liquidationThreshold, 1_000_000)}%</p>
                    <p><strong>Liquidation Bonus:</strong> {toDecimal(engineData.liquidationBonus, 1_000_000)}%</p>
                    <p><strong>Redemption Fee:</strong> {toDecimal(engineData.feePercent, 1_000_000)}%</p>
                </div>
            )}
        </div>
    );
}
