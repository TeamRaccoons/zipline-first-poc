use anchor_lang::{prelude::*, solana_program::sysvar};

mod secp256k1_defs;
pub mod state;
pub use state::ZiplineMessage;

use crate::secp256k1_defs::{iter_signature_offsets, SecpSignatureOffsets};
declare_id!("8KKAek3c9jAT9PPFTfwbpQwrd4av8WH5qKSc8BgfCD1R");

pub const HASHED_PUBKEY_SERIALIZED_SIZE: usize = 20;

pub const ZIPLINE_SEED: &[u8] = b"zipline";
pub const PULLEY_SEED: &[u8] = b"pulley";

#[account]
#[derive(InitSpace)]
pub struct Pulley {
    zipline_bump: u8,
    eth_address: [u8; HASHED_PUBKEY_SERIALIZED_SIZE],
    /// Think more about implication of overflow and potential replay, most likely we need the blockhash and the nonce
    nonce: u64,
}

/// Verify that the zipline message was signed
fn verify_message(instructions_sysvar: &AccountInfo, program_id: &Pubkey) -> Result<()> {
    let current_ix_index = sysvar::instructions::load_current_index_checked(instructions_sysvar)?;
    require_neq!(current_ix_index, 0);
    let current_ixn = sysvar::instructions::load_instruction_at_checked(
        current_ix_index as usize,
        instructions_sysvar,
    )?;
    require_keys_eq!(current_ixn.program_id, *program_id); // This ensures it is a top level invocation as the runtime does not allow re-entrency

    // The previous ix must be a secp256k1 program instruction
    let secp256k1_ix_index = (current_ix_index - 1) as u8;
    let secp256k1_ix = sysvar::instructions::load_instruction_at_checked(
        secp256k1_ix_index as usize,
        instructions_sysvar,
    )
    .map_err(|_| ProgramError::InvalidAccountData)?;

    // Check that the instruction is actually for the secp256k1 verify program
    require_keys_eq!(
        secp256k1_ix.program_id,
        anchor_lang::solana_program::secp256k1_program::ID
    );

    let SecpSignatureOffsets {
        signature_offset,
        signature_instruction_index,
        eth_address_offset,
        eth_address_instruction_index,
        message_data_offset,
        message_data_size,
        message_instruction_index,
    } = iter_signature_offsets(&secp256k1_ix.data)
        .unwrap()
        .next()
        .ok_or(ErrorCode::MissingSignature)?;
    require_eq!(signature_offset, 8);
    require_eq!(signature_instruction_index as u16, current_ix_index);
    require_eq!(eth_address_offset, 8 + 64 + 1);
    require_eq!(eth_address_instruction_index as u16, current_ix_index);
    require_eq!(message_data_offset, 8 + 64 + 1 + 20 + 4); // + 4 because the prefix is a borsh string which starts with length, but we ignore the length
    require_eq!(
        message_data_size,
        current_ixn.data.len() as u16 - message_data_offset
    ); // variable data size, erm, whatever is left should be safu because anchor ix deser is strict on size
    require_eq!(message_instruction_index as u16, current_ix_index);

    Ok(())
}

#[program]
pub mod zipline {
    use anchor_lang::solana_program::{account_info::next_account_infos, program::invoke_signed};

    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        eth_address: [u8; HASHED_PUBKEY_SERIALIZED_SIZE],
    ) -> Result<()> {
        ctx.accounts.pulley.set_inner(Pulley {
            zipline_bump: *ctx.bumps.get("zipline").unwrap(),
            eth_address,
            nonce: 0,
        });
        Ok(())
    }

    /// fee payer needs to get something out of this
    /// this allows tx failures to be replayed since the nonce is not increased,
    pub fn execute(
        ctx: Context<Execute>,
        signature: [u8; 64],
        recovery_id: u8,
        eth_address: [u8; 20],
        prefix: String,
        message: ZiplineMessage,
    ) -> Result<()> {
        let nonce = &mut ctx.accounts.pulley.nonce;
        require!(message.nonce > *nonce, ErrorCode::InvalidNonce);
        ctx.accounts.pulley.nonce += 1;
        let expected_eth_address = ctx.accounts.pulley.eth_address;
        if expected_eth_address != eth_address {
            return Err(ErrorCode::InvalidEthAddress.into());
        }

        verify_message(&ctx.accounts.instructions_sysvar, &ctx.program_id)?;

        let mut remaining_accounts_iter = ctx.remaining_accounts.iter();
        // TODO: Validate account infos, otherwise the cpi can be failed on purpose
        for instruction in message.instructions {
            let accounts_len = instruction.accounts.len();
            invoke_signed(
                &instruction.into(),
                next_account_infos(&mut remaining_accounts_iter, accounts_len)?,
                &[&[
                    ZIPLINE_SEED,
                    eth_address.as_ref(),
                    &[ctx.accounts.pulley.zipline_bump],
                ]],
            )?;
        }

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(eth_address: [u8; HASHED_PUBKEY_SERIALIZED_SIZE])]
pub struct Initialize<'info> {
    #[account(mut)]
    payer: Signer<'info>,
    #[account(init, seeds = [PULLEY_SEED, eth_address.as_ref()], bump, payer = payer, space = 8 + Pulley::INIT_SPACE)]
    pulley: Account<'info, Pulley>,
    #[account(seeds = [ZIPLINE_SEED, eth_address.as_ref()], bump)]
    zipline: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Execute<'info> {
    #[account(mut)]
    pulley: Account<'info, Pulley>,
    #[account(seeds = [ZIPLINE_SEED, pulley.eth_address.as_ref()], bump = pulley.zipline_bump)]
    zipline: UncheckedAccount<'info>,
    #[account(address = sysvar::instructions::ID)]
    instructions_sysvar: UncheckedAccount<'info>,
}

#[error_code]
pub enum ErrorCode {
    InvalidNonce,
    InvalidDataOffsets,
    InvalidEthAddress,
    MissingSignature,
}
