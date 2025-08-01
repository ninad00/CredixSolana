import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StartEngineDisplayOnly } from './components/interest/start-engine-display-only'
import { DSC_MINT, Interest_PROGRAM_ID } from '../anchor/src/source.ts'
import { ExplorerLink } from './components/cluster/cluster-ui'
import {
  Coins,
  TrendingUp,
  Shield,
  Zap,
  PiggyBank,
  Activity,
  ArrowRight,
} from 'lucide-react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Text3D from './components/Text3D.tsx'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { useNavigate } from 'react-router'

const STABLECOIN_MINT = DSC_MINT

const AnimatedCard = ({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) => {
  const cardVariants = {
    offscreen: {
      y: 50,
      opacity: 0,
    },
    onscreen: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        bounce: 0.4,
        duration: 0.8,
        delay,
      },
    },
  }
  return (
    <motion.div
      initial="offscreen"
      whileInView="onscreen"
      viewport={{ once: true, amount: 0.2 }}
      variants={cardVariants}
    >
      <Card className={className}>{children}</Card>
    </motion.div>
  )
}


const Index = () => {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })

  // Parallax transformations
  const heroTextY = useTransform(scrollYProgress, [0, 1], ['0%', '20%'])
  const heroLottieY = useTransform(scrollYProgress, [0, 1], ['0%', '55%'])
  const heroBgY = useTransform(scrollYProgress, [0, 1], ['0%', '50%'])
  const heroBgOpacity = useTransform(scrollYProgress, [0, 1], [1, 0])
  const navigate = useNavigate()

  return (
    <div className="w-full bg-gray-950 text-white overflow-x-hidden">
      {/* --- Hero Section with Parallax Effect --- */}
      <section
        ref={heroRef}
        className="relative w-full h-screen flex items-center justify-center overflow-hidden"
      >
        <motion.div style={{ y: heroBgY, opacity: heroBgOpacity }} className="absolute inset-0 bg-purple-900/70 rounded-3xl" />
        <div className="max-w-7xl mx-auto px-6 w-full">
            <div className="grid md:grid-cols-2 gap-8 items-center">
                {/* Left Column: Text Content */}
                <motion.div style={{ y: heroTextY }} className="text-center md:text-left">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.2 }}>
                        <Badge
                        variant="outline"
                        className="mb-6 border-purple-400/50 bg-purple-900/20 text-purple-300 backdrop-blur-sm"
                        >
                        <Activity className="h-3 w-3 mr-2" />
                        Powered by Solana & Pyth Network
                        </Badge>

                        <Text3D>
                            <h1 className="text-5xl lg:text-7xl font-bold text-transparent bg-clip-text bg-white">
                                The Future of
                            </h1>
                            <h1 className="text-5xl lg:text-7xl font-bold text-transparent bg-clip-text bg-white">
                                Decentralized Lending
                            </h1>
                        </Text3D>
                        
                        <p className="text-lg text-gray-400 max-w-xl mx-auto md:mx-0 mt-8 mb-10 ">
                            A secure and transparent DeFi protocol for efficient lending and borrowing. Mint DSC stablecoin or provide
                            liquidity to earn yield.
                        </p>
                        {/* <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                            <Button size="lg" className="bg-purple-600 text-white hover:bg-purple-700 font-semibold">
                                Launch App <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                            <Button size="lg" variant="outline" className="border-gray-700 hover:bg-gray-800 hover:border-gray-600">
                                Read Docs
                            </Button>
                        </div> */}
                    </motion.div>
                </motion.div>

                {/* Right Column: Lottie Animation */}
                <motion.div style={{ y: heroLottieY }} className="w-full max-w-md mx-auto md:max-w-full">
                    <DotLottieReact
                    src="https://lottie.host/d6028fbf-03c3-4733-8c06-98e55b5d8a4a/RFD7pBV71n.lottie"
                    loop
                    autoplay
                    />
                </motion.div>
            </div>
        </div>
      </section>

      {/* --- Main Features Section --- */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Borrowing Section */}
          <AnimatedCard className="bg-gray-900/50 border-gray-800 shadow-2xl shadow-purple-900/10">
            <CardHeader>
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-purple-600 rounded-lg">
                  <PiggyBank className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-white">Mint DSC Stablecoin</h3>
              </div>
              <CardDescription className="text-lg text-gray-400">
                Deposit crypto assets as collateral and mint DSC stablecoin up to 50% of your deposit value.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => {navigate('/deposit')}} size="lg" className="w-full mt-4 bg-purple-600 text-white hover:bg-purple-700 font-semibold">
                Start Borrowing
              </Button>
            </CardContent>
          </AnimatedCard>

          {/* Liquidity Provider Section */}
          <AnimatedCard className="bg-gray-900/50 border-gray-800 shadow-2xl shadow-purple-900/10" delay={0.2}>
            <CardHeader>
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-green-600 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-white">Provide Liquidity</h3>
              </div>
              <CardDescription className="text-lg text-gray-400">
                Earn interest on your deposits from borrowing fees paid by DSC minters.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => {navigate('/liquidity')}} size="lg" className="w-full mt-4 bg-green-600 text-white hover:bg-green-700 font-semibold">
                Start Earning
              </Button>
            </CardContent>
          </AnimatedCard>
        </div>
      </section>

      {/* --- Protocol Features --- */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white">Built for Trust and Performance</h2>
          <p className="text-lg text-gray-500 mt-4">Core principles that make Credix secure and reliable.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <AnimatedCard className="bg-gray-900 border-gray-800 text-center group">
            <CardContent className="p-8">
              <div className="mb-4 mx-auto w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold mb-3 text-white">Overcollateralized</h4>
              <p className="text-gray-400">
                Protocol stability and user funds are secured by overcollateralized backing.
              </p>
            </CardContent>
          </AnimatedCard>
          <AnimatedCard className="bg-gray-900 border-gray-800 text-center group" delay={0.15}>
            <CardContent className="p-8">
              <div className="mb-4 mx-auto w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold mb-3 text-white">Pyth Price Feeds</h4>
              <p className="text-gray-400">Real-time, accurate pricing data from institutional-grade oracles.</p>
            </CardContent>
          </AnimatedCard>
          <AnimatedCard className="bg-gray-900 border-gray-800 text-center group" delay={0.3}>
            <CardContent className="p-8">
              <div className="mb-4 mx-auto w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <Coins className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-xl font-semibold mb-3 text-white">DSC Stablecoin</h4>
              <p className="text-gray-400">
                Mint our stablecoin, accepted across a growing ecosystem of DeFi protocols.
              </p>
            </CardContent>
          </AnimatedCard>
        </div>
      </section>

      {/* --- Contract Info & Engine Params --- */}
      <section className="max-w-7xl mx-auto px-6 py-24 space-y-16">
        <AnimatedCard className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-2xl font-semibold">Explore On-Chain</CardTitle>
            <CardDescription className="text-gray-400">
              Our protocol is transparent and verifiable on the Solana blockchain.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <ExplorerLink
              className="block p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:bg-gray-800 hover:border-purple-500 transition-colors"
              label="Credix Program ID"
              path={`address/${Interest_PROGRAM_ID}`}
            />
            <ExplorerLink
              className="block p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:bg-gray-800 hover:border-purple-500 transition-colors"
              label="DSC Stablecoin Mint"
              path={`address/${STABLECOIN_MINT}`}
            />
          </CardContent>
        </AnimatedCard>

        <AnimatedCard className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Engine Parameters</CardTitle>
            <CardDescription className="text-gray-400">Displaying current engine configuration values.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <StartEngineDisplayOnly />
          </CardContent>
        </AnimatedCard>
      </section>
    </div>
  )
}

export default Index
