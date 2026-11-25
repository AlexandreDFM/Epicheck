#!/usr/bin/env node
/**
 * Fail when a workspace project has production advisories at or above a level.
 * pnpm audit covers the whole workspace; this keeps the findings of one
 * project (paths start with "apps__<name>>").
 *
 *   pnpm audit --prod --json | node scripts/ci/audit.mjs proxy moderate
 */
const [, , project, level = "moderate"] = process.argv;
const ORDER = ["info", "low", "moderate", "high", "critical"];
if (!project || !ORDER.includes(level)) {
    console.error(
        "usage: pnpm audit --prod --json | node scripts/ci/audit.mjs <project> [level]",
    );
    process.exit(2);
}

let input = "";
for await (const chunk of process.stdin) input += chunk;
const report = JSON.parse(input);
const prefix = `apps__${project}>`;

const found = Object.values(report.advisories ?? {}).filter(
    (a) =>
        ORDER.indexOf(a.severity) >= ORDER.indexOf(level) &&
        a.findings.some((f) => f.paths.some((p) => p.startsWith(prefix))),
);

for (const a of found) {
    console.log(
        `::error::${a.severity} ${a.module_name}: ${a.title} (${a.url})`,
    );
}
console.log(
    `${project}: ${found.length} advisories at level ${level} or above`,
);
process.exit(found.length > 0 ? 1 : 0);
