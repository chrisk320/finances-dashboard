import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { portfolioHoldings } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import type { PortfolioHolding } from "@/lib/types";

function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

function toHolding(r: typeof portfolioHoldings.$inferSelect): PortfolioHolding {
  return {
    ticker: r.ticker,
    shares: r.shares,
    costBasis: r.costBasis,
    addedAt: r.addedAt,
    notes: r.notes ?? undefined,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const rows = await db
    .select()
    .from(portfolioHoldings)
    .where(eq(portfolioHoldings.userId, session.user.id));
  return Response.json(rows.map(toHolding));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;
  const body = await req.json();
  const ticker = String(body.ticker ?? "").toUpperCase().trim();
  const shares = Number(body.shares);
  const costBasis = Number(body.costBasis);
  const notes = body.notes ? String(body.notes) : null;

  if (!ticker || !Number.isFinite(shares) || shares <= 0) {
    return Response.json({ error: "invalid input" }, { status: 400 });
  }
  if (!Number.isFinite(costBasis) || costBasis <= 0) {
    return Response.json({ error: "invalid input" }, { status: 400 });
  }

  await db
    .insert(portfolioHoldings)
    .values({ userId, ticker, shares, costBasis, addedAt: Date.now(), notes })
    .onConflictDoUpdate({
      target: [portfolioHoldings.userId, portfolioHoldings.ticker],
      set: { shares, costBasis, notes },
    });
  return Response.json({});
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const body = await req.json();
  const ticker = String(body.ticker ?? "").toUpperCase();
  if (!ticker) {
    return Response.json({ error: "missing ticker" }, { status: 400 });
  }

  const set: Partial<typeof portfolioHoldings.$inferInsert> = {};
  if (Number.isFinite(body.shares) && body.shares > 0) set.shares = Number(body.shares);
  if (Number.isFinite(body.costBasis) && body.costBasis > 0) set.costBasis = Number(body.costBasis);
  if ("notes" in body) set.notes = body.notes ? String(body.notes) : null;
  if (Object.keys(set).length === 0) return Response.json({});

  await db
    .update(portfolioHoldings)
    .set(set)
    .where(
      and(
        eq(portfolioHoldings.userId, session.user.id),
        eq(portfolioHoldings.ticker, ticker),
      ),
    );
  return Response.json({});
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const body = await req.json();
  const ticker = String(body.ticker ?? "").toUpperCase();
  if (!ticker) {
    return Response.json({ error: "missing ticker" }, { status: 400 });
  }
  await db
    .delete(portfolioHoldings)
    .where(
      and(
        eq(portfolioHoldings.userId, session.user.id),
        eq(portfolioHoldings.ticker, ticker),
      ),
    );
  return Response.json({});
}
