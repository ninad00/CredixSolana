// src/utils/tokenUtils.ts

import { TokenMetadata, knownTokens } from '../lib/known-tokens';

// --- OPTIMIZATION: Use the 'strict' list which is smaller and faster ---
const JUPITER_TOKEN_LIST_URL = 'https://token.jup.ag/strict';

// --- OPTIMIZATION: Pre-populate the cache with our known tokens ---
let tokenCache: Map<string, TokenMetadata> = new Map(knownTokens);
let hasFetchedList = false;

export const fetchTokenMetadata = async (mintAddress: string): Promise<TokenMetadata | null> => {
  // 1. Check the cache first (already includes known tokens)
  if (tokenCache.has(mintAddress)) {
    return tokenCache.get(mintAddress)!;
  }

  // 2. If not in cache and we haven't fetched the list yet, fetch it.
  if (!hasFetchedList) {
    try {
      console.log('Fetching strict token list from Jupiter...');
      const response = await fetch(JUPITER_TOKEN_LIST_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch token list: ${response.statusText}`);
      }
      const remoteTokenList: TokenMetadata[] = await response.json();
      hasFetchedList = true;

      // Populate cache with the fetched list
      remoteTokenList.forEach(token => {
        if (!tokenCache.has(token.address)) {
          tokenCache.set(token.address, token);
        }
      });
    } catch (error) {
      console.error('Error fetching remote token list:', error);
      // Don't throw, we can still return fallbacks
    }
  }
  
  // 3. Check cache again after potential fetch
  if (tokenCache.has(mintAddress)) {
    return tokenCache.get(mintAddress)!;
  }

  // 4. If still not found, return a fallback
  console.log(`No metadata found for mint address: ${mintAddress}`);
  return {
    name: 'Unknown Token',
    symbol: mintAddress.slice(0, 4) + '..',
    address: mintAddress,
    decimals: 6, // A common default for Solana tokens
    logoURI: undefined,
  };
};

// Helper function to get a fallback logo for unknown tokens (Unchanged)
export const getFallbackTokenLogo = (symbol: string, size: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const colors = ['#06b6d4', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
    const colorIndex = (symbol.charCodeAt(0) || 0) % colors.length;

    ctx.fillStyle = colors[colorIndex];
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    const fontSize = Math.max(10, size / 2);
    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol.charAt(0).toUpperCase(), size / 2, size / 2 + 1); // Slight offset for better vertical centering
  }

  return canvas.toDataURL();
};