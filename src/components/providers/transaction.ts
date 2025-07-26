

const INTEREST_IDL = {
    "address": "J4bfWKCuz2J1gzbwhosrhRV5Q1bQATjvAmnzP7SMYptY",
    "instructions": [
        {
            "name": "depositCollateral",
            "discriminator": [
                156,
                131,
                142,
                116,
                146,
                247,
                162,
                120
            ],
            "args": [{ "name": "amount", "type": "u64" }]
        },
        {
            "name": "giveLiquidity",
            "discriminator": [
                243,
                205,
                169,
                207,
                77,
                123,
                63,
                7
            ],
            "args": [
                { "name": "amount", "type": "u64" },

            ]
        },
        {
            "name": "liquidateUser",
            "discriminator": [
                121,
                20,
                69,
                108,
                54,
                153,
                66,
                95
            ],
            "args": [{
                "name": "debtToCover",
                "type": "u64"
            },
            {
                "name": "newPrice",
                "type": "u64"
            }]
        },
        {
            "name": "mintDsc",
            "discriminator": [
                142,
                219,
                102,
                161,
                136,
                60,
                179,
                173
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                },
                {
                    "name": "newPrice",
                    "type": "u64"
                }
            ]
        },

        {
            "name": "redeemLiquidity",
            "discriminator": [
                180,
                117,
                142,
                137,
                227,
                225,
                97,
                211
            ],
            "args": [],
        },

        {
            "name": "startEngine",
            "discriminator": [
                47,
                24,
                94,
                248,
                13,
                125,
                158,
                142
            ],
            "args": [
                {
                    "name": "liquidationThreshold",
                    "type": "u64"
                },
                {
                    "name": "minHealthFactor",
                    "type": "u64"
                },
                {
                    "name": "liquidationBonus",
                    "type": "u64"
                },
                {
                    "name": "feePercent",
                    "type": "u64"
                }
            ]
        },

        {
            "name": "startToken",
            "discriminator": [
                253,
                172,
                159,
                168,
                69,
                117,
                168,
                65
            ],
            "args": [
                {
                    "name": "price",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "temp",
            "discriminator": [
                221,
                138,
                209,
                235,
                107,
                243,
                152,
                193
            ],
            "args": [
                {
                    "name": "hfbn",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "withdrawCollateral",
            "discriminator": [
                115,
                135,
                168,
                106,
                139,
                214,
                138,
                150
            ],
            "args": [
                {
                    "name": "dscToGive",
                    "type": "u64"
                },
                {
                    "name": "newPrice",
                    "type": "u64"
                }
            ]
        }


    ]
};

export interface DecodedInstruction {
    instructionName: string;
    summary: string;
    args: Record<string, any>;
    programId: string;
}

// make sure bs58 is installed

const decodeInstructionData = (data: string): Uint8Array => {
    // Try base64 first, fallback to base58

    return base64ToUint8Array(data);

};

export const logInstructionDiscriminator = (instruction: any) => {
    const data = instruction.data;
    if (!data) {
        console.log("No data in instruction.");
        return;
    }

    const dataBytes = decodeInstructionData(data);
    const discriminator = Array.from(dataBytes.slice(0, 8));

    console.log("---- Instruction Debug ----");
    console.log("Program ID:", instruction.programId?.toString());
    console.log("Raw Data (first 20 chars):", data.slice(0, 20) + "...");
    console.log("Decoded Bytes Length:", dataBytes.length);
    console.log("Discriminator (first 8 bytes):", discriminator);

    console.log("Checking against INTEREST_IDL...");
    INTEREST_IDL.instructions.forEach((ix) => {
        const matches = JSON.stringify(ix.discriminator) === JSON.stringify(discriminator);
        console.log(` - ${ix.name}: ${ix.discriminator} => MATCH? ${matches}`);
    });
    console.log("---------------------------");
};


// Browser-compatible base64 to Uint8Array conversion
const base64ToUint8Array = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

// Browser-compatible function to read i64 from bytes
const readBigInt64LE = (bytes: Uint8Array, offset: number): bigint => {
    let result = 0n;
    for (let i = 0; i < 8; i++) {
        result |= BigInt(bytes[offset + i]) << (BigInt(i) * 8n);
    }
    return result;
};

const formatTokenAmount = (amount: bigint, decimals: number = 6): string => {
    const divisor = BigInt(10 ** decimals);
    const wholePart = amount / divisor;
    const fractionalPart = amount % divisor;

    if (fractionalPart === 0n) {
        return wholePart.toString();
    }

    // Format fractional part, remove trailing zeros
    return `${wholePart}.${fractionalPart.toString().padStart(decimals, '0').replace(/0+$/, '')}`;
};

const getGenericInstructionSummary = (instruction: any): string => {
    if (instruction.parsed?.type) {
        const info = instruction.parsed.info || {};

        switch (instruction.parsed.type) {
            case "transfer":
                return `Transferred ${info.amount || "unknown"} tokens from ${info.source || "unknown"} to ${info.destination || "unknown"}`;

            case "transferChecked":
                return `Transferred ${info.amount || "unknown"} tokens (checked) from ${info.source || "unknown"} to ${info.destination || "unknown"}`;

            case "mintTo":
                return `Minted ${info.amount || "unknown"} tokens to ${info.account || "unknown"}`;

            case "burn":
                return `Burned ${info.amount || "unknown"} tokens from ${info.account || "unknown"}`;

            case "approve":
                return `Approved ${info.delegate || "unknown"} to spend ${info.amount || "unknown"} tokens`;

            case "createAccount":
                return `Created account ${info.newAccount || "unknown"}`;

            case "closeAccount":
                return `Closed account ${info.account || "unknown"}`;

            case "initializeAccount":
                return `Initialized account ${info.account || "unknown"}`;

            case "initializeMint":
                return `Initialized mint with ${info.decimals || "unknown"} decimals`;

            default:
                return `${instruction.parsed.type} instruction`;
        }
    }

    if (instruction.program) {
        return `${instruction.program} program call`;
    }

    return "Unknown instruction";
};

export const getProgramName = (programId: string): string => {
    const knownPrograms: Record<string, string> = {
        [INTEREST_IDL.address]: 'Interest Protocol',
        '11111111111111111111111111111111': 'System Program',
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': 'Token Program',
        'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL': 'Associated Token Program'
    };

    return knownPrograms[programId] || `Unknown Program (${programId.slice(0, 8)}...)`;
};


export const decodeInstruction = (instruction: any): DecodedInstruction => {
    const programId = instruction.programId?.toString();
    const data = instruction.data;

    console.log('Decoding instruction:', { programId, data: data ? data.slice(0, 20) + '...' : 'no data' });

    // Check if this is our interest program
    if (programId === INTEREST_IDL.address && data) {
        try {
            // Convert base64 data to bytes for discriminator comparison
            const dataBytes = base64ToUint8Array(data);

            console.log('Data bytes length:', dataBytes.length);
            console.log('First 8 bytes (discriminator):', Array.from(dataBytes.slice(0, 8)));

            if (dataBytes.length >= 8) {
                const discriminator = Array.from(dataBytes.slice(0, 8));

                console.log('Looking for discriminator:', discriminator);

                // Find matching instruction by discriminator
                const matchingInstruction = INTEREST_IDL.instructions.find(ix => {
                    const matches = JSON.stringify(ix.discriminator) === JSON.stringify(discriminator);
                    console.log(`Checking ${ix.name}:`, ix.discriminator, 'matches:', matches);
                    return matches;
                });

                if (matchingInstruction) {
                    console.log('Found matching instruction:', matchingInstruction.name);
                    const decodedArgs: Record<string, any> = {};
                    let summary = '';

                    switch (matchingInstruction.name) {
                        case 'depositCollateral': {
                            if (dataBytes.length >= 16) {
                                const amount = readBigInt64LE(dataBytes, 8);
                                decodedArgs.amount = amount.toString();
                                summary = `Deposited ${formatTokenAmount(amount)} as collateral`;
                            } else {
                                summary = 'Deposited collateral';
                            }
                            break;
                        }

                        case 'giveLiquidity': {
                            if (dataBytes.length >= 16) {
                                const amount = readBigInt64LE(dataBytes, 8);
                                decodedArgs.amount = amount.toString();
                                summary = `Gave ${formatTokenAmount(amount)} liquidity`;
                            } else {
                                summary = 'Gave liquidity';
                            }
                            break;
                        }

                        case 'liquidateUser': {
                            if (dataBytes.length >= 24) {
                                const debtToCover = readBigInt64LE(dataBytes, 8);
                                const newPrice = readBigInt64LE(dataBytes, 16);
                                decodedArgs.debtToCover = debtToCover.toString();
                                decodedArgs.newPrice = newPrice.toString();
                                summary = `Liquidated user with debt ${formatTokenAmount(debtToCover)}, price set to ${newPrice}`;
                            } else {
                                summary = 'Liquidated user';
                            }
                            break;
                        }

                        case 'mintDsc': {
                            if (dataBytes.length >= 24) {
                                const amount = readBigInt64LE(dataBytes, 8);
                                const newPrice = readBigInt64LE(dataBytes, 16);
                                decodedArgs.amount = amount.toString();
                                decodedArgs.newPrice = newPrice.toString();
                                summary = `Minted DSC: ${formatTokenAmount(amount)}, price ${newPrice}`;
                            } else {
                                summary = 'Minted DSC';
                            }
                            break;
                        }

                        case 'redeemLiquidity': {
                            summary = 'Redeemed liquidity';
                            break;
                        }

                        case 'startEngine': {
                            if (dataBytes.length >= 40) {
                                const liquidationThreshold = readBigInt64LE(dataBytes, 8);
                                const minHealthFactor = readBigInt64LE(dataBytes, 16);
                                const liquidationBonus = readBigInt64LE(dataBytes, 24);
                                const feePercent = readBigInt64LE(dataBytes, 32);
                                decodedArgs.liquidationThreshold = liquidationThreshold.toString();
                                decodedArgs.minHealthFactor = minHealthFactor.toString();
                                decodedArgs.liquidationBonus = liquidationBonus.toString();
                                decodedArgs.feePercent = feePercent.toString();
                                summary = `Engine started (Threshold: ${liquidationThreshold}, MinHF: ${minHealthFactor}, Bonus: ${liquidationBonus}, Fee: ${feePercent}%)`;
                            } else {
                                summary = 'Engine started';
                            }
                            break;
                        }

                        case 'startToken': {
                            if (dataBytes.length >= 16) {
                                const price = readBigInt64LE(dataBytes, 8);
                                decodedArgs.price = price.toString();
                                summary = `Token started with price ${price}`;
                            } else {
                                summary = 'Token started';
                            }
                            break;
                        }

                        case 'temp': {
                            if (dataBytes.length >= 16) {
                                const hfbn = readBigInt64LE(dataBytes, 8);
                                decodedArgs.hfbn = hfbn.toString();
                                summary = `Temporary HF updated: ${hfbn}`;
                            } else {
                                summary = 'Temp instruction executed';
                            }
                            break;
                        }

                        case 'withdrawCollateral': {
                            if (dataBytes.length >= 24) {
                                const dscToGive = readBigInt64LE(dataBytes, 8);
                                const newPrice = readBigInt64LE(dataBytes, 16);
                                decodedArgs.dscToGive = dscToGive.toString();
                                decodedArgs.newPrice = newPrice.toString();
                                summary = `Withdrew collateral (DSC: ${formatTokenAmount(dscToGive)}, Price: ${newPrice})`;
                            } else {
                                summary = 'Withdrew collateral';
                            }
                            break;
                        }

                        default:
                            summary = `Unknown instruction: ${matchingInstruction.name}`;
                    }

                    return {
                        instructionName: matchingInstruction.name,
                        summary,
                        args: decodedArgs,
                        programId
                    };
                } else {
                    console.log('No matching instruction found for discriminator:', discriminator);
                }
            }
        } catch (error) {
            console.warn('Failed to decode instruction data:', error);
        }
    }

    // Fallback for other programs or failed decoding
    return {
        instructionName: instruction.parsed?.type || instruction.program || 'Unknown',
        summary: getGenericInstructionSummary(instruction),
        args: instruction.parsed?.info || {},
        programId: programId || 'Unknown'
    };
};
