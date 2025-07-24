use crate::errors::ErrorCode;
use crate::shared::*;
use crate::structs::*;

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface},
};

pub fn give_liquidity(mut ctx: Context<GiveLiquidity>, amount: u64) -> Result<()> {
    let user_key = ctx.accounts.user.key();

    if ctx.accounts.liq_deposit.user != Pubkey::default()
        && ctx.accounts.liq_deposit.user != user_key
    {
        return Err(error!(ErrorCode::UnauthorizedUser));
    }

    if amount == 0 {
        return Err(ErrorCode::AmountLessThanZero.into());
    }

    if ctx.accounts.lp_data.user == Pubkey::default() {
        let user_data = &mut ctx.accounts.lp_data;
        user_data.user = user_key;
        user_data.token = ctx.accounts.token_mint.key();
        user_data.bump = ctx.bumps.lp_data;
        user_data.token_amt = 0;
    }

    // Deposit tokens to vault
    deposit_tokens_to_vault(&ctx, amount)?;

    // Save deposit PDA if new
    if ctx.accounts.liq_deposit.token_amt == 0 {
        save_liq_deposit(&mut ctx, 0)?; // Called before any borrows
    }

    let liq_deposit = &mut ctx.accounts.liq_deposit;
    liq_deposit.token_amt = liq_deposit.token_amt.checked_add(amount).unwrap();

    let lp_data = &mut ctx.accounts.lp_data;
    lp_data.token_amt = lp_data.token_amt.checked_add(amount).unwrap();

    let config = &mut ctx.accounts.config;
    msg!("Before total_liq: {}", config.total_liq);
    config.total_liq = config.total_liq.checked_add(amount).unwrap();
    msg!("After total_liq: {}", config.total_liq);

    emit!(LiquidityProvided {
        user: user_key,
        token: ctx.accounts.token_mint.key(),
        amount,
    });

    Ok(())
}

pub fn deposit_tokens_to_vault(ctx: &Context<GiveLiquidity>, token_amt: u64) -> Result<()> {
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

pub fn save_liq_deposit(ctx: &mut Context<GiveLiquidity>, token_amt: u64) -> Result<()> {
    let liq_deposit = &mut ctx.accounts.liq_deposit;
    liq_deposit.user = ctx.accounts.user.key();
    liq_deposit.token_mint = ctx.accounts.token_mint.key();
    liq_deposit.token_amt = token_amt;
    liq_deposit.bump = ctx.bumps.liq_deposit;
    liq_deposit.config_account = ctx.accounts.config.key();
    Ok(())
}

#[derive(Accounts)]
pub struct GiveLiquidity<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mint::token_program = token_program)]
    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = token_mint,
        associated_token::authority = user,
        associated_token::token_program = token_program
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + LpData::INIT_SPACE,
        seeds = [b"lp", user.key().as_ref(), token_mint.key().as_ref()],
        bump
    )]
    pub lp_data: Account<'info, LpData>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + LqDeposit::INIT_SPACE,
        seeds = [b"liq_deposit", user.key().as_ref(), token_mint.key().as_ref()],
        bump
    )]
    pub liq_deposit: Account<'info, LqDeposit>,

    #[account(
        mut,
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

//withdraw//
pub fn redeem_liquidity(mut ctx: Context<RedeemLiquidity>) -> Result<()> {
    // msg!("1");
    require_keys_eq!(
        ctx.accounts.liq_deposit.user.key(),
        ctx.accounts.user.key(),
        ErrorCode::UnauthorizedUser
    );
    require!(
        ctx.accounts.liq_deposit.token_amt > 0,
        ErrorCode::NotEnoughTokensInCollateral
    );

    let lp_data = &mut ctx.accounts.lp_data;
    require!(
        lp_data.user.key() != Pubkey::default(),
        ErrorCode::UnauthorizedUser
    );
    let _amt = lp_data.token_amt;

    let total_collected = ctx.accounts.config.total_collected;
    require!(
        ctx.accounts.config.total_liq > 0,
        ErrorCode::ZeroTotalLiquidity
    );
    let amt = lp_data.token_amt;
    let ratio = amt
        .checked_mul(1_000_000_000)
        .unwrap()
        .checked_div(ctx.accounts.config.total_liq)
        .unwrap();

    let interest = total_collected
        .checked_mul(ratio)
        .unwrap()
        .checked_div(1_000_000_000)
        .unwrap();

    let total = _amt + interest;

    // require!(
    //     ctx.accounts.vault. >= total,
    //     ErrorCode::NotEnoughTokensInCollateral
    // );

    send_tokens_to_user(&mut ctx, total)?;
    ctx.accounts.liq_deposit.token_amt = 0;
    ctx.accounts.lp_data.token_amt = 0;
    ctx.accounts.config.total_collected = ctx
        .accounts
        .config
        .total_collected
        .checked_sub(interest)
        .unwrap();

    ctx.accounts.config.total_liq = ctx.accounts.config.total_liq.checked_sub(amt).unwrap();

    emit!(LiquidityRedeemed {
        user: ctx.accounts.user.key(),
        token: ctx.accounts.token_mint.key(),
        interest: interest,
    });

    Ok(())
}

pub fn send_tokens_to_user(ctx: &mut Context<RedeemLiquidity>, amt_total: u64) -> Result<()> {
    let binding = ctx.accounts.token_mint.key();
    let seeds = &[b"config", binding.as_ref(), &[ctx.accounts.config.bump]];
    let signer_seeds = &[&seeds[..]];

    let decimals = ctx.accounts.token_mint.decimals;

    msg!(
        "Withdrawing {} tokens (decimals: {}) to user {}",
        amt_total,
        decimals,
        ctx.accounts.user_token_account.key()
    );

    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        anchor_spl::token_interface::TransferChecked {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            mint: ctx.accounts.token_mint.to_account_info(),
            authority: ctx.accounts.config.to_account_info(),
        },
        signer_seeds,
    );
    transfer_checked(transfer_ctx, amt_total, decimals)?;

    Ok(())
}

#[derive(Accounts)]
pub struct RedeemLiquidity<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"lp", user.key().as_ref(),token_mint.key().as_ref()],
        bump = lp_data.bump
    )]
    pub lp_data: Account<'info, LpData>,

    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        close=user,
        has_one = user,
        has_one = token_mint,
        seeds = [b"liq_deposit", user.key().as_ref(), token_mint.key().as_ref()],
        bump = liq_deposit.bump,
    )]
    pub liq_deposit: Account<'info, LqDeposit>,

    #[account(
        mut,
        has_one = token_mint,
        seeds = [b"config", token_mint.key().as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = config,
        associated_token::token_program = token_program
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = user,
        associated_token::token_program = token_program
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
}
