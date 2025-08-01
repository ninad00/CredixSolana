import { useEffect, useState, useCallback } from 'react'
import { useAnchorWallet } from '@solana/wallet-adapter-react'
import { fetchAllConfigsOnChain } from './fetchallaccounts.tsx'
import { getProgram } from '../../../anchor/src/source.ts'
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { TokenIcon } from '../common/TokenIcon'
import { fetchTokenMetadata } from '../../utils/tokenUtils'
import BN from 'bn.js'
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token'
import { AnchorProvider } from '@coral-xyz/anchor'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {  AlertCircle, CheckCircle, DatabaseZap, Loader2 } from 'lucide-react'

// --- Interfaces ---

interface TokenMetadata {
  name: string
  symbol: string
  logoURI?: string
  decimals: number
  address: string
}

interface Config {
  publicKey: string
  tokenMint: string
  totalLiq: string
  totalCollected: string
  vault: string
  authority: string
  bump: number
}
interface DepositAmounts {
  [tokenMint: string]: BN
}
interface TransactionStates {
  [tokenMint: string]: {
    isLoading: boolean
    txSig: string | null
    error: {
      Logs: string[]
    } | null
  }
}

// --- Constants ---
const TOKEN_DECIMALS = 6

// --- Helper Functions ---
const formatTokenAmount = (amount: string | BN): string => {
  try {
    const bn = typeof amount === 'string' ? new BN(amount) : amount
    const divisor = new BN(10).pow(new BN(TOKEN_DECIMALS))
    const quotient = bn.div(divisor)
    const remainder = bn.mod(divisor)
    if (remainder.isZero()) {
      return quotient.toString()
    }
    const remainderStr = remainder.toString().padStart(TOKEN_DECIMALS, '0').replace(/0+$/, '')
    return `${quotient.toString()}.${remainderStr}`
  } catch (error) {
    return '0'
  }
}

const parseAmountInput = (value: string): BN | null => {
  if (!value) return new BN(0)
  try {
    const parts = value.split('.')
    const integerPart = new BN(parts[0] || 0)
    let fractionalPart = new BN(0)
    if (parts[1]) {
      const fractionalStr = parts[1].slice(0, TOKEN_DECIMALS).padEnd(TOKEN_DECIMALS, '0')
      fractionalPart = new BN(fractionalStr)
    }
    const multiplier = new BN(10).pow(new BN(TOKEN_DECIMALS))
    return integerPart.mul(multiplier).add(fractionalPart)
  } catch (error) {
    return null
  }
}

const formatTokenMint = (tokenMint: string) => `${tokenMint.slice(0, 4)}...${tokenMint.slice(-4)}`

// --- UI Components ---
const LoadingSkeleton = () => (
  <div className="space-y-6">
    {[...Array(2)].map((_, i) => (
      <div key={i} className="bg-gray-900/50 border-gray-800 rounded-xl p-6 space-y-4 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-1/2"></div>
        <div className="h-20 bg-gray-700 rounded"></div>
        <div className="h-12 bg-gray-700 rounded"></div>
      </div>
    ))}
  </div>
)

const EmptyState = () => (
  <div className="text-center py-24">
    <div className="mx-auto w-16 h-16 bg-gray-900 border-2 border-gray-800 rounded-full flex items-center justify-center mb-4">
      <DatabaseZap className="h-8 w-8 text-gray-600" />
    </div>
    <h3 className="text-xl font-semibold text-white">No Configurations Found</h3>
    <p className="text-gray-500 mt-2">The protocol configurations have not been set up yet.</p>
  </div>
)

