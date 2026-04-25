use anchor_lang::prelude::*;

declare_id!("5ygRCA7pF2h7GeGxP9RaiNQNTNb5J5GnB9XSzxh75gVw");

#[program]
pub mod breezo {
    use super::*;

    pub fn init_node(ctx: Context<InitNode>) -> Result<()> {
        let node = &mut ctx.accounts.node_account;

        node.owner          = ctx.accounts.owner.key();
        node.device_public_key = ctx.accounts.device_public_key.key();
        node.reward_balance = 0;

        Ok(())
    }

    pub fn add_reward(ctx: Context<AddReward>, amount: u64) -> Result<()> {
        let node = &mut ctx.accounts.node_account;

        require!(
            ctx.accounts.authority.key() == node.owner,
            ErrorCode::Unauthorized
        );

        node.reward_balance = node.reward_balance
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;

        Ok(())
    }

pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
    let amount = {
        let node = &mut ctx.accounts.node_account;

        let amount = node.reward_balance;
        require!(amount > 0, ErrorCode::NoReward);
        require!(
            ctx.accounts.owner.key() == node.owner,
            ErrorCode::Unauthorized
        );

        node.reward_balance = 0; // zero BEFORE dropping borrow
        amount
    }; //  mutable borrow of node_account dropped here

    // now safe to borrow node_account again for lamport transfer
    **ctx.accounts.node_account.to_account_info().try_borrow_mut_lamports()? -= amount;
    **ctx.accounts.owner.to_account_info().try_borrow_mut_lamports()?        += amount;

    Ok(())
}
}


// ACCOUNT STRUCTS


#[account]
pub struct NodeAccount {
    pub owner:             Pubkey,  // 32
    pub device_public_key: Pubkey,  // 32
    pub reward_balance:    u64,     // 8
}

const NODE_SIZE: usize = 8 + 32 + 32 + 8; // discriminator + fields


// CONTEXTS


#[derive(Accounts)]
pub struct InitNode<'info> {
    #[account(
        init,
        payer = authority,          // 👈 backend wallet pays rent
        space = NODE_SIZE
    )]
    pub node_account: Account<'info, NodeAccount>,

    /// CHECK: user wallet — stored as owner, does NOT need to sign
    pub owner: AccountInfo<'info>,  // 👈 not a Signer

    #[account(mut)]
    pub authority: Signer<'info>,   // 👈 backend wallet signs + pays

    /// CHECK: device pubkey — stored on-chain, no validation needed
    pub device_public_key: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddReward<'info> {
    #[account(mut)]
    pub node_account: Account<'info, NodeAccount>,

    pub authority: Signer<'info>,   // 👈 backend wallet signs
}

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    pub node_account: Account<'info, NodeAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,       // 👈 user must sign from frontend

    pub system_program: Program<'info, System>,
}


// ERRORS


#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized access")]
    Unauthorized,

    #[msg("No reward available")]
    NoReward,

    #[msg("Arithmetic overflow")]
    Overflow,
}
