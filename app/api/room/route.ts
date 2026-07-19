import { NextResponse } from "next/server";
import { createRoom } from "@/lib/room-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim().slice(0, 24);
  const deckSlug = String(body?.deckSlug ?? "verdict");
  if (!name) {
    return NextResponse.json({ error: "Prénom requis" }, { status: 400 });
  }
  const seenIds = Array.isArray(body?.seenIds)
    ? (body.seenIds as unknown[]).filter((n): n is number => typeof n === "number")
    : [];
  const created = createRoom(deckSlug, name, seenIds);
  if (!created) {
    return NextResponse.json({ error: "Deck inconnu" }, { status: 404 });
  }
  return NextResponse.json({ code: created.room.code, playerId: created.playerId });
}
