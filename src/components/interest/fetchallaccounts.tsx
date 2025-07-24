import { AnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getProgram } from "../../../anchor/src/source.ts";
import { Interest_PROGRAM_ID } from "../../../anchor/src/source.ts";
import BN from "bn.js";

const programId = Interest_PROGRAM_ID;
console.log("Valid program ID:", programId.toBase58());



export async function fetchAllConfigsOnChain(anchorWallet: AnchorWallet | null) {
    const program = getProgram(anchorWallet);
    if (!program) return [];

    const ConfigSize = program.account.config.size;
    console.log(ConfigSize);
    const connection = program.provider.connection;

    if (!connection) {
        console.error("No connection available in the program provider.");
        return [];
    }

    const rawAccounts = await connection.getProgramAccounts(programId, {
        filters: [
            { dataSize: ConfigSize },
        ],
    });

    const configAccounts: {
        publicKey: string;
        tokenMint: string;
        totalLiq: string;
        totalCollected: string;
        vault: string;
        authority: string;
        bump: number;
    }[] = [];

    for (const { pubkey, account } of rawAccounts) {
        try {
            const decoded = program.coder.accounts.decode<{
                tokenMint: PublicKey;
                totalLiq: BN;
                totalCollected: BN;
                vault: PublicKey;
                authority: PublicKey;
                bump: number;
            }>("config", account.data);

            console.log("Decoded config:", decoded);

            configAccounts.push({
                publicKey: pubkey.toBase58(),
                tokenMint: decoded.tokenMint.toBase58(),
                totalLiq: decoded.totalLiq.toString(),
                totalCollected: decoded.totalCollected.toString(),
                vault: decoded.vault.toBase58(),
                authority: decoded.authority.toBase58(),
                bump: decoded.bump,
            });

        } catch (e) {
            console.warn("Skipping invalid Config account:", pubkey.toBase58());
            console.error("Error decoding account:", e);
        }
    }

    return configAccounts;
}

export async function fetchAllUsersOnChain(anchorWallet: AnchorWallet | null) {
    const program = getProgram(anchorWallet);
    if (!program) return [];

    const UserSize = program.account.userData.size;
    const connection = program.provider.connection;

    if (!connection) {
        console.error("No connection available in the program provider.");
        return [];
    }

    const rawAccounts = await connection.getProgramAccounts(programId, {
        filters: [
            { dataSize: UserSize },
        ],
    });

    const UserAccounts: {
        publicKey: string;
        user: string;
        borrowedAmount: string;
        primaryToken: string,
        hf: string;
        tokenBalance: string;
        bump: number;
    }[] = [];

    for (const { pubkey, account } of rawAccounts) {
        console.log("data account:", account.data);
        console.log("Processing account:", pubkey.toBase58());
        console.log(program.idl.accounts.map(a => a.name));

        try {
            const decoded = program.coder.accounts.decode<{
                user: PublicKey;
                borrowedAmount: BN;
                primaryToken: PublicKey,
                hf: BN;
                tokenBalance: BN;
                bump: number;
            }>("userData", account.data);

            console.log("Decoded user:", decoded);

            UserAccounts.push({
                publicKey: pubkey.toBase58(),
                user: decoded.user.toBase58(),
                borrowedAmount: decoded.borrowedAmount.toString(), // Safe conversion to string
                primaryToken: decoded.primaryToken.toBase58(),
                hf: decoded.hf.toString(), // Safe conversion to string
                tokenBalance: decoded.tokenBalance.toString(), // Safe conversion to string
                bump: decoded.bump,
            });

        } catch (e) {
            console.warn("Skipping invalid user account:", pubkey.toBase58());
            console.error("Error decoding account:", e);
        }
    }

    return UserAccounts;
}

