use crate::errors::ErrorCode;
use crate::pricefeeds::*;
use crate::structs::*;

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{burn, transfer_checked, Burn, Mint, TokenAccount, TokenInterface},
};

pub fn redeem_collateral(
    mut ctx: &mut Context<WithdrawToken>,
    dsc_to_give: u64,
    new_price: u64,
) -> Result<()> {
    // msg!("1");
    require_keys_eq!(
        ctx.accounts.deposit.user.key(),
        ctx.accounts.user.key(),
        ErrorCode::UnauthorizedUser
    );
    require!(
        ctx.accounts.deposit.token_amt > 0,
        ErrorCode::NotEnoughTokensInCollateral
    );

    let price = &mut ctx.accounts.price;
    price.price = new_price;

    let user_data = &mut ctx.accounts.user_data;
    require!(
        user_data.user.key() != Pubkey::default(),
        ErrorCode::UnauthorizedUser
    );
    let amt = user_data.token_balance;

    if dsc_to_give == 0 {
        require!(user_data.borrowed_amount == 0, ErrorCode::MustRepayDscFirst);

        send_tokens_to_user(&mut ctx, amt)?;
        // ctx.accounts.deposit.token_amt = 0;
        ctx.accounts.user_data.token_balance = 0;

        emit!(TokenRedeemed {
            user: ctx.accounts.user.key(),
            token: ctx.accounts.token_mint.key(),
            amount: amt,
        });

        return Ok(());
    }

    let burn_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Burn {
            mint: ctx.accounts.dsc_mint.to_account_info(),
            from: ctx.accounts.user_dsc_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    burn(burn_ctx, dsc_to_give)?;

    // let dsc_burn_scaled = (dsc_to_give) / 1000;
    let dsc_burn_scaled = dsc_to_give;
    msg!("dsc, {}", dsc_burn_scaled);
    msg!("borr, {}", user_data.borrowed_amount);

    let new_borrow = user_data
        .borrowed_amount
        .checked_sub(dsc_burn_scaled)
        .unwrap();
    user_data.borrowed_amount = new_borrow;

    let dsc_collateral_equiv = convert_dsc_to_collateral(dsc_burn_scaled, price)?;
    msg!("feeperc ,{}", ctx.accounts.engine.fee_percent);
    let fee = calculate_collateral_fee(dsc_burn_scaled, price, ctx.accounts.engine.fee_percent)?;
    let liq_amt = fee * (3) / 4;
    msg!("dscequiv {}", dsc_collateral_equiv);
    msg!("fee ,{}", fee);
    let withdrawable_amt = dsc_collateral_equiv.checked_sub(fee).unwrap();

    require!(
        ctx.accounts.deposit.token_amt >= withdrawable_amt as u64,
        ErrorCode::NotEnoughTokensInCollateral
    );

    let new_collateral = ctx.accounts.deposit.token_amt - (withdrawable_amt);
    let user_new = user_data.token_balance - dsc_collateral_equiv;

    if user_data.borrowed_amount > 0 {
        let hf = calculate_health_factor_after_withdrawal(
            user_data.borrowed_amount,
            price,
            &ctx.accounts.engine,
            new_collateral,
        )?;
        msg!("hf,{}", hf);
        require!(
            hf >= ctx.accounts.engine.min_health_factor,
            ErrorCode::LessHealthFactor
        );
    }

    send_tokens_to_user(&mut ctx, withdrawable_amt)?;
    ctx.accounts.deposit.token_amt = new_collateral;
    ctx.accounts.user_data.token_balance = user_new;
    ctx.accounts.config.total_collected = ctx
        .accounts
        .config
        .total_collected
        .checked_add(liq_amt)
        .unwrap();

    emit!(TokenRedeemed {
        user: ctx.accounts.user.key(),
        token: ctx.accounts.token_mint.key(),
        amount: withdrawable_amt,
    });

    Ok(())
}

pub fn send_tokens_to_user(ctx: &mut Context<WithdrawToken>, amt_total: u64) -> Result<()> {
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
pub struct WithdrawToken<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"user", user.key().as_ref(),token_mint.key().as_ref()],
        bump = user_data.bump
    )]
    pub user_data: Account<'info, UserData>,

    #[account(
        seeds = [b"engine"],
        bump = engine.bump
    )]
    pub engine: Account<'info, Engine>,

    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(mut, address = engine.dsc_mint)]
    pub dsc_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        has_one = user,
        has_one = token_mint,
        seeds = [b"deposit", user.key().as_ref(), token_mint.key().as_ref()],
        bump = deposit.bump,
    )]
    pub deposit: Account<'info, Deposit>,

    #[account(
        mut,
        has_one = token_mint,
        seeds = [b"price",token_mint.key().as_ref()],
        bump = price.bump,
    )]
    pub price: Account<'info, Price>,

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

    #[account(
        init_if_needed,
        payer=user,
        associated_token::mint=dsc_mint,
        associated_token::authority=user,
        associated_token::token_program=token_program
    )]
    pub user_dsc_account: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
}
