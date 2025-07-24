use anchor_lang::prelude::*;

// Error Codes
#[error_code]
pub enum ErrorCode {
    #[msg("Amount must be greater than zero")]
    AmountLessThanZero,
    #[msg("Invalid token")]
    InvalidToken,
    #[msg("Health factor too low")]
    LessHealthFactor,
    #[msg("Not enough tokens in collateral")]
    NotEnoughTokensInCollateral,
    #[msg("No need to liquidate")]
    NoNeedToLiquidate,
    #[msg("Health factor not improved")]
    HealthFactorNotImproved,
    #[msg("Not enough debt")]
    NotEnoughDebt,
    #[msg("Unauthorized user")]
    UnauthorizedUser,
    Overflow,
    DivisionError,
    InvalidPrice,
    MathOverflow,
    MustRepayDscFirst,
    ZeroTotalLiquidity,
    CannotLiquidateSelf,
    TooMuchRepay,
    OverCollateralLimit,
}
