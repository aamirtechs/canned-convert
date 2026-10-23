# Good first issues

These are seeded ideas for first time contributors. Each one is self contained and needs no account on any helpdesk platform, since every format here is handled offline from exported files.

## 1. Intercom saved-reply export adapter

Add an adapter that reads an Intercom saved reply export and converts it to the Freshdesk and Zendesk shapes this tool already produces. Intercom uses a different placeholder style, so the adapter needs its own placeholder pass through the existing mapping file rather than a second hard coded table. Include sample input in examples, tests for at least two placeholders, and a note in the README about any Intercom placeholder that has no equivalent.

## 2. Chatwoot macro JSON output

Add Chatwoot as an output target for Zendesk macros, matching the shape of a Chatwoot macro export. Reuse the existing conversion pipeline and add Chatwoot entries to the mapping file where a sensible equivalent exists, documenting the ones that do not. Tests should cover a converted macro end to end, and the conversion report should list Chatwoot specific gaps the same way it lists Freshdesk gaps today.

## 3. Dry-run diff report comparing source and converted libraries

Add a dry run mode that writes no converted file and instead reports a diff style summary: how many items would change, which bodies would change only in placeholders, and which bodies would change in wording. This helps a support lead review a large library before committing to a migration. Keep the report in Markdown, reuse the existing report writer where possible, and add tests with a small two item library.
