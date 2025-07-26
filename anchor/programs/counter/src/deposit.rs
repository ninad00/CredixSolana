use crate::errors::ErrorCode;
use crate::shared::*;
use crate::structs::*;

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

pub fn deposit_token(mut ctx: &mut Context<DepositToken>, amount: u64) -> Result<()> {
    let deposit = &mut ctx.accounts.deposit;
    let user_key = ctx.accounts.user.key();

    if deposit.user != Pubkey::default() && deposit.user != user_key {
        return Err(error!(ErrorCode::UnauthorizedUser));
    }

    if amount <= 0 {
        return Err(ErrorCode::AmountLessThanZero.into());
    }

    if ctx.accounts.user_data.user == Pubkey::default() {
        let user_data1 = &mut ctx.accounts.user_data;
        user_data1.user = ctx.accounts.user.key();
        user_data1.borrowed_amount = 0;
        user_data1.primary_token = ctx.accounts.token_mint.key();
        user_data1.bump = ctx.bumps.user_data;
        user_data1.hf = u64::MAX;
        user_data1.token_balance = 0;
    }

    deposit_tokens_to_vault(&ctx, amount)?;

    if ctx.accounts.deposit.token_amt == 0 {
        save_deposit(&mut ctx, 0)?;
    }

    let deposit = &mut ctx.accounts.deposit;
    deposit.token_amt = deposit.token_amt.checked_add(amount).unwrap();

    ctx.accounts.user_data.token_balance = ctx
        .accounts
        .user_data
        .token_balance
        .checked_add(amount)
        .unwrap();

    emit!(TokenDeposited {
        user: ctx.accounts.user.key(),
        token: ctx.accounts.token_mint.key(),
        amount: amount as u64,
    });

    Ok(())
}

pub fn deposit_tokens_to_vault(ctx: &Context<DepositToken>, token_amt: u64) -> Result<()> {
    transfer_tokens(
        &ctx.accounts.user_token_account,
        &ctx.accounts.vault,
        &token_amt,
        &ctx.accounts.token_mint,
        &ctx.accounts.user,
        &ctx.accounts.token_program,
    )?;
    Ok(())
}

pub fn save_deposit(ctx: &mut Context<DepositToken>, token_amt: u64) -> Result<()> {
    let deposit = &mut ctx.accounts.deposit;
    deposit.user = ctx.accounts.user.key();
    deposit.token_mint = ctx.accounts.token_mint.key();
    deposit.token_amt = token_amt;
    deposit.bump = ctx.bumps.deposit;
    deposit.config_account = ctx.accounts.config.key();
    Ok(())
}

#[derive(Accounts)]
pub struct DepositToken<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mint::token_program = token_program)]
    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init_if_needed,
        payer=user,
        associated_token::mint = token_mint,
        associated_token::authority = user,
        associated_token::token_program = token_program
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
    init_if_needed,
    payer = user,
    space = 8 + UserData::INIT_SPACE,
    seeds = [b"user", user.key().as_ref(),token_mint.key().as_ref()],
    bump
    )]
    pub user_data: Account<'info, UserData>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + Deposit::INIT_SPACE,
        seeds = [b"deposit", user.key().as_ref(), token_mint.key().as_ref()],
        bump,
        // constraint = deposit.user == user.key() 
    )]
    pub deposit: Account<'info, Deposit>,

    #[account(
        seeds = [b"config", token_mint.key().as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}
