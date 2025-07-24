use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Engine {
    pub authority: Pubkey,
    pub dsc_mint: Pubkey,
    pub liquidation_threshold: u64,
    pub min_health_factor: u64,
    pub liquidation_bonus: u64,
    pub fee_percent: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct LqDeposit {
    pub user: Pubkey,
    pub token_mint: Pubkey,
    pub token_amt: u64,
    pub config_account: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Deposit {
    pub user: Pubkey,
    pub token_mint: Pubkey,
    pub token_amt: u64,
    pub config_account: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub token_mint: Pubkey,
    pub total_liq: u64,
    pub total_collected: u64,
    pub vault: Pubkey,
    pub authority: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Price {
    pub token_mint: Pubkey,
    pub price: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserData {
    pub user: Pubkey,
    pub borrowed_amount: u64,
    pub primary_token: Pubkey,
    pub hf: u64,
    pub token_balance: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct LpData {
    pub user: Pubkey,
    pub token_amt: u64,
    pub token: Pubkey,
    pub bump: u8,
}

// Events
#[event]
pub struct TokenDeposited {
    pub user: Pubkey,
    pub token: Pubkey,
    pub amount: u64,
}

#[event]
pub struct LiquidityProvided {
    pub user: Pubkey,
    pub token: Pubkey,
    pub amount: u64,
}

#[event]
pub struct TokenRedeemed {
    pub user: Pubkey,
    pub token: Pubkey,
    pub amount: u64,
}

#[event]
pub struct TokenLiquidated {
    pub liquidator: Pubkey,
    pub user: Pubkey,
    pub token: Pubkey,
    pub amount: u64,
}

#[event]
pub struct LiquidityRedeemed {
    pub user: Pubkey,
    pub token: Pubkey,
    pub interest: u64,
}

#[event]
pub struct HealthFactors {
    pub health_factor: u64,
}
