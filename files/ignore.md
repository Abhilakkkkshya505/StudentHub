# Ignore / Do Not Do — StudentHub

## Tech restrictions (hard rules)
- Do NOT use React, Vue, Angular, Svelte, Vite, Next.js, Tailwind, Bootstrap, jQuery or any framework/library
- Do NOT use npm, bundlers, or build steps. The project must run by opening index.html
- Do NOT add a backend, server, Node/Express, Firebase, Supabase or any database
- Do NOT use APIs that need keys, and do NOT make network calls (Google Fonts link is the only allowed external resource)
- Do NOT use charting libraries (Chart.js etc). Draw charts with CSS bars or canvas
- Do NOT add login, signup, authentication or payments
- Do NOT use sessionStorage or cookies. Use localStorage only

## Scope restrictions
- Do NOT add features beyond prd.md unless asked
- Do NOT add extra pages, modules or settings screens on your own
- Do NOT rename the file structure or localStorage keys defined in prd.md
- Do NOT build everything in one go. Build step by step in the order in prd.md and stop after each step

## Code style
- Beginner-friendly: simple functions, clear names, short comments explaining what each block does
- No advanced patterns (no classes with inheritance, no modules/imports, no async complexity, no minified code)
- Plain `<script src="...">` tags, no ES module imports
- One responsibility per JS file
- Do NOT leave `console.log` debugging or dead/commented-out code
- Do NOT use inline `onclick` everywhere if it makes code messy; prefer `addEventListener`

## Design restrictions
- Do NOT use stock/copyrighted images; use emoji or inline SVG
- Do NOT use heavy animations or autoplay sound (Pomodoro sound only when the timer ends)
- Do NOT hard-code colors; use the CSS variables from design.md
- Do NOT ship anything that breaks below 360px width

## Data safety
- Always wrap `JSON.parse` in try/catch and fall back to defaults if data is corrupted
- Validate inputs (no empty text, no negative or zero amounts, no past exam dates)
- Ask before deleting everything ("Are you sure?")
