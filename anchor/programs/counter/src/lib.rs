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
declare_id!("AM4tcZNBHBGaDeLEPgzuoEJbHbXqn2odYm9yXC93iUu");

#[program]
pub mod interest {
    use super::*;
    use crate::structs::UserData;
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
    pub fn deposit_collateral(mut ctx: Context<DepositToken>, amount: u64) -> Result<()> {
        deposit::deposit_token(&mut ctx, amount)
    }

    pub fn mint_dsc(mut ctx: Context<MintDSC>, amount: u64, new_price: u64) -> Result<()> {
        engine::mint_dsc(&mut ctx, amount, new_price)
    }

    pub fn withdraw_collateral(
        mut ctx: Context<WithdrawToken>,
        dsc_to_give: u64,
        new_price: u64,
    ) -> Result<()> {
        withdraw::redeem_collateral(&mut ctx, dsc_to_give, new_price)
    }

    pub fn liquidate_user(
        mut ctx: Context<Liquidate>,
        debt_to_cover: u64,
        new_price: u64,
    ) -> Result<()> {
        engine::liquidate(&mut ctx, debt_to_cover, new_price)
    }

    pub fn temp(ctx: Context<User>, hfbn: u64) -> Result<()> {
        pricefeeds::temp_hf(ctx, hfbn)
    }

    pub fn give_liquidity(ctx: Context<GiveLiquidity>, amount: u64) -> Result<()> {
        lp::give_liquidity(ctx, amount)
    }
    pub fn redeem_liquidity(ctx: Context<RedeemLiquidity>) -> Result<()> {
        lp::redeem_liquidity(ctx)
    }
}