export async function fetchAllLPsOnChain(anchorWallet: AnchorWallet | null) {
    const program = getProgram(anchorWallet);
    if (!program) return [];

    const LPSize = program.account.lpData.size;
    const connection = program.provider.connection;

    if (!connection) {
        console.error("No connection available in the program provider.");
        return [];
    }

    const rawAccounts = await connection.getProgramAccounts(programId, {
        filters: [
            { dataSize: LPSize },
        ],
    });

    const LpAccounts: {
        publicKey: string;
        user: string;
        tokenAmt: string;
        token: string,
        bump: number;
    }[] = [];

    for (const { pubkey, account } of rawAccounts) {
        console.log("data account:", account.data);
        console.log("Processing account:", pubkey.toBase58());
        console.log(program.idl.accounts.map(a => a.name));

        try {
            const decoded = program.coder.accounts.decode<{
                user: PublicKey;
                tokenAmt: BN;
                token: PublicKey,
                bump: number;
            }>("lpData", account.data);

            console.log("Decoded user:", decoded);

            LpAccounts.push({
                publicKey: pubkey.toBase58(),
                user: decoded.user.toBase58(),
                tokenAmt: decoded.tokenAmt.toString(), // Safe conversion to string
                token: decoded.token.toBase58(),
                bump: decoded.bump,
            });

        } catch (e) {
            console.warn("Skipping invalid user account:", pubkey.toBase58());
            console.error("Error decoding account:", e);
        }
    }

    return LpAccounts;
}

export async function fetchAlldeposits(
    anchorWallet: AnchorWallet | null,
) {
    const program = getProgram(anchorWallet);
    if (!program) return [];

    const connection = program.provider.connection;
    const depositAccountSize = program.account.deposit.size;
    console.log(depositAccountSize);

    const rawAccounts = await connection.getProgramAccounts(programId, {
        filters: [
            { dataSize: depositAccountSize },
        ],
    });
    console.log(rawAccounts);

    const deposits: {
        publicKey: string;
        user: string;
        tokenMint: string;
        tokenAmt: string; // Changed to string to handle large numbers
        configAccount: string;
        bump: number;
    }[] = [];

    for (const { pubkey, account } of rawAccounts) {
        try {
            const decoded = program.coder.accounts.decode<{
                user: PublicKey;
                tokenMint: PublicKey;
                tokenAmt: BN;
                configAccount: PublicKey;
                bump: number;
            }>("deposit", account.data);

            const [configPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from("config"), decoded.tokenMint.toBuffer()],
                program.programId
            );
            console.log({
                actual: decoded.configAccount.toBase58(),
                expected: configPDA.toBase58(),
            });

            deposits.push({
                publicKey: pubkey.toBase58(),
                user: decoded.user.toBase58(),
                tokenMint: decoded.tokenMint.toBase58(),
                tokenAmt: decoded.tokenAmt.toString(), // Safe conversion to string
                configAccount: decoded.configAccount.toBase58(),
                bump: decoded.bump,
            });
        } catch (e) {
            console.warn("Skipping invalid deposit account:", pubkey.toBase58());
            console.error(e);
        }
    }
    return deposits;
}

export async function fetchAllLqdeposits(
    anchorWallet: AnchorWallet | null,
) {
    const program = getProgram(anchorWallet);
    if (!program) return [];

    const connection = program.provider.connection;
    const depositAccountSize = program.account.lqDeposit.size;
    console.log(depositAccountSize);

    const rawAccounts = await connection.getProgramAccounts(programId, {
        filters: [
            { dataSize: depositAccountSize },
        ],
    });
    console.log(rawAccounts);

    const deposits: {
        publicKey: string;
        user: string;
        tokenMint: string;
        tokenAmt: string; // Changed to string to handle large numbers
        configAccount: string;
        bump: number;
    }[] = [];

    for (const { pubkey, account } of rawAccounts) {
        try {
            const decoded = program.coder.accounts.decode<{
                user: PublicKey;
                tokenMint: PublicKey;
                tokenAmt: BN;
                configAccount: PublicKey;
                bump: number;
            }>("lqDeposit", account.data);

            const [configPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from("config"), decoded.tokenMint.toBuffer()],
                program.programId
            );
            console.log({
                actual: decoded.configAccount.toBase58(),
                expected: configPDA.toBase58(),
            });

            deposits.push({
                publicKey: pubkey.toBase58(),
                user: decoded.user.toBase58(),
                tokenMint: decoded.tokenMint.toBase58(),
                tokenAmt: decoded.tokenAmt.toString(), // Safe conversion to string
                configAccount: decoded.configAccount.toBase58(),
                bump: decoded.bump,
            });
        } catch (e) {
            console.warn("Skipping invalid deposit account:", pubkey.toBase58());
            console.error(e);
        }
    }
    return deposits;
}

