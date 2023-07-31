use anchor_lang::{
    prelude::{AccountMeta, Pubkey},
    AnchorSerialize, InstructionData, ToAccountMetas,
};
use rand::{thread_rng, Rng};
use solana_program_test::*;
use solana_sdk::{
    instruction::Instruction,
    native_token::LAMPORTS_PER_SOL,
    pubkey,
    secp256k1_instruction::{self, construct_eth_pubkey},
    signature::Keypair,
    signer::Signer,
    system_instruction, system_program, sysvar,
    transaction::{Transaction, TransactionError},
};
mod secp256k1_helper;
use zipline::{
    self,
    state::{ZiplineAccountMeta, ZiplineInstruction},
    ZiplineMessage,
};

pub async fn process_transaction(
    context: &mut ProgramTestContext,
    instructions: &[Instruction],
    signers: &[&Keypair],
) -> std::result::Result<(), BanksClientError> {
    let recent_blockhash = context.banks_client.get_latest_blockhash().await?;

    let mut all_signers = vec![&context.payer];
    all_signers.extend_from_slice(signers);

    let transaction = Transaction::new_signed_with_payer(
        &instructions,
        Some(&context.payer.pubkey()),
        &all_signers,
        recent_blockhash,
    );

    context.banks_client.process_transaction(transaction).await
}

type EthAddress = [u8; 20];

fn find_pulley(eth_address: &EthAddress) -> Pubkey {
    Pubkey::find_program_address(&[zipline::PULLEY_SEED, eth_address.as_ref()], &zipline::ID).0
}

fn find_zipline(eth_address: &EthAddress) -> Pubkey {
    Pubkey::find_program_address(&[zipline::ZIPLINE_SEED, eth_address.as_ref()], &zipline::ID).0
}

#[tokio::test]
async fn test_execute() {
    let pt = ProgramTest::new("zipline", zipline::ID, None);
    let mut context = pt.start_with_context().await;
    let payer = context.payer.pubkey();

    let secret_key = libsecp256k1::SecretKey::random(&mut thread_rng());
    let public_key = libsecp256k1::PublicKey::from_secret_key(&secret_key);
    let eth_address = construct_eth_pubkey(&public_key);

    let pulley = find_pulley(&eth_address);
    let zipline = find_zipline(&eth_address);

    process_transaction(
        &mut context,
        &[
            Instruction {
                program_id: zipline::ID,
                accounts: zipline::accounts::Initialize {
                    payer,
                    pulley,
                    zipline,
                    system_program: system_program::ID,
                }
                .to_account_metas(None),
                data: zipline::instruction::Initialize { eth_address }.data(),
            },
            system_instruction::transfer(&payer, &zipline, 10 * LAMPORTS_PER_SOL), // Fund the zipline
        ],
        &[],
    )
    .await
    .unwrap();

    let transfer_ix = system_instruction::transfer(&zipline, &payer, LAMPORTS_PER_SOL);

    // Basic system program transfer
    let message = ZiplineMessage {
        nonce: 1,
        instructions: vec![ZiplineInstruction {
            program_id: transfer_ix.program_id,
            accounts: transfer_ix
                .accounts
                .iter()
                .cloned()
                .map(
                    |AccountMeta {
                         pubkey,
                         is_signer,
                         is_writable,
                     }| ZiplineAccountMeta {
                        pubkey,
                        is_signer,
                        is_writable,
                    },
                )
                .collect(),
            data: transfer_ix.data,
        }],
    };
    let zipline_message_bytes = message.try_to_vec().unwrap();

    let prefix = format!(
        "\x19Ethereum Signed Message:\n{}",
        zipline_message_bytes.len()
    );
    let message_bytes = [prefix.as_bytes(), &zipline_message_bytes].concat();
    let (secp256k1_instruction, secpk256k1_payload) =
        secp256k1_helper::new_secp256k1_instruction_with_payload(&secret_key, &message_bytes, 1, 8);

    let mut execute_ix = Instruction {
        program_id: zipline::ID,
        accounts: zipline::accounts::Execute {
            pulley,
            zipline,
            instructions_sysvar: sysvar::instructions::ID,
        }
        .to_account_metas(None),
        data: zipline::instruction::Execute {
            signature: secpk256k1_payload.signature,
            recovery_id: secpk256k1_payload.recovery_id,
            eth_address,
            prefix,
            message,
        }
        .data(),
    };
    let mut transfer_account_metas = transfer_ix.accounts.clone();
    transfer_account_metas[0].is_signer = false;
    transfer_account_metas.push(AccountMeta::new_readonly(transfer_ix.program_id, false));
    execute_ix.accounts.extend(transfer_account_metas);

    process_transaction(&mut context, &[secp256k1_instruction, execute_ix], &[])
        .await
        .unwrap();
}
