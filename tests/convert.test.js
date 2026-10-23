import { test } from "node:test";
import assert from "node:assert/strict";
import { loadMapping, translatePlaceholders, stripHtml, zendeskToFreshdesk, freshdeskToZendesk, toCsv, buildReport } from "../src/convert.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rows = loadMapping(join(dirname(fileURLToPath(import.meta.url)), "..", "placeholders.json"));

test("mapping file loads and covers the core fields", () => {
  const names = rows.map((r) => r.name);
  for (const n of ["requester_first_name","requester_name","requester_email","ticket_id","ticket_subject","agent_name","agent_email","organization_name"]) assert.ok(names.includes(n), n);
});

test("zendesk first name placeholder becomes the freshdesk spelling", () => {
  const unmapped = [];
  const out = translatePlaceholders("Hi {{ticket.requester.first_name}}", "zendesk-to-freshdesk", rows, unmapped);
  assert.equal(out, "Hi {{ticket.requester.firstname}}");
  assert.equal(unmapped.length, 0);
});

test("freshdesk first name placeholder converts back to zendesk", () => {
  const unmapped = [];
  const out = translatePlaceholders("Hi {{ticket.requester.firstname}}", "freshdesk-to-zendesk", rows, unmapped);
  assert.equal(out, "Hi {{ticket.requester.first_name}}");
});

test("organization name maps to company name in freshdesk", () => {
  const unmapped = [];
  assert.equal(translatePlaceholders("{{ticket.organization.name}}", "zendesk-to-freshdesk", rows, unmapped), "{{ticket.company.name}}");
  assert.equal(translatePlaceholders("{{ticket.company.name}}", "freshdesk-to-zendesk", rows, []), "{{ticket.organization.name}}");
});

test("unmapped placeholders are left as-is and reported", () => {
  const unmapped = [];
  const out = translatePlaceholders("Ref {{ticket.custom_field_123}}", "zendesk-to-freshdesk", rows, unmapped);
  assert.equal(out, "Ref {{ticket.custom_field_123}}");
  assert.equal(unmapped.length, 1);
  assert.equal(unmapped[0].reason, "not in mapping file");
});

test("known placeholder with no equivalent is reported with its reason", () => {
  const unmapped = [];
  const out = translatePlaceholders("Due {{ticket.due_date}}", "zendesk-to-freshdesk", rows, unmapped);
  assert.equal(out, "Due {{ticket.due_date}}");
  assert.equal(unmapped[0].reason, "no equivalent in target format");
});

test("stripHtml removes tags and decodes common entities", () => {
  assert.equal(stripHtml("<p>Hello &amp; welcome</p><p>Bye</p>"), "Hello & welcome\n\nBye");
});

test("zendesk macros convert to freshdesk canned responses", () => {
  const input = { macros: [{ title: "Hi", actions: [{ field: "comment_value", value: "Hi {{ticket.requester.first_name}}" }] }] };
  const result = zendeskToFreshdesk(input, rows, {});
  assert.equal(result.converted, 1);
  assert.equal(result.output.canned_responses[0].content, "Hi {{ticket.requester.firstname}}");
});

test("plain text option strips html from bodies", () => {
  const input = { macros: [{ title: "Hi", actions: [{ field: "comment_value", value: "<p>Hi there</p>" }] }] };
  const result = zendeskToFreshdesk(input, rows, { plainText: true });
  assert.equal(result.output.canned_responses[0].content, "Hi there");
});

test("freshdesk canned responses convert to zendesk macros", () => {
  const input = { canned_responses: [{ title: "Refund", content: "Hi {{ticket.requester.firstname}}" }] };
  const result = freshdeskToZendesk(input, rows, {});
  assert.equal(result.output.macros[0].actions[0].field, "comment_value");
  assert.equal(result.output.macros[0].actions[0].value, "Hi {{ticket.requester.first_name}}");
});

test("csv output quotes fields that contain commas or quotes", () => {
  const csv = toCsv([{ title: "A, B", content: 'Say "hi", ok' }]);
  assert.ok(csv.includes('"A, B"'));
  assert.ok(csv.includes('"Say ""hi"", ok"'));
});

test("report lists unmapped placeholders", () => {
  const report = buildReport({ direction: "zendesk-to-freshdesk", converted: 2, unmapped: [{ placeholder: "{{ticket.due_date}}", reason: "no equivalent in target format", count: 1, titles: ["Closing"] }] });
  assert.ok(report.includes("{{ticket.due_date}}"));
  assert.ok(report.includes("Items converted: 2"));
});
