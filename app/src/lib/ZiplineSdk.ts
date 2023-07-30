import {
  Connection,
  Keypair,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import { IDL, Zipline } from "./zipline";
import {
  AnchorProvider,
  IdlTypes,
  Program,
  Provider,
  Wallet,
} from "@coral-xyz/anchor";
import { createInstructionWithEthAddress } from "./Secp256k1";

export const RELAYER_KEYPAIR = Keypair.generate();

const ZIPLINE_SEED = Buffer.from("zipline");
const PULLEY_SEED = Buffer.from("pulley");

type ZiplineMessage = IdlTypes<Zipline>["ZiplineMessage"];

const ZIPLINE_PROGRAM_ID = new PublicKey(
  "8KKAek3c9jAT9PPFTfwbpQwrd4av8WH5qKSc8BgfCD1R"
);

const PROGRAM = new Program<Zipline>(IDL, ZIPLINE_PROGRAM_ID, {} as Provider);

export function findZipline(ethAddress: Buffer) {
  return PublicKey.findProgramAddressSync(
    [ZIPLINE_SEED, ethAddress],
    ZIPLINE_PROGRAM_ID
  );
}

export function findPulley(ethAddress: Buffer) {
  return PublicKey.findProgramAddressSync(
    [PULLEY_SEED, ethAddress],
    ZIPLINE_PROGRAM_ID
  );
}

export function createZiplineProgram(connection: Connection) {
  return new Program<Zipline>(
    IDL,
    ZIPLINE_PROGRAM_ID,
    new AnchorProvider(connection, {} as Wallet, {})
  );
}

export function createZiplineProgramWithProvider(provider: Provider) {
  return new Program<Zipline>(IDL, ZIPLINE_PROGRAM_ID, provider);
}

export function createZiplineMessage({
  nonce,
  instructions,
}: {
  nonce: number;
  instructions: TransactionInstruction[];
}) {
  // Convert into wrapping stuff
  const ziplineMessage: ZiplineMessage = {
    nonce,
    instructions: instructions.map(({ programId, keys, data }) => ({
      programId,
      accounts: keys,
      data,
    })),
  };

  return {
    ziplineMessage,
    ziplineMessageData: PROGRAM.coder.types.encode(
      "ZiplineMessage",
      ziplineMessage
    ),
  };
}

export async function createZiplineExecuteInstructions({
  signMessageData,
  ethAddress,
  prefix,
  ziplineMessage,
  message,
}: {
  signMessageData: `0x${string}`;
  ethAddress: Buffer;
  prefix: string;
  ziplineMessage: ZiplineMessage;
  message: Buffer;
}) {
  const signMessageDataBuffer = Buffer.from(signMessageData.slice(2), "hex");
  const signature = signMessageDataBuffer.subarray(0, 64);
  // v = recovery_id + 27
  const v = signMessageDataBuffer.readUint8(64);
  const recoveryId = v - 27;
  console.log("recoveryId:", recoveryId);

  const zipline = findZipline(ethAddress)[0];
  const pulley = findPulley(ethAddress)[0];

  const secp256k1Instruction = createInstructionWithEthAddress({
    ethAddress,
    message,
    signature,
    recoveryId,
    instructionIndex: 1,
    dataStart: 8,
  });

  const remainingAccounts = ziplineMessage.instructions
    .map(({ accounts }) => [
      ...accounts.map((key) => ({
        ...key,
        isSigner: key.pubkey.equals(zipline) ? false : key.isSigner,
      })),
    ])
    .flat();

  remainingAccounts.push(
    ...ziplineMessage.instructions.map(({ programId }) => ({
      pubkey: programId,
      isWritable: false,
      isSigner: false,
    }))
  );

  const executeInstruction = await PROGRAM.methods
    .execute(
      [...signature],
      recoveryId,
      [...ethAddress],
      prefix,
      ziplineMessage
    )
    .accountsStrict({
      pulley,
      zipline,
      instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
    })
    .remainingAccounts(remainingAccounts)
    .instruction();

  return [secp256k1Instruction, executeInstruction];
}
