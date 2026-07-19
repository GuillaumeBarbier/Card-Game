import Home from "@/components/Home";
import { DECKS } from "@/lib/decks";
import pkg from "@/package.json";

export default function Page() {
  const sha = (process.env.NEXT_PUBLIC_BUILD_SHA ?? "").slice(0, 7);
  const version = `v${pkg.version}${sha ? ` · ${sha}` : ""}`;
  return <Home decks={DECKS} version={version} />;
}
