#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadMapping, zendeskToFreshdesk, freshdeskToZendesk, toCsv, buildReport } from "./convert.js";

function parseArgs(argv) {
  const args = { plainText: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--plain-text") args.plainText = true;
    else if (a.startsWith("--")) args[a.slice(2)] = argv[++i];
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input || !args.from || !args.to || !args.output) {
    console.error("Usage: canned-convert --input in.json --from zendesk --to freshdesk --output out.json [--format json|csv] [--report report.md] [--mapping placeholders.json] [--plain-text]");
    process.exit(1);
  }
  const here = dirname(fileURLToPath(import.meta.url));
  const mappingPath = args.mapping || join(here, "..", "placeholders.json");
  const rows = loadMapping(mappingPath);
  const input = JSON.parse(readFileSync(args.input, "utf8"));
  const direction = args.from + "-to-" + args.to;
  let result;
  if (direction === "zendesk-to-freshdesk") result = zendeskToFreshdesk(input, rows, { plainText: args.plainText });
  else if (direction === "freshdesk-to-zendesk") result = freshdeskToZendesk(input, rows, { plainText: args.plainText });
  else { console.error("Unsupported direction: " + direction + ". Supported: zendesk-to-freshdesk, freshdesk-to-zendesk"); process.exit(1); }

  const format = args.format || "json";
  let outText;
  if (format === "csv") {
    if (direction !== "zendesk-to-freshdesk") { console.error("CSV output is only supported for zendesk-to-freshdesk"); process.exit(1); }
    outText = toCsv(result.output.canned_responses);
  } else {
    outText = JSON.stringify(result.output, null, 2) + "\n";
  }
  writeFileSync(args.output, outText);
  const report = buildReport({ direction, converted: result.converted, unmapped: result.unmapped });
  if (args.report) writeFileSync(args.report, report);
  else process.stdout.write(report);
  console.log("Converted " + result.converted + " item(s) to " + args.output + ". Unmapped placeholders: " + result.unmapped.length + ".");
}

main();
