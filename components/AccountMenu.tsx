"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

/**
 * Anonymous visitors get a way in; signed-in users get their account and a way
 * out. Rendered in the header on both the public page and the dashboard.
 */
export default function AccountMenu({
  email,
  convexEnabled,
}: {
  email: string | null;
  convexEnabled: boolean;
}) {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!convexEnabled) return null;

  if (!email) {
    return (
      <Link
        href="/signin"
        className="focus-ring rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-muted transition-colors hover:text-foreground"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className="hidden max-w-[168px] truncate text-[12.5px] text-subtle sm:inline"
        title={email}
      >
        {email}
      </span>
      <button
        onClick={async () => {
          setBusy(true);
          await signOut();
          router.push("/");
        }}
        disabled={busy}
        className="focus-ring rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-muted transition-colors hover:text-foreground disabled:opacity-60"
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
