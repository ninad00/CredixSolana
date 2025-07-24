use crate::errors::ErrorCode;
use crate::pricefeeds::*;
use crate::structs::*;
// use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{
        burn, mint_to, transfer_checked, Burn, Mint, MintTo, TokenAccount, TokenInterface,
        TransferChecked,
    },
};

pub fn initialize_engine(
    ctx: Context<InitializeEngine>,
    liquidation_threshold: u64,
    min_health_factor: u64,
    liquidation_bonus: u64,
    fee_percent: u64,
) -> Result<()> {
    let engine = &mut ctx.accounts.engine;
    engine.authority = ctx.accounts.authority.key();
    engine.dsc_mint = ctx.accounts.dsc_mint.key();
    engine.liquidation_threshold = liquidation_threshold;
    engine.min_health_factor = min_health_factor;
    engine.liquidation_bonus = liquidation_bonus;
    engine.fee_percent = fee_percent;
    engine.bump = ctx.bumps.engine;
    Ok(())
}
pub fn mint_dsc(ctx: Context<MintDSC>, amount: u64, new_price: u64) -> Result<()> {
    if amount == 0 {
        return Err(ErrorCode::AmountLessThanZero.into());
    }
    let amt = amount.checked_div(1000).unwrap();

    // Update the oracle price
    let price = &mut ctx.accounts.price;
    price.price = new_price;

    let user_data = &mut ctx.accounts.user_data;

    // Ensure the user is authorized
    if user_data.user == Pubkey::default() {
        return Err(ErrorCode::UnauthorizedUser.into());
    }

    // Safely calculate new borrowed amount
    let new_borrowed = user_data
        .borrowed_amount
        .checked_add(amt)
        .ok_or(ErrorCode::Overflow)?;

    // Calculate health factor with the new debt
    let health_factor = calculate_health_factor_with_debt(
        &ctx.accounts.deposit,
        &ctx.accounts.price,
        &ctx.accounts.engine,
        new_borrowed,
    )?;
    msg!("Health factor too low: {}", health_factor);
    msg!(
        "Required minimum: {}",
        ctx.accounts.engine.min_health_factor
    );

    if health_factor < ctx.accounts.engine.min_health_factor {
        msg!("Health factor too low: {}", health_factor);
        msg!(
            "Required minimum: {}",
            ctx.accounts.engine.min_health_factor
        );
        return Err(ErrorCode::LessHealthFactor.into());
    }

    // Mint DSC tokens to the user using engine as authority
    let seeds: &[&[u8]] = &[b"engine", &[ctx.accounts.engine.bump]];
    let signer = &[seeds];

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.dsc_mint.to_account_info(),
            to: ctx.accounts.user_dsc_account.to_account_info(),
            authority: ctx.accounts.engine.to_account_info(),
        },
        signer,
    );
    mint_to(cpi_ctx, amount)?;

    // Update user data with new debt
    user_data.borrowed_amount = new_borrowed;

    Ok(())
}

