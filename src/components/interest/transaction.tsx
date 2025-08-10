import React, { useState, useCallback } from 'react';
import { Connection, PublicKey, ConfirmedSignatureInfo } from '@solana/web3.js';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Loader2, Search, Coins, BarChart, Users, Hash, ShieldCheck, AlertCircle, ExternalLink, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { decodeInstruction, getProgramName, type DecodedInstruction } from '../providers/transaction.ts';
import { motion, AnimatePresence } from 'framer-motion';
import { Interest_PROGRAM_ID } from 'anchor/src/source.ts';

// The program address from your transaction.ts file
const PROGRAM_ID = Interest_PROGRAM_ID.toBase58();
const CLUSTER_URL = "https://api.devnet.solana.com";

// --- Interfaces ---
interface TransactionSummary {
    signature: string;
    blockTime: number | null;
    slot: number;
    status: string;
    instructions: DecodedInstruction[];
    accounts: string[];
    fee: number;
    humanSummary: string;
}

interface AnalysisSummary {
    totalTransactions: number;
    programCalls: Record<string, number>;
    instructionTypes: Record<string, number>;
    uniqueAccounts: Set<string>;
    dateRange: { earliest: Date | null; latest: Date | null };
    totalFees: number;
}

// --- Main Component ---
const SolanaTransactionAnalyzer: React.FC = () => {
    const [programId, setProgramId] = useState(PROGRAM_ID);
    const [transactions, setTransactions] = useState<TransactionSummary[]>([]);
    const [analysis, setAnalysis] = useState<AnalysisSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastSignature, setLastSignature] = useState<string | undefined>(undefined);
    const [canLoadMore, setCanLoadMore] = useState(true);

    const connection = new Connection(CLUSTER_URL, 'confirmed');

    // --- Logic ---
    const analyzeTransactions = useCallback((txs: TransactionSummary[]): AnalysisSummary => {
        const programCalls: Record<string, number> = {};
        const instructionTypes: Record<string, number> = {};
        const uniqueAccounts = new Set<string>();
        let totalFees = 0;
        let earliest: Date | null = null;
        let latest: Date | null = null;

        txs.forEach(tx => {
            if (tx.blockTime) {
                const date = new Date(tx.blockTime * 1000);
                if (!earliest || date < earliest) earliest = date;
                if (!latest || date > latest) latest = date;
            }
            totalFees += tx.fee;
            tx.accounts.forEach(account => uniqueAccounts.add(account));
            tx.instructions.forEach(ix => {
                const programName = getProgramName(ix.programId);
                programCalls[programName] = (programCalls[programName] || 0) + 1;
                instructionTypes[ix.instructionName] = (instructionTypes[ix.instructionName] || 0) + 1;
            });
        });

        return {
            totalTransactions: txs.length,
            programCalls,
            instructionTypes,
            uniqueAccounts,
            dateRange: { earliest, latest },
            totalFees
        };
    }, []);

    const generateHumanSummary = (instructions: DecodedInstruction[]): string => {
        if (instructions.length === 0) return 'No instructions found';
        const mainActions = instructions
            .filter(ix => ix.programId === PROGRAM_ID)
            .map(ix => ix.summary);
        if (mainActions.length > 0) return mainActions.join(', ');
        return instructions[0]?.summary || 'Unknown Action';
    };

    const processSignatures = async (signatures: ConfirmedSignatureInfo[]): Promise<TransactionSummary[]> => {
        const processedTransactions: TransactionSummary[] = [];
        for (const txSig of signatures) {
            try {
                await new Promise(resolve => setTimeout(resolve, 20)); // Rate limit
                const tx = await connection.getParsedTransaction(txSig.signature, { maxSupportedTransactionVersion: 0 });
                if (tx?.transaction) {
                    const decodedInstructions = tx.transaction.message.instructions.map(ix => decodeInstruction(ix));
                    const accounts = Array.from(new Set(tx.transaction.message.accountKeys.map(key => key.pubkey.toString())));
                    processedTransactions.push({
                        signature: txSig.signature,
                        blockTime: txSig.blockTime ?? null,
                        slot: txSig.slot || 0,
                        status: txSig.confirmationStatus || 'unknown',
                        instructions: decodedInstructions,
                        accounts,
                        fee: tx.meta?.fee || 0,
                        humanSummary: generateHumanSummary(decodedInstructions)
                    });
                }
            } catch (txError) {
                console.warn(`Failed to process transaction ${txSig.signature}:`, txError);
            }
        }
        return processedTransactions;
    };

    const handleInitialFetch = async () => {
        if (!programId.trim()) {
            setError('Please enter a valid program ID');
            return;
        }
        setLoading(true);
        setError(null);
        setTransactions([]);
        setAnalysis(null);
        setLastSignature(undefined);
        setCanLoadMore(true);

        try {
            const pubKey = new PublicKey(programId);
            const signatureInfos = await connection.getSignaturesForAddress(pubKey, { limit: 25 });

            if (signatureInfos.length > 0) {
                const newTransactions = await processSignatures(signatureInfos);
                setTransactions(newTransactions);
                setAnalysis(analyzeTransactions(newTransactions));
                setLastSignature(signatureInfos[signatureInfos.length - 1]?.signature);
                setCanLoadMore(signatureInfos.length === 25);
            } else {
                setCanLoadMore(false);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = async () => {
        if (!lastSignature || loadingMore) return;

        setLoadingMore(true);
        try {
            const pubKey = new PublicKey(programId);
            const signatureInfos = await connection.getSignaturesForAddress(pubKey, { limit: 20, before: lastSignature });

            if (signatureInfos.length > 0) {
                const newTransactions = await processSignatures(signatureInfos);
                const allTransactions = [...transactions, ...newTransactions];
                setTransactions(allTransactions);
                setAnalysis(analyzeTransactions(allTransactions));
                setLastSignature(signatureInfos[signatureInfos.length - 1]?.signature);
                setCanLoadMore(signatureInfos.length === 25);
            } else {
                setCanLoadMore(false);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch more transactions');
        } finally {
            setLoadingMore(false);
        }
    }

    // --- Animation Variants ---
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.1 } }
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="w-full bg-gray-950 text-white min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-8">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-white">Transaction Analyzer</h1>
                    <p className="text-lg text-gray-400 mt-2">Dive deep into Solana program activity.</p>
                </motion.div>

                <Card className="bg-gray-900/50 border-gray-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl text-white">
                            <Search className="h-5 w-5 text-purple-400" />
                            Analyze Program
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-grow p-3 bg-gray-800 border border-gray-700 rounded-md text-gray-300 font-mono text-sm flex items-center break-all">{programId}</div>
                        <Button onClick={handleInitialFetch} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white h-12 w-full sm:w-auto">
                            {loading ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Analyzing...</> : 'Analyze Transactions'}
                        </Button>
                    </CardContent>
                </Card>

                <AnimatePresence>
                    {error && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className="bg-red-900/30 text-red-400 text-sm p-3 border border-red-800 rounded-md flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span><strong>Error:</strong> {error}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {analysis && (
                    <motion.div variants={containerVariants} initial="hidden" animate="visible">
                        <Card className="bg-gray-900/50 border-gray-800">
                            <CardHeader><CardTitle className="text-xl text-white">Analysis Summary</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <StatCard icon={Hash} value={analysis.totalTransactions} label="Transactions" />
                                    <StatCard icon={Users} value={analysis.uniqueAccounts.size} label="Unique Accounts" />
                                    <StatCard icon={BarChart} value={Object.keys(analysis.instructionTypes).length} label="Instruction Types" />
                                    <StatCard icon={Coins} value={`${(analysis.totalFees / 1e9).toFixed(6)} SOL`} label="Total Fees" />
                                </div>
                                {/* <div className="grid md:grid-cols-2 gap-6">
                                    <AnalysisChart title="Top Instructions" data={analysis.instructionTypes} />
                                    <AnalysisList title="Top Programs Called" data={analysis.programCalls} />
                                </div> */}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {transactions.length > 0 && (
                    <motion.div className="space-y-4" variants={containerVariants} initial="hidden" animate="visible">
                        <h2 className="text-2xl font-bold text-white pt-4">Transaction Details</h2>
                        {transactions.map((tx) => (
                            <motion.div key={tx.signature} variants={itemVariants}>
                                <TransactionCard tx={tx} />
                            </motion.div>
                        ))}
                        {canLoadMore && (
                            <div className="flex justify-center pt-4">
                                <Button onClick={handleLoadMore} disabled={loadingMore} variant="outline" className="border-gray-700 hover:bg-gray-800">
                                    {loadingMore ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading More...</> : 'Load More'}
                                </Button>
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
};

// --- Sub-components for better structure ---
const StatCard = ({ icon: Icon, value, label }: { icon: React.ElementType; value: string | number; label: string }) => (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center gap-4">
        <div className="p-2 bg-purple-600/20 border border-purple-500/30 rounded-md flex-shrink-0">
            <Icon className="h-6 w-6 text-purple-400" />
        </div>
        <div className="min-w-0">
            <div className="text-2xl font-bold text-white truncate">{value}</div>
            <div className="text-sm text-gray-400">{label}</div>
        </div>
    </div>
);

const AnalysisList = ({ title, data }: { title: string; data: Record<string, number> }) => (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h3 className="font-semibold mb-3 text-white">{title}</h3>
        <div className="space-y-2">
            {Object.entries(data).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, count]) => (
                <div key={name} className="flex justify-between items-center text-sm">
                    <span className="text-gray-300 capitalize truncate pr-2">{name === 'Unknown' ? 'Unrecognized Instruction' : name}</span>
                    <Badge variant="secondary" className="bg-gray-700 text-gray-300 flex-shrink-0">{count}</Badge>
                </div>
            ))}
        </div>
    </div>
);

const AnalysisChart = ({ title, data }: { title: string; data: Record<string, number> }) => {
    const sortedData = Object.entries(data).sort(([, a], [, b]) => b - a).slice(0, 5);
    const maxValue = Math.max(...sortedData.map(([, count]) => count), 0);

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="font-semibold mb-4 text-white">{title}</h3>
            <div className="space-y-3">
                {sortedData.map(([name, count]) => (
                    <div key={name} className="grid grid-cols-[auto_1fr] items-center gap-3 text-sm">
                        <span className="text-gray-300 capitalize truncate text-right">{name === 'Unknown' ? 'Unrecognized' : name}</span>
                        <div className="w-full bg-gray-700 rounded-full h-6 flex items-center">
                            <div
                                className="bg-purple-600 h-6 rounded-full flex items-center justify-end pr-2"
                                style={{ width: `${maxValue > 0 ? (count / maxValue) * 100 : 0}%` }}
                            >
                                <span className="text-white text-xs font-medium">{count}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const TransactionCard = ({ tx }: { tx: TransactionSummary }) => (
    <Card className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="ml-4 flex-grow min-w-0">
            <p className="text-sm font-medium text-gray-300">
                Transaction Signature:
            </p>
            <p className="mt-0.5 truncate text-xs font-mono text-gray-400  px-2 py-1 rounded-lg ">
                {tx.signature}
            </p>
        </div>

        <CardHeader className="flex items-center gap-2 justify-between">
            <div className="text-green-400 text-sm p-3 border border-green-800 rounded-md flex flex-cols-2 items-start gap-2">

                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />

                <div className="flex-grow min-w-0">
                    <a
                        href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-green-400 hover:text-green-300 underline flex items-center"
                    >
                        View Transaction <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                </div>
            </div>
            <Badge variant={tx.status === 'finalized' ? 'default' : 'secondary'} className="bg-green-600/20 text-green-400 border-green-500/30 flex-shrink-0">
                <ShieldCheck className="h-3 w-3 mr-1.5" />
                {tx.status}
            </Badge>
        </CardHeader>

        {/* <CardContent>
            <details className="group">
                <summary className="cursor-pointer list-none flex items-center justify-between text-sm font-medium text-gray-400 hover:text-white">
                    <span>View Details</span>
                    <span className="transition-transform duration-300 group-open:rotate-180">▼</span>
                </summary>
                <div className="mt-4 pl-4 border-l-2 border-gray-800 space-y-4">
                    {tx.instructions.map((ix: DecodedInstruction, ixIndex: number) => (
                        <div key={ixIndex} className="text-sm">
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="border-gray-700 text-gray-300">{ix.instructionName === 'Unknown' ? 'Unrecognized' : ix.instructionName}</Badge>
                                <span className="text-xs text-gray-500">{getProgramName(ix.programId)}</span>
                            </div>
                            <p className="text-gray-300">{ix.summary}</p>
                            {Object.keys(ix.args).length > 0 && (
                                <div className="text-xs text-gray-500 mt-2 bg-gray-800/50 p-2 rounded-md font-mono">
                                    <h4 className="font-semibold text-gray-400 mb-1">Arguments:</h4>
                                    {Object.entries(ix.args).map(([key, value]) => (
                                        <div key={key} className="flex justify-between gap-2">
                                            <span className="flex-shrink-0">{key}:</span>
                                            <span className="break-all text-right">{String(value)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </details>
        </CardContent> */}
    </Card>
);

export default SolanaTransactionAnalyzer;
