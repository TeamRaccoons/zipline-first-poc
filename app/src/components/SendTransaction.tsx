import { useConnection } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  TransactionInstruction,
  TransactionSignature,
} from "@solana/web3.js";
import { FC, useCallback, useMemo } from "react";
import { notify } from "../utils/notifications";
import { useAccount, useSignMessage } from "wagmi";
import { findZipline } from "lib/ZiplineSdk";
import { intoZiplineExecuteTransaction } from "lib/ZiplineAction";

const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

export const SendTransaction: FC = () => {
  const { connection } = useConnection();
  const { signMessageAsync } = useSignMessage();
  const { address } = useAccount();

  const ethAddress = useMemo(() => {
    if (!address) return;
    return Buffer.from(address.slice(2), "hex");
  }, [address]);

  const zipline = useMemo(() => {
    if (!ethAddress) return;
    return findZipline(ethAddress)[0];
  }, [ethAddress]);

  const onClick = useCallback(async () => {
    let signature: TransactionSignature = "";
    try {
      // Maybe do something more exciting
      const instructions: TransactionInstruction[] = [
        {
          programId: MEMO_PROGRAM_ID,
          keys: [{ pubkey: zipline, isWritable: false, isSigner: true }],
          data: Buffer.from("You executed a tx through metamask!"),
        },
      ];

      const { transaction, blockhashWithLastValidBlockHeight } =
        await intoZiplineExecuteTransaction({
          connection,
          ethAddress,
          instructions,
          signMessageAsync,
        });

      console.log(await connection.simulateTransaction(transaction));
      signature = await connection.sendTransaction(transaction);
      console.log(signature);

      // Send transaction and await for signature
      await connection.confirmTransaction(
        { signature, ...blockhashWithLastValidBlockHeight },
        "confirmed"
      );

      console.log(signature);
      notify({
        type: "success",
        message: "Transaction successful!",
        txid: signature,
      });
    } catch (error: any) {
      console.log(error);
      notify({
        type: "error",
        message: `Transaction failed!`,
        description: error?.message,
        txid: signature,
      });
      console.log("error", `Transaction failed! ${error?.message}`, signature);
      return;
    }
  }, [ethAddress, zipline, signMessageAsync, connection]);

  return (
    <div className="flex flex-row justify-center">
      <div className="relative group items-center">
        <div
          className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 
                rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"
        ></div>
        <button
          className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
          onClick={onClick}
          disabled={!address}
        >
          {/* <div className="hidden group-disabled:block ">
            Wallet not connected
          </div> */}
          <span className="block group-disabled:hidden">
            Send Transaction on solana
          </span>
        </button>
      </div>
    </div>
  );
};
