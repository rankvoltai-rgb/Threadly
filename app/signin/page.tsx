"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import Link from "next/link";
import { Logo, Spinner, Arrow } from "@/components/Icons";
import ThreadsRain from "@/components/ThreadsRain";

export default function SignInPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signUp");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn("password", { email, password, flow });
      router.push("/dashboard");
    } catch {
      // Convex Auth deliberately does not say which half was wrong.
      setError(
        flow === "signUp"
          ? "Could not create that account. The email may already be registered, or the password is too short."
          : "Email or password is incorrect."
      );
      setBusy(false);
    }
  };

  return (
    <main className="hero-glow relative flex min-h-screen items-center justify-center px-5 py-10">
      <ThreadsRain />

      <div className="relative w-full max-w-sm">
        <Link href="/" className="focus-ring mb-7 flex items-center justify-center gap-2 rounded">
          <Logo className="size-7" />
          <span className="text-[17px] font-bold tracking-tight">Threadly</span>
        </Link>

        <div className="card p-6 shadow-[0_18px_50px_-18px_rgba(0,0,0,.9)]">
          <h1 className="text-[20px] font-bold tracking-[-0.01em]">
            {flow === "signUp" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
            {flow === "signUp"
              ? "Save leads, track who you've contacted, and keep your licence across devices."
              : "Sign in to your pipeline."}
          </p>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-label="Email"
              className="focus-ring w-full rounded-lg border px-3 py-2.5 text-[14px] outline-none placeholder:text-subtle"
              style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
            />
            <input
              type="password"
              required
              minLength={8}
              autoComplete={flow === "signUp" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (8+ characters)"
              aria-label="Password"
              className="focus-ring w-full rounded-lg border px-3 py-2.5 text-[14px] outline-none placeholder:text-subtle"
              style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
            />

            {error && <p className="text-[13px] text-white">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[14px] font-bold text-white transition-colors disabled:opacity-60"
              style={{ background: "var(--accent)" }}
            >
              {busy ? <Spinner className="size-4" /> : null}
              {busy ? "One moment…" : flow === "signUp" ? "Create account" : "Sign in"}
              {!busy && <Arrow className="size-4" />}
            </button>
          </form>

          <p className="mt-4 text-center text-[13px] text-muted">
            {flow === "signUp" ? "Already have an account?" : "No account yet?"}{" "}
            <button
              onClick={() => {
                setFlow(flow === "signUp" ? "signIn" : "signUp");
                setError(null);
              }}
              className="focus-ring rounded font-bold text-white underline underline-offset-2"
            >
              {flow === "signUp" ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>

        <p className="mt-5 text-center text-[12.5px] text-subtle">
          <Link href="/" className="focus-ring rounded underline underline-offset-2 hover:text-muted">
            Keep searching without an account
          </Link>
        </p>
      </div>
    </main>
  );
}
