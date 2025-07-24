use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{
    transfer_checked, Burn, Mint, TokenAccount, TokenInterface, TransferChecked,
};

declare_id!("2rgWx9qb8RrjYwnSAiiogQL5jWGnn3nR58S5jMQTZXrK");

#[program]
pub mod idea_board {
    use super::*;

    pub fn post_idea(ctx: Context<PostIdea>, content: String) -> Result<()> {
        let idea = &mut ctx.accounts.idea;
        idea.creator = ctx.accounts.creator.key();
        idea.content = content;
        idea.likes = 0;
        idea.total_dsc_contributions = 0;
        idea.vault = ctx.accounts.vault.key();
        Ok(())
    }

    pub fn like_idea(ctx: Context<LikeIdea>) -> Result<()> {
        ctx.accounts.idea.likes += 1;
        Ok(())
    }

    pub fn contribute_dsc(ctx: Context<ContributeDsc>, amount: u64) -> Result<()> {
        if amount == 0 {
            return Err(ErrorCode::AmountLessThanZero.into());
        }

        deposit_tokens_to_vault(&ctx, amount)?;
        ctx.accounts.idea.total_dsc_contributions += amount;

        Ok(())
    }

}
pub fn deposit_tokens_to_vault(ctx: &Context<ContributeDsc>, token_amt: u64) -> Result<()> {
    transfer_tokens(
        &ctx.accounts.user_token_account,
        &ctx.accounts.vault,
        &token_amt,
        &ctx.accounts.dsc_mint,
        &ctx.accounts.contributor,
        &ctx.accounts.token_program,
    )?;
    Ok(())
}
pub fn transfer_tokens<'info>(
    from: &InterfaceAccount<'info, TokenAccount>,
    to: &InterfaceAccount<'info, TokenAccount>,
    amount: &u64,
    mint: &InterfaceAccount<'info, Mint>,
    authority: &Signer<'info>,
    token_program: &Interface<'info, TokenInterface>,
) -> Result<()> {
    let transfer_accounts_options = TransferChecked {
        from: from.to_account_info(),
        mint: mint.to_account_info(),
        to: to.to_account_info(),
        authority: authority.to_account_info(),
    };
    let cpi_context = CpiContext::new(token_program.to_account_info(), transfer_accounts_options);

    transfer_checked(cpi_context, (*amount) as u64, mint.decimals)
}

#[derive(Accounts)]
pub struct PostIdea<'info> {
    #[account(
        init,
        payer = creator,
        space = 8+ Idea::INIT_SPACE,
        seeds = [b"idea", creator.key().as_ref(), clock.unix_timestamp.to_le_bytes().as_ref()],
        bump
    )]
    pub idea: Account<'info, Idea>,

    pub dsc_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = dsc_mint,
        associated_token::authority = creator,
        associated_token::token_program = token_program
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub clock: Sysvar<'info, Clock>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct LikeIdea<'info> {
    #[account(mut)]
    pub idea: Account<'info, Idea>,
}

#[derive(Accounts)]
pub struct ContributeDsc<'info> {
    #[account(mut)]
    pub idea: Account<'info, Idea>,

    #[account(mut)]
    pub contributor: Signer<'info>,

    #[account(
        init_if_needed,
        payer=contributor,
        associated_token::mint = dsc_mint,
        associated_token::authority = contributor,
        associated_token::token_program = token_program
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub dsc_mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(InitSpace)]
#[account]
pub struct Idea {
    pub creator: Pubkey,
    #[max_len(500)]
    pub content: String, // limit to 280 chars
    pub likes: u64,
    pub total_dsc_contributions: u64,
    pub vault: Pubkey,
}

#[error_code]

pub enum ErrorCode {
    AmountLessThanZero,
}