// --- Main Component ---
export default function ConfigList() {
  const wallet = useAnchorWallet()
  const [configs, setConfigs] = useState<Config[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [depositAmounts, setDepositAmounts] = useState<DepositAmounts>({})
  const [transactionStates, setTransactionStates] = useState<TransactionStates>({})
  const [error, setError] = useState<string | null>(null)
  const [tokenMetadataMap, setTokenMetadataMap] = useState<Record<string, TokenMetadata>>({})
  const [prices, setPrices] = useState<Record<string, number>>({})

  const updateTransactionState = useCallback((tokenMint: string, updates: Partial<TransactionStates[string]>) => {
    setTransactionStates((prev) => ({ ...prev, [tokenMint]: { ...prev[tokenMint], ...updates } }))
  }, [])

  const getTransactionState = useCallback(
    (tokenMint: string) => {
      return transactionStates[tokenMint] || { isLoading: false, txSig: null, error: null }
    },
    [transactionStates],
  )

  const GiveLiquidity = async (config: Config) => {
    if (!wallet?.publicKey || !wallet.signTransaction) return
    const program = getProgram(wallet)
    if (!program) return
    const depositAmount = depositAmounts[config.tokenMint]
    if (!depositAmount || depositAmount.isZero()) {
      updateTransactionState(config.tokenMint, { error: 'Please enter a valid amount' })
      return
    }
    updateTransactionState(config.tokenMint, { isLoading: true, error: null, txSig: null })
    const takerPublicKey = wallet.publicKey
    const tokenMint = new PublicKey(config.tokenMint)
    const configPublicKey = new PublicKey(config.publicKey)
    try {
      const vaultATA = await getAssociatedTokenAddress(tokenMint, configPublicKey, true)
      const userTokenAccount = await getAssociatedTokenAddress(tokenMint, takerPublicKey)
      const [liq_depositPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('liq_deposit'), takerPublicKey.toBuffer(), tokenMint.toBuffer()],
        program.programId,
      )
      const [lp_dataPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('lp'), takerPublicKey.toBuffer(), tokenMint.toBuffer()],
        program.programId,
      )
      const connection = (program.provider as AnchorProvider).connection
      const userTokenAccountInfo = await connection.getAccountInfo(userTokenAccount)
      if (!userTokenAccountInfo) {
        const ix = createAssociatedTokenAccountInstruction(takerPublicKey, userTokenAccount, takerPublicKey, tokenMint)
        const tx = new Transaction().add(ix)
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized')
        tx.recentBlockhash = blockhash
        tx.lastValidBlockHeight = lastValidBlockHeight
        tx.feePayer = wallet.publicKey
        const signedTx = await wallet.signTransaction(tx)
        const sig = await connection.sendRawTransaction(signedTx.serialize())
        await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature: sig })
      }
      const transaction = await program.methods
        .giveLiquidity(depositAmount)
        .accountsStrict({
          user: wallet.publicKey,
          tokenMint,
          userTokenAccount,
          lpData: lp_dataPDA,
          liqDeposit: liq_depositPDA,
          config: configPublicKey,
          vault: vaultATA,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .transaction()
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized')
      transaction.recentBlockhash = blockhash
      transaction.lastValidBlockHeight = lastValidBlockHeight
      transaction.feePayer = wallet.publicKey
      const signedTx = await wallet.signTransaction(transaction)
      const sig = await connection.sendRawTransaction(signedTx.serialize())
      await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature: sig })
      updateTransactionState(config.tokenMint, { isLoading: false, txSig: sig, error: null })
      setDepositAmounts((prev) => ({ ...prev, [config.tokenMint]: new BN(0) }))
      try {
        const updatedConfigs = await fetchAllConfigsOnChain(wallet)
        setConfigs(updatedConfigs)
      } catch (e) {
        console.error('Failed to refresh configs:', e)
      }
    } catch (error) {
      console.error('Transaction failed:', error)
      let errorMessage = 'Transaction failed'
      if (error && typeof error === 'object' && 'logs' in error && Array.isArray(error.logs)) {
        const logs = error.logs as string[]
        if (logs.some((log) => log.includes('insufficient funds'))) {
          errorMessage = 'Insufficient token balance. Please check your wallet balance.'
        } else if (logs.some((log) => log.includes('custom program error'))) {
          errorMessage = 'Transaction failed. Please try again or check your inputs.'
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      updateTransactionState(config.tokenMint, {
        isLoading: false,
        error: { Logs: [errorMessage] },
      })
    }
  }

  const handleAmountChange = (tokenMint: string, value: string) => {
    const parsedAmount = parseAmountInput(value)
    if (parsedAmount !== null) {
      setDepositAmounts((prev) => ({ ...prev, [tokenMint]: parsedAmount }))
    }
    updateTransactionState(tokenMint, { error: null })
  }

  // Load token metadata for all configs
  useEffect(() => {
    console.log(
      'Configs changed, loading metadata for:',
      configs.map((c) => ({
        mint: c.tokenMint,
        name: tokenMetadataMap[c.tokenMint]?.name || 'Not loaded',
      })),
    )

    const loadTokenMetadata = async () => {
      const metadataMap: Record<string, TokenMetadata> = {}
      const tokensToFetch = configs.filter((config) => !tokenMetadataMap[config.tokenMint])

      console.log(
        `Fetching metadata for ${tokensToFetch.length} tokens:`,
        tokensToFetch.map((t) => t.tokenMint.slice(0, 4) + '...' + t.tokenMint.slice(-4)),
      )

      try {
        const results = await Promise.allSettled(
          tokensToFetch.map((config) =>
            fetchTokenMetadata(config.tokenMint).then((metadata) => ({ tokenMint: config.tokenMint, metadata })),
          ),
        )

        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.metadata) {
            console.log(`Fetched metadata for ${result.value.tokenMint}:`, result.value.metadata)
            metadataMap[result.value.tokenMint] = result.value.metadata
          } else if (result.status === 'rejected') {
            console.error('Error fetching token metadata:', result.reason)
          }
        })

        if (Object.keys(metadataMap).length > 0) {
          console.log('Updating token metadata map with new entries')
          setTokenMetadataMap((prev) => ({
            ...prev,
            ...metadataMap,
          }))
        } else {
          console.log('No new token metadata to update')
        }
      } catch (error) {
        console.error('Error in token metadata loading batch:', error)
      }
    }

    if (configs.length > 0) {
      loadTokenMetadata()
    }
  }, [configs, tokenMetadataMap])

  useEffect(() => {
    if (!wallet) return
    const loadConfigs = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const configsData = await fetchAllConfigsOnChain(wallet)
        setConfigs(configsData)
      } catch (e) {
        setError('Failed to load token configurations. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }
    loadConfigs()
  }, [wallet])

  if (!wallet) {
    return (
      <div className="w-full bg-gray-950 text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
          <p className="text-gray-400">Please connect your wallet to view available liquidity pools.</p>
        </div>
      </div>
    )
  }

  const listVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  }

  return (
    <div className="w-full bg-gray-950 text-white min-h-screen">
        {/* Debug overlay - remove in production */}
      <div className="fixed bottom-4 right-4 bg-black/80 p-3 rounded-lg text-xs z-50 max-w-xs">
        <div className="font-mono">
          <div>Tokens: {configs.length}</div>
          <div>Metadata: {Object.keys(tokenMetadataMap).length}</div>
          {configs.length > 0 && (
            <div className="mt-2">
              <div>First token: {configs[0].tokenMint.slice(0, 6)}...{configs[0].tokenMint.slice(-4)}</div>
              <div>Name: {tokenMetadataMap[configs[0].tokenMint]?.name || 'Loading...'}</div>
              <div>Has logo: {tokenMetadataMap[configs[0].tokenMint]?.logoURI ? '✅' : '❌'}</div>
            </div>
          )}
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white">Liquidity Pools</h1>
          <p className="text-lg text-gray-400 mt-2">Provide liquidity to earn yield from protocol fees.</p>
        </motion.div>

        {error && (
          <div className="bg-red-900/30 text-red-400 text-sm p-3 border border-red-800 rounded-md flex items-start gap-2 mb-6">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Error:</strong> {error}
            </span>
          </div>
        )}

        {isLoading ? (
          <LoadingSkeleton />
        ) : configs.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div className="space-y-6" variants={listVariants} initial="hidden" animate="visible">
            {configs.map((config) => {
              const txState = getTransactionState(config.tokenMint)
              const currentAmount = depositAmounts[config.tokenMint] || new BN(0)
              const displayAmount = formatTokenAmount(currentAmount)

              return (
                <Card key={config.publicKey} className="bg-gray-900/50 border-gray-800 overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-xl text-white flex items-center gap-3">
                      <div className='relative'>
                        <TokenIcon mintAddress={config.tokenMint} size={24} />
                        {!tokenMetadataMap[config.tokenMint]?.logoURI && (
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                            {config.tokenMint.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="break-all ml-3">
                        {tokenMetadataMap[config.tokenMint]?.name || 'Token'}
                        <span className="text-sm text-gray-400 block mt-1">
                          {tokenMetadataMap[config.tokenMint]?.symbol || 'TOKEN'}
                          {prices[config.tokenMint] > 0 && (
                            <span className="ml-2 text-green-400">
                              (${(prices[config.tokenMint] / 1e4).toFixed(4)})
                            </span>
                          )}
                        </span>
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-900 border border-gray-800 rounded-lg p-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-gray-400">Total Liquidity</span>
                        <span className="font-mono text-lg text-white">{formatTokenAmount(config.totalLiq)}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-gray-400">Fees Collected</span>
                        <span className="font-mono text-lg text-green-400">
                          {formatTokenAmount(config.totalCollected)}
                        </span>
                      </div>
                    </div>

                    <div className="relative">
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        value={displayAmount === '0' ? '' : displayAmount}
                        placeholder="0.00"
                        onChange={(e) => handleAmountChange(config.tokenMint, e.target.value)}
                        disabled={txState.isLoading}
                        className="bg-gray-800 border-gray-700 h-12 text-lg pr-40"
                      />
                      <Button
                        className="absolute top-1.5 right-1.5 h-9 bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => GiveLiquidity(config)}
                        disabled={txState.isLoading || currentAmount.isZero()}
                      >
                        {txState.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Provide Liquidity'}
                      </Button>
                    </div>

                    <AnimatePresence>
                      {txState.error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-red-900/30 text-red-400 text-sm p-3 border border-red-800 rounded-md flex items-start gap-2"
                        >
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>
                            <strong>Error:</strong> {txState.error.Logs[0]}
                          </span>
                        </motion.div>
                      )}
                      {txState.txSig && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-green-900/30 text-green-400 text-sm p-3 border border-green-800 rounded-md flex items-start gap-2"
                        >
                          <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div className="flex-grow">
                            <strong>Success:</strong>
                            <a
                              href={`https://explorer.solana.com/tx/${txState.txSig}?cluster=devnet`}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-2 text-purple-400 hover:text-purple-300 underline break-all"
                            >
                              View Transaction
                            </a>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              )
            })}
          </motion.div>
        )}
      </div>
    </div>
  )
}
