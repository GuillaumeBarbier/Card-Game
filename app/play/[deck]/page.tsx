import { notFound } from "next/navigation";
import { getCards, getDeck, DECKS } from "@/lib/decks";
import GameScreen from "@/components/GameScreen";

export function generateStaticParams() {
  return DECKS.filter((d) => d.available).map((d) => ({ deck: d.slug }));
}

export default async function PlayPage({
  params,
}: {
  params: Promise<{ deck: string }>;
}) {
  const { deck: slug } = await params;
  const deck = getDeck(slug);
  const cards = getCards(slug);
  if (!deck || !deck.available || cards.length === 0) notFound();

  return <GameScreen deck={deck} cards={cards} />;
}
