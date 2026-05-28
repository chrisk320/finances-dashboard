"use client";

import { signIn, useSession } from "next-auth/react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description: string;
  children: ReactNode;
};

export default function AuthGate({ title, description, children }: Props) {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center p-10">
        <div className="text-text-dim text-[12px] font-mono uppercase tracking-[0.12em]">
          Loading…
        </div>
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="flex-1 flex items-center justify-center p-10">
        <div className="max-w-md text-center bg-bg-card border border-border rounded-xl px-6 py-8">
          <div className="text-[10px] uppercase tracking-[0.14em] text-text-dim font-mono mb-2">
            Sign in required
          </div>
          <h2 className="text-[20px] font-mono font-bold text-text-primary mb-3">
            {title}
          </h2>
          <p className="text-text-secondary text-[13px] leading-relaxed mb-5">
            {description}
          </p>
          <button
            onClick={() => signIn("google")}
            className="bg-[#15182a] border border-border-subtle hover:border-text-muted rounded-md px-4 py-2 text-[12px] font-mono text-text-primary transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
