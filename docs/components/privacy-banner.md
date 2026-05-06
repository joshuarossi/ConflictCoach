# PrivacyBanner

A persistent, non-dismissable banner that visually declares private data contexts across the app. Required by PRD §6 and DesignDoc §4.7 to ensure every screen containing private data clearly signals it.

**File:** `src/components/PrivacyBanner.tsx`

## Props

| Prop             | Type     | Required | Description                                                        |
| ---------------- | -------- | -------- | ------------------------------------------------------------------ |
| `text`           | `string` | Yes      | Primary banner text (e.g., "This conversation is private to you.") |
| `otherPartyName` | `string` | No       | When provided, appends personalized copy: "{name} can't see this." |

## Usage

```tsx
import { PrivacyBanner } from "@/components/PrivacyBanner";

// Basic usage
<PrivacyBanner text="This conversation is private to you." />

// With other party name
<PrivacyBanner
  text="This conversation is private to you."
  otherPartyName="Jordan"
/>
```

## Usage Contexts

The banner is intended for the top of private-scoped views:

- **Private Coaching:** "This conversation is private to you. [Name] will never see any of it."
- **Synthesis view:** "Private to you — [Name] has their own version"
- **Draft Coach panel:** "This is private to you. [Name] can't see what you're discussing here."

## Visual Design

- Background color: `--private-tint` (#F0E9E0)
- Lock icon: Lucide `Lock`, 1.5px stroke width
- The lock icon is interactive (not decorative) — clicking it opens a Dialog modal explaining what data is private and why

## Accessibility

- Banner uses `role="region"` with `aria-label="Privacy notice"`
- Lock button has `aria-label="Lock — view privacy details"`
- Screen reader text is always present (visually hidden): "Private conversation. Only you and the AI coach see this."
- Modal follows focus management best practices via Radix Dialog

## Dependencies

- `lucide-react` — Lock icon
- `@radix-ui/react-dialog` — Modal primitive (via `src/components/ui/dialog.tsx`)