export async function fetchAllPricesOnChain(anchorWallet: AnchorWallet | null) {
    const program = getProgram(anchorWallet);
    if (!program) return [];

    const PriceSize = program.account.price.size;
    const connection = program.provider.connection;

    if (!connection) {
        console.error("No connection available in the program provider.");
        return [];
    }

    const rawAccounts = await connection.getProgramAccounts(programId, {
        filters: [
            { dataSize: PriceSize },
        ],
    });

    const priceAccounts: {
        publicKey: string;
        tokenMint: string;
        price: string; // Keep as string for precision
        rawPrice: string; // Raw BN value as string
        expo: number;
        bump: number;
    }[] = [];

    for (const { pubkey, account } of rawAccounts) {
        try {
            const decoded = program.coder.accounts.decode<{
                tokenMint: PublicKey;
                price: BN;
                expo: number;
                bump: number;
            }>("price", account.data);

            console.log("Decoded price:", decoded);

            const rawPrice = decoded.price.toString();

            // Calculate human-readable price with proper decimal handling
            let decimalPrice: string;
            if (decoded.expo >= 0) {
                // Positive exponent - multiply
                const multiplier = new BN(10).pow(new BN(decoded.expo));
                decimalPrice = decoded.price.mul(multiplier).toString();
            } else {
                // Negative exponent - divide (most common case)
                const divisor = new BN(10).pow(new BN(Math.abs(decoded.expo)));
                const quotient = decoded.price.div(divisor);
                const remainder = decoded.price.mod(divisor);

                if (remainder.isZero()) {
                    decimalPrice = quotient.toString();
                } else {
                    const remainderStr = remainder.toString().padStart(Math.abs(decoded.expo), '0');
                    decimalPrice = `${quotient.toString()}.${remainderStr}`;
                }
            }

            priceAccounts.push({
                publicKey: pubkey.toBase58(),
                tokenMint: decoded.tokenMint.toBase58(),
                price: decimalPrice,
                rawPrice: rawPrice,
                expo: decoded.expo,
                bump: decoded.bump,
            });

        } catch (e) {
            console.warn("Skipping invalid Price account:", pubkey.toBase58());
            console.error("Error decoding account:", e);
        }
    }

    return priceAccounts;
}

// Utility functions for working with the returned data
// export const utils = {
//     // Convert string back to BN if needed
//     stringToBN: (str: string): BN => new BN(str),

//     // Format token amount with decimals
//     formatTokenAmount: (amount: string, decimals: number): string => {
//         const bn = new BN(amount);
//         return bnToDecimal(bn, decimals);
//     },

//     // Compare two string numbers
//     compareStringNumbers: (a: string, b: string): number => {
//         const bnA = new BN(a);
//         const bnB = new BN(b);
//         return bnA.cmp(bnB);
//     },

//     // Add two string numbers
//     addStringNumbers: (a: string, b: string): string => {
//         const bnA = new BN(a);
//         const bnB = new BN(b);
//         return bnA.add(bnB).toString();
//     },

//     // Subtract two string numbers
//     subtractStringNumbers: (a: string, b: string): string => {
//         const bnA = new BN(a);
//         const bnB = new BN(b);
//         return bnA.sub(bnB).toString();
//     }
// };