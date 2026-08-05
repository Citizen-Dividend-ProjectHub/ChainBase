# ChainBase Dashboard v12 — Visual Style Guide

**Scope: style only.** This defines how the dashboard should *look and feel* — color, type, surfaces, states, density. Layout and information architecture stay as they are in the current app; apply this styling to the existing screens.

---

## 1. Principles

1. **Clean finance, not crypto.** The reference points are Stripe and Mercury — calm, flat, legible. Nothing glows, nothing gradients.
2. **Blue is the only accent.** One accent color across buttons, active nav, links, and progress. Green/gold/red exist **only** to communicate status.
3. **The logo is the exception.** The spinning conic-gradient sphere is the single full-color element in the entire product. Everything else is restrained.
4. **Depth comes from borders, not shadows.** Dark mode has no shadow at all; light mode gets one hairline.
5. **Numbers are typographic objects.** Monospace and tabular figures for every amount, hash, address, and countdown.

---

## 2. Tokens

Drop these in once and reference the variables everywhere. Light mode = add `.cb-light` to the app root.

```css
/* DARK (default) */
:root{
  --cb-bg:#0b0d12;
  --cb-surface:#13161d;
  --cb-surface2:#181c24;
  --cb-text:#eef1f6;
  --cb-text2:#c9ced9;
  --cb-muted:#9aa1af;
  --cb-muted2:#7d8492;
  --cb-border:rgba(255,255,255,.085);
  --cb-border2:rgba(255,255,255,.14);
  --cb-accent:#4b8bf4;
  --cb-accent-soft:rgba(75,139,244,.14);
  --cb-shadow:none;
  --cb-navon-bg:rgba(75,139,244,.13);
  --cb-navon-text:#9dc0ff;
  --cb-good:#3ec98c;
  --cb-bad:#f2686b;
}

/* LIGHT */
.cb-light{
  --cb-bg:#f5f6f9;
  --cb-surface:#ffffff;
  --cb-surface2:#fafbfd;
  --cb-text:#11141b;
  --cb-text2:#333844;
  --cb-muted:#5c6373;
  --cb-muted2:#767d8c;
  --cb-border:#e5e8ef;
  --cb-border2:#d5dae4;
  --cb-accent:#1f66e0;
  --cb-accent-soft:rgba(31,102,224,.08);
  --cb-shadow:0 1px 2px rgba(16,24,40,.05);
  --cb-navon-bg:rgba(31,102,224,.08);
  --cb-navon-text:#1a56c0;
  --cb-good:#0a8a52;
  --cb-bad:#c93b3e;
}
```

**Usage map**

| Token | Use for |
|---|---|
| `--cb-bg` | app background |
| `--cb-surface` | cards, panels, inputs, buttons |
| `--cb-surface2` | nested/recessed fills inside a card (chips, track backgrounds) |
| `--cb-text` | headings, key values |
| `--cb-text2` | secondary labels, button text |
| `--cb-muted` | body copy, table cell text |
| `--cb-muted2` | eyebrows, captions, timestamps |
| `--cb-border` | default hairline |
| `--cb-border2` | emphasized edge (secondary buttons, dividers between chips) |
| `--cb-accent` | primary button fill, active nav, progress fill, links |
| `--cb-good / --cb-bad` | status only — never decoration |

---

## 3. Typography

```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

- **UI:** `'Plus Jakarta Sans', system-ui, sans-serif`, `-webkit-font-smoothing:antialiased`
- **Data:** `'JetBrains Mono', monospace` — amounts in tables, tx hashes, wallet addresses, countdowns, cycle IDs

**Scale**

| Role | Size / weight / tracking |
|---|---|
| Page title | 22–24px / 700 / `-.5px` |
| Card title | 15–16px / 600 / `-.2px` |
| Section eyebrow | 10.5–11px / 600 / uppercase / `+.7px` / `--cb-muted2` |
| Body | 13–14.5px / 400 / line-height 1.6–1.7 |
| Table cell | 12.5–13.5px |
| Hero metric | 20–30px / 500–700, mono, `font-variant-numeric:tabular-nums` |
| Micro caption | 11.5–12px / `--cb-muted2` |

Always set `font-variant-numeric:tabular-nums` on numeric columns so figures align down the column. Use `text-wrap:pretty` on paragraphs.

---

## 4. Surfaces & shape

- **Card:** `background:var(--cb-surface); border:1px solid var(--cb-border); border-radius:14px; box-shadow:var(--cb-shadow); padding:20–22px`
- **Control (button, input, chip, icon button):** `border-radius:8–9px`
- **Pill / progress track:** `border-radius:999px`
- **Nested fill:** `background:var(--cb-surface2)` with `1px solid var(--cb-border)`
- **Divider:** `1px solid var(--cb-border)` — never a heavier rule
- Card grid gap: **18px**. Section spacing: **24–32px**.

No card ever gets a colored background, colored left border, or tint. All cards are the same surface.

---

## 5. Buttons & controls

| Variant | Style |
|---|---|
| Primary | `background:var(--cb-accent);border:1px solid var(--cb-accent);color:#fff;font-weight:600` |
| Secondary | `background:var(--cb-surface);border:1px solid var(--cb-border2);color:var(--cb-text2);font-weight:600` |
| Ghost / icon | `background:var(--cb-surface);border:1px solid var(--cb-border);color:var(--cb-muted)` |