pub fn liquidate(ctx: Context<Liquidate>, debt_to_cover: u64, new_price: u64) -> Result<()> {
    require!(debt_to_cover > 0, ErrorCode::AmountLessThanZero);

    let engine = &ctx.accounts.engine;
    let user_data = &mut ctx.accounts.user_data;
    let deposit = &mut ctx.accounts.deposit;
    let dsc_amt = debt_to_cover / 1000;
    require!(
        ctx.accounts.liquidator.key() != user_data.user,
        ErrorCode::CannotLiquidateSelf
    );
    require!(
        dsc_amt <= user_data.borrowed_amount,
        ErrorCode::TooMuchRepay
    );

    let price = &mut ctx.accounts.price;
    price.price = new_price;

    let initial_health = calculate_health_factor_with_debt(
        deposit,
        price,
        engine,
        user_data.borrowed_amount - dsc_amt,
    )?;
    require!(
        initial_health < engine.min_health_factor,
        ErrorCode::NoNeedToLiquidate
    );

    let burn_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Burn {
            mint: ctx.accounts.dsc_mint.to_account_info(),
            from: ctx.accounts.liquidator_dsc_account.to_account_info(),
            authority: ctx.accounts.liquidator.to_account_info(),
        },
    );
    burn(burn_ctx, debt_to_cover)?;

    let dsc_collateral_equiv = convert_dsc_to_collateral(dsc_amt, price)?;
    let bonus = (dsc_collateral_equiv * engine.liquidation_bonus) / 100;
    let total_liquidator_reward = dsc_collateral_equiv + bonus;

    require!(
        deposit.token_amt >= total_liquidator_reward,
        ErrorCode::NotEnoughTokensInCollateral
    );

    let seeds = &[
        b"config",
        ctx.accounts.token_mint.to_account_info().key.as_ref(),
        &[ctx.accounts.config.bump],
    ];

    let signer_seeds = &[&seeds[..]];

    let decimals = anchor_spl::token::Mint::try_deserialize(
        &mut &ctx.accounts.token_mint.to_account_info().data.borrow()[..],
    )?
    .decimals;

    let accounts = TransferChecked {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.liquidator_token_account.to_account_info(),
        mint: ctx.accounts.token_mint.to_account_info(),
        authority: ctx.accounts.config.to_account_info(),
    };

    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        accounts,
        signer_seeds,
    );

    transfer_checked(cpi_context, total_liquidator_reward, decimals)?;

    deposit.token_amt -= total_liquidator_reward;
    user_data.borrowed_amount = user_data.borrowed_amount.saturating_sub(debt_to_cover);

    emit!(TokenLiquidated {
        liquidator: ctx.accounts.liquidator.key(),
        user: ctx.accounts.user_data.user.key(),
        token: ctx.accounts.token_mint.key(),
        amount: total_liquidator_reward,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeEngine<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Engine::INIT_SPACE,
        seeds = [b"engine"],
        bump
    )]
    pub engine: Account<'info, Engine>,

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mint::token_program = token_program)]
    pub dsc_mint: InterfaceAccount<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct MintDSC<'info> {
    #[account(seeds = [b"engine"], bump = engine.bump)]
    pub engine: Account<'info, Engine>,

    #[account(mut, seeds = [b"user", user.key().as_ref(),token_mint.key().as_ref()], bump = user_data.bump)]
    pub user_data: Account<'info, UserData>,

    #[account(mint::token_program=token_program)]
    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, address = engine.dsc_mint)]
    pub dsc_mint: InterfaceAccount<'info, Mint>,

    #[account(
        seeds = [b"deposit", user.key().as_ref(), token_mint.key().as_ref()],
        bump = deposit.bump,
    )]
    pub deposit: Account<'info, Deposit>,

    #[account(
        has_one = token_mint,
        seeds = [b"config", token_mint.key().as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    // pub price_update: Account<'info, PriceUpdateV2>,
    #[account(
        mut,
        seeds = [b"price", token_mint.key().as_ref()],
        bump = price.bump,
    )]
    pub price: Account<'info, Price>,

    #[account(
        init_if_needed,
        payer=user,
        associated_token::mint=dsc_mint,
        associated_token::authority=user,
        associated_token::token_program=token_program
    )]
    pub user_dsc_account: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct Liquidate<'info> {
    #[account(seeds = [b"engine"], bump = engine.bump)]
    pub engine: Account<'info, Engine>,

    #[account(mut,seeds = [b"user", user_data.user.as_ref(),token_mint.key().as_ref()], bump = user_data.bump)]
    pub user_data: Account<'info, UserData>,

    #[account(
        mut,
        seeds = [b"deposit", user_data.user.as_ref(), token_mint.key().as_ref()],
        bump = deposit.bump
    )]
    pub deposit: Account<'info, Deposit>,

    #[account(mut)]
    pub liquidator: Signer<'info>,

    #[account(mint::token_program = token_program)]
    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(
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
        init_if_needed,
        payer = liquidator,
        associated_token::mint = token_mint,
        associated_token::authority = liquidator,
        associated_token::token_program = token_program
    )]
    pub liquidator_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, address = engine.dsc_mint)]
    pub dsc_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = dsc_mint,
        associated_token::authority = liquidator,
        associated_token::token_program = token_program
    )]
    pub liquidator_dsc_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"price", token_mint.key().as_ref()],
        bump = price.bump,
    )]
    pub price: Account<'info, Price>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}
