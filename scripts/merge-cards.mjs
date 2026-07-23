// Merge content/<deck>/part-*.json into data/<deck>.json, with validation.
// Usage: node scripts/merge-cards.mjs [verdict|ouinon|all]
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CATEGORIES = new Set([
  "soirees", "reseaux", "ex", "amis", "argent", "quotidien",
  "travail", "famille", "vacances", "seduction", "telephone", "jalousie",
  "sexe", "projets",
]);

const DECKS = {
  // Chaque carte source a déjà scenario/optionA/optionB.
  verdict: { src: "content/verdict", out: "data/verdict.json", transform: (c) => c },
  // Les cartes source n'ont qu'une question ; les réponses sont toujours Oui/Non.
  ouinon: {
    src: "content/ouinon",
    out: "data/ouinon.json",
    transform: (c) => ({
      id: c.id,
      category: c.category,
      scenario: c.question,
      optionA: "Oui",
      optionB: "Non",
      spice: c.spice,
    }),
  },
};

function mergeDeck(name) {
  const { src, out, transform } = DECKS[name];
  const parts = readdirSync(src)
    .filter((f) => /^part-\d+\.json$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

  const cards = parts
    .flatMap((f) => JSON.parse(readFileSync(join(src, f), "utf8")))
    .map(transform);

  const ids = new Set();
  const errors = [];
  for (const c of cards) {
    if (ids.has(c.id)) errors.push(`duplicate id ${c.id}`);
    ids.add(c.id);
    if (!CATEGORIES.has(c.category)) errors.push(`card ${c.id}: bad category ${c.category}`);
    if (![1, 2, 3].includes(c.spice)) errors.push(`card ${c.id}: bad spice ${c.spice}`);
    if (!c.scenario || !c.optionA || !c.optionB) errors.push(`card ${c.id}: missing field`);
  }
  for (let i = 1; i <= cards.length; i++) {
    if (!ids.has(i)) errors.push(`missing id ${i}`);
  }

  if (errors.length) {
    console.error(`[${name}] ${errors.length} validation errors:\n` + errors.slice(0, 20).join("\n"));
    process.exit(1);
  }

  cards.sort((a, b) => a.id - b.id);
  writeFileSync(out, JSON.stringify(cards, null, 2) + "\n");
  console.log(`[${name}] OK — ${cards.length} cards merged into ${out}`);
}

const target = process.argv[2] ?? "all";
for (const name of target === "all" ? Object.keys(DECKS) : [target]) {
  if (!DECKS[name]) {
    console.error(`unknown deck ${name}`);
    process.exit(1);
  }
  mergeDeck(name);
}