Sizes: compact `padding:7–8px 12–15px; font-size:13px`; standard `padding:12px 22px; font-size:14px`. Radius 8–9px.

**Hover:** lift the border one step (`--cb-border` → `--cb-border2`) or raise background to `--cb-surface2`. Primary hover darkens the accent ~6%. No transforms, no shadows on hover.

**Active nav item:** `background:var(--cb-navon-bg); color:var(--cb-navon-text)`, radius 9px. Inactive: `color:var(--cb-muted)`, transparent background.

**Wallet chip (header):** `display:inline-flex;gap:7px;padding:7px 12px;border-radius:8px;background:var(--cb-surface);border:1px solid var(--cb-border);font-size:12px`, mono address, preceded by a 6px `--cb-good` dot.

---

## 6. Status badges

One shared base plus a per-status color pair. This is the **only** place non-blue color appears in the UI.

```js
const base = 'display:inline-flex;align-items:center;gap:6px;padding:3px 9px;'
           + 'border-radius:6px;font-size:11px;font-weight:600;'
           + 'text-transform:capitalize;border:1px solid;';
```

| Status | Dark | Light |
|---|---|---|
| confirmed | bg `rgba(62,201,140,.10)` · border `rgba(62,201,140,.22)` · text `#4fd39a` | bg `rgba(10,138,82,.08)` · border `rgba(10,138,82,.22)` · text `#0a7a4a` |
| pending | bg `rgba(240,194,77,.10)` · border `rgba(240,194,77,.22)` · text `#e8c25e` | bg `rgba(176,120,0,.08)` · border `rgba(176,120,0,.22)` · text `#8a6100` |
| failed | bg `rgba(242,104,107,.10)` · border `rgba(242,104,107,.24)` · text `#f28184` | bg `rgba(201,59,62,.07)` · border `rgba(201,59,62,.22)` · text `#bb3538` |
| neutral | bg `rgba(255,255,255,.05)` · border `rgba(255,255,255,.1)` · text `#8f96a3` | bg `#f2f4f8` · border `#e5e8ef` · text `#5c6373` |

Badges are low-saturation tinted chips, never solid fills.

---

## 7. Tables & lists

- Header row: 10.5–11px, 600, uppercase, `+.7px` tracking, `--cb-muted2`; separated by a `--cb-border` hairline.
- Rows: `padding:12–14px 0`, separated by `--cb-border`; no zebra striping.
- Row hover: `background:var(--cb-surface2)` only.
- Column alignment: labels left, numbers right-aligned with tabular figures.
- Tx hashes render as mono 12px links in `--cb-accent`; a missing/failed hash renders as plain `--cb-muted2` text (e.g. `reverted`), not a link.
- Avatars/initials: 28–32px circle, `background:var(--cb-surface2)`, `1px solid var(--cb-border)`, 11–12px 600 text in `--cb-text2`. No colored avatar backgrounds.

---

## 8. Data display

**Progress / funding bar**
```
track: height:6px;border-radius:999px;background:var(--cb-surface2);
       border:1px solid var(--cb-border);overflow:hidden
fill:  height:100%;border-radius:999px;background:var(--cb-accent)
```
Caption row under it: `font-size:11.5px;color:var(--cb-muted2)`, `display:flex;justify-content:space-between`.

**Stat block:** eyebrow (uppercase micro, `--cb-muted2`) → value (mono, tabular, 20–30px, `--cb-text`) → optional context line (13px, `--cb-muted`). Never colorize the value; a delta may use `--cb-good`/`--cb-bad` on the *delta text* only.

**Charts:** single accent series, hairline gridlines in `--cb-border`, axis labels in `--cb-muted2`. No multi-hue palettes, no fills heavier than `--cb-accent-soft`.

---

## 9. Iconography & motion

- Inline SVG, 14–16px, `fill:currentColor`, inheriting `--cb-muted`. **No emoji anywhere.**
- Motion is minimal and purposeful: 150–200ms ease transitions on color/background; entrance fades of `.6–.7s` on first paint only. The logo's 14s spin is the sole ambient animation. Honor `prefers-reduced-motion`.

---

## 10. Checklist for "does this look like ChainBase?"

- [ ] Every card is the same flat `--cb-surface` with a 1px border and 14px radius
- [ ] Blue is the only accent; green/gold/red appear only in status badges
- [ ] All amounts, hashes, and addresses are mono with tabular figures
- [ ] No gradients, glows, colored washes, or accent left-borders
- [ ] No emoji
- [ ] Light and dark both work purely through the token swap — no per-mode component code
