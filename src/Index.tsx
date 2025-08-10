import React, { useRef, useMemo, Suspense } from 'react'
import { useNavigate } from 'react-router'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StartEngineDisplayOnly } from './components/interest/start-engine-display-only'
import { DSC_MINT, Interest_PROGRAM_ID } from '../anchor/src/source.ts'
import { ExplorerLink } from './components/cluster/cluster-ui'
import Text3D from './components/Text3D.tsx'
import { Coins, TrendingUp, Shield, Zap, PiggyBank, Activity, ArrowRight } from 'lucide-react'
import ScrollStack, { ScrollStackItem } from './ScrollStack'


// Lazy load the Lottie component to improve initial load time
const DotLottieReact = React.lazy(() =>
  import('@lottiefiles/dotlottie-react').then((module) => ({
    default: module.DotLottieReact,
  })),
)

// Constants
const STABLECOIN_MINT = DSC_MINT
const LOTTIE_URL = 'https://lottie.host/d6028fbf-03c3-4733-8c06-98e55b5d8a4a/RFD7pBV71n.lottie'

// Animation variants
const CARD_VARIANTS = {
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
    },
  },
}

const HERO_TEXT_VARIANTS = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 1,
      delay: 0.2,
    },
  },
}

// Feature data
const FEATURES = [
  {
    icon: Shield,
    title: 'Overcollateralized',
    description: 'Protocol stability and user funds are secured by overcollateralized backing.',
    delay: 0,
  },
  {
    icon: Zap,
    title: 'Pyth Price Feeds',
    description: 'Real-time, accurate pricing data from institutional-grade oracles.',
    delay: 0.15,
  },
  {
    icon: Coins,
    title: 'DSC Stablecoin',
    description: 'Mint our stablecoin, accepted across a growing ecosystem of DeFi protocols.',
    delay: 0.3,
  },
] as const

// Types
interface AnimatedCardProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  delay: number
}

interface ActionCardProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  buttonText: string
  buttonColor: 'purple' | 'green'
  onClick: () => void
  delay?: number
}

// Components
const AnimatedCard: React.FC<AnimatedCardProps> = ({ children, className = '', delay = 0 }) => {
  const variants = useMemo(
    () => ({
      ...CARD_VARIANTS,
      onscreen: {
        ...CARD_VARIANTS.onscreen,
        transition: {
          ...CARD_VARIANTS.onscreen.transition,
          delay,
        },
      },
    }),
    [delay],
  )

  return (
    <motion.div initial="offscreen" whileInView="onscreen" viewport={{ once: true, amount: 0.2 }} variants={variants}>
      <Card className={className}>{children}</Card>
    </motion.div>
  )
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description, delay }) => (
  <AnimatedCard
    className="border-gray-900 text-center group hover:border-purple-500/50 transition-colors"
    delay={delay}
  >
    <CardContent className="p-8">
      <div className="mb-4 mx-auto w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:bg-purple-500">
        <Icon className="h-8 w-8 text-white" />
      </div>
      <h4 className="text-xl font-semibold mb-3 text-white">{title}</h4>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </CardContent>
  </AnimatedCard>
)

