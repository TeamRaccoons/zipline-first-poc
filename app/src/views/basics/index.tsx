import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { SendTransaction } from "../../components/SendTransaction";
import { Profile } from "components/Profile";
import { useAccount, useQuery, useSignMessage } from "wagmi";
import {
  RELAYER_KEYPAIR,
  createZiplineProgram,
  createZiplineProgramWithProvider,
  findPulley,
  findZipline,
} from "lib/ZiplineSdk";
import { useConnection } from "@solana/wallet-adapter-react";
import {
  AddressLookupTableAccount,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import { notify } from "utils/notifications";
import useUserSOLBalanceStore from "stores/useUserSOLBalanceStore";
import { AnchorProvider } from "@coral-xyz/anchor";
import { ClientSolana } from "@nightlylabs/nightly-connect-solana";
import { intoZiplineExecuteTransaction } from "lib/ZiplineAction";

class KeypairWallet {
  constructor(private keypair: Keypair) {}
  signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T
  ): Promise<T> {
    if ("version" in tx) {
      tx.sign([this.keypair]);
    } else {
      tx.sign(this.keypair);
    }
    return Promise.resolve(tx);
  }
  signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[]
  ): Promise<T[]> {
    throw new Error("Not supported");
  }
  get publicKey() {
    return this.keypair.publicKey;
  }
}

export const BasicsView: FC = ({}) => {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { connection } = useConnection();
  const { getUserSOLBalance } = useUserSOLBalanceStore();
  const [nightlyConnectLink, setNightlyConnectLink] = useState<string>("");
  const ethAddress = useMemo(() => {
    if (!address) return;
    return Buffer.from(address.slice(2), "hex");
  }, [address]);

  const pulley = useMemo(() => {
    if (!ethAddress) return;
    return findPulley(ethAddress)[0];
  }, [ethAddress]);

  const zipline = useMemo(() => {
    if (!ethAddress) return;
    return findZipline(ethAddress)[0];
  }, [ethAddress]);

  const { data: pulleyAccount } = useQuery(
    ["pulley", pulley?.toBase58() ?? ""],
    async () => {
      const program = createZiplineProgram(connection);
      return program.account.pulley.fetchNullable(pulley);
    },
    { refetchInterval: 5_000 }
  );

  useEffect(() => {
    async function connectNightlyConnect() {
      if (!nightlyConnectLink) return;
      const url = new URL(nightlyConnectLink);
      const client: ClientSolana = await ClientSolana.create({
        url: url.searchParams["relay"],
      });
      const sessionId = url.pathname;
      console.log("sessionID:", sessionId);
      const info = await client.getInfo(sessionId);

      const message = {
        publicKeys: [zipline.toBase58()],
        sessionId,
      };
      await client.connect(message);
      console.log(`Connected with ${info}`);

      client.on("signTransactions", async (e) => {
        const tx = e.transactions[0];

        const addressLookupTableAccounts = await Promise.all(
          tx.message.addressTableLookups.map(async (lookup) => {
            return new AddressLookupTableAccount({
              key: lookup.accountKey,
              state: AddressLookupTableAccount.deserialize(
                await connection
                  .getAccountInfo(lookup.accountKey)
                  .then((res) => res.data)
              ),
            });
          })
        );
        const message = TransactionMessage.decompile(tx.message, {
          addressLookupTableAccounts,
        });

        const {
          transaction: ziplineTransaction,
          blockhashWithLastValidBlockHeight,
        } = await intoZiplineExecuteTransaction({
          connection,
          ethAddress,
          instructions: message.instructions,
          addressLookupTableAccounts,
          signMessageAsync,
        });

        // resolve
        await client.resolveSignTransaction({
          requestId: e.requestId,
          signedTransactions: [ziplineTransaction],
        });

        notify({
          type: "success",
          message: "Signed tx",
          // txid: initSignature,
        });
      });
    }
    connectNightlyConnect();
  }, [zipline, connection, ethAddress, signMessageAsync, nightlyConnectLink]);

  const createPulley = useCallback(async () => {
    let signature: TransactionSignature = "";

    try {
      signature = await connection.requestAirdrop(
        RELAYER_KEYPAIR.publicKey,
        LAMPORTS_PER_SOL
      );

      // Get the lates block hash to use on our transaction and confirmation
      let latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature, ...latestBlockhash },
        "confirmed"
      );

      getUserSOLBalance(RELAYER_KEYPAIR.publicKey, connection);

      const provider = new AnchorProvider(
        connection,
        new KeypairWallet(RELAYER_KEYPAIR),
        {}
      );
      const program = createZiplineProgramWithProvider(provider);
      const initSignature = await program.methods
        .initialize([...ethAddress])
        .accountsStrict({
          payer: RELAYER_KEYPAIR.publicKey,
          pulley,
          zipline,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      notify({
        type: "success",
        message: "Airdrop and create pulley successful!",
        txid: initSignature,
      });
    } catch (error: any) {
      notify({
        type: "error",
        message: `Airdrop failed!`,
        description: error?.message,
        txid: signature,
      });
      console.log("error", `Airdrop failed! ${error?.message}`, signature);
    }
  }, [connection, ethAddress, zipline, pulley, getUserSOLBalance]);

  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <h1 className="text-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-fuchsia-500 mt-10 mb-8">
          Basics
        </h1>
        {/* CONTENT GOES HERE */}
        <div className="text-center">
          <Profile />
          <div>ETH address: {address}</div>
          <div>Associated zipline: {zipline?.toBase58()}</div>
          <div>Relayer: {RELAYER_KEYPAIR.publicKey.toBase58()}</div>
          {pulleyAccount === null && (
            <div>
              <button
                className="w-60 m-2 btn bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                onClick={createPulley}
              >
                Airdrop relayer and create pulley
              </button>
            </div>
          )}
          {zipline !== undefined && (
            <div>
              <button
                className="w-60 m-2 btn bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                onClick={async () => {
                  const signature = await connection.requestAirdrop(
                    zipline,
                    LAMPORTS_PER_SOL
                  );

                  // Get the lates block hash to use on our transaction and confirmation
                  let latestBlockhash = await connection.getLatestBlockhash();
                  await connection.confirmTransaction(
                    { signature, ...latestBlockhash },
                    "confirmed"
                  );

                  notify({
                    type: "success",
                    message: "Airdrop to zipline successful!",
                    txid: signature,
                  });
                }}
              >
                Airdrop to zipline
              </button>
            </div>
          )}
          <input
            type="text"
            placeholder="Session id"
            className="input w-full max-w-xs"
            value={nightlyConnectLink}
            onChange={(e) => setNightlyConnectLink(e.target.value)}
          ></input>
          {/* <SignMessage /> */}
          <SendTransaction />
          {/* <SendVersionedTransaction /> */}
        </div>
      </div>
    </div>
  );
};
