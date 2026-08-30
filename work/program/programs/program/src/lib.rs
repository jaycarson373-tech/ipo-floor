use anchor_lang::prelude::*;
use anchor_spl::token::{self, transfer_checked, Mint, Token, TokenAccount, TransferChecked};

declare_id!("2P9ehfkHUgght4YmW43YG1vEqFatKa3zKAkaV5ona7wo");

#[program]
pub mod ipo_program {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        treasury: Pubkey,
        total_supply: u16,
        mint_price_lamports: u64,
        ipo_price_tokens: u64,
    ) -> Result<()> {
        require!(total_supply > 0, ErrorCode::InvalidSupply);
        require!(mint_price_lamports > 0, ErrorCode::InvalidPrice);
        require!(ipo_price_tokens > 0, ErrorCode::InvalidPrice);

        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.treasury = treasury;
        config.ipo_mint = ctx.accounts.ipo_mint.key();
        config.ipo_vault = ctx.accounts.ipo_vault.key();
        config.total_supply = total_supply;
        config.minted = 0;
        config.mint_price_lamports = mint_price_lamports;
        config.ipo_price_tokens = ipo_price_tokens;
        config.paused = false;
        config.bump = ctx.bumps.config;

        emit!(ConfigInitialized {
            authority: config.authority,
            treasury,
            ipo_mint: config.ipo_mint,
            total_supply,
            mint_price_lamports,
            ipo_price_tokens,
        });

        Ok(())
    }

    pub fn set_pause(ctx: Context<Admin>, paused: bool) -> Result<()> {
        ctx.accounts.config.paused = paused;
        emit!(PauseSet { paused });
        Ok(())
    }

    pub fn mint_desk(
        ctx: Context<MintDesk>,
        serial: u16,
        stock: Stock,
        metadata_uri_hash: [u8; 32],
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        require!(!config.paused, ErrorCode::MintPaused);
        require!(config.minted < config.total_supply, ErrorCode::SoldOut);
        require!(serial == config.minted + 1, ErrorCode::InvalidSerial);
        require_keys_eq!(ctx.accounts.treasury.key(), config.treasury, ErrorCode::InvalidTreasury);
        require_keys_eq!(ctx.accounts.ipo_mint.key(), config.ipo_mint, ErrorCode::InvalidMint);
        require_keys_eq!(ctx.accounts.ipo_vault.key(), config.ipo_vault, ErrorCode::InvalidVault);
        let mint_price_lamports = config.mint_price_lamports;
        let ipo_price_tokens = config.ipo_price_tokens;

        transfer_sol(
            &ctx.accounts.buyer,
            &ctx.accounts.treasury,
            &ctx.accounts.system_program,
            mint_price_lamports,
        )?;

        transfer_ipo(
            ctx.accounts.transfer_ipo_context(),
            ipo_price_tokens,
            ctx.accounts.ipo_mint.decimals,
        )?;

        ctx.accounts.config.minted += 1;

        let desk = &mut ctx.accounts.desk;
        desk.owner = ctx.accounts.buyer.key();
        desk.serial = serial;
        desk.stock = stock;
        desk.level = 0;
        desk.rental_days = 0;
        desk.rental_price_lamports = 0;
        desk.metadata_uri_hash = metadata_uri_hash;
        desk.minted_at = Clock::get()?.unix_timestamp;
        desk.bump = ctx.bumps.desk;

        emit!(DeskMinted {
            owner: desk.owner,
            serial,
            stock,
            sol_paid: mint_price_lamports,
            ipo_locked: ipo_price_tokens,
            metadata_uri_hash,
        });

        Ok(())
    }

    pub fn upgrade_desk(ctx: Context<UpgradeDesk>) -> Result<()> {
        let level = ctx.accounts.desk.level;
        require!(level < MAX_UPGRADE_LEVEL, ErrorCode::MaxLevel);
        require_keys_eq!(ctx.accounts.treasury.key(), ctx.accounts.config.treasury, ErrorCode::InvalidTreasury);
        require_keys_eq!(ctx.accounts.ipo_vault.key(), ctx.accounts.config.ipo_vault, ErrorCode::InvalidVault);
        require_keys_eq!(ctx.accounts.ipo_mint.key(), ctx.accounts.config.ipo_mint, ErrorCode::InvalidMint);

        let ipo_cost = upgrade_ipo_cost(level)?;
        let sol_cost = upgrade_sol_cost(level)?;

        transfer_sol(
            &ctx.accounts.owner,
            &ctx.accounts.treasury,
            &ctx.accounts.system_program,
            sol_cost,
        )?;

        transfer_ipo(
            ctx.accounts.transfer_ipo_context(),
            ipo_cost,
            ctx.accounts.ipo_mint.decimals,
        )?;

        ctx.accounts.desk.level += 1;

        emit!(DeskUpgraded {
            owner: ctx.accounts.owner.key(),
            serial: ctx.accounts.desk.serial,
            level: ctx.accounts.desk.level,
            sol_paid: sol_cost,
            ipo_locked: ipo_cost,
        });

        Ok(())
    }

    pub fn list_rental(
        ctx: Context<OwnerDesk>,
        rental_days: u16,
        rental_price_lamports: u64,
    ) -> Result<()> {
        require!(rental_days > 0 && rental_days <= 30, ErrorCode::InvalidRental);
        require!(rental_price_lamports > 0, ErrorCode::InvalidRental);

        let desk = &mut ctx.accounts.desk;
        desk.rental_days = rental_days;
        desk.rental_price_lamports = rental_price_lamports;

        emit!(RentalListed {
            owner: ctx.accounts.owner.key(),
            serial: desk.serial,
            rental_days,
            rental_price_lamports,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + Config::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, Config>,
    pub ipo_mint: Account<'info, Mint>,
    #[account(
        constraint = ipo_vault.mint == ipo_mint.key() @ ErrorCode::InvalidVault
    )]
    pub ipo_vault: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Admin<'info> {
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump, has_one = authority)]
    pub config: Account<'info, Config>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(serial: u16)]
