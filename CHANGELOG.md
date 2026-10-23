# Changelog

## 1.0.0

First release.

- Convert Zendesk macro JSON to Freshdesk canned response JSON and CSV.
- Convert Freshdesk canned response JSON back to Zendesk macro JSON.
- Editable placeholder mapping file, placeholders.json, covering requester, ticket, agent and organization fields.
- Conversion report in Markdown listing every placeholder that could not be mapped, left as-is in the output.
- Option to strip HTML tags from bodies with a plain text flag.
- Library API and CLI, zero dependencies.
