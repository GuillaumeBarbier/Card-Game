// Merge content/verdict/part-*.json into data/verdict.json, with validation.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC = "content/verdict";
const OUT = "data/verdict.json";

const parts = readdirSync(SRC)
  .filter((f) => /^part-\d+\.json$/.test(f))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

const cards = parts.flatMap((f) => JSON.parse(readFileSync(join(SRC, f), "utf8")));

const ids = new Set();
const errors = [];
const CATEGORIES = new Set([
  "soirees", "reseaux", "ex", "amis", "argent", "quotidien",
  "travail", "famille", "vacances", "seduction", "telephone", "jalousie",
]);

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
  console.error(`${errors.length} validation errors:\n` + errors.slice(0, 20).join("\n"));
  process.exit(1);
}

cards.sort((a, b) => a.id - b.id);
writeFileSync(OUT, JSON.stringify(cards, null, 2) + "\n");
console.log(`OK — ${cards.length} cards merged into ${OUT}`);
