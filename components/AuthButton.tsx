"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center text-[10px] uppercase tracking-[0.12em] font-mono text-text-dim px-2 py-1.5">
        …
      </div>
    );
  }

  if (status === "authenticated" && session?.user) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5">
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt=""
            className="w-5 h-5 rounded-full"
          />
        ) : (
          <span className="w-5 h-5 rounded-full bg-bg-card border border-border-subtle inline-block" />
        )}
        <span
          className="text-[11px] font-mono text-text-secondary truncate max-w-[140px]"
          title={session.user.email ?? undefined}
        >
          {session.user.name || session.user.email}
        </span>
        <button
          onClick={() => signOut()}
          className="ml-auto shrink-0 text-[10px] uppercase tracking-[0.12em] font-mono text-text-dim hover:text-text-secondary transition-colors"
          title="Sign out"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="w-full flex items-center justify-center gap-2 bg-bg-card border border-border-subtle hover:border-text-muted hover:bg-[#15182a] rounded-md px-3 py-2 text-[11px] font-mono text-text-secondary hover:text-text-primary transition-colors"
    >
      Sign in with Google
    </button>
  );
}
