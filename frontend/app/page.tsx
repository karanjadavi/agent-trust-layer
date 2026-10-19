"use client";

import { useEffect, useState } from "react";
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

const GITHUB_URL = "https://github.com/karanjadavi/agent-trust-layer";
const HACKATHON_URL = "https://dorahacks.io/buidl/46244";

const idle: StepResult = { status: "idle" };

function shorten(value: string) {
  return value.length > 16 ? `${value.slice(0, 6)}…${value.slice(-6)}` : value;
}

export default function Home() {
  const [step1, setStep1] = useState<StepResult>(idle);
  const [step2, setStep2] = useState<StepResult>(idle);
  const [step3, setStep3] = useState<StepResult>(idle);
  const [step4, setStep4] = useState<StepResult>(idle);

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

  function resetDemo() {
    setStep1(idle);
    setStep2(idle);
    setStep3(idle);
    setStep4(idle);
    setAdminKey("");
    setVerifierKey("");
    setAgentKey("");
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

  const progressSteps: { label: string; status: StepStatus }[] = [
    { label: "Keys", status: adminKey ? "success" : "idle" },
    { label: "Register", status: step1.status },
    { label: "Issue", status: step2.status },
    { label: "Check", status: step3.status },
    { label: "Revoke", status: step4.status },
  ];

  const anyProgress = progressSteps.some((s) => s.status !== "idle");

  return (
    <main className="min-h-screen bg-bg text-text px-5 sm:px-6 py-12">
      <ThemeToggle />
      <div className="max-w-3xl mx-auto">
        <header className="mb-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-xs text-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            Live on Stellar Testnet
          </span>

          <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight bg-linear-to-r from-accent to-accent-strong bg-clip-text text-transparent">
            AgentTrust
          </h1>
          <p className="text-muted mt-3 max-w-xl">
            On-chain verifiable credentials for autonomous AI agents. Check an agent
            before you trust it, and revoke it if it misbehaves.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href={explorerContractUrl()}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-success hover:underline"
            >
              View contract on Stellar Expert ↗
            </a>
            <CopyButton value={CONTRACT_ID} label="Copy contract ID" />
          </div>
          <p className="text-xs text-muted2 mt-2 font-mono break-all">{CONTRACT_ID}</p>
        </header>

        <ProgressTracker steps={progressSteps} />

        <section className="mb-6 p-5 rounded-2xl border border-line bg-card shadow-sm">
          <h2 className="font-semibold mb-1">1. Load demo identities</h2>
          <p className="text-sm text-muted mb-4">
            Loads the admin, verifier, and agent public keys from your local environment
            config.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadKeys}
              className="px-4 py-2 rounded-lg bg-accent-strong text-on-accent font-medium hover:opacity-90 transition"
            >
              Load Keys
            </button>
            {anyProgress && (
              <button
                onClick={resetDemo}
                className="px-4 py-2 rounded-lg border border-line text-muted hover:text-text transition"
              >
                Reset demo
              </button>
            )}
          </div>
          {adminKey && (
            <div className="mt-4 grid gap-2 text-xs">
              <KeyRow role="Admin" value={adminKey} />
              <KeyRow role="Verifier" value={verifierKey} />
              <KeyRow role="Agent" value={agentKey} />
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
          description={`Verifier attests the agent passed a "${CAPABILITY}" check, backed by a proof hash. No private data goes on-chain.`}
          onRun={runStep2}
          result={step2}
          disabled={!verifierKey || !agentKey}
        />

        <StepCard
          number={4}
          title="Check credential (before trusting the agent)"
          description="Any other agent or contract calls this before transacting. The answer is verified on-chain."
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

        <footer className="mt-12 pt-6 border-t border-line text-xs text-muted2 text-center space-y-2">
          <p>Built for UK AI Agent Hackathon EP5 × Conduct. Testnet demo only.</p>
          <p className="space-x-4">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-text hover:underline">
              GitHub
            </a>
            <a href={HACKATHON_URL} target="_blank" rel="noreferrer" className="hover:text-text hover:underline">
              DoraHacks submission
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <button
      onClick={copy}
      className="text-xs rounded-md border border-line px-2 py-1 text-muted hover:text-text transition"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

function KeyRow({ role, value }: { role: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
      <span className="text-muted">{role}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-text" title={value}>
          {shorten(value)}
        </span>
        <CopyButton value={value} />
      </span>
    </div>
  );
}

function ProgressTracker({
  steps,
}: {
  steps: { label: string; status: StepStatus }[];
}) {
  const currentIndex = steps.findIndex((s) => s.status !== "success");
  const doneCount = steps.filter((s) => s.status === "success").length;

  return (
    <nav aria-label="Demo progress" className="mb-8">
      <ol className="flex items-start">
        {steps.map((s, i) => {
          const isDone = s.status === "success";
          const isError = s.status === "error";
          const isLoading = s.status === "loading";
          const isCurrent = i === currentIndex && !isError;

          let circle = "border-line bg-card text-muted2";
          if (isDone) circle = "border-accent bg-accent text-on-accent";
          else if (isError) circle = "border-danger bg-danger text-on-accent";
          else if (isCurrent) circle = "border-accent bg-card text-success";

          return (
            <li
              key={s.label}
              className="relative flex-1 flex flex-col items-center"
              aria-current={isCurrent ? "step" : undefined}
            >
              {i > 0 && (
                <span
                  className={`absolute top-4 right-1/2 w-full h-0.5 ${
                    steps[i - 1].status === "success" ? "bg-accent" : "bg-line"
                  }`}
                />
              )}
              <span
                className={`relative z-10 h-8 w-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold ${circle} ${
                  isLoading ? "animate-pulse" : ""
                } ${isCurrent ? "ring-4 ring-accent/20" : ""}`}
              >
                {isDone ? "✓" : isError ? "!" : i + 1}
              </span>
              <span
                className={`mt-2 text-xs text-center ${
                  isDone || isCurrent ? "text-text" : "text-muted2"
                }`}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs text-muted text-center">
        {doneCount} of {steps.length} steps complete
      </p>
    </nav>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Pick up whatever theme the script in layout.tsx already applied
  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="fixed top-4 right-4 z-50 h-10 w-10 rounded-full border border-line bg-card text-lg flex items-center justify-center hover:opacity-80 transition"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
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
    <section className="mb-6 p-5 rounded-2xl border border-line bg-card shadow-sm">
      <h2 className="font-semibold mb-1">
        {number}. {title}
      </h2>
      <p className="text-sm text-muted mb-4">{description}</p>
      <div className="flex items-center gap-3">
        <button
          onClick={onRun}
          disabled={disabled || result.status === "loading"}
          className="px-4 py-2 rounded-lg bg-accent text-on-accent font-medium hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {result.status === "loading" ? "Sending to testnet…" : "Run"}
        </button>
        {disabled && result.status === "idle" && (
          <span className="text-xs text-muted2">Load keys first</span>
        )}
      </div>

      {result.status === "success" && (
        <div className="mt-4 rounded-lg border border-line px-3 py-2 text-sm">
          <p className="text-success">✅ {result.message}</p>
          {result.txHash && (
            <p className="mt-1 text-xs text-muted flex flex-wrap items-center gap-2">
              <span className="font-mono">{shorten(result.txHash)}</span>
              <a
                href={explorerTxUrl(result.txHash)}
                target="_blank"
                rel="noreferrer"
                className="hover:underline text-success"
              >
                View on explorer ↗
              </a>
              <CopyButton value={result.txHash} label="Copy hash" />
            </p>
          )}
        </div>
      )}
      {result.status === "error" && (
        <p className="mt-4 rounded-lg border border-danger px-3 py-2 text-sm text-danger break-words">
          ❌ {result.message}
        </p>
      )}
    </section>
  );
}