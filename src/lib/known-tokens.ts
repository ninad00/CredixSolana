// src/lib/known-tokens.ts

/**
 * A map of pre-defined, commonly used tokens to avoid API calls for them.
 * This provides an instant lookup for critical assets like USDC and EURC.
 */
export interface TokenMetadata {
    name: string;
    symbol: string;
    logoURI?: string;
    decimals: number;
    address: string;
  }
  
  export const knownTokens = new Map<string, TokenMetadata>([
    [
      '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // USDC Mint Address
      {
        address: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
        name: 'USD Coin',
        symbol: 'USDC',
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
        decimals: 6,
      },
    ],
    [
      'Hzxi1XGcy8mK3C2tfrn2izX2i3nB4T1G5M54S2S2FpS2', // EURC Mint Address
      {
          address: 'Hzxi1XGcy8mK3C2tfrn2izX2i3nB4T1G5M54S2S2FpS2',
          name: 'Euro Coin',
          symbol: 'EURC',
          logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Hzxi1XGcy8mK3C2tfrn2izX2i3nB4T1G5M54S2S2FpS2/logo.png',
          decimals: 6,
      }
    ],
    // Add other high-priority tokens here
  ]);