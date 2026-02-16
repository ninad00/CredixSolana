# CredixSolana Workflow Diagram

This document provides comprehensive workflow diagrams for the CredixSolana DeFi lending protocol.

---

## Table of Contents
1. [System Architecture](#system-architecture)
2. [User Workflows](#user-workflows)
3. [Smart Contract Modules](#smart-contract-modules)
4. [Component Interaction Flow](#component-interaction-flow)

---

## System Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[React UI<br/>Vite + TypeScript]
        WA[Wallet Adapter]
        RQ[React Query<br/>State Management]
    end
    
    subgraph "Blockchain Layer - Solana"
        AP[Anchor Program<br/>CredixSolana]
        SPL[SPL Token Program]
        PF[Pyth Price Feeds]
    end
    
    subgraph "Smart Contract Modules"
        ENG[Engine Module<br/>Core Logic]
        DEP[Deposit Module]
        WTH[Withdraw Module]
        LP[Liquidity Provider Module]
        PRC[Price Feed Module]
    end
    
    subgraph "Data Accounts"
        ED[Engine Data<br/>Config]
        TD[Token Data<br/>Price Info]
        UD[User Data<br/>Positions]
        LD[Liquidity Provider Data]
    end
    
    UI --> WA
    WA --> AP
    UI --> RQ
    RQ --> AP
    
    AP --> ENG
    AP --> DEP
    AP --> WTH
    AP --> LP
    AP --> PRC
    
    ENG --> ED
    DEP --> UD
    WTH --> UD
    LP --> LD
    PRC --> TD
    
    AP --> SPL
    PRC --> PF
    
    style UI fill:#e1f5ff
    style AP fill:#ffe1e1
    style ENG fill:#fff4e1
    style ED fill:#e1ffe1
```

---

## User Workflows

### 1. Deposit Collateral Workflow

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Wallet
    participant Program
    participant TokenAccount
    participant UserData
    
    User->>Frontend: Select token & amount
    Frontend->>Wallet: Request signature
    Wallet->>User: Confirm transaction
    User->>Wallet: Approve
    Wallet->>Program: Call deposit_collateral(amount)
    Program->>TokenAccount: Transfer tokens from user
    TokenAccount->>Program: Tokens received
    Program->>UserData: Update collateral balance
    UserData->>Program: Balance updated
    Program->>Frontend: Transaction success
    Frontend->>User: Show updated balance
```

### 2. Mint DSC (Borrow) Workflow

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Wallet
    participant Program
    participant UserData
    participant PriceFeed
    participant DSCMint
    
    User->>Frontend: Enter DSC amount to mint
    Frontend->>Program: Fetch user collateral data
    Program->>UserData: Get collateral amounts
    UserData->>Frontend: Return collateral info
    Frontend->>User: Show borrowing power
    
    User->>Frontend: Confirm mint
    Frontend->>Wallet: Request signature
    Wallet->>Program: Call mint_dsc(amount, price)
    Program->>PriceFeed: Get collateral price
    PriceFeed->>Program: Return price
    Program->>Program: Calculate health factor
    
    alt Health factor OK
        Program->>DSCMint: Mint DSC tokens
        DSCMint->>User: Transfer DSC
        Program->>UserData: Update debt
        Program->>Frontend: Success
        Frontend->>User: Show minted DSC
    else Health factor too low
        Program->>Frontend: Error: Insufficient collateral
        Frontend->>User: Show error message
    end
```

### 3. Liquidation Workflow

```mermaid
sequenceDiagram
    actor Liquidator
    participant Frontend
    participant Program
    participant UserData
    participant PriceFeed
    participant Collateral
    participant DSC
    
    Liquidator->>Frontend: Check for liquidatable positions
    Frontend->>Program: Fetch all user accounts
    Program->>UserData: Get all positions
    UserData->>Frontend: Return positions
    
    Frontend->>PriceFeed: Get current prices
    PriceFeed->>Frontend: Return prices
    Frontend->>Frontend: Calculate health factors
    Frontend->>Liquidator: Show unhealthy positions
    
    Liquidator->>Frontend: Select user to liquidate
    Frontend->>Liquidator: Show debt amount
    Liquidator->>Program: Call liquidate_user(debt_amount)
    
    Program->>Program: Verify health factor < threshold
    Program->>DSC: Burn DSC from liquidator
    Program->>Collateral: Transfer collateral to liquidator
    Program->>Program: Apply liquidation bonus
    Program->>UserData: Update user position
    Program->>Frontend: Liquidation complete
    Frontend->>Liquidator: Show liquidation reward
```

### 4. Liquidity Provider Workflow

```mermaid
sequenceDiagram
    actor LP as Liquidity Provider
    participant Frontend
    participant Program
    participant LPData
    participant PoolAccount
    
    Note over LP,PoolAccount: Provide Liquidity
    LP->>Frontend: Enter amount to provide
    Frontend->>Program: Call give_liquidity(amount)
    Program->>PoolAccount: Transfer tokens
    Program->>LPData: Create/Update LP record
    LPData->>LPData: Record timestamp & amount
    Program->>Frontend: Success
    Frontend->>LP: Show LP position
    
    Note over LP,PoolAccount: Withdraw Liquidity
    LP->>Frontend: Request withdrawal
    Frontend->>Program: Call redeem_liquidity()
    Program->>LPData: Get LP data
    LPData->>Program: Return deposit info
    Program->>Program: Calculate fees earned
    Program->>PoolAccount: Transfer principal + fees
    Program->>LPData: Clear LP record
    Program->>Frontend: Success
    Frontend->>LP: Show withdrawn amount
```

---

## Smart Contract Modules

### Module Structure and Interactions

```mermaid
graph LR
    subgraph "lib.rs - Main Program"
        MAIN[Program Entry Points]
    end
    
    subgraph "Core Modules"
        ENGINE[engine.rs<br/>- initialize_engine<br/>- mint_dsc<br/>- liquidate]
        DEPOSIT[deposit.rs<br/>- deposit_token]
        WITHDRAW[withdraw.rs<br/>- redeem_collateral]
        LP[lp.rs<br/>- give_liquidity<br/>- redeem_liquidity]
        TOKEN[new_token.rs<br/>- initialize_token]
        PRICE[pricefeeds.rs<br/>- temp_hf<br/>- price fetching]
    end
    
    subgraph "Supporting Modules"
        STRUCTS[structs.rs<br/>- EngineData<br/>- TokenData<br/>- UserData<br/>- LiquidityProvider]
        ERRORS[errors.rs<br/>- Custom Errors]
        CONSTANTS[constants.rs<br/>- System Constants]
        SHARED[shared.rs<br/>- Shared Utilities]
    end
    
    MAIN --> ENGINE
    MAIN --> DEPOSIT
    MAIN --> WITHDRAW
    MAIN --> LP
    MAIN --> TOKEN
    MAIN --> PRICE
    
    ENGINE --> STRUCTS
    DEPOSIT --> STRUCTS
    WITHDRAW --> STRUCTS
    LP --> STRUCTS
    TOKEN --> STRUCTS
    PRICE --> STRUCTS
    
    ENGINE --> ERRORS
    DEPOSIT --> ERRORS
    WITHDRAW --> ERRORS
    LP --> ERRORS
    
    ENGINE --> CONSTANTS
    ENGINE --> SHARED
    
    style MAIN fill:#ff6b6b
    style ENGINE fill:#4ecdc4
    style STRUCTS fill:#ffe66d
```

### Key Smart Contract Functions

```mermaid
graph TD
    subgraph "Admin Functions"
        A1[start_engine<br/>Initialize protocol]
        A2[start_token<br/>Add supported token]
    end
    
    subgraph "User Functions"
        U1[deposit_collateral<br/>Deposit tokens]
        U2[mint_dsc<br/>Borrow against collateral]
        U3[withdraw_collateral<br/>Redeem collateral]
        U4[liquidate_user<br/>Liquidate unhealthy position]
    end
    
    subgraph "LP Functions"
        L1[give_liquidity<br/>Provide liquidity]
        L2[redeem_liquidity<br/>Withdraw liquidity]
    end
    
    subgraph "Internal Functions"
        I1[Calculate Health Factor]
        I2[Fetch Price Feeds]
        I3[Validate Collateral]
        I4[Calculate Liquidation Bonus]
    end
    
    A1 --> I1
    U2 --> I1
    U2 --> I2
    U3 --> I1
    U3 --> I2
    U4 --> I1
    U4 --> I2
    U4 --> I4
    U1 --> I3
    
    style A1 fill:#ffd700
    style A2 fill:#ffd700
    style U1 fill:#87ceeb
    style U2 fill:#87ceeb
    style U3 fill:#87ceeb
    style U4 fill:#ff6b6b
    style L1 fill:#90ee90
    style L2 fill:#90ee90
```

---

## Component Interaction Flow

### Frontend Component Architecture

```mermaid
graph TB
    subgraph "App Layer"
        APP[App.tsx<br/>Router & Providers]
        LAYOUT[AppLayout<br/>Navigation & Layout]
    end
    
    subgraph "Provider Layer"
        WALLET[WalletAdapter<br/>Wallet Connection]
        QUERY[ReactQuery<br/>Data Fetching]
        CONNECTION[ConnectionProvider<br/>Solana RPC]
    end
    
    subgraph "Feature Components"
        HOME[index.tsx<br/>Dashboard]
        DEP[depositToken.tsx<br/>Deposit Interface]
        MINT[mint&withdraw.tsx<br/>Borrow/Repay]
        LIQUIDITY[giveLiquidity.tsx<br/>Add Liquidity]
        WITHDRAW[withdrawLiq.tsx<br/>Remove Liquidity]
        LIQ[liquidate.tsx<br/>Liquidation Interface]
        HISTORY[transaction.tsx<br/>Transaction History]
    end
    
    subgraph "Supporting Components"
        CONFIG[startEngine.tsx<br/>Admin Config]
        HF[hf.tsx<br/>Health Factor Display]
        FETCH[fetchallaccounts.tsx<br/>Data Fetching]
        TOAST[use-transaction-toast<br/>Notifications]
    end
    
    subgraph "UI Components"
        UI[Radix UI Components<br/>Button, Dialog, Card, etc.]
    end
    
    APP --> LAYOUT
    APP --> WALLET
    APP --> QUERY
    APP --> CONNECTION
    
    LAYOUT --> HOME
    LAYOUT --> DEP
    LAYOUT --> MINT
    LAYOUT --> LIQUIDITY
    LAYOUT --> WITHDRAW
    LAYOUT --> LIQ
    LAYOUT --> HISTORY
    
    DEP --> FETCH
    MINT --> FETCH
    MINT --> HF
    LIQUIDITY --> FETCH
    LIQ --> FETCH
    LIQ --> HF
    
    DEP --> TOAST
    MINT --> TOAST
    LIQUIDITY --> TOAST
    WITHDRAW --> TOAST
    LIQ --> TOAST
    
    DEP --> UI
    MINT --> UI
    LIQUIDITY --> UI
    WITHDRAW --> UI
    LIQ --> UI
    HOME --> UI
    
    style APP fill:#ff6b6b
    style WALLET fill:#ffd700
    style DEP fill:#87ceeb
    style MINT fill:#87ceeb
    style LIQ fill:#ff6b6b
```

### Data Flow: Deposit to Borrow Journey

```mermaid
flowchart TD
    START([User Starts]) --> CONNECT{Wallet<br/>Connected?}
    CONNECT -->|No| CONNECT_WALLET[Connect Wallet]
    CONNECT_WALLET --> CONNECT
    CONNECT -->|Yes| DASHBOARD[View Dashboard]
    
    DASHBOARD --> DEPOSIT_PAGE[Navigate to Deposit]
    DEPOSIT_PAGE --> SELECT_TOKEN[Select Token & Amount]
    SELECT_TOKEN --> APPROVE[Approve Transaction]
    APPROVE --> DEPOSIT_TX[Execute Deposit]
    DEPOSIT_TX --> UPDATE_UI1[Update UI with Balance]
    
    UPDATE_UI1 --> MINT_PAGE[Navigate to Mint DSC]
    MINT_PAGE --> FETCH_COLLATERAL[Fetch Collateral Value]
    FETCH_COLLATERAL --> SHOW_POWER[Display Borrowing Power]
    SHOW_POWER --> ENTER_AMOUNT[Enter DSC Amount]
    ENTER_AMOUNT --> CHECK_HF{Health Factor<br/>Sufficient?}
    
    CHECK_HF -->|No| ERROR1[Show Error]
    ERROR1 --> ENTER_AMOUNT
    CHECK_HF -->|Yes| APPROVE2[Approve Transaction]
    APPROVE2 --> MINT_TX[Execute Mint DSC]
    MINT_TX --> UPDATE_UI2[Update UI with DSC Balance]
    UPDATE_UI2 --> END([Complete])
    
    style START fill:#90ee90
    style END fill:#90ee90
    style CHECK_HF fill:#ffd700
    style ERROR1 fill:#ff6b6b
    style DEPOSIT_TX fill:#87ceeb
    style MINT_TX fill:#87ceeb
```

### Complete Transaction Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as Frontend
    participant WA as Wallet Adapter
    participant RPC as Solana RPC
    participant Program as Smart Contract
    participant Account as On-chain Accounts
    
    Note over User,Account: Transaction Lifecycle
    
    User->>UI: Initiate action
    UI->>UI: Build transaction
    UI->>WA: Request signature
    WA->>User: Show transaction details
    User->>WA: Approve
    WA->>UI: Return signed transaction
    
    UI->>RPC: Send transaction
    RPC->>Program: Execute instruction
    Program->>Program: Validate inputs
    Program->>Account: Read account data
    Account->>Program: Return data
    Program->>Program: Execute business logic
    Program->>Account: Update account data
    Account->>Program: Confirm update
    Program->>RPC: Return success
    
    RPC->>UI: Transaction confirmed
    UI->>UI: Update React Query cache
    UI->>User: Show success notification
    UI->>UI: Refresh displayed data
```

---

## Key Concepts

### Health Factor Calculation

The health factor determines the safety of a user's position:

```
Health Factor = (Collateral Value × Liquidation Threshold) / Total Debt

- If HF < Min Health Factor (typically 1.0): Position can be liquidated
- If HF > Min Health Factor: Position is safe
```

### Liquidation Process

When a position becomes unhealthy:
1. Liquidator identifies undercollateralized position
2. Liquidator provides DSC to cover debt
3. Liquidator receives collateral + liquidation bonus
4. User's debt is reduced/cleared
5. User's collateral is reduced

### Liquidity Provider Rewards

LPs earn fees from:
- Minting fees
- Liquidation fees
- Protocol operations

Fees are distributed proportionally based on:
- Amount provided
- Time in pool

---

## Technology Stack Summary

```mermaid
graph LR
    subgraph "Frontend Stack"
        F1[React 19]
        F2[TypeScript]
        F3[Vite]
        F4[Tailwind CSS]
        F5[React Query]
        F6[Radix UI]
    end
    
    subgraph "Blockchain Stack"
        B1[Solana]
        B2[Anchor Framework]
        B3[Rust]
        B4[SPL Token]
        B5[Pyth Network]
    end
    
    subgraph "Integration"
        I1[Wallet Adapter]
        I2[Web3.js]
        I3[RPC Connection]
    end
    
    F1 --> I1
    F2 --> I2
    I1 --> B1
    I2 --> B1
    I3 --> B1
    
    B2 --> B1
    B3 --> B2
    B4 --> B1
    B5 --> B1
    
    style F1 fill:#61dafb
    style B1 fill:#9945ff
    style B2 fill:#ff6b6b
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        DEV[Local Development]
        DEVNET[Solana Devnet]
    end
    
    subgraph "Production"
        BUILD[Vite Build]
        PAGES[GitHub Pages]
        MAINNET[Solana Mainnet]
    end
    
    subgraph "Smart Contract Deployment"
        ANCHOR[Anchor Build]
        DEPLOY[Anchor Deploy]
        UPGRADE[Program Upgrade]
    end
    
    DEV --> DEVNET
    DEV --> BUILD
    BUILD --> PAGES
    
    ANCHOR --> DEPLOY
    DEPLOY --> DEVNET
    DEPLOY --> MAINNET
    UPGRADE --> MAINNET
    
    PAGES --> MAINNET
    
    style PAGES fill:#90ee90
    style MAINNET fill:#ff6b6b
    style DEVNET fill:#ffd700
```

---

## Error Handling Flow

```mermaid
flowchart TD
    START[Transaction Initiated] --> VALIDATE[Validate Inputs]
    VALIDATE -->|Invalid| ERR1[Show Input Error]
    VALIDATE -->|Valid| CHECK_WALLET{Wallet<br/>Connected?}
    
    CHECK_WALLET -->|No| ERR2[Wallet Not Connected]
    CHECK_WALLET -->|Yes| CHECK_BALANCE{Sufficient<br/>Balance?}
    
    CHECK_BALANCE -->|No| ERR3[Insufficient Balance]
    CHECK_BALANCE -->|Yes| SIGN[Request Signature]
    
    SIGN -->|Rejected| ERR4[User Rejected]
    SIGN -->|Approved| SUBMIT[Submit to Blockchain]
    
    SUBMIT --> EXECUTE[Execute Smart Contract]
    EXECUTE -->|Program Error| ERR5[Smart Contract Error]
    EXECUTE -->|Success| SUCCESS[Transaction Success]
    
    ERR1 --> NOTIFY[Show Toast Notification]
    ERR2 --> NOTIFY
    ERR3 --> NOTIFY
    ERR4 --> NOTIFY
    ERR5 --> NOTIFY
    SUCCESS --> NOTIFY
    
    NOTIFY --> UPDATE[Update UI State]
    UPDATE --> END[End]
    
    style SUCCESS fill:#90ee90
    style ERR1 fill:#ff6b6b
    style ERR2 fill:#ff6b6b
    style ERR3 fill:#ff6b6b
    style ERR4 fill:#ff6b6b
    style ERR5 fill:#ff6b6b
```

---

## Conclusion

This workflow documentation provides a comprehensive view of the CredixSolana protocol, including:
- High-level system architecture
- Detailed user workflows for all major features
- Smart contract module interactions
- Frontend component structure
- Data flow and transaction lifecycle
- Error handling mechanisms

The protocol enables users to:
1. **Deposit** collateral tokens
2. **Mint** DSC stablecoin against collateral
3. **Provide** liquidity to earn fees
4. **Liquidate** unhealthy positions for rewards
5. **Withdraw** collateral and liquidity

All operations are secured by health factor checks and managed through the Anchor framework on Solana blockchain.
