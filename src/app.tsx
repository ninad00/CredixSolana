import { AppProviders } from '@/components/app-providers.tsx';
import { AppLayout } from '@/components/app-layout.tsx';
import { RouteObject, useRoutes } from 'react-router';
import { lazy, Suspense, useMemo } from 'react';
import { ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';
import './index.css';


const LazyAccountIndex = lazy(() => import('./Index'));
// const LazyAccountDetail = lazy(() => import('@/components/account/account-detail-feature'));
// const LazyDashboard = lazy(() => import('@/components/dashboard/dashboard-feature'));
const LazyInterest = lazy(() => import('@/components/interest/interest-feature'));
const LazyDeposit = lazy(() => import('@/components/interest/depositToken'));
const LazyDepositList = lazy(() => import('@/components/interest/mint&withdraw'));
const LazyLiquidity = lazy(() => import('@/components/interest/giveLiquidity'));
const LazyclaimLiquidity = lazy(() => import('@/components/interest/withdrawLiq'));
const LazyLiquidate = lazy(() => import('@/components/interest/liquidate'));
const LazyHistory = lazy(() => import('@/components/interest/transaction'));
const NotFound = lazy(() => import('./components/Not-Found'));

const links = [
  { label: 'Home', path: '/' },
  { label: 'Interest Program', path: '/interest' },
  { label: 'Deposit Token', path: '/deposit' },
  { label: 'Your Deposits', path: '/depositList' },
  { label: 'Provide Liquidity', path: '/liquidity' },
  { label: 'Claim Liquidity', path: '/claimliquidity' },
  { label: 'Liquidate', path: '/liquidate' },
  { label: 'History', path: '/history' },
];

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Suspense fallback={<div>Loading...</div>}><LazyAccountIndex /></Suspense>,
    index: true,
  },
  // {
  //   path: 'account',
  //   children: [
  //     {
  //       index: true,
  //       element: <Suspense fallback={<div>Loading...</div>}><LazyAccountIndex /></Suspense>,
  //     },
  //     {
  //       path: ':address',
  //       element: <Suspense fallback={<div>Loading...</div>}><LazyAccountDetail /></Suspense>,
  //     },
  //   ],
  // },
  {
    path: 'interest',
    element: <Suspense fallback={<div>Loading...</div>}><LazyInterest /></Suspense>,
  },
  {
    path: 'deposit',
    element: <Suspense fallback={<div>Loading...</div>}><LazyDeposit /></Suspense>,
  },
  {
    path: 'depositList',
    element: <Suspense fallback={<div>Loading...</div>}><LazyDepositList /></Suspense>,
  },
  {
    path: 'liquidity',
    element: <Suspense fallback={<div>Loading...</div>}><LazyLiquidity /></Suspense>,
  },
  {
    path: 'claimliquidity',
    element: <Suspense fallback={<div>Loading...</div>}><LazyclaimLiquidity /></Suspense>,
  },
  {
    path: 'liquidate',
    element: <Suspense fallback={<div>Loading...</div>}><LazyLiquidate /></Suspense>,
  },
  {
    path: 'history',
    element: <Suspense fallback={<div>Loading...</div>}><LazyHistory /></Suspense>,
  },
  {
    path: '*',
    element: <Suspense fallback={<div>Loading...</div>}><NotFound /></Suspense>,
  },
];


export function App() {
  const router = useRoutes(routes);

  // Solana wallet setup
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);


  return (
    <ConnectionProvider endpoint={endpoint} >
      {/* <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider> */}
      <AppProviders>
        <AppLayout links={links}>
          {router}
        </AppLayout>
      </AppProviders>
      {/* </WalletModalProvider> */}
      {/* </WalletProvider> */}
    </ConnectionProvider>
  );
}
