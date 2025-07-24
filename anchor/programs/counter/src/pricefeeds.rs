use crate::errors::ErrorCode;
use crate::structs::*;
use anchor_lang::prelude::*;

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

// pub fn temp_hf(mut user: &mut Account<UserData>, hfbn: u64) -> Result<()> {
//     user.hf = hfbn;
//     Ok(())
// }
pub fn temp(ctx: Context<User>, hfbn: u64) -> Result<()> {
    let user_data = &mut ctx.accounts.user_data;
    user_data.hf = hfbn;
    Ok(())
}

pub fn calculate_health_factor(ctx: Context<HealthFactor>, new_price: u64) -> Result<()> {
    let engine = &ctx.accounts.engine;
    let user_data = &mut ctx.accounts.user_data;

    let price = &mut ctx.accounts.price;
    price.price = new_price;

    let total_debt = user_data.borrowed_amount;

    if total_debt == 0 {
        user_data.hf = u64::MAX;
        return Ok(());
    }

    let collateral_tokens = user_data.token_balance;
    let collateral_value = convert_collateral_to_usd_scaled(collateral_tokens, price)?;

    let threshold_value = collateral_value
        .checked_mul(engine.liquidation_threshold)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(100)
        .ok_or(ErrorCode::DivisionError)?;

    // Remove invalid comparison - we should check if debt exceeds threshold, not tokens vs threshold
    require!(
        total_debt.checked_mul(10000).unwrap() <= threshold_value,
        ErrorCode::OverCollateralLimit
    );

    let health_factorn = (threshold_value as u128)
        .checked_mul(1_000_000) // Scale up for fixed-point output (consistent 1e6 scaling)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10000000000 as u128)
        .ok_or(ErrorCode::DivisionError)?
        .checked_div(total_debt as u128)
        .ok_or(ErrorCode::DivisionError)?;

    if health_factorn > u64::MAX as u128 {
        return Err(ErrorCode::MathOverflow.into());
    }

    emit!(HealthFactors {
        health_factor: health_factorn as u64,
    });
    user_data.hf = health_factorn as u64;
    msg!("hf,{}", health_factorn as u64);
    Ok(())
}

pub fn calculate_health_factor_with_debt(
    deposit: &Account<Deposit>,
    price: &Price,
    engine: &Account<Engine>,
    total_debt: u64,
) -> Result<u64> {
    if total_debt == 0 {
        return Ok(u64::MAX);
    }

    let collateral_tokens = deposit.token_amt;
    let collateral_value = convert_collateral_to_usd_scaled(collateral_tokens, price)?;

    let threshold_value = collateral_value
        .checked_mul(engine.liquidation_threshold)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(100)
        .ok_or(ErrorCode::DivisionError)?;

    // Remove invalid comparison - we should check if debt exceeds threshold, not tokens vs threshold
    require!(
        total_debt.checked_mul(10000).unwrap() <= threshold_value,
        ErrorCode::OverCollateralLimit
    );

    let health_factor = (threshold_value as u128)
        .checked_mul(1_000_000) // Scale up for fixed-point output (consistent 1e6 scaling)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10000000000 as u128)
        .ok_or(ErrorCode::DivisionError)?
        .checked_div(total_debt as u128)
        .ok_or(ErrorCode::DivisionError)?;

    if health_factor > u64::MAX as u128 {
        return Err(ErrorCode::MathOverflow.into());
    }

    Ok(health_factor as u64)
}

/// Calculates the health factor after a withdrawal.
pub fn calculate_health_factor_after_withdrawal(
    total_debt: u64,
    price: &Price,
    engine: &Account<Engine>,
    remaining_amount: u64,
) -> Result<u64> {
    if total_debt == 0 {
        return Ok(u64::MAX);
    }

    let collateral_value = convert_collateral_to_usd_scaled(remaining_amount, price)?;

    let threshold_value = collateral_value
        .checked_mul(engine.liquidation_threshold)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(100)
        .ok_or(ErrorCode::DivisionError)?;

    // Use consistent scaling factor (1e6) instead of 1e18
    let health_factor = (threshold_value as u128)
        .checked_mul(1_000_000) // Consistent with other health factor calculation
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10000000000)
        .ok_or(ErrorCode::DivisionError)?
        .checked_div(total_debt as u128)
        .ok_or(ErrorCode::DivisionError)?;

    if health_factor > u64::MAX as u128 {
        return Err(ErrorCode::MathOverflow.into());
    }

    Ok(health_factor as u64)
}

/// Calculates the fee amount in collateral given DSC amount.
pub fn calculate_collateral_fee(dsc_amount: u64, price: &Price, fee_percent: u64) -> Result<u64> {
    let fee_dsc = (dsc_amount * fee_percent) / (100000000 as u64);

    msg!("temp,{}", fee_dsc);

    convert_dsc_to_collateral(fee_dsc, price)
}
pub fn calculate_collateral_fee_scaled(
    dsc_amount: u64,
    price: &Price,
    fee_percent: u64,
) -> Result<u64> {
    let fee_dsc = dsc_amount
        .checked_mul(fee_percent)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(100)
        .ok_or(ErrorCode::DivisionError)?;

    convert_dsc_to_collateral_scaled(fee_dsc, price)
}

pub fn convert_collateral_to_usd_scaled(amount: u64, price: &Price) -> Result<u64> {
    let usd_value = (amount)
        .checked_mul(price.price)
        .ok_or(ErrorCode::MathOverflow)?;

    if usd_value > u64::MAX {
        return Err(ErrorCode::MathOverflow.into());
    }

    Ok(usd_value)
}

pub fn convert_collateral_to_usd(amount: u64, price: &Price) -> Result<u64> {
    // Use u128 for intermediate calculation to prevent overflow
    let amount_u128 = amount as u128;
    let price_u128 = price.price as u128;

    let usd_value_u128 = (amount_u128 * price_u128) / 10000;

    if usd_value_u128 > u64::MAX as u128 {
        return Err(ErrorCode::MathOverflow.into());
    }

    Ok(usd_value_u128 as u64)
}

pub fn convert_dsc_to_collateral(dsc_amount: u64, price: &Price) -> Result<u64> {
    require!(price.price > 0, ErrorCode::InvalidPrice);

    let collateral = (dsc_amount) * (10_000) / (price.price);

    if collateral > u64::MAX {
        return Err(ErrorCode::MathOverflow.into());
    }

    Ok(collateral)
}

pub fn convert_dsc_to_collateral_scaled(dsc_amount: u64, price: &Price) -> Result<u64> {
    require!(price.price > 0, ErrorCode::InvalidPrice);

    let numerator = (dsc_amount as u128)
        .checked_mul(10000 as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_mul(10_000)
        .ok_or(ErrorCode::MathOverflow)?;

    let collateral = numerator
        .checked_div(price.price as u128)
        .ok_or(ErrorCode::DivisionError)?;

    if collateral > u64::MAX as u128 {
        return Err(ErrorCode::MathOverflow.into());
    }

    Ok(collateral as u64)
}

#[derive(Accounts)]
pub struct User<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"user", user.key().as_ref(),token_mint.key().as_ref()],
        bump = user_data.bump
    )]
    pub user_data: Account<'info, UserData>,
    pub token_mint: InterfaceAccount<'info, Mint>,
}

#[derive(Accounts)]
pub struct HealthFactor<'info> {
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

    #[account(
        mut,
        has_one = token_mint,
        seeds = [b"price",token_mint.key().as_ref()],
        bump = price.bump,
    )]
    pub price: Account<'info, Price>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}
