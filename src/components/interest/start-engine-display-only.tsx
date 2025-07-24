import { useState, useEffect } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { getProgram } from "../../../anchor/src/source.ts";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

const toDecimal = (bn: BN, scale: number) =>
    (bn.toNumber() / scale).toFixed(4);

export function StartEngineDisplayOnly() {
    const wallet = useAnchorWallet();
    const { connection } = useConnection();

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

                const account = await connection.getAccountInfo(enginePDA);
                if (account === null) return;

                const engine = await program.account.engine.fetch(enginePDA);
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

    if (!engineData) return null;

    return (
        <div className="w-full p-4 ">
            <p><strong>Min Health Factor:</strong> {toDecimal(engineData.minHealthFactor, 1_000_000)}</p>
            <p><strong>Liquidation Threshold:</strong> {toDecimal(engineData.liquidationThreshold, 1_000_000)}%</p>
            <p><strong>Liquidation Bonus:</strong> {toDecimal(engineData.liquidationBonus, 1_000_000)}%</p>
            <p><strong>Redemption Fee:</strong> {toDecimal(engineData.feePercent, 1_000_000)}%</p>
        </div>
    );
}
