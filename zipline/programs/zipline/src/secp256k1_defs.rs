/// From the example
use anchor_lang::solana_program::program_error::ProgramError;
use std::iter::Iterator;

pub const HASHED_PUBKEY_SERIALIZED_SIZE: usize = 20;
pub const SIGNATURE_SERIALIZED_SIZE: usize = 64;
pub const SIGNATURE_OFFSETS_SERIALIZED_SIZE: usize = 11;

/// The structure encoded in the secp2256k1 instruction data.
pub struct SecpSignatureOffsets {
    pub signature_offset: u16,
    pub signature_instruction_index: u8,
    pub eth_address_offset: u16,
    pub eth_address_instruction_index: u8,
    pub message_data_offset: u16,
    pub message_data_size: u16,
    pub message_instruction_index: u8,
}

pub fn iter_signature_offsets(
    secp256k1_instr_data: &[u8],
) -> Result<impl Iterator<Item = SecpSignatureOffsets> + '_, ProgramError> {
    // First element is the number of `SecpSignatureOffsets`.
    let num_structs = *secp256k1_instr_data
        .get(0)
        .ok_or(ProgramError::InvalidArgument)?;

    let all_structs_size = SIGNATURE_OFFSETS_SERIALIZED_SIZE * num_structs as usize;
    let all_structs_slice = secp256k1_instr_data
        .get(1..all_structs_size + 1)
        .ok_or(ProgramError::InvalidArgument)?;

    fn decode_u16(chunk: &[u8], index: usize) -> u16 {
        u16::from_le_bytes(<[u8; 2]>::try_from(&chunk[index..index + 2]).unwrap())
    }

    Ok(all_structs_slice
        .chunks(SIGNATURE_OFFSETS_SERIALIZED_SIZE)
        .map(|chunk| SecpSignatureOffsets {
            signature_offset: decode_u16(chunk, 0),
            signature_instruction_index: chunk[2],
            eth_address_offset: decode_u16(chunk, 3),
            eth_address_instruction_index: chunk[5],
            message_data_offset: decode_u16(chunk, 6),
            message_data_size: decode_u16(chunk, 8),
            message_instruction_index: chunk[10],
        }))
}
