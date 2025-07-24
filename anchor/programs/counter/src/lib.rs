#![allow(clippy::result_large_err)]
use anchor_lang::prelude::*;

pub mod constants;
pub mod deposit;
pub mod engine;
pub mod errors;
pub mod lp;
pub mod new_token;
pub mod pricefeeds;
pub mod shared;
pub mod structs;
pub mod withdraw;

pub use deposit::*;
pub use engine::*;
pub use lp::*;
pub use new_token::*;
pub use pricefeeds::*;
pub use withdraw::*;
declare_id!("88tXn9rAFm1HwM8fjmMrZJymZEy17GEDmD5dmNmqTiAC");

#[program]
pub mod interest {
    use super::*;
    //all functions and their roles

    //Admin:
    pub fn start_engine(
        ctx: Context<InitializeEngine>,
        liquidation_threshold: u64,
        min_health_factor: u64,
        liquidation_bonus: u64,
        fee_percent: u64,
    ) -> Result<()> {
        engine::initialize_engine(
            ctx,
            liquidation_threshold,
            min_health_factor,
            liquidation_bonus,
            fee_percent,
        )
    }

    pub fn start_token(ctx: Context<InitializeToken>, _price: u64) -> Result<()> {
        new_token::initialize_token(ctx, _price)
    }

    //Deposit and the user initialization
    pub fn deposit_collateral(ctx: Context<DepositToken>, amount: u64) -> Result<()> {
        deposit::deposit_token(ctx, amount)
    }
    pub fn mint_dsc(ctx: Context<MintDSC>, amount: u64, new_price: u64) -> Result<()> {
        engine::mint_dsc(ctx, amount, new_price)
    }

    //Withdraw with the fee
    pub fn withdraw_collateral(
        ctx: Context<WithdrawToken>,
        dsc_to_give: u64,
        new_price: u64,
    ) -> Result<()> {
        withdraw::redeem_collateral(ctx, dsc_to_give, new_price)
    }

    //Liquidate_for_anyone
    pub fn liquidate_user(
        ctx: Context<Liquidate>,
        debt_to_cover: u64,
        new_price: u64,
    ) -> Result<()> {
        engine::liquidate(ctx, debt_to_cover, new_price)
    }

    pub fn get_hf(ctx: Context<HealthFactor>, new_price: u64) -> Result<()> {
        pricefeeds::calculate_health_factor(ctx, new_price)
    }

    pub fn temp(mut ctx: Context<User>, hfbn: u64) -> Result<()> {
        pricefeeds::temp(ctx, hfbn)
    }

    pub fn give_liquidity(ctx: Context<GiveLiquidity>, amount: u64) -> Result<()> {
        lp::give_liquidity(ctx, amount)
    }
    pub fn redeem_liquidity(ctx: Context<RedeemLiquidity>) -> Result<()> {
        lp::redeem_liquidity(ctx)
    }
}
