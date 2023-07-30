use anchor_lang::{prelude::*, solana_program::instruction::Instruction};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ZiplineAccountMeta {
    pub pubkey: Pubkey,
    pub is_signer: bool,
    pub is_writable: bool,
}

impl Into<AccountMeta> for ZiplineAccountMeta {
    fn into(self) -> AccountMeta {
        AccountMeta {
            pubkey: self.pubkey,
            is_signer: self.is_signer,
            is_writable: self.is_writable,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ZiplineInstruction {
    pub program_id: Pubkey,
    pub accounts: Vec<ZiplineAccountMeta>,
    pub data: Vec<u8>,
}

impl Into<Instruction> for ZiplineInstruction {
    fn into(self) -> Instruction {
        Instruction {
            program_id: self.program_id,
            accounts: self.accounts.into_iter().map(Into::into).collect(),
            data: self.data,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ZiplineMessage {
    pub nonce: u64,
    pub instructions: Vec<ZiplineInstruction>,
}
