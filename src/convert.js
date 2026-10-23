import { readFileSync } from "node:fs";

export function loadMapping(path) {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const rows = Array.isArray(raw) ? raw : raw.placeholders;
  if (!Array.isArray(rows)) throw new Error("Mapping file must be an array or an object with a placeholders array");
  return rows;
}

export function buildDirectionMap(rows, direction) {
  const map = new Map();
  for (const row of rows) {
    const from = direction === "zendesk-to-freshdesk" ? row.zendesk : row.freshdesk;
    const to = direction === "zendesk-to-freshdesk" ? row.freshdesk : row.zendesk;
    if (from && to) map.set(normalize(from), to);
  }
  return map;
}

export function knownButUnmappable(rows, direction) {
  const set = new Set();
  for (const row of rows) {
    const from = direction === "zendesk-to-freshdesk" ? row.zendesk : row.freshdesk;
    const to = direction === "zendesk-to-freshdesk" ? row.freshdesk : row.zendesk;
    if (from && !to) set.add(normalize(from));
  }
  return set;
}

export function normalize(placeholder) {
  return "{{" + placeholder.replace(/^\{\{|\}\}$/g, "").trim() + "}}";
}

export function stripHtml(input) {
  if (!input) return "";
  return String(input)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function translatePlaceholders(text, direction, rows, unmapped) {
  if (!text) return "";
  const map = buildDirectionMap(rows, direction);
  const noEquivalent = knownButUnmappable(rows, direction);
  return String(text).replace(/\{\{[^}]+\}\}/g, (match) => {
    const key = normalize(match);
    if (map.has(key)) return map.get(key);
    unmapped.push({ placeholder: key, reason: noEquivalent.has(key) ? "no equivalent in target format" : "not in mapping file" });
    return match;
  });
}

function collectUnmapped(unmapped) {
  const byKey = new Map();
  for (const item of unmapped) {
    const prev = byKey.get(item.placeholder) || { placeholder: item.placeholder, reason: item.reason, count: 0, titles: [] };
    prev.count += 1;
    byKey.set(item.placeholder, prev);
  }
  return byKey;
}

export function zendeskToFreshdesk(input, rows, options = {}) {
  const macros = Array.isArray(input) ? input : input.macros || [];
  const allUnmapped = [];
  const responses = macros.map((macro) => {
    const local = [];
    const actions = macro.actions || [];
    const bodyAction = actions.find((a) => a.field === "comment_value" || a.field === "comment_value_html");
    let content = bodyAction ? String(bodyAction.value || "") : "";
    content = translatePlaceholders(content, "zendesk-to-freshdesk", rows, local);
    if (options.plainText) content = stripHtml(content);
    for (const item of local) allUnmapped.push({ ...item, title: macro.title || "" });
    return { title: macro.title || "", content };
  });
  return { output: { canned_responses: responses }, unmapped: summarise(allUnmapped), converted: responses.length };
}

export function freshdeskToZendesk(input, rows, options = {}) {
  const items = Array.isArray(input) ? input : input.canned_responses || input.cannedResponses || [];
  const allUnmapped = [];
  const macros = items.map((item) => {
    const local = [];
    let content = String(item.content || item.body || "");
    content = translatePlaceholders(content, "freshdesk-to-zendesk", rows, local);
    if (options.plainText) content = stripHtml(content);
    for (const entry of local) allUnmapped.push({ ...entry, title: item.title || item.name || "" });
    return {
      title: item.title || item.name || "",
      active: true,
      actions: [{ field: "comment_value", value: content }]
    };
  });
  return { output: { macros }, unmapped: summarise(allUnmapped), converted: macros.length };
}

function summarise(allUnmapped) {
  const byKey = collectUnmapped(allUnmapped);
  const list = [];
  for (const entry of allUnmapped) {
    const agg = byKey.get(entry.placeholder);
    if (!agg.titles.includes(entry.title)) agg.titles.push(entry.title);
  }
  for (const value of byKey.values()) list.push(value);
  list.sort((a, b) => a.placeholder.localeCompare(b.placeholder));
  return list;
}

export function toCsv(responses) {
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = ["title,content"];
  for (const r of responses) lines.push([esc(r.title), esc(r.content)].join(","));
  return lines.join("\n") + "\n";
}

export function buildReport({ direction, converted, unmapped }) {
  const lines = [];
  lines.push("# Conversion report");
  lines.push("");
  lines.push("Direction: " + direction);
  lines.push("Items converted: " + converted);
  lines.push("Unmapped placeholders: " + unmapped.length);
  lines.push("");
  if (unmapped.length === 0) {
    lines.push("Every placeholder found in the source was mapped.");
  } else {
    lines.push("Unmapped placeholders are left as-is in the output. Add them to the mapping file, or fix them by hand after conversion.");
    lines.push("");
    lines.push("| Placeholder | Reason | Occurrences | Found in |");
    lines.push("| --- | --- | --- | --- |");
    for (const u of unmapped) {
      lines.push("| " + u.placeholder + " | " + u.reason + " | " + u.count + " | " + u.titles.join(", ") + " |");
    }
  }
  lines.push("");
  return lines.join("\n");
}