const ActionCard: React.FC<ActionCardProps> = ({
  icon: Icon,
  title,
  description,
  buttonText,
  buttonColor,
  onClick,
  delay = 0,
}) => {
  const buttonClasses =
    buttonColor === 'purple' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700'

  return (
    <AnimatedCard
      className="bg-gray-900/50 border-gray-800 shadow-2xl shadow-purple-900/10 hover:shadow-purple-900/20 transition-all duration-300"
      delay={delay}
    >
      <CardHeader>
        <div className="flex items-center space-x-4 mb-4">
          <div className={`p-3 ${buttonColor === 'purple' ? 'bg-purple-600' : 'bg-green-600'} rounded-lg`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-3xl font-bold text-white">{title}</h3>
        </div>
        <CardDescription className="text-lg text-gray-400 leading-relaxed">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={onClick}
          size="lg"
          className={`w-full mt-4 ${buttonClasses} text-white font-semibold transition-all duration-200 hover:scale-105`}
        >
          {buttonText}
        </Button>
      </CardContent>
    </AnimatedCard>
  )
}

const LottieAnimation: React.FC = () => (
  <Suspense
    fallback={
      <div className="w-full h-96 bg-gray-800/30 rounded-lg animate-pulse flex items-center justify-center">
        <div className="text-gray-500">Loading animation...</div>
      </div>
    }
  >
    <DotLottieReact
      src={LOTTIE_URL}
      loop
      autoplay
      className="w-full h-auto max-h-96"
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  </Suspense>
)

const HeroSection: React.FC<{
  heroRef: React.RefObject<HTMLDivElement>
  heroTextY: any
  heroLottieY: any
  heroBgY: any
  heroBgOpacity: any
}> = ({ heroRef, heroTextY, heroLottieY, heroBgY, heroBgOpacity }) => (
  <section ref={heroRef} className="relative w-full h-screen flex items-center justify-center overflow-hidden">
    <motion.div
      style={{ y: heroBgY, opacity: heroBgOpacity }}
      className="absolute inset-0 bg-purple-900/80 rounded-3xl m-6 bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat
      "
    />

    <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        {/* Text Content */}
        <motion.div style={{ y: heroTextY }} className="text-center md:text-left">
          <motion.div initial="hidden" animate="visible" variants={HERO_TEXT_VARIANTS}>
            <Badge
              variant="outline"
              className="mb-6 border-purple-400/50 bg-purple-900/20 text-purple-300 backdrop-blur-sm hover:bg-purple-900/30 transition-colors"
            >
              <Activity className="h-3 w-3 mr-2" />
              Powered by Solana & Pyth Network
            </Badge>

            <Text3D>
              <h1 className="text-5xl lg:text-7xl font-bold text-white nasa leading-tight">
                The Future of
                <br />
                Decentralized Lending
              </h1>
            </Text3D>

            <p className="text-lg text-gray-400 max-w-xl mx-auto md:mx-0 mt-6 mb-10 leading-relaxed">
              A secure and transparent DeFi protocol for efficient lending and borrowing. Mint DSC stablecoin or provide
              liquidity to earn yield.
            </p>
          </motion.div>
        </motion.div>

        {/* Lottie Animation */}
        <motion.div style={{ y: heroLottieY }} className="w-full max-w-md mx-auto md:max-w-full">
          <LottieAnimation />
        </motion.div>
      </div>
    </div>
  </section>
)

const MainFeaturesSection: React.FC<{ navigate: ReturnType<typeof useNavigate> }> = ({ navigate }) => (
  <section className="max-w-7xl mx-auto px-6 py-24">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
      <ActionCard
        icon={PiggyBank}
        title="Mint DSC Stablecoin"
        description="Deposit crypto assets as collateral and mint DSC stablecoin up to 50% of your deposit value."
        buttonText="Start Borrowing"
        buttonColor="purple"
        onClick={() => navigate('/deposit')}
      />

      <ActionCard
        icon={TrendingUp}
        title="Provide Liquidity"
        description="Earn interest on your deposits from borrowing fees paid by DSC minters."
        buttonText="Start Earning"
        buttonColor="green"
        onClick={() => navigate('/liquidity')}
        delay={0.2}
      />
    </div>
  </section>
)

const ProtocolFeaturesSection: React.FC = () => (
  <section className="max-w-7xl mx-auto px-6 py-24">
    <div className="text-center mb-16">
      <h2 className="text-4xl font-bold text-white mb-4">Built for Trust and Performance</h2>
      <p className="text-lg text-gray-500">Core principles that make Credix secure and reliable.</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {FEATURES.map((feature, index) => (
        <FeatureCard key={index} {...feature} />
      ))}
    </div>
  </section>
)

const ContractInfoSection: React.FC = () => (
  <section className="max-w-7xl mx-auto px-6 py-24 space-y-16">
    <AnimatedCard className="bg-gray-900/50 border-gray-800 hover:border-purple-500/30 transition-colors">
      <CardHeader>
        <CardTitle className="text-white text-2xl font-semibold">Explore On-Chain</CardTitle>
        <CardDescription className="text-gray-400">
          Our protocol is transparent and verifiable on the Solana blockchain.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6">
        <ExplorerLink
          className="block p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:bg-gray-800 hover:border-purple-500 transition-all duration-200"
          label="Credix Program ID"
          path={`address/${Interest_PROGRAM_ID}`}
        />
        <ExplorerLink
          className="block p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:bg-gray-800 hover:border-purple-500 transition-all duration-200"
          label="DSC Stablecoin Mint"
          path={`address/${STABLECOIN_MINT}`}
        />
      </CardContent>
    </AnimatedCard>

    <AnimatedCard className="bg-gray-900/50 border-gray-800 hover:border-purple-500/30 transition-colors">
      <CardHeader>
        <CardTitle className="text-white text-2xl">Engine Parameters</CardTitle>
        <CardDescription className="text-gray-400">Displaying current engine configuration values.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <StartEngineDisplayOnly />
      </CardContent>
    </AnimatedCard>
  </section>
)

// Main Component
const Index: React.FC = () => {
  const navigate = useNavigate()
  const heroRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })

  // Memoize transform values to prevent unnecessary recalculations
  const heroTextY = useTransform(scrollYProgress, [0, 1], ['0%', '20%'])
  const heroLottieY = useTransform(scrollYProgress, [0, 1], ['0%', '55%'])
  const heroBgY = useTransform(scrollYProgress, [0, 1], ['0%', '50%'])
  const heroBgOpacity = useTransform(scrollYProgress, [0, 1], [1, 0])

  return (
    <div className="w-full bg-gray-950 text-white overflow-x-hidden">
      <HeroSection
        heroRef={heroRef}
        heroTextY={heroTextY}
        heroLottieY={heroLottieY}
        heroBgY={heroBgY}
        heroBgOpacity={heroBgOpacity}
      />

      <MainFeaturesSection navigate={navigate} />
      <ProtocolFeaturesSection />
      <ContractInfoSection />
    </div>
  )
}

export default Index