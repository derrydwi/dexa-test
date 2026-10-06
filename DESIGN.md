# Interface design

The interface prioritizes two tasks: employees recording their workday and HR reviewing employees/attendance. Employee screens show today's status and the next available action; HR screens use searchable, paginated tables and explicit filters.

## Shared visual tokens

Tokens are defined in `apps/web/src/styles/tokens.css` and mapped to Tailwind/shadcn semantic variables. Page composition remains in `layout.css`.

| Token            | Value     | Purpose                     |
| ---------------- | --------- | --------------------------- |
| Background       | `#f5f7f8` | Neutral work surface        |
| Navigation       | `#142c34` | App navigation and headings |
| Primary          | `#147d70` | Main actions                |
| Foreground       | `#223c43` | Body text                   |
| Muted foreground | `#5b7078` | Supporting text             |
| Border           | `#e4eaed` | Panel boundaries            |
| Focus            | `#168477` | Keyboard focus              |

DM Sans Variable is bundled locally through Fontsource, with sans-serif fallbacks. Shared control radii are 8 px; panel radii are 14 px. Status badges retain text alongside color: Working, Completed, Incomplete, Active, and Inactive.

## Components and interaction

Shared controls use owned shadcn/ui component source and Radix primitives. Select filters use Radix Select; the employee picker composes Popover and Command with remote search, loading/retry feedback, and selection preservation. Native date/file behavior is retained inside labeled fields.

Forms use React Hook Form and Zod, with field-level errors and server validation authoritative. Photo submissions show a local preview and confirmation. Pending mutations block duplicate submissions and dialog dismissal. Dialogs and mobile navigation restore focus; mobile tables scroll within their panels.

Compound search fields apply their focus treatment to the outer container so it fits around the icon and input. Status meaning never relies on color alone. Loading, empty, validation, network-failure, and background-refresh failure states remain explicit.

## Verification

Browser tests cover desktop/mobile widths, keyboard selects and picker search, dialog focus restoration, pending-dismissal protection, file reset, and WCAG A/AA scans. Viewports are emulated; physical-device and manual screen-reader testing are not included. See [README](README.md) for commands and limitations.
