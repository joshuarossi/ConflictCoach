# Design Tokens

The project uses a design-token layer on top of Tailwind CSS so that every page
shares the same visual language. Tokens are defined in `STYLE_GUIDE.md` and
`03-DesignDoc.md` (both attached to Epic WOR-5) and exposed as Tailwind
utilities.

## Token categories

| Category | Examples | Raw Tailwind to avoid |
|---|---|---|
| **Color** | `bg-accent`, `text-text-primary`, `bg-error-subtle`, `text-danger` | `bg-blue-600`, `text-gray-900`, `bg-red-50` |
| **Typography** | `text-h1`, `text-body`, `text-label`, `text-meta`, `text-timestamp` | `text-2xl`, `text-lg`, `text-xs`, `text-sm` |
| **Spacing** | Uses the scale defined in STYLE_GUIDE | Arbitrary `mb-4`, `gap-3`, `py-3` |
| **Radius** | `rounded-sm`, `rounded-md` | `rounded-[var(--radius-sm)]` (CSS-var syntax in classes) |
| **Shadow** | `shadow-2`, `shadow-3` | `shadow-[var(--shadow-2)]`, `shadow-[0_12px_32px_...]` |
| **Surfaces** | `bg-surface`, `bg-surface-subtle`, `bg-canvas` | `bg-white`, `bg-gray-50` |
| **Borders** | `border-border-default`, `border-coach-accent` | `border-gray-200`, `border-[var(--border-default)]` |

## Buttons

Buttons use four spec'd variants — **primary**, **secondary**, **ghost**, and
**destructive** — with a consistent height of `h-10`. Always use design-token
colors (`bg-accent`, `text-accent-on`, `hover:bg-accent-hover`) rather than
raw Tailwind palette classes.

## Layout widths

Pages render at one of two widths, assigned per route (see `App.tsx`):

- **Reading width** — 720 px (`ReadingLayout`): landing, dashboard, case
  detail, case creation, invite, admin pages (templates list, template editor,
  audit log).
- **Chat width** — 1080 px (`ChatLayout`): private coaching, joint chat.

## Contributing

When adding or modifying UI:

1. **Never use raw Tailwind color/size/spacing classes** — always use the
   corresponding design token.
2. Refer to `STYLE_GUIDE.md` for the canonical token list.
3. If a token you need doesn't exist, add it to the Tailwind config and
   `STYLE_GUIDE.md` before using it.
4. Run the token-usage tests (`tests/wor-80/token-usage.test.ts`) to verify no
   hardcoded literals crept in.
