import { AppProviders } from '@/components/app-providers.tsx'
import { AppLayout } from '@/components/app-layout.tsx'
import { HashRouter as Router, useRoutes } from 'react-router-dom'
import { Suspense, lazy, useMemo } from 'react'
import { ConnectionProvider } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { clusterApiUrl } from '@solana/web3.js'
import './index.css'
import { FullPageLoading } from './components/FullPageLoading'
import { LoadingSpinner } from './components/LoadingSpinner'

const LazyAccountIndex = lazy(() => import('./Index'))
const LazyDeposit = lazy(() => import('@/components/interest/depositToken'))
const LazyDepositList = lazy(() => import('@/components/interest/mint&withdraw'))
const LazyLiquidity = lazy(() => import('@/components/interest/giveLiquidity'))
const LazyclaimLiquidity = lazy(() => import('@/components/interest/withdrawLiq'))
const LazyLiquidate = lazy(() => import('@/components/interest/liquidate'))
const LazyHistory = lazy(() => import('@/components/interest/transaction'))
const NotFound = lazy(() => import('./components/Not-Found'))

const links = [
  { label: 'Home', path: '/' },
  { label: 'Deposit Token', path: '/deposit' },
  { label: 'Your Deposits', path: '/depositList' },
  { label: 'Provide Liquidity', path: '/liquidity' },
  { label: 'Claim Liquidity', path: '/claimliquidity' },
  { label: 'Liquidate', path: '/liquidate' },
  { label: 'History', path: '/history' },
];

const routes = [
  {
    path: '/',
    element: (
      <Suspense fallback={<FullPageLoading />}>
        <LazyAccountIndex />
      </Suspense>
    ),
    index: true,
  },
  {
    path: 'deposit',
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <LazyDeposit />
      </Suspense>
    ),
  },
  {
    path: 'depositList',
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <LazyDepositList />
      </Suspense>
    ),
  },
  {
    path: 'liquidity',
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <LazyLiquidity />
      </Suspense>
    ),
  },
  {
    path: 'claimliquidity',
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <LazyclaimLiquidity />
      </Suspense>
    ),
  },
  {
    path: 'liquidate',
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <LazyLiquidate />
      </Suspense>
    ),
  },
  {
    path: 'history',
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <LazyHistory />
      </Suspense>
    ),
  },
  {
    path: '*',
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <NotFound />
      </Suspense>
    ),
  },
]

function AppRoutes() {
  const router = useRoutes(routes)
  return router
}

export function App() {
  const network = WalletAdapterNetwork.Devnet
  const endpoint = useMemo(() => clusterApiUrl(network), [network])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <AppProviders>
        <Router>
          <AppLayout links={links}>
            <AppRoutes />
          </AppLayout>
        </Router>
      </AppProviders>
    </ConnectionProvider>
  )
}