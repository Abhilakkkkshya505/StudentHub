# Design — StudentHub

## Vibe
Clean, modern, friendly student dashboard. Think "calm productivity app", not a boring college portal. Card-based layout, soft shadows, rounded corners, lots of whitespace.

## Colors (use CSS variables on :root)
Light mode:
- --bg: #f5f7fb
- --surface: #ffffff
- --text: #1e2433
- --muted: #6b7385
- --primary: #5b5bf0 (indigo)
- --primary-soft: #e8e8ff
- --success: #22a06b
- --warning: #f0a020
- --danger: #e5484d
- --border: #e3e7ef

Dark mode (`[data-theme="dark"]`):
- --bg: #0f1320
- --surface: #181d2e
- --text: #e8ebf5
- --muted: #9aa3b8
- --primary: #8585ff
- --primary-soft: #26274a
- --border: #2a3047

## Typography
- Font: "Poppins" from Google Fonts for headings, "Inter" for body, with system-ui fallback
- Base size 16px; headings bold; numbers on cards large (28-36px)

## Layout
- Sticky top navbar: logo "StudentHub" left, page links center/right, dark mode toggle at end
- On mobile (< 700px): navbar collapses into a hamburger menu (simple JS toggle)
- Main content: max-width 1100px, centered, 24px padding
- Dashboard: responsive grid of cards (auto-fit, minmax(240px, 1fr))
- Module pages: two columns on desktop (form on left, list/results on right), stacked on mobile

## Components
- **Card**: surface background, 16px radius, soft shadow, 20px padding, subtle hover lift
- **Button**: primary (filled), secondary (outline), danger (red); 10px radius; smooth hover transition
- **Inputs**: full-width, 10px radius, clear focus ring in primary color, visible labels
- **Progress bar**: rounded, animated fill, colored by status
- **Badges**: small pills for priority (High red, Medium orange, Low green) and attendance status
- **Empty state**: friendly icon/emoji + one line text + action button
- **Toast**: small message at bottom for "Saved", "Deleted", validation errors
- **Warning banner**: colored strip at top of a page for budget/attendance alerts

## Icons
Use emoji or inline SVG (no icon libraries). Example: 📚 planner, 💰 budget, ✅ attendance, 📝 to-do, ⏱️ timer.

## Motion
Subtle only: 0.2s transitions, progress bar fill animation, fade-in cards on load. Respect `prefers-reduced-motion`.

## Accessibility
- Contrast good in both themes
- Buttons and inputs at least 40px tall for touch
- Labels tied to inputs, focus states visible
- Do not rely on color alone (add text like "Low attendance")

## Demo polish
- A "Load demo data" button on the dashboard fills realistic Indian student sample data (subjects like DSA, Physics, Maths; expenses like canteen, auto, recharge)
- Each page has a short one-line subtitle explaining what it does
