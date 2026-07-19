import { NextResponse } from "next/server";
import { getRoom, nextCard, startCountdown, submitAnswer } from "@/lib/room-server";
import type { Choice } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const room = getRoom(code);
  if (!room) {
    return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const playerId = String(body?.playerId ?? "");
  if (!room.players.some((p) => p.id === playerId)) {
    return NextResponse.json({ error: "Joueur inconnu" }, { status: 403 });
  }

  switch (body?.type) {
    case "start":
      startCountdown(room);
      break;
    case "answer": {
      const choice = body?.choice as Choice;
      if (choice !== "A" && choice !== "B") {
        return NextResponse.json({ error: "Choix invalide" }, { status: 400 });
      }
      submitAnswer(room, playerId, choice, String(body?.note ?? ""));
      break;
    }
    case "next":
      nextCard(room);
      break;
    default:
      return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
