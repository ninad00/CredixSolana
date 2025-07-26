import React, { useState, useCallback } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

import { Badge } from '../ui/badge';
import { Loader2, Search, Activity, Clock, MessageSquare } from 'lucide-react';
import { decodeInstruction, getProgramName, logInstructionDiscriminator, type DecodedInstruction } from '../providers/transaction.ts';
import { InterestIDL } from 'anchor/src/source.ts';

const CLUSTER_URL = "https://api.devnet.solana.com";

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
    actionSummaries: Record<string, number>;
    uniqueAccounts: Set<string>;
    dateRange: { earliest: Date | null; latest: Date | null };
    totalFees: number;
}

const SolanaTransactionAnalyzer: React.FC = () => {
    const [programId, setProgramId] = useState(InterestIDL.address);
    const [transactions, setTransactions] = useState<TransactionSummary[]>([]);
    const [analysis, setAnalysis] = useState<AnalysisSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [limit, setLimit] = useState(20);

    const connection = new Connection(CLUSTER_URL, 'confirmed');

    const analyzeTransactions = useCallback((txs: TransactionSummary[]): AnalysisSummary => {
        const programCalls: Record<string, number> = {};
        const instructionTypes: Record<string, number> = {};
        const actionSummaries: Record<string, number> = {};
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

                // Count action summaries
                const actionKey = ix.summary.split(' ')[0] + ' ' + (ix.summary.split(' ')[1] || '');
                actionSummaries[actionKey] = (actionSummaries[actionKey] || 0) + 1;
            });
        });

        return {
            totalTransactions: txs.length,
            programCalls,
            instructionTypes,
            actionSummaries,
            uniqueAccounts,
            dateRange: { earliest, latest },
            totalFees
        };
    }, []);

    const generateHumanSummary = (instructions: DecodedInstruction[]): string => {
        if (instructions.length === 0) return 'No instructions found';

        const mainActions = instructions
            .filter(ix => ix.programId === '6mhY9Me3yh6kvBsejK8TcReGzRkdSYb8Gy9GDLWakzFP')
            .map(ix => ix.summary);

        if (mainActions.length > 0) {
            return mainActions.join(', ');
        }

        return instructions[0].summary;
    };

    const fetchTransactionHistory = async () => {
        if (!programId.trim()) {
            setError('Please enter a valid program ID');
            return;
        }

        setLoading(true);
        setError(null);
        setTransactions([]);
        setAnalysis(null);

        try {
            const pubKey = new PublicKey(programId);
            console.log(`Fetching transaction history for program: ${programId}`);

            const transactionList = await connection.getSignaturesForAddress(pubKey, {
                limit: Math.min(limit, 100)
            });

            console.log(`Found ${transactionList.length} transaction signatures`);

            const processedTransactions: TransactionSummary[] = [];

            for (const [index, txSig] of transactionList.entries()) {
                console.log(`Processing transaction ${index + 1}/${transactionList.length}: ${txSig.signature}`);

                try {
                    await new Promise(resolve => setTimeout(resolve, 200));

                    const tx = await connection.getParsedTransaction(txSig.signature, {
                        maxSupportedTransactionVersion: 0,
                        commitment: 'confirmed'
                    });

                    if (tx?.transaction) {
                        const decodedInstructions = tx.transaction.message.instructions.map(ix => {
                            if (ix.programId?.toString() === InterestIDL.address) {
                                logInstructionDiscriminator(ix);
                            }
                            return decodeInstruction(ix);
                        });


                        const accounts = Array.from(new Set([
                            ...tx.transaction.message.accountKeys.map(key => key.pubkey.toString()),
                            ...decodedInstructions.flatMap(ix => [ix.programId])
                        ]));

                        const humanSummary = generateHumanSummary(decodedInstructions);

                        processedTransactions.push({
                            signature: txSig.signature,
                            blockTime: txSig.blockTime ?? null,
                            slot: txSig.slot || 0,
                            status: txSig.confirmationStatus || 'unknown',
                            instructions: decodedInstructions,
                            accounts,
                            fee: tx.meta?.fee || 0,
                            humanSummary
                        });

                        console.log(`✓ Transaction ${index + 1} processed: ${humanSummary}`);
                    }
                } catch (txError) {
                    console.warn(`Failed to process transaction ${txSig.signature}:`, txError);
                }
            }

            console.log(`Successfully processed ${processedTransactions.length} transactions`);
            setTransactions(processedTransactions);
            setAnalysis(analyzeTransactions(processedTransactions));

        } catch (err) {
            console.error('Error fetching transactions:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp: number | null) => {
        if (!timestamp) return 'Unknown';
        return new Date(timestamp * 1000).toLocaleString();
    };

    const truncateAddress = (address: string, length = 8) => {
        return `${address.slice(0, length)}...${address.slice(-4)}`;
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Solana Transaction Analyzer
                </h1>
                <p className="text-lg text-muted-foreground">
                    Analyze and summarize Solana program transactions with detailed insights
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        Transaction Fetcher
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4">
                        {/* <Input
                            placeholder="Enter Solana Program ID"
                            value={programId}
                            onChange={(e) => setProgramId(e.target.value)}
                            className="flex-1"
                        /> */}
                        {/* <Input
                            type="number"
                            placeholder="Limit"
                            value={limit}
                            onChange={(e) => setLimit(Math.min(100, Math.max(1, parseInt(e.target.value) || 10)))}
                            className="w-24"
                            min="1"
                            max="100" */}
                        {/* /> */}
                        <Button
                            onClick={fetchTransactionHistory}
                            disabled={loading}
                            className="min-w-[120px]"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Fetching...
                                </>
                            ) : (
                                'Analyze'
                            )}
                        </Button>
                    </div>
                    {error && (
                        <div className="text-red-500 text-sm bg-red-50 p-3 rounded-md">
                            {error}
                        </div>
                    )}
                </CardContent>
            </Card>

            {analysis && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            Analysis Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">{analysis.totalTransactions}</div>
                                <div className="text-sm text-muted-foreground">Total Transactions</div>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">{analysis.uniqueAccounts.size}</div>
                                <div className="text-sm text-muted-foreground">Unique Accounts</div>
                            </div>
                            <div className="text-center p-4 bg-purple-50 rounded-lg">
                                <div className="text-2xl font-bold text-purple-600">{Object.keys(analysis.instructionTypes).length}</div>
                                <div className="text-sm text-muted-foreground">Instruction Types</div>
                            </div>
                            <div className="text-center p-4 bg-orange-50 rounded-lg">
                                <div className="text-2xl font-bold text-orange-600">{(analysis.totalFees / 1e9).toFixed(4)} SOL</div>
                                <div className="text-sm text-muted-foreground">Total Fees</div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            <div>
                                <h3 className="font-semibold mb-3">Most Called Programs</h3>
                                <div className="space-y-2">
                                    {Object.entries(analysis.programCalls)
                                        .sort(([, a], [, b]) => b - a)
                                        .slice(0, 5)
                                        .map(([program, count]) => (
                                            <div key={program} className="flex justify-between items-center p-2 bg-black-50 rounded">
                                                <span className="text-sm">{program}</span>
                                                <Badge variant="secondary">{count} calls</Badge>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-3">Instruction Types</h3>
                                <div className="space-y-2">
                                    {Object.entries(analysis.instructionTypes)
                                        .sort(([, a], [, b]) => b - a)
                                        .slice(0, 5)
                                        .map(([type, count]) => (
                                            <div key={type} className="flex justify-between items-center p-2 bg-black-50 rounded">
                                                <span className="capitalize text-sm">{type}</span>
                                                <Badge variant="outline">{count}</Badge>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold mb-3">Action Summary</h3>
                                <div className="space-y-2">
                                    {Object.entries(analysis.actionSummaries)
                                        .sort(([, a], [, b]) => b - a)
                                        .slice(0, 5)
                                        .map(([action, count]) => (
                                            <div key={action} className="flex justify-between items-center p-2 bg-black-50 rounded">
                                                <span className="capitalize text-sm">{action}</span>
                                                <Badge variant="default">{count}</Badge>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>

                        {analysis.dateRange.earliest && analysis.dateRange.latest && (
                            <div className="mt-6 p-4 bg-black-50 rounded-lg">
                                <h3 className="font-semibold mb-2 flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Time Range
                                </h3>
                                <div className="text-sm text-muted-foreground">
                                    From: {analysis.dateRange.earliest.toLocaleString()} <br />
                                    To: {analysis.dateRange.latest.toLocaleString()}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {transactions.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Transaction Activity Summary ({transactions.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {transactions.map((tx, index) => (
                                <div key={tx.signature} className="p-4 border rounded-lg">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="default" className="text-xs">
                                                    Transaction #{index + 1}
                                                </Badge>
                                                <span className="text-sm text-muted-foreground">
                                                    {formatDate(tx.blockTime)}
                                                </span>
                                            </div>
                                            <div className="text-lg font-medium text-green-700 mb-2">
                                                {tx.humanSummary}
                                            </div>
                                            <div className="font-mono text-xs text-muted-foreground">
                                                {truncateAddress(tx.signature, 16)}
                                            </div>
                                        </div>
                                        <Badge variant={tx.status === 'finalized' ? 'default' : 'secondary'}>
                                            {tx.status}
                                        </Badge>
                                    </div>

                                    <div className="text-sm text-muted-foreground mb-3">
                                        Fee: {(tx.fee / 1e9).toFixed(6)} SOL | Slot: {tx.slot.toLocaleString()}
                                    </div>

                                    <details className="mt-3">
                                        <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                                            View Detailed Instructions ({tx.instructions.length})
                                        </summary>
                                        <div className="mt-3 pl-4 border-l-2 border-gray-200 space-y-2">
                                            {tx.instructions.map((ix, ixIndex) => (
                                                <div key={ixIndex} className="py-2 bg-gray-50 rounded p-3">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Badge variant="outline" className="text-xs">
                                                            {ix.instructionName}
                                                        </Badge>
                                                        <span className="text-xs text-muted-foreground">
                                                            {getProgramName(ix.programId)}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm font-medium">{ix.summary}</div>
                                                    {Object.keys(ix.args).length > 0 && (
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            Args: {JSON.stringify(ix.args)}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default SolanaTransactionAnalyzer;
