import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Power } from 'lucide-react';
import StartConfig from './startConfig';
import StartEngine from './startEngine';
import { ExplorerLink } from '../cluster/cluster-ui';
import { DSC_MINT, Interest_PROGRAM_ID } from '../../../anchor/src/source.ts';

export default function InterestFeature() {
    const dscMint = DSC_MINT;

    return (
        <div className="w-full bg-gray-950 text-white min-h-screen py-12">
            <div className="max-w-7xl mx-auto px-6">
                {/* --- Page Header --- */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-16"
                >
                    <h1 className="text-4xl md:text-5xl font-bold text-white">
                        Interest Program Configuration
                    </h1>
                    <p className="text-lg text-gray-400 mt-4 max-w-2xl mx-auto">
                        Manage the core settings and start the engine for the Credix protocol.
                    </p>
                    <div className="flex justify-center items-center gap-6 mt-6">
                        <ExplorerLink 
                            label="Program ID" 
                            path={`address/${Interest_PROGRAM_ID}`} 
                            className="text-purple-400 hover:text-purple-300 transition-colors"
                        />
                        <ExplorerLink 
                            label="DSC Mint" 
                            path={`address/${dscMint}`} 
                            className="text-purple-400 hover:text-purple-300 transition-colors"
                        />
                    </div>
                </motion.div>

                {/* --- Configuration Cards --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    {/* Add Config Card */}
                    <Card className="bg-gray-900/50 border-gray-800 h-full">
                        <CardHeader>
                            <div className="flex items-center space-x-3 mb-2">
                                <div className="p-2 bg-purple-600 rounded-md">
                                    <Settings className="h-5 w-5 text-white" />
                                </div>
                                <CardTitle className="text-2xl text-white">Add Config</CardTitle>
                            </div>
                            <CardDescription className="text-gray-400">
                                Set the initial configuration parameters for a new engine instance.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <StartConfig />
                        </CardContent>
                    </Card>

                    {/* Start Engine Card */}
                    <Card className="bg-gray-900/50 border-gray-800 h-full">
                        <CardHeader>
                            <div className="flex items-center space-x-3 mb-2">
                                <div className="p-2 bg-purple-600 rounded-md">
                                    <Power className="h-5 w-5 text-white" />
                                </div>
                                <CardTitle className="text-2xl text-white">Start Engine</CardTitle>
                            </div>
                            <CardDescription className="text-gray-400">
                                Initialize and activate the engine with the specified configuration.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <StartEngine />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}