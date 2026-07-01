"use client";

import { useState } from "react";
import {
  registerVerifier,
  issueCredential,
  hasCredential,
  revokeCredential,
  getPublicKey,
  explorerTxUrl,
  explorerContractUrl,
  CONTRACT_ID,
} from "@/lib/stellar";

type StepStatus = "idle" | "loading" | "success" | "error";

interface StepResult {
  status: StepStatus;
  message?: string;
  txHash?: string;
}

const CAPABILITY = "safety_checked";
const PROOF_HASH =
  "0101010101010101010101010101010101010101010101010101010101010101".slice(0, 64);
const VALIDITY_SECONDS = 3600;

export default function Home() {
  const [step1, setStep1] = useState<StepResult>({ status: "idle" });
  const [step2, setStep2] = useState<StepResult>({ status: "idle" });
  const [step3, setStep3] = useState<StepResult>({ status: "idle", message: undefined });
  const [step4, setStep4] = useState<StepResult>({ status: "idle" });

  const [adminKey, setAdminKey] = useState("");
  const [verifierKey, setVerifierKey] = useState("");
  const [agentKey, setAgentKey] = useState("");

  function loadKeys() {
    try {
      setAdminKey(getPublicKey("admin"));
      setVerifierKey(getPublicKey("verifier"));
      setAgentKey(getPublicKey("agent"));
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function runStep1() {
    setStep1({ status: "loading" });
    try {
      const { txHash } = await registerVerifier(verifierKey);
      setStep1({ status: "success", message: "Verifier registered on-chain", txHash });
    } catch (e) {
      setStep1({ status: "error", message: (e as Error).message });
    }
  }

  async function runStep2() {
    setStep2({ status: "loading" });
    try {
      const { txHash } = await issueCredential({
        verifierPublicKey: verifierKey,
        agentPublicKey: agentKey,
        capability: CAPABILITY,
        proofHashHex: PROOF_HASH,
        validitySeconds: VALIDITY_SECONDS,
      });
      setStep2({ status: "success", message: "Credential issued to agent", txHash });
    } catch (e) {
      setStep2({ status: "error", message: (e as Error).message });
    }
  }

  async function runStep3() {
    setStep3({ status: "loading" });
    try {
      const { result } = await hasCredential(agentKey, CAPABILITY);
      setStep3({
        status: "success",
        message: result
          ? "TRUE — agent is verified, safe to transact"
          : "FALSE — no valid credential",
      });
    } catch (e) {
      setStep3({ status: "error", message: (e as Error).message });
    }
  }

  async function runStep4() {
    setStep4({ status: "loading" });
    try {
      const { txHash } = await revokeCredential(agentKey, CAPABILITY);
      setStep4({ status: "success", message: "Credential revoked on-chain", txHash });
    } catch (e) {
      setStep4({ status: "error", message: (e as Error).message });
    }
  }

  return (
    <main className="min-h-screen bg-[#0B1226] text-[#F4FFFD] px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">AgentTrust</h1>
          <p className="text-[#9FB3C8] mt-2">
            On-chain verifiable credentials for autonomous AI agents — live on Stellar
            testnet.
          </p>
          <a
            href={explorerContractUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-3 text-sm text-[#5EE6C8] hover:underline"
          >
            View contract on Stellar Expert →
          </a>
          <p className="text-xs text-[#5C6B7A] mt-1 font-mono break-all">{CONTRACT_ID}</p>
        </header>

        <section className="mb-8 p-4 rounded-xl border border-[#1E2A44] bg-[#0F1830]">
          <h2 className="font-semibold mb-2">1. Load demo identities</h2>
          <p className="text-sm text-[#9FB3C8] mb-3">
            Loads the admin, verifier, and agent public keys from your local environment
            config.
          </p>
          <button
            onClick={loadKeys}
            className="px-4 py-2 rounded-lg bg-[#2BB7A6] text-[#0B1226] font-medium hover:opacity-90"
          >
            Load Keys
          </button>
          {adminKey && (
            <div className="mt-3 text-xs font-mono text-[#9FB3C8] space-y-1">
              <p>Admin: {adminKey}</p>
              <p>Verifier: {verifierKey}</p>
              <p>Agent: {agentKey}</p>
            </div>
          )}
        </section>

        <StepCard
          number={2}
          title="Register verifier"
          description="Admin authorizes the verifier address to issue credentials."
          onRun={runStep1}
          result={step1}
          disabled={!verifierKey}
        />

        <StepCard
          number={3}
          title="Issue credential"
          description={`Verifier attests the agent passed a "${CAPABILITY}" check, backed by a proof hash — no private data goes on-chain.`}
          onRun={runStep2}
          result={step2}
          disabled={!verifierKey || !agentKey}
        />

        <StepCard
          number={4}
          title="Check credential (before trusting the agent)"
          description="Any other agent or contract calls this before transacting — a real, on-chain-verified answer."
          onRun={runStep3}
          result={step3}
          disabled={!agentKey}
        />

        <StepCard
          number={5}
          title="Revoke credential (misbehavior response)"
          description="Admin or issuer can revoke early if the agent is later found untrustworthy."
          onRun={runStep4}
          result={step4}
          disabled={!agentKey}
        />

        <footer className="mt-12 text-xs text-[#5C6B7A] text-center">
          Built for UK AI Agent Hackathon EP5 × Conduct — testnet demo only.
        </footer>
      </div>
    </main>
  );
}

function StepCard({
  number,
  title,
  description,
  onRun,
  result,
  disabled,
}: {
  number: number;
  title: string;
  description: string;
  onRun: () => void;
  result: StepResult;
  disabled?: boolean;
}) {
  return (
    <section className="mb-6 p-4 rounded-xl border border-[#1E2A44] bg-[#0F1830]">
      <h2 className="font-semibold mb-1">
        {number}. {title}
      </h2>
      <p className="text-sm text-[#9FB3C8] mb-3">{description}</p>
      <button
        onClick={onRun}
        disabled={disabled || result.status === "loading"}
        className="px-4 py-2 rounded-lg bg-[#5EE6C8] text-[#0B1226] font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {result.status === "loading" ? "Sending to testnet…" : "Run"}
      </button>

      {result.status === "success" && (
        <div className="mt-3 text-sm">
          <p className="text-[#5EE6C8]">✅ {result.message}</p>
          {result.txHash && (
            <a
              href={explorerTxUrl(result.txHash)}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#9FB3C8] hover:underline break-all"
            >
              {result.txHash}
            </a>
          )}
        </div>
      )}
      {result.status === "error" && (
        <p className="mt-3 text-sm text-[#FF8A8A]">❌ {result.message}</p>
      )}
    </section>
  );
}
