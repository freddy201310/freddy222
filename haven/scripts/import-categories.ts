// Imports public website block lists into the DomainCategory table.
//   npm run categories:import            # everything except the very large adult list
//   npm run categories:import -- --large # also the ~950k-domain adult list (needs ~200 MB of database)
// Safe to re-run: each source's rows are replaced. Run it weekly to stay current.
import { PrismaClient } from "@prisma/client";
import { CATEGORY_SOURCES, parseDomainList } from "../src/lib/webfilter";

const db = new PrismaClient();
const includeLarge = process.argv.includes("--large");
const BATCH = 5000;

async function main() {
  const cache = new Map<string, string[]>();
  let total = 0;
  for (const src of CATEGORY_SOURCES) {
    if (src.large && !includeLarge) {
      console.log(`skip  ${src.category.padEnd(15)} ${src.source} (large; pass --large to include)`);
      continue;
    }
    let domains = cache.get(src.url);
    if (!domains) {
      const res = await fetch(src.url);
      if (!res.ok) {
        console.error(`FAIL  ${src.source}: HTTP ${res.status}`);
        continue;
      }
      domains = parseDomainList(await res.text());
      cache.set(src.url, domains);
    }
    await db.domainCategory.deleteMany({ where: { source: src.source, category: src.category } });
    for (let i = 0; i < domains.length; i += BATCH) {
      await db.domainCategory.createMany({
        data: domains.slice(i, i + BATCH).map((domain) => ({ domain, category: src.category, source: src.source })),
        skipDuplicates: true,
      });
    }
    total += domains.length;
    console.log(`ok    ${src.category.padEnd(15)} ${src.source}: ${domains.length.toLocaleString()} domains`);
  }
  console.log(`done: ${total.toLocaleString()} rows processed`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
