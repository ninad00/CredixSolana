import { HermesClient } from "@pythnetwork/hermes-client";
import { DSC_MINT } from "anchor/src/source";
import BN from "bn.js";

// --- Static Mappings ---
const SOL_PRICE_FEED_ID =
    "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";
const ETH_PRICE_FEED_ID =
    "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace";
const EURC_PRICE_FEED_ID =
    "0x76fa85158bf14ede77087fe3ae472f66213f6ea2f5b411cb2de472794990fa5c";
const USDC_PRICE_FEED_ID =
    "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a";

const mintToPriceFeedMap: Record<string, string> = {
    "So11111111111111111111111111111111111111112": SOL_PRICE_FEED_ID,
    "2pFfLkkVjhQqz3Xb7j5dNQaiX3CbzJXqkM5JXWhzK2i4": ETH_PRICE_FEED_ID,
    "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr": EURC_PRICE_FEED_ID,
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU": USDC_PRICE_FEED_ID,
};

const HARDCODED_MINTS: Record<string, BN> = {
    "EyF4B3dcWnahy4VAKU54b2MbDdTRboF6LUBpTjaRbqGZ": new BN(10000), // for demo
};

export async function getPriceForMint(mint: string): Promise<BN> {
    // Return hardcoded if exists
    if (HARDCODED_MINTS[mint]) {
        return HARDCODED_MINTS[mint];
    }

    const feedId = mintToPriceFeedMap[mint];
    if (!feedId) {
        throw new Error(`No price feed ID mapped for mint: ${mint}`);
    }

    const client = new HermesClient("https://hermes.pyth.network", {});
    const update = await client.getLatestPriceUpdates([feedId]);

    const normalizedFeedId = feedId.toLowerCase().replace(/^0x/, "");
    const feed = update.parsed?.find((f) => f.id === normalizedFeedId);

    if (!feed) {
        throw new Error("Price feed not found in response");
    }

    const rawPrice = new BN(feed.price.price);
    const expo = feed.price.expo;

    const scale = new BN(10_000);
    let scaledPrice: BN;

    if (expo < 0) {
        const divisor = new BN(10).pow(new BN(-expo));
        scaledPrice = rawPrice.mul(scale).div(divisor);
    } else {
        const multiplier = new BN(10).pow(new BN(expo));
        scaledPrice = rawPrice.mul(scale).mul(multiplier);
    }

    return scaledPrice;
}

export async function runAllPrices(): Promise<Record<string, string>> {
    const prices: Record<string, string> = {};

    const allMints = [...Object.keys(mintToPriceFeedMap), ...Object.keys(HARDCODED_MINTS)];

    for (const mint of allMints) {
        try {
            const priceBN = await getPriceForMint(mint);
            const formatted = (priceBN.toNumber() / 10_000).toFixed(4);
            console.log(`${mint}: ${formatted}`);
            prices[mint] = formatted;
        } catch (err) {
            console.error(`Error getting price for ${mint}:`, err);
            prices[mint] = "Error";
        }
    }

    return prices;
}

runAllPrices().catch(console.error);
