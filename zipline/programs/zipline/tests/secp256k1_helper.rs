use sha3::Digest;
use solana_sdk::{
    instruction::Instruction,
    secp256k1_instruction::{
        construct_eth_pubkey, SecpSignatureOffsets, DATA_START, SIGNATURE_SERIALIZED_SIZE,
    },
};

pub struct Secp256k1Payload {
    pub signature: [u8; 64],
    pub recovery_id: u8,
}

/// The eth pubkey, signature and message are located in another instruction, this is for ease of use in the other ix
pub fn new_secp256k1_instruction_with_payload(
    priv_key: &libsecp256k1::SecretKey,
    message_arr: &[u8],
    ix_index: u8,
    offset: usize,
) -> (Instruction, Secp256k1Payload) {
    let secp_pubkey = libsecp256k1::PublicKey::from_secret_key(priv_key);
    let eth_pubkey = construct_eth_pubkey(&secp_pubkey);
    let mut hasher = sha3::Keccak256::new();
    hasher.update(message_arr);
    let message_hash = hasher.finalize();
    let mut message_hash_arr = [0u8; 32];
    message_hash_arr.copy_from_slice(message_hash.as_slice());
    let message = libsecp256k1::Message::parse(&message_hash_arr);
    let (signature, recovery_id) = libsecp256k1::sign(&message, priv_key);
    let signature_arr = signature.serialize();
    assert_eq!(signature_arr.len(), SIGNATURE_SERIALIZED_SIZE);

    let mut instruction_data = vec![];
    instruction_data.resize(
        DATA_START,
        // .saturating_add(eth_pubkey.len())
        // .saturating_add(signature_arr.len())
        // .saturating_add(1)
        // .saturating_add(message_arr.len())
        0,
    );

    let signature_offset = offset;
    // instruction_data[signature_offset..signature_offset.saturating_add(signature_arr.len())]
    //     .copy_from_slice(&signature_arr);

    // instruction_data[signature_offset.saturating_add(signature_arr.len())] =
    //     recovery_id.serialize();

    let eth_address_offset = signature_offset
        .saturating_add(signature_arr.len())
        .saturating_add(1);
    // instruction_data[eth_address_offset..eth_address_offset.saturating_add(eth_pubkey.len())]
    //     .copy_from_slice(&eth_pubkey);

    let message_data_offset = eth_address_offset.saturating_add(eth_pubkey.len());
    // instruction_data[message_data_offset..].copy_from_slice(message_arr);

    let num_signatures = 1;
    instruction_data[0] = num_signatures;
    let offsets = SecpSignatureOffsets {
        signature_offset: signature_offset as u16,
        signature_instruction_index: ix_index,
        eth_address_offset: eth_address_offset as u16,
        eth_address_instruction_index: ix_index,
        message_data_offset: message_data_offset as u16,
        message_data_size: message_arr.len() as u16,
        message_instruction_index: ix_index,
    };
    let writer = std::io::Cursor::new(&mut instruction_data[1..DATA_START]);
    bincode::serialize_into(writer, &offsets).unwrap();

    (
        Instruction {
            program_id: solana_sdk::secp256k1_program::id(),
            accounts: vec![],
            data: instruction_data,
        },
        Secp256k1Payload {
            signature: signature_arr,
            recovery_id: recovery_id.serialize(),
        },
    )
}
