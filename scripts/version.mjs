#!/usr/bin/env node
/**
 * Bump or show the EpiCheck version.
 *
 *   pnpm run version:bump patch|minor|major   # app + proxy package.json
 *   pnpm run version:show                     # version and build number
 *
 * package.json "version" is the single source: app.config.ts derives the
 * Android versionCode and iOS buildNumber from it (1.2.1 -> 10201). Commit
 * as "chore(release): vX.Y.Z", then tag vX.Y.Z on main after the merge.
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILES = ["package.json", "proxy-server/package.json"];

const read = (file) => JSON.parse(readFileSync(file, "utf8"));
const buildNumber = (v) => {
    const [major, minor, patch] = v.split(".").map(Number);
    return major * 10000 + minor * 100 + patch;
};

const [, , command, part] = process.argv;
const current = read("package.json").version;

if (command === "show") {
    console.log(`${current} (build ${buildNumber(current)})`);
    process.exit(0);
}

if (command !== "bump" || !["patch", "minor", "major"].includes(part)) {
    console.error("usage: version.mjs show | bump patch|minor|major");
    process.exit(1);
}

let [major, minor, patch] = current.split(".").map(Number);
if (part === "major") [major, minor, patch] = [major + 1, 0, 0];
if (part === "minor") [minor, patch] = [minor + 1, 0];
if (part === "patch") patch += 1;
if (minor > 99 || patch > 99) {
    console.error("minor and patch must stay below 100");
    process.exit(1);
}
const next = `${major}.${minor}.${patch}`;

for (const file of FILES) {
    const pkg = read(file);
    pkg.version = next;
    writeFileSync(file, `${JSON.stringify(pkg, null, 4)}\n`);
}
console.log(`${current} -> ${next} (build ${buildNumber(next)})`);
console.log(`next: git commit -am "chore(release): v${next}"`);
