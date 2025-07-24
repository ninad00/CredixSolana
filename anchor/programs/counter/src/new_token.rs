use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::structs::*;

pub fn initialize_token(ctx: Context<InitializeToken>, _price: u64) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let price = &mut ctx.accounts.price;

    config.token_mint = ctx.accounts.token_mint.key();
    config.total_collected = 0;
    config.total_liq = 0;
    config.vault = ctx.accounts.vault.key();
    config.authority = ctx.accounts.admin.key();
    config.bump = ctx.bumps.config;

    price.token_mint = ctx.accounts.token_mint.key();
    price.price = _price;
    price.bump = ctx.bumps.price;
    Ok(())
}

#[derive(Accounts)]
#[instruction(price: u64)]
pub struct InitializeToken<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config", token_mint.key().as_ref()],
        bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer=admin,
        space = 8 + Price::INIT_SPACE,
        seeds = [b"price", token_mint.key().as_ref()],
        bump
    )]
    pub price: Account<'info, Price>,

    #[account(mint::token_program = token_program)]
    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = admin,
        associated_token::mint = token_mint,
        associated_token::authority = config,
        associated_token::token_program = token_program
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}
