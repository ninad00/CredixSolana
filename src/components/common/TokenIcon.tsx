// src/components/TokenIcon.tsx

import { useEffect, useState, useMemo } from 'react';
import { fetchTokenMetadata, getFallbackTokenLogo } from '../../utils/tokenUtils';
import { TokenMetadata } from '../../lib/known-tokens';

interface TokenIconProps {
  mintAddress: string;
  size?: number;
  className?: string;
}

export const TokenIcon = ({ mintAddress, size = 24, className = '' }: TokenIconProps) => {
  const [metadata, setMetadata] = useState<TokenMetadata | null>(null);
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    // Reset state when mintAddress changes
    setMetadata(null);
    setHasImageError(false);

    if (!mintAddress) return;

    const loadTokenData = async () => {
      const data = await fetchTokenMetadata(mintAddress);
      setMetadata(data);
    };

    loadTokenData();
  }, [mintAddress]);

  // Generate a fallback logo only when needed and memoize it.
  const fallbackLogo = useMemo(() => {
    if (!metadata) return '';
    return getFallbackTokenLogo(metadata.symbol, size);
  }, [metadata, size]);

  // Show a loading skeleton while metadata is being fetched.
  if (!metadata) {
    return (
      <div
        className={`bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  const showFallback = !metadata.logoURI || hasImageError;

  return (
    <img
      src={showFallback ? fallbackLogo : metadata.logoURI}
      alt={metadata.symbol}
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
      onError={() => {
        if (!hasImageError) {
          setHasImageError(true);
        }
      }}
    />
  );
};