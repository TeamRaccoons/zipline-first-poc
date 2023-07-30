import {
  Connection,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  RELAYER_KEYPAIR,
  createZiplineExecuteInstructions,
  createZiplineMessage,
  createZiplineProgram,
  findPulley,
} from "./ZiplineSdk";
import { BN } from "@coral-xyz/anchor";
import { useSignMessage } from "wagmi";

export async function intoZiplineExecuteTransaction({
  connection,
  ethAddress,
  instructions,
  signMessageAsync,
}: {
  connection: Connection;
  ethAddress: Buffer;
  instructions: TransactionInstruction[];
  signMessageAsync: ReturnType<typeof useSignMessage>["signMessageAsync"];
}) {
  const program = createZiplineProgram(connection);
  const pulleyAccount = await program.account.pulley.fetch(
    findPulley(ethAddress)[0]
  );
  const { ziplineMessage, ziplineMessageData } = createZiplineMessage({
    nonce: pulleyAccount.nonce.add(new BN(1)),
    instructions,
  });

  // Looking at the package, it supports this internally while narrowing the type in the parameters
  const message = { raw: new Uint8Array(ziplineMessageData) };
  const signMessageData = await signMessageAsync({
    message: message as any,
  });
  console.log("Length before prefix:", message.raw.length);

  const prefix = "\x19Ethereum Signed Message:\n" + message.raw.length;
  const personalSignMessageData = Buffer.concat([
    Buffer.from(prefix),
    message.raw,
  ]);

  const ziplineExecuteInstructions = await createZiplineExecuteInstructions({
    signMessageData,
    ethAddress,
    prefix,
    ziplineMessage,
    message: personalSignMessageData,
  });

  const blockhashAndLastValidBlockHeight =
    await connection.getLatestBlockhash();
  // Create a new TransactionMessage with version and compile it to legacy
  const messageLegacy = new TransactionMessage({
    payerKey: RELAYER_KEYPAIR.publicKey,
    recentBlockhash: blockhashAndLastValidBlockHeight.blockhash,
    instructions: ziplineExecuteInstructions,
  }).compileToLegacyMessage();

  // Create a new VersionedTransacction which supports legacy and v0
  const transaction = new VersionedTransaction(messageLegacy);
  transaction.sign([RELAYER_KEYPAIR]);
  console.log(
    RELAYER_KEYPAIR.publicKey.toBase58(),
    //@ts-ignore
    connection._rpcEndpoint
  );

  return {
    transaction,
    blockhashWithLastValidBlockHeight: blockhashAndLastValidBlockHeight,
  };
}
