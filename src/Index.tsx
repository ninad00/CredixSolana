import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StartEngineDisplayOnly } from "./components/interest/start-engine-display-only";
import { DSC_MINT, Interest_PROGRAM_ID } from '../anchor/src/source.ts'
import {
    Coins,
    TrendingUp,
    Shield,
    Zap,
    ArrowRight,
    Wallet,
    PiggyBank,
    Activity,
    Lock,
    AlertTriangle
} from "lucide-react";

import { ExplorerLink } from './components/cluster/cluster-ui';

const STABLECOIN_MINT = DSC_MINT;

const Index = () => {
    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <header className="border-b border-gray-800 bg-black/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
                                <Coins className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                                    Credix
                                </h1>
                                <p className="text-xs text-gray-400">DSC Protocol</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-gray-800">
                                Documentation
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="container mx-auto px-6 py-16">
                <div className="text-center mb-16">
                    <Badge variant="secondary" className="mb-4 bg-gray-800 text-gray-300 border-gray-700">
                        <Activity className="h-3 w-3 mr-1" />
                        Powered by Pyth Price Feeds
                    </Badge>
                    <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        Credix

                    </h2>
                    <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
                        A secure DeFi protocol for efficient lending and borrowing.
                        Mint DSC stablecoin against your crypto collateral or provide liquidity to earn interest.
                    </p>
                </div>
            </section>




            {/* Main Features - Two Sections */}
            <section className="container mx-auto px-6 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Borrowing Section */}
                    <div className="space-y-8">
                        <div className="text-center lg:text-left">
                            <div className="flex items-center justify-center lg:justify-start space-x-2 mb-4">
                                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                                    <PiggyBank className="h-6 w-6 text-white" />
                                </div>
                                <h3 className="text-3xl font-bold text-white">Mint DSC Stablecoin</h3>
                            </div>
                            <p className="text-lg text-gray-400 mb-8">
                                Deposit crypto assets as collateral and mint DSC stablecoin up to 50% of your deposit value
                            </p>
                        </div>

                        <Card className="bg-gray-900/80 backdrop-blur-sm border-gray-800 shadow-xl">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center space-x-2 text-white">
                                    <Lock className="h-5 w-5 text-blue-400" />
                                    <span>Collateral Assets</span>
                                </CardTitle>
                                <CardDescription className="text-gray-400">Supported tokens for collateral</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">ETH</span>
                                        </div>
                                        <span className="font-medium text-white">Ethereum</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">USDC</span>
                                        </div>
                                        <span className="font-medium text-white">USD Coin</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">EURC</span>
                                        </div>
                                        <span className="font-medium text-white">Euro Coin</span>
                                    </div>
                                </div>

                                <div className="mt-6 p-4 bg-yellow-900/30 border border-yellow-800 rounded-lg">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <AlertTriangle className="h-4 w-4 text-yellow-400" />
                                        <span className="text-sm font-medium text-yellow-300">Health Factor</span>
                                    </div>
                                    <p className="text-xs text-yellow-400 mb-3">
                                        Maintain health factor more than 1.0 to avoid liquidation
                                    </p>
                                    <div className="flex items-center space-x-2">
                                        <Progress value={85} className="flex-1" />
                                        <span className="text-sm font-medium text-green-400">Healthy</span>
                                    </div>
                                </div>

                                <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white">
                                    Start Borrowing
                                </Button>
                            </CardContent>
                        </Card>
                    </div>



                    {/* Liquidity Provider Section */}
                    <div className="space-y-8">
                        <div className="text-center lg:text-left">
                            <div className="flex items-center justify-center lg:justify-start space-x-2 mb-4">
                                <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                                    <TrendingUp className="h-6 w-6 text-white" />
                                </div>
                                <h3 className="text-3xl font-bold text-white">Provide Liquidity</h3>
                            </div>
                            <p className="text-lg text-gray-400 mb-8">
                                Earn interest on your deposits from borrowing fees paid by DSC minters
                            </p>
                        </div>

                        <Card className="bg-gray-900/80 backdrop-blur-sm border-gray-800 shadow-xl">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center space-x-2 text-white">
                                    <Wallet className="h-5 w-5 text-green-400" />
                                    <span>Liquidity Pools</span>
                                </CardTitle>
                                <CardDescription className="text-gray-400">Earn competitive yields on your assets</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">USDC</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">USDC Pool</p>
                                            <p className="text-sm text-gray-400">High liquidity</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-green-400">High APY</p>
                                        <p className="text-xs text-gray-400">Competitive</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">ETH</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">ETH Pool</p>
                                            <p className="text-sm text-gray-400">High liquidity</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-green-400">High APY</p>
                                        <p className="text-xs text-gray-400">Competitive</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">EURC</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">EURC Pool</p>
                                            <p className="text-sm text-gray-400">High liquidity</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-green-400">High APY</p>
                                        <p className="text-xs text-gray-400">Competitive</p>
                                    </div>
                                </div>

                                <div className="mt-6 p-4 bg-green-900/30 border border-green-800 rounded-lg">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Shield className="h-4 w-4 text-green-400" />
                                        <span className="text-sm font-medium text-green-300">Protected by Overcollateralization</span>
                                    </div>
                                    <p className="text-xs text-green-400">
                                        Your deposits are secured by overcollateral backing
                                    </p>
                                </div>

                                <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white">
                                    Start Earning
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            <section className="container mx-auto px-6 py-10">
                <Card className="bg-gray-900/80 backdrop-blur border border-gray-800">
                    <CardHeader className="pb-0">
                        <CardTitle className="text-white text-2xl font-semibold">
                            Check out the contract and our DSC token
                        </CardTitle>


                        <div className="mt-6 space-y-3">
                            <h3>
                                <ExplorerLink label="Program  ID" path={`address/${Interest_PROGRAM_ID}`} />
                            </h3>
                            <br />
                            <h3>
                                <ExplorerLink label=" Stablecoin" path={`address/${STABLECOIN_MINT}`} />
                            </h3>
                        </div>
                    </CardHeader>
                </Card>
            </section>


            <section className="container mx-auto px-6 py-10">
                <Card className="bg-gray-900/80 backdrop-blur border border-gray-800">
                    <CardHeader>
                        <CardTitle className="text-white text-xl">Engine Parameters</CardTitle>
                        <CardDescription className="text-gray-400">
                            Displaying current engine configuration values.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <StartEngineDisplayOnly />
                    </CardContent>
                </Card>
            </section>


            {/* Protocol Features */}
            <section className="container mx-auto px-6 py-16">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="bg-gray-900/60 backdrop-blur-sm border-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 group">
                        <CardContent className="p-8 text-center">
                            <div className="mb-4 mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Shield className="h-8 w-8 text-white" />
                            </div>
                            <h4 className="text-xl font-semibold mb-3 text-white">Overcollateralized</h4>
                            <p className="text-gray-400">
                                Overcollateral backing ensures protocol stability and user fund security
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gray-900/60 backdrop-blur-sm border-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 group">
                        <CardContent className="p-8 text-center">
                            <div className="mb-4 mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Zap className="h-8 w-8 text-white" />
                            </div>
                            <h4 className="text-xl font-semibold mb-3 text-white">Pyth Price Feeds</h4>
                            <p className="text-gray-400">
                                Real-time, accurate pricing data from institutional-grade oracles
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gray-900/60 backdrop-blur-sm border-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 group">
                        <CardContent className="p-8 text-center">
                            <div className="mb-4 mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Coins className="h-8 w-8 text-white" />
                            </div>
                            <h4 className="text-xl font-semibold mb-3 text-white">DSC Stablecoin</h4>
                            <p className="text-gray-400">
                                Mint our stablecoin accepted across DeFi protocols and DEXs
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </section>
        </div>
    );
};

export default Index;