pub struct MintDesk<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        init,
        payer = buyer,
        space = 8 + Desk::INIT_SPACE,
        seeds = [DESK_SEED, buyer.key().as_ref(), &serial.to_le_bytes()],
        bump
    )]
    pub desk: Account<'info, Desk>,
    /// CHECK: Treasury address is validated against config before transfer.
    #[account(mut)]
    pub treasury: UncheckedAccount<'info>,
    #[account(mut)]
    pub buyer_ipo_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub ipo_vault: Account<'info, TokenAccount>,
    pub ipo_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl<'info> MintDesk<'info> {
    fn transfer_ipo_context(&self) -> CpiContext<'_, '_, '_, 'info, TransferChecked<'info>> {
        let accounts = TransferChecked {
            from: self.buyer_ipo_account.to_account_info(),
            mint: self.ipo_mint.to_account_info(),
            to: self.ipo_vault.to_account_info(),
            authority: self.buyer.to_account_info(),
        };
        CpiContext::new(token::ID, accounts)
    }
}

#[derive(Accounts)]
pub struct UpgradeDesk<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [DESK_SEED, owner.key().as_ref(), &desk.serial.to_le_bytes()],
        bump = desk.bump,
        has_one = owner
    )]
    pub desk: Account<'info, Desk>,
    /// CHECK: Treasury address is validated against config before transfer.
    #[account(mut)]
    pub treasury: UncheckedAccount<'info>,
    #[account(mut)]
    pub owner_ipo_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub ipo_vault: Account<'info, TokenAccount>,
    pub ipo_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl<'info> UpgradeDesk<'info> {
    fn transfer_ipo_context(&self) -> CpiContext<'_, '_, '_, 'info, TransferChecked<'info>> {
        let accounts = TransferChecked {
            from: self.owner_ipo_account.to_account_info(),
            mint: self.ipo_mint.to_account_info(),
            to: self.ipo_vault.to_account_info(),
            authority: self.owner.to_account_info(),
        };
        CpiContext::new(token::ID, accounts)
    }
}

#[derive(Accounts)]
pub struct OwnerDesk<'info> {
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [DESK_SEED, owner.key().as_ref(), &desk.serial.to_le_bytes()],
        bump = desk.bump,
        has_one = owner
    )]
    pub desk: Account<'info, Desk>,
}

fn transfer_sol<'info>(
    from: &Signer<'info>,
    to: &UncheckedAccount<'info>,
    _system_program: &Program<'info, System>,
    lamports: u64,
) -> Result<()> {
    let cpi_accounts = anchor_lang::system_program::Transfer {
        from: from.to_account_info(),
        to: to.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(anchor_lang::system_program::ID, cpi_accounts);
    anchor_lang::system_program::transfer(cpi_ctx, lamports)
}

fn transfer_ipo<'info>(
    ctx: CpiContext<'_, '_, '_, 'info, TransferChecked<'info>>,
    raw_amount: u64,
    decimals: u8,
) -> Result<()> {
    transfer_checked(ctx, raw_amount, decimals)
}

fn upgrade_ipo_cost(level: u8) -> Result<u64> {
    UPGRADE_IPO_COSTS
        .get(level as usize)
        .copied()
        .ok_or(ErrorCode::MaxLevel.into())
}

fn upgrade_sol_cost(level: u8) -> Result<u64> {
    UPGRADE_SOL_COSTS
        .get(level as usize)
        .copied()
        .ok_or(ErrorCode::MaxLevel.into())
}

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub ipo_mint: Pubkey,
    pub ipo_vault: Pubkey,
    pub total_supply: u16,
    pub minted: u16,
    pub mint_price_lamports: u64,
    pub ipo_price_tokens: u64,
    pub paused: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Desk {
    pub owner: Pubkey,
    pub serial: u16,
    pub stock: Stock,
    pub level: u8,
    pub rental_days: u16,
    pub rental_price_lamports: u64,
    pub metadata_uri_hash: [u8; 32],
    pub minted_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum Stock {
    Gta,
    Neuralink,
    Anthropic,
}

#[event]
pub struct ConfigInitialized {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub ipo_mint: Pubkey,
    pub total_supply: u16,
    pub mint_price_lamports: u64,
    pub ipo_price_tokens: u64,
}

#[event]
pub struct DeskMinted {
    pub owner: Pubkey,
    pub serial: u16,
    pub stock: Stock,
    pub sol_paid: u64,
    pub ipo_locked: u64,
    pub metadata_uri_hash: [u8; 32],
}

#[event]
pub struct DeskUpgraded {
    pub owner: Pubkey,
    pub serial: u16,
    pub level: u8,
    pub sol_paid: u64,
    pub ipo_locked: u64,
}

#[event]
pub struct RentalListed {
    pub owner: Pubkey,
    pub serial: u16,
    pub rental_days: u16,
    pub rental_price_lamports: u64,
}

#[event]
pub struct PauseSet {
    pub paused: bool,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Supply must be greater than zero")]
    InvalidSupply,
    #[msg("Price must be greater than zero")]
    InvalidPrice,
    #[msg("Minting is paused")]
    MintPaused,
    #[msg("All desks have been minted")]
    SoldOut,
    #[msg("Serial must be the next supply number")]
    InvalidSerial,
    #[msg("Treasury account does not match config")]
    InvalidTreasury,
    #[msg("IPO mint does not match config")]
    InvalidMint,
    #[msg("IPO vault does not match config")]
    InvalidVault,
    #[msg("Desk is already max level")]
    MaxLevel,
    #[msg("Rental terms are invalid")]
    InvalidRental,
}

pub const CONFIG_SEED: &[u8] = b"config";
pub const DESK_SEED: &[u8] = b"desk";
pub const MAX_UPGRADE_LEVEL: u8 = 10;

pub const UPGRADE_IPO_COSTS: [u64; 10] = [
    150_000,
    250_000,
    400_000,
    650_000,
    1_000_000,
    1_500_000,
    2_250_000,
    3_300_000,
    4_800_000,
    7_000_000,
];

pub const UPGRADE_SOL_COSTS: [u64; 10] = [
    30_000_000,
    40_000_000,
    60_000_000,
    80_000_000,
    110_000_000,
    150_000_000,
    210_000_000,
    300_000_000,
    420_000_000,
    600_000_000,
];
