use anchor_lang::prelude::*;

declare_id!("5ygRCA7pF2h7GeGxP9RaiNQNTNb5J5GnB9XSzxh75gVw");

#[program]
pub mod breezo {
    use super::*;

    pub fn init_node(ctx: Context<InitNode>) -> Result<()> {
        let node = &mut ctx.accounts.node_account;

        node.owner = ctx.accounts.owner.key();
        node.device_public_key = ctx.accounts.device_public_key.key();
        node.reward_balance = 0;

        Ok(())
    }

    pub fn add_reward(ctx: Context<AddReward>, amount: u64) -> Result<()> {
        let node = &mut ctx.accounts.node_account;

        // backend authority check
        require!(
            ctx.accounts.authority.key() == ctx.accounts.backend.key(),
            ErrorCode::Unauthorized
        );

        node.reward_balance = node
            .reward_balance
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;

        Ok(())
    }

    pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
        let amount: u64;

        {
            let node = &mut ctx.accounts.node_account;

            require!(node.reward_balance > 0, ErrorCode::NoReward);
            require!(
                ctx.accounts.owner.key() == node.owner,
                ErrorCode::Unauthorized
            );

            amount = node.reward_balance;
            node.reward_balance = 0;
        }

        // safe lamport transfer
        **ctx
            .accounts
            .node_account
            .to_account_info()
            .try_borrow_mut_lamports()? -= amount;

        **ctx
            .accounts
            .owner
            .to_account_info()
            .try_borrow_mut_lamports()? += amount;

        Ok(())
    }
}

#[account]
pub struct NodeAccount {
    pub owner: Pubkey,
    pub device_public_key: Pubkey,
    pub reward_balance: u64,
}

// discriminator + 2 pubkeys + u64
const NODE_SIZE: usize = 8 + 32 + 32 + 8;

#[derive(Accounts)]
pub struct InitNode<'info> {
    #[account(init, payer = authority, space = NODE_SIZE)]
    pub node_account: Account<'info, NodeAccount>,

    /// CHECK: stored only
    pub owner: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: device identity
    pub device_public_key: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddReward<'info> {
    #[account(mut)]
    pub node_account: Account<'info, NodeAccount>,

    pub authority: Signer<'info>,

    /// CHECK: backend wallet for verification
    pub backend: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    pub node_account: Account<'info, NodeAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized access")]
    Unauthorized,

    #[msg("No reward available")]
    NoReward,

    #[msg("Arithmetic overflow")]
    Overflow,
}
