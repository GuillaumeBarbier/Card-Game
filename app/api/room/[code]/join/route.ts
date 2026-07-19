import { NextResponse } from "next/server";
import { joinRoom } from "@/lib/room-server";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim().slice(0, 24);
  if (!name) {
    return NextResponse.json({ error: "Prénom requis" }, { status: 400 });
  }
  const result = joinRoom(code, name);
  if ("error" in result) {
    const message =
      result.error === "introuvable"
        ? "Salle introuvable — vérifie le code"
        : "La salle est déjà complète";
    return NextResponse.json({ error: message }, { status: 409 });
  }
  return NextResponse.json({ code: result.room.code, playerId: result.playerId });
}
