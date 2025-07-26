import * as anchor from '@coral-xyz/anchor';
import {
  ProgramTestContext,
  startAnchor,
  BanksClient,
} from 'solana-bankrun';
import { BankrunProvider } from 'anchor-bankrun';
import {
  PublicKey,
  SystemProgram,
  Keypair,
  Transaction,
} from '@solana/web3.js';
import { beforeEach, it, describe } from 'node:test';
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { BN, Program } from '@coral-xyz/anchor';
import { Buffer } from 'buffer';
import { Interest } from '../target/types/interest';
import { createMint, mintTo } from 'spl-token-bankrun';

const IDL = require('../target/idl/interest.json');
const programId = new PublicKey('J4bfWKCuz2J1gzbwhosrhRV5Q1bQATjvAmnzP7SMYptY');

describe('Interest Program', () => {
  let context;
  let provider;
  let program: Program<Interest>;
  let banksClient: BanksClient;

  let user: Keypair;
  let userATA: PublicKey;
  let vaultATA: PublicKey;
  let configPDA: PublicKey;
  let collateralPDA: PublicKey;
  let pricePDA: PublicKey;
  let userPDA: PublicKey;
  let depositPDA: PublicKey;
  let enginePDA: PublicKey;
  let mint: PublicKey;
  let dscMint: PublicKey;
  let userDSCAccount: PublicKey;

  async function initializeConfig() {
    await program.methods
      .startToken(new BN(100_000_000))
      .accountsStrict({
        config: configPDA,
        price: pricePDA,
        tokenMint: mint,
        vault: vaultATA,
        admin: user.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();
  }

  async function startEngine() {
    const liqThresh = new BN(50);
    const healthFac = new BN(1);
    const liqBonus = new BN(10);
    const feePercent = new BN(8);

    await program.methods
      .startEngine(liqThresh, healthFac, liqBonus, feePercent)
      .accountsStrict({
        engine: enginePDA,
        authority: user.publicKey,
        dscMint: dscMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();
  }

  async function createUserDSCAccount() {
    const ataIx = createAssociatedTokenAccountInstruction(
      user.publicKey,
      userDSCAccount,
      user.publicKey,
      dscMint
    );

    const tx = new Transaction().add(ataIx);
    tx.feePayer = user.publicKey;
    tx.recentBlockhash = context.lastBlockhash;
    tx.sign(user);
    await banksClient.processTransaction(tx);
  }

  async function depositCollateral() {
    await program.methods
      .depositCollateral(new BN(100_000_000))
      .accountsStrict({
        user: user.publicKey,
        tokenMint: mint,
        userTokenAccount: userATA,
        userData: userPDA,
        deposit: depositPDA,
        config: configPDA,
        vault: vaultATA,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();
  }

  beforeEach(async () => {
    user = Keypair.generate();

    context = await startAnchor(
      '',
      [{ name: 'interest', programId }],
      [
        {
          address: user.publicKey,
          info: {
            lamports: 1_000_000_000,
            data: new Uint8Array(Buffer.alloc(0)),
            owner: SystemProgram.programId,
            executable: false,
          },
        },
      ]
    );

    provider = new BankrunProvider(context);
    anchor.setProvider(provider);
    program = new Program<Interest>(IDL as Interest, provider);
    banksClient = context.banksClient;
    mint = await createMint(banksClient, user, user.publicKey, null, 6);

    [enginePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('engine')],
      program.programId
    );

    dscMint = await createMint(banksClient, user, enginePDA, null, 6);
    await startEngine();

    [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('config'), mint.toBuffer()],
      program.programId
    );

    [userPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('user'), user.publicKey.toBuffer(), mint.toBuffer()],
      program.programId
    );

    [depositPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('deposit'), user.publicKey.toBuffer(), mint.toBuffer()],
      program.programId
    );

    [pricePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('price'), mint.toBuffer()],
      program.programId
    );

    [collateralPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('collateral'), user.publicKey.toBuffer()],
      program.programId
    );

    vaultATA = await getAssociatedTokenAddress(
      mint,
      configPDA,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    userATA = await getAssociatedTokenAddress(
      mint,
      user.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    userDSCAccount = await getAssociatedTokenAddress(
      dscMint,
      user.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const ataIx = createAssociatedTokenAccountInstruction(
      user.publicKey,
      userATA,
      user.publicKey,
      mint
    );

    const tx = new Transaction().add(ataIx);
    tx.feePayer = user.publicKey;
    tx.recentBlockhash = context.lastBlockhash;
    tx.sign(user);
    await banksClient.processTransaction(tx);

    await mintTo(
      banksClient,
      user,
      mint,
      userATA,
      user.publicKey,
      5_000_000_000
    );
  });

  it('initializes token config', async () => {
    await initializeConfig();
    const config = await program.account.config.fetch(configPDA);
    console.log('Config created:', config);
  });

  it('starts engine (already done in beforeEach)', async () => {
    const engine = await program.account.engine.fetch(enginePDA);
    console.log('Engine verified:', engine);
  });

  it('deposits collateral', async () => {
    await initializeConfig();
    await depositCollateral();

    const deposit = await program.account.deposit.fetch(depositPDA);
    console.log('Collateral deposited:', deposit);
  });

  it('checks health factor before minting DSC', async () => {
    await initializeConfig();
    await depositCollateral();
    await createUserDSCAccount();

    try {
      await program.methods
        .mintDsc(new BN(1_000), new BN(100_000_000))
        .accountsStrict({
          engine: enginePDA,
          userData: userPDA,
          tokenMint: mint,
          user: user.publicKey,
          dscMint: dscMint,
          deposit: depositPDA,
          config: configPDA,
          price: pricePDA,
          userDscAccount: userDSCAccount,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();

      console.log('✓ Small DSC mint successful');
    } catch (error) {
      console.log('✗ Small DSC mint failed:', error.message);
    }
  });

  it('mints DSC', async () => {
    await initializeConfig();
    await depositCollateral();
    await createUserDSCAccount();

    await program.methods
      .mintDsc(new BN(10_000), new BN(100_000_000))
      .accountsStrict({
        engine: enginePDA,
        userData: userPDA,
        tokenMint: mint,
        user: user.publicKey,
        dscMint: dscMint,
        deposit: depositPDA,
        config: configPDA,
        price: pricePDA,
        userDscAccount: userDSCAccount,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    console.log('DSC minted successfully.');
    const userDscBalance = await banksClient.getAccount(userDSCAccount);
    console.log('User DSC account balance:', userDscBalance);
  });

  it('full workflow: config -> engine -> deposit -> mint DSC', async () => {
    await initializeConfig();
    await depositCollateral();
    await createUserDSCAccount();

    await program.methods
      .mintDsc(new BN(10_000), new BN(100_000_000))
      .accountsStrict({
        engine: enginePDA,
        userData: userPDA,
        tokenMint: mint,
        user: user.publicKey,
        dscMint: dscMint,
        deposit: depositPDA,
        config: configPDA,
        price: pricePDA,
        userDscAccount: userDSCAccount,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();
  });

  it('withdraws collateral', async () => {
    await initializeConfig();
    await depositCollateral();
    await createUserDSCAccount();

    await program.methods
      .mintDsc(new BN(5_000000), new BN(100_000_000))
      .accountsStrict({
        engine: enginePDA,
        userData: userPDA,
        tokenMint: mint,
        user: user.publicKey,
        dscMint: dscMint,
        deposit: depositPDA,
        config: configPDA,
        price: pricePDA,
        userDscAccount: userDSCAccount,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    const initialDeposit = await program.account.deposit.fetch(depositPDA);

    const withdrawAmount = new BN(1_000_000);
    const currentPrice = new BN(100_000_000);

    await program.methods
      .withdrawCollateral(withdrawAmount, currentPrice)
      .accountsStrict({
        user: user.publicKey,
        userData: userPDA,
        engine: enginePDA,
        tokenMint: mint,
        dscMint: dscMint,
        deposit: depositPDA,
        price: pricePDA,
        config: configPDA,
        vault: vaultATA,
        userTokenAccount: userATA,
        userDscAccount: userDSCAccount,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    const finalDeposit = await program.account.deposit.fetch(depositPDA);
    const expectedFinalAmount = initialDeposit.tokenAmt.sub(withdrawAmount);

    if (finalDeposit.tokenAmt.eq(expectedFinalAmount)) {
      console.log('✓ Collateral withdrawal successful');
    } else {
      console.log('✗ Collateral withdrawal amount mismatch');
    }
  });
});
