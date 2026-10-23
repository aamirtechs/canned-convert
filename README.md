# canned-convert

Convert macros and canned responses between Zendesk, Freshdesk, Intercom and Chatwoot formats offline, with placeholders translated through an editable mapping file and a report of anything that could not be mapped.

## Why

Moving a support team between helpdesks usually means hand editing hundreds of canned replies, because each platform spells its placeholders differently. A reply that says hello to the requester by first name in Zendesk will silently print the raw placeholder text in Freshdesk if nobody translates it. This tool does the bulk conversion from exported files, translates the placeholders it knows, and lists the rest in a report so a human can finish the job with a complete list instead of hunting reply by reply.

Version 1 covers Zendesk macros to Freshdesk canned responses (JSON and CSV) and Freshdesk canned responses back to Zendesk macros. Intercom and Chatwoot are seeded as good first issues in GFIs.md.

## Install

Requires Node.js 20 or later. No dependencies.

```bash
git clone https://github.com/aamirtechs/canned-convert.git
cd canned-convert
node src/cli.js --help
```

Or run it in place with `npx` style direct calls to `node src/cli.js`. There is nothing to install.

## The placeholder mapping

`placeholders.json` at the repo root is the editable mapping table. Each row names a concept once and gives its spelling per platform, for example:

| Concept | Zendesk | Freshdesk |
| --- | --- | --- |
| Requester first name | `{{ticket.requester.first_name}}` | `{{ticket.requester.firstname}}` |
| Agent name | `{{ticket.assignee.name}}` | `{{ticket.agent.name}}` |
| Organization name | `{{ticket.organization.name}}` | `{{ticket.company.name}}` |

The file also covers requester name, requester email, requester phone, ticket id, ticket subject, ticket description, ticket status, ticket priority, ticket type, ticket URL, ticket created date and agent email. Edit it freely, add your own custom fields, and the converter picks the changes up on the next run. Pass `--mapping your-file.json` to use a different copy.

Two placeholders in the shipped file have no Freshdesk equivalent and are documented there: ticket due date and satisfaction rating. Like any placeholder missing from the file, they are left as-is in the output and listed in the conversion report.

## Usage

```bash
# Zendesk macros to Freshdesk canned responses, JSON
node src/cli.js --input examples/zendesk-macros.json --from zendesk --to freshdesk --output freshdesk.json --report report.md

# Same conversion, CSV output
node src/cli.js --input examples/zendesk-macros.json --from zendesk --to freshdesk --format csv --output freshdesk.csv --report report.md

# Freshdesk canned responses back to Zendesk macros
node src/cli.js --input examples/freshdesk-canned.json --from freshdesk --to zendesk --output zendesk.json --report report.md

# Strip HTML tags from bodies while converting
node src/cli.js --input examples/zendesk-macros.json --from zendesk --to freshdesk --output freshdesk.json --plain-text
```

## Example

Input, from `examples/zendesk-macros.json` (trimmed to the shape, the file holds three macros):

```json
{
  "macros": [
    {
      "id": 1,
      "title": "Greeting and first reply",
      "active": true,
      "actions": [
        {
          "field": "comment_value",
          "value": "Hi {{ticket.requester.first_name}}, thanks for writing in about \"{{ticket.subject}}\". My name is {{ticket.assignee.name}} from {{ticket.organization.name}} and I am looking into ticket {{ticket.id}} now."
        }
      ]
    },
    {
      "id": 2,
      "title": "Ask for more detail",
      "active": true,
      "actions": [
        {
          "field": "comment_value",
          "value": "<p>Hello {{ticket.requester.name}},</p><p>Could you confirm the email on the account ({{ticket.requester.email}})? The custom reference is {{ticket.custom_field_123}}.</p>"
        }
      ]
    },
    {
      "id": 3,
      "title": "Closing note",
      "active": true,
      "actions": [
        {
          "field": "comment_value",
          "value": "Thanks again, {{ticket.requester.first_name}}. This ticket was due on {{ticket.due_date}}. If you were happy with the help, the rating was {{satisfaction.rating}}."
        }
      ]
    }
  ]
}
```

Real output from running the first command above on that file:

```json
{
  "canned_responses": [
    {
      "title": "Greeting and first reply",
      "content": "Hi {{ticket.requester.firstname}}, thanks for writing in about \"{{ticket.subject}}\". My name is {{ticket.agent.name}} from {{ticket.company.name}} and I am looking into ticket {{ticket.id}} now."
    },
    {
      "title": "Ask for more detail",
      "content": "<p>Hello {{ticket.requester.name}},</p><p>Could you confirm the email on the account ({{ticket.requester.email}})? The custom reference is {{ticket.custom_field_123}}.</p>"
    },
    {
      "title": "Closing note",
      "content": "Thanks again, {{ticket.requester.firstname}}. This ticket was due on {{ticket.due_date}}. If you were happy with the help, the rating was {{satisfaction.rating}}."
    }
  ]
}
```

And the real conversion report it wrote:

```markdown
# Conversion report

Direction: zendesk-to-freshdesk
Items converted: 3
Unmapped placeholders: 3

Unmapped placeholders are left as-is in the output. Add them to the mapping file, or fix them by hand after conversion.

| Placeholder | Reason | Occurrences | Found in |
| --- | --- | --- | --- |
| {{satisfaction.rating}} | no equivalent in target format | 1 | Closing note |
| {{ticket.custom_field_123}} | not in mapping file | 1 | Ask for more detail |
| {{ticket.due_date}} | no equivalent in target format | 1 | Closing note |
```

The reverse direction on `examples/freshdesk-canned.json` produces Zendesk macros like:

```json
{
  "macros": [
    {
      "title": "Refund status",
      "active": true,
      "actions": [
        {
          "field": "comment_value",
          "value": "Hi {{ticket.requester.first_name}}, your refund for ticket {{ticket.id}} is on its way. Any questions, reply to {{ticket.assignee.email}}."
        }
      ]
    },
    {
      "title": "Company welcome",
      "active": true,
      "actions": [
        {
          "field": "comment_value",
          "value": "Welcome aboard, {{ticket.organization.name}}. Your contact is {{ticket.requester.name}} ({{ticket.requester.email}})."
        }
      ]
    }
  ]
}
```

## Library API

```js
import { loadMapping, zendeskToFreshdesk, freshdeskToZendesk } from "./src/convert.js";

const rows = loadMapping("placeholders.json");
const result = zendeskToFreshdesk(JSON.parse(sourceJson), rows, { plainText: false });
console.log(result.output);   // { canned_responses: [...] }
console.log(result.unmapped); // placeholders left as-is, with reasons
```

## Tests

```bash
npm test
```

## License

MIT, see LICENSE.
