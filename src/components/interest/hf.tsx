import { PublicKey } from "@solana/web3.js";
import { getPriceForMint } from "../providers/tp";
import BN, { max } from "bn.js";
import { Program } from "@coral-xyz/anchor";
import { Interest } from "anchor/src/source";

export async function uploadHf(taker: PublicKey, tokenMint: PublicKey
    , program: Program<Interest>) {
    const [userPDA] = PublicKey.findProgramAddressSync([Buffer.from("user"), taker.toBuffer(), tokenMint.toBuffer()], program.programId);
    const userAccount = await program.account.userData.fetch(userPDA);
    const borrowedAmount = userAccount.borrowedAmount.toNumber();
    if (borrowedAmount == 0) {
        return new BN("18446744073709551615");
    }
    const tokens = userAccount.tokenBalance.toNumber();
    const token = userAccount.primaryToken.toString();
    const priceusd_scaled = (await getPriceForMint(token)).toNumber();
    const priceusd = priceusd_scaled / 10000;
    const hf = ((tokens) * (priceusd)) / ((borrowedAmount) * 2);
    const hf_to_upload = new BN(hf * (1000000));
    return hf_to_upload;
}
