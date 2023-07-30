/// This is duplicated because web3.js doesn't exactly does what we want
import * as BufferLayout from "@solana/buffer-layout";
import {
  CreateSecp256k1InstructionWithEthAddressParams,
  Secp256k1Program,
  TransactionInstruction,
} from "@solana/web3.js";

const SIGNATURE_OFFSETS_SERIALIZED_SIZE = 11;

const SECP256K1_INSTRUCTION_LAYOUT = BufferLayout.struct<
  Readonly<{
    // ethAddress: Uint8Array;
    ethAddressInstructionIndex: number;
    ethAddressOffset: number;
    messageDataOffset: number;
    messageDataSize: number;
    messageInstructionIndex: number;
    numSignatures: number;
    // recoveryId: number;
    // signature: Uint8Array;
    signatureInstructionIndex: number;
    signatureOffset: number;
  }>
>([
  BufferLayout.u8("numSignatures"),
  BufferLayout.u16("signatureOffset"),
  BufferLayout.u8("signatureInstructionIndex"),
  BufferLayout.u16("ethAddressOffset"),
  BufferLayout.u8("ethAddressInstructionIndex"),
  BufferLayout.u16("messageDataOffset"),
  BufferLayout.u16("messageDataSize"),
  BufferLayout.u8("messageInstructionIndex"),
  // BufferLayout.blob(20, "ethAddress"),
  // BufferLayout.blob(64, "signature"),
  // BufferLayout.u8("recoveryId"),
]);

export const toBuffer = (arr: Buffer | Uint8Array | Array<number>): Buffer => {
  if (Buffer.isBuffer(arr)) {
    return arr;
  } else if (arr instanceof Uint8Array) {
    return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
  } else {
    return Buffer.from(arr);
  }
};

export function createInstructionWithEthAddress(
  params: CreateSecp256k1InstructionWithEthAddressParams & { dataStart: number }
): TransactionInstruction {
  const {
    ethAddress: rawAddress,
    message,
    signature,
    recoveryId,
    instructionIndex = 0,
    dataStart = 1 + SIGNATURE_OFFSETS_SERIALIZED_SIZE,
  } = params;

  let ethAddress: Buffer | Uint8Array | number[];
  if (typeof rawAddress === "string") {
    if (rawAddress.startsWith("0x")) {
      ethAddress = Buffer.from(rawAddress.slice(2), "hex");
    } else {
      ethAddress = Buffer.from(rawAddress, "hex");
    }
  } else {
    ethAddress = rawAddress;
  }

  //   assert(
  //     ethAddress.length === ETHEREUM_ADDRESS_BYTES,
  //     `Address must be ${ETHEREUM_ADDRESS_BYTES} bytes but received ${ethAddress.length} bytes`
  //   );

  // const dataStart = 1 + SIGNATURE_OFFSETS_SERIALIZED_SIZE;
  const signatureOffset = dataStart;
  const ethAddressOffset = signatureOffset + signature.length + 1;
  const messageDataOffset = ethAddressOffset + ethAddress.length + 4; // We skip the u32 length of the prefix
  const numSignatures = 1;

  console.log({ signatureOffset, ethAddressOffset, messageDataOffset });
  const instructionData = Buffer.alloc(SECP256K1_INSTRUCTION_LAYOUT.span);

  SECP256K1_INSTRUCTION_LAYOUT.encode(
    {
      numSignatures,
      signatureOffset,
      signatureInstructionIndex: instructionIndex,
      ethAddressOffset,
      ethAddressInstructionIndex: instructionIndex,
      messageDataOffset,
      messageDataSize: message.length,
      messageInstructionIndex: instructionIndex,
      // signature: toBuffer(signature),
      // ethAddress: toBuffer(ethAddress),
      // recoveryId,
    },
    instructionData
  );

  // instructionData.fill(toBuffer(message), SECP256K1_INSTRUCTION_LAYOUT.span);

  return new TransactionInstruction({
    keys: [],
    programId: Secp256k1Program.programId,
    data: instructionData,
  });
}

import { secp256k1 } from "@noble/curves/secp256k1";

export const ecdsaSign = (
  msgHash: Parameters<typeof secp256k1.sign>[0],
  privKey: Parameters<typeof secp256k1.sign>[1]
) => {
  const signature = secp256k1.sign(msgHash, privKey);
  return [signature.toCompactRawBytes(), signature.recovery!] as const;
};
export const isValidPrivateKey = secp256k1.utils.isValidPrivateKey;
export const publicKeyCreate = secp256k1.getPublicKey;
