import {
  Contract,
  rpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Keypair,
  nativeToScVal,
  scValToNative,
  Address,
} from "@stellar/stellar-sdk";

const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;
export const CONTRACT_ID =
  process.env.NEXT_PUBLIC_CONTRACT_ID ||
  "CDDWCPMK53VWWDGQ7O3HLXFOQOFTQOTRGJMPCUEBGBUBX2QA365OH2JU";

export type IdentityRole = "admin" | "verifier" | "agent";

// Secret keys for the demo identities. These are TESTNET-ONLY keys with no
// real value, loaded from local env vars that are never committed to git.
// This lets the demo sign transactions directly in the browser without a
// wallet extension, which is fine for a hackathon demo on testnet but would
// never be appropriate for mainnet / production use.
function getSecretKey(role: IdentityRole): string {
  const key =
    role === "admin"
      ? process.env.NEXT_PUBLIC_ADMIN_SECRET
      : role === "verifier"
      ? process.env.NEXT_PUBLIC_VERIFIER_SECRET
      : process.env.NEXT_PUBLIC_AGENT_SECRET;

  if (!key) {
    throw new Error(
      `Missing secret key for role "${role}". Add it to .env.local (see .env.local.example).`
    );
  }
  return key;
}

function getServer() {
  return new rpc.Server(RPC_URL);
}

function getKeypair(role: IdentityRole): Keypair {
  return Keypair.fromSecret(getSecretKey(role));
}

export function getPublicKey(role: IdentityRole): string {
  return getKeypair(role).publicKey();
}

async function invokeContract(
  role: IdentityRole,
  method: string,
  args: ReturnType<typeof nativeToScVal>[],
  readOnly = false
): Promise<{ result: unknown; txHash?: string }> {
  const server = getServer();
  const keypair = getKeypair(role);
  const account = await server.getAccount(keypair.publicKey());
  const contract = new Contract(CONTRACT_ID);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(keypair);

  if (readOnly) {
    const sim = await server.simulateTransaction(prepared);
    if (rpc.Api.isSimulationSuccess(sim) && sim.result) {
      return { result: scValToNative(sim.result.retval) };
    }
    throw new Error("Simulation failed");
  }

  const sendResponse = await server.sendTransaction(prepared);
  if (sendResponse.status === "ERROR") {
    throw new Error(`Transaction failed: ${JSON.stringify(sendResponse.errorResult)}`);
  }

  let getResponse = await server.getTransaction(sendResponse.hash);
  let attempts = 0;
  while (getResponse.status === "NOT_FOUND" && attempts < 15) {
    await new Promise((r) => setTimeout(r, 1500));
    getResponse = await server.getTransaction(sendResponse.hash);
    attempts++;
  }

  if (getResponse.status !== "SUCCESS") {
    throw new Error(`Transaction did not succeed: ${getResponse.status}`);
  }

  const returnValue =
    getResponse.status === "SUCCESS" && getResponse.returnValue
      ? scValToNative(getResponse.returnValue)
      : null;

  return { result: returnValue, txHash: sendResponse.hash };
}

export async function registerVerifier(verifierPublicKey: string) {
  return invokeContract("admin", "register_verifier", [
    new Address(verifierPublicKey).toScVal(),
  ]);
}

export async function issueCredential(params: {
  verifierPublicKey: string;
  agentPublicKey: string;
  capability: string;
  proofHashHex: string; // 64 hex chars (32 bytes)
  validitySeconds: number;
}) {
  const proofHashBytes = Buffer.from(params.proofHashHex, "hex");
  return invokeContract("verifier", "issue_credential", [
    new Address(params.verifierPublicKey).toScVal(),
    new Address(params.agentPublicKey).toScVal(),
    nativeToScVal(params.capability, { type: "symbol" }),
    nativeToScVal(proofHashBytes, { type: "bytes" }),
    nativeToScVal(params.validitySeconds, { type: "u64" }),
  ]);
}

export async function hasCredential(agentPublicKey: string, capability: string) {
  return invokeContract(
    "admin",
    "has_credential",
    [
      new Address(agentPublicKey).toScVal(),
      nativeToScVal(capability, { type: "symbol" }),
    ],
    true
  );
}

export async function revokeCredential(agentPublicKey: string, capability: string) {
  const adminKey = getPublicKey("admin");
  return invokeContract("admin", "revoke_credential", [
    new Address(adminKey).toScVal(),
    new Address(agentPublicKey).toScVal(),
    nativeToScVal(capability, { type: "symbol" }),
  ]);
}

export function explorerTxUrl(hash: string) {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function explorerContractUrl() {
  return `https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`;
}
