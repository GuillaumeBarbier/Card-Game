import Home from "@/components/Home";
import { DECKS } from "@/lib/decks";

export default function Page() {
  return <Home decks={DECKS} />;
}
