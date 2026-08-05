# ChainBase — Landing Page Spec

Build target: the public marketing/landing page at `/` (React + your existing stack).
This document is the **complete** spec: tokens, structure, copy, and the animated globe background.

---

## 1. Foundations

### Fonts
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```
- **UI / body:** `'Plus Jakarta Sans', system-ui, sans-serif`
- **Numbers, hashes, addresses, step numerals:** `'JetBrains Mono', monospace`

### Design tokens (CSS custom properties)

```css
*{box-sizing:border-box;margin:0;padding:0}
body{
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  background:#0b0d12;color:var(--cb-text);
  -webkit-font-smoothing:antialiased;
}
a{color:#5b93f5;text-decoration:none}
a:hover{color:#7fadfa}
::selection{background:rgba(47,127,240,.28)}

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
  --cb-accent-text:#9dc0ff;
  --cb-accent-soft:rgba(75,139,244,.14);
  --cb-shadow:none;
  --cb-good:#4fd39a;
  --cb-nav:rgba(11,13,18,.72);
  --cb-veil:radial-gradient(ellipse 55% 62% at 50% 50%,
    rgba(9,22,58,.55), rgba(9,19,46,.6) 40%,
    rgba(10,14,26,.72) 70%, rgba(11,13,18,.9) 100%);
}

/* LIGHT — applied by adding class .cb-light on the page root */
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
  --cb-accent-text:#1a56c0;
  --cb-accent-soft:rgba(31,102,224,.08);
  --cb-shadow:0 1px 2px rgba(16,24,40,.05);
  --cb-good:#0a8a52;
  --cb-nav:rgba(245,246,249,.78);
  --cb-veil:radial-gradient(ellipse 55% 62% at 50% 50%,
    rgba(222,231,246,.4), rgba(232,238,248,.62) 62%, rgba(245,246,249,.9) 100%);
}
```

### Keyframes
```css
@keyframes cbspin{to{transform:rotate(360deg)}}
@keyframes cbup{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes cbpulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}
@keyframes cbbounce{0%,100%{transform:translateY(0);opacity:.5}50%{transform:translateY(6px);opacity:1}}
```

---

## 2. Page shell

```html
<div class="{theme === 'light' ? 'cb-light' : ''}"
     style="position:relative;min-height:100vh;background:var(--cb-bg);overflow-x:hidden">

  <!-- fixed animated background, behind everything -->
  <div style="position:fixed;inset:0;z-index:0;pointer-events:none">
    <canvas ref={canvasRef} style="display:block;width:100%;height:100%"></canvas>
    <div style="position:absolute;inset:0;background:var(--cb-veil)"></div>
  </div>

  <header>…</header>
  <section>…</section>   <!-- all content sections: position:relative;z-index:1 -->
  <footer>…</footer>
</div>
```

Theme is local component state (`'dark' | 'light'`), toggled by the header button. Persist to localStorage if you want it sticky.

---

## 3. Header (sticky)

```
position:sticky; top:0; z-index:30;
display:flex; align-items:center; justify-content:space-between;
padding:16px 34px;
border-bottom:1px solid var(--cb-border);
background:var(--cb-nav);
backdrop-filter:blur(14px);
```

**Logo mark** — 30×30 circle, `overflow:hidden`, `box-shadow:inset 0 0 0 1px rgba(255,255,255,.16)`, composed of three stacked absolute layers:
1. `background:#050b18`
2. `inset:-30%; background:conic-gradient(from 0deg,#2f7bff,#00c97b,#ffc400,#ff3b3b,#2f7bff); filter:blur(4px) saturate(1.4); animation:cbspin 14s linear infinite`
3. `border-radius:50%; background:radial-gradient(circle at 32% 26%,rgba(255,255,255,.36),rgba(255,255,255,0) 44%)` (specular highlight)

This spinning multicolor sphere is the **only** full-color element in the product — keep it.

**Wordmark:** `font-size:16.5px;font-weight:700;letter-spacing:-.3px` — "Chain" in `--cb-text`, "Base" in a `<span style="font-weight:500;opacity:.5">`.

**Right cluster** (`gap:9px`):
- Theme toggle: 34×34, `border-radius:9px`, `background:var(--cb-surface)`, `1px solid var(--cb-border)`, icon color `var(--cb-muted)`. Moon icon in light mode, sun icon in dark mode (16px, `fill:currentColor`).
- `Sign In` — secondary button: `padding:8px 15px;border-radius:9px;background:var(--cb-surface);border:1px solid var(--cb-border2);font-size:13px;font-weight:600;color:var(--cb-text2)`
- `Get Started` — primary: same metrics, `background:var(--cb-accent);border:1px solid var(--cb-accent);color:#fff`

---

## 4. Hero

`position:relative;z-index:1;text-align:center;padding:104px 24px 78px;max-width:800px;margin:0 auto`

**Status pill** (`animation:cbup .6s ease both`):
`display:inline-flex;align-items:center;gap:8px;padding:6px 13px;border-radius:999px;background:var(--cb-surface);border:1px solid var(--cb-border2);font-size:12px;color:var(--cb-text2);margin-bottom:26px`
with a 6px dot: `background:var(--cb-good);animation:cbpulse 2s ease-in-out infinite` — text: **Live on Ethereum**

**H1** — `font-size:46px;font-weight:700;line-height:1.16;letter-spacing:-1.4px;color:var(--cb-text);animation:cbup .7s ease both;animation-delay:.05s`

> A Citizens Dividend, **[paid automatically]** and transparently

The bracketed phrase is a `<span style="color:var(--cb-accent-text)">`.

**Subhead** — `font-size:16px;color:var(--cb-muted);margin-top:18px;line-height:1.65`, delay `.15s`:

> ChainBase disburses USDC payments directly to verified recipients every cycle. Funding, eligibility, and every transaction settle on Ethereum — auditable by anyone, controlled by no one.

**CTA row** — `display:flex;gap:10px;justify-content:center;margin-top:32px;flex-wrap:wrap`, delay `.25s`. Buttons: `padding:12px 22px;border-radius:9px;font-size:14px;font-weight:600`.
- Primary: **Register as a Recipient** — `background:var(--cb-accent);border:1px solid var(--cb-accent);color:#fff`
- Secondary: **Sign In** — `background:var(--cb-surface);border:1px solid var(--cb-border2);color:var(--cb-text2)`

**Scroll cue** — `margin-top:56px;font-size:12px;color:var(--cb-muted2)`, column flex, gap 6px: label "How it works" + `↓` with `animation:cbbounce 1.8s ease-in-out infinite`.

---

## 5. "Understand the basics" — 3 alternating explainer rows

Section: `padding:30px 24px 60px;max-width:980px;margin:0 auto`

Header block, centered, `margin-bottom:14px`:
- Title: `font-size:22px;font-weight:700;letter-spacing:-.5px;color:var(--cb-text)` — **Understand the basics**
- Sub: `font-size:14px;color:var(--cb-muted);margin-top:5px` — *No crypto experience needed — here's what's actually happening*

Each row: `display:flex;align-items:center;gap:48px;padding:36px 0;border-bottom:1px solid var(--cb-border)`. Row 2 adds `flex-direction:row-reverse`. Last row has **no** bottom border. Visual column is `flex:0 0 330px`, text column `flex:1;min-width:0`.

Text column pattern:
- Heading: `font-size:20px;font-weight:700;letter-spacing:-.3px;color:var(--cb-text);margin-bottom:9px`
- Body: `font-size:14.5px;color:var(--cb-muted);line-height:1.7;text-wrap:pretty`

### Row 1 — "What is Ethereum?"
Visual: four block cards in a horizontal row, joined by 18×1px connectors (`background:var(--cb-border2)`, omitted after the last). Each card: `width:68px;padding:10px 8px;border-radius:9px;background:var(--cb-surface);border:1px solid var(--cb-border);box-shadow:var(--cb-shadow);text-align:center`, containing a mono 10px hash in `--cb-muted2` (`0x8f3a…`, `0x2c91…`, `0xa07e…`, `0x51db…`) and a 12px `✓` in `--cb-good`. Caption below (`margin-top:14px;font-size:12px;color:var(--cb-muted2)`): *Every disbursement, permanently recorded*

Copy:
> Ethereum is a public computer network — no company or government owns it. Every ChainBase payment runs on it, and thousands of independent computers around the world check and agree on each one. That means once a payment happens, nobody can quietly change it or hide it afterward. Anyone — you, a journalist, an auditor — can look up any ChainBase disbursement and see exactly when it happened and for how much.

### Row 2 — "What's a wallet?" (reversed)
Visual: a card `padding:22px;border-radius:14px;background:var(--cb-surface);border:1px solid var(--cb-border);box-shadow:var(--cb-shadow);text-align:center` containing:
- Eyebrow: `font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:var(--cb-muted2);margin-bottom:13px` — **Your Wallet**
- Address chip: `padding:9px 12px;border-radius:8px;background:var(--cb-surface2);border:1px solid var(--cb-border);font-family:'JetBrains Mono';font-size:12.5px;color:var(--cb-text2)` with a 6px `--cb-good` dot — `0x71C7…9F3B`
- Footnote: `margin-top:13px;font-size:12px;color:var(--cb-good)` — ✓ Created automatically for you

Copy:
> Think of a wallet like an account number — except no one, not even ChainBase, can move money out of it without your permission, and you don't need a bank to have one. When you sign up, ChainBase automatically creates a wallet for you, so you never have to touch anything crypto-related yourself. Already comfortable with a wallet app like MetaMask? You can connect that one instead.

### Row 3 — "Getting paid: what is USDC?"
Visual: an equivalence line — `1 USDC` `=` `$1 USD` at `font-size:24px;font-weight:700;letter-spacing:-.5px` (the `=` at 16px/500 in `--cb-muted2`), then a wrapping chip row (`gap:8px;margin-top:18px`) of **Rent, Groceries, Gas, Bills**, each: `padding:6px 12px;border-radius:999px;background:var(--cb-surface);border:1px solid var(--cb-border);font-size:12.5px;color:var(--cb-text2)`

Copy:
> USDC is a digital dollar — 1 USDC always equals $1 USD, unlike other cryptocurrencies that jump around in value. A $1,200 disbursement is exactly 1,200 USDC: no conversion, no waiting, no guessing what it's worth. You can spend it directly — many cards and apps let you pay for rent, groceries, gas, and bills with it just like a debit card — or convert it to cash in your bank account whenever you want.

---

## 6. "How it works" — 4 numbered steps

Section: `padding:20px 24px 96px;max-width:1020px;margin:0 auto`. Header block (`margin-bottom:32px`): **How it works** / *From enrollment to on-chain payment* (same title/sub styles as above).

Grid: `display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px`

Card: `padding:22px;border-radius:14px;background:var(--cb-surface);border:1px solid var(--cb-border);box-shadow:var(--cb-shadow)`
- Numeral: `font-family:'JetBrains Mono';font-size:12px;font-weight:500;color:var(--cb-accent-text);margin-bottom:12px`
- Title: `font-size:14.5px;font-weight:600;color:var(--cb-text);margin-bottom:6px`
- Body: `font-size:13px;color:var(--cb-muted);line-height:1.6;text-wrap:pretty`

| # | Title | Body |
|---|---|---|
| 01 | Enroll & verify | Recipients register with a wallet address. Admins review and mark accounts eligible for the program. |
| 02 | Pool funded on-chain | The Citizens Dividend funding pool is held in USDC on Ethereum, with balances visible to anyone. |
| 03 | Disbursed automatically | Each cycle, eligible recipients are paid in USDC automatically — no manual transfers, no delays. |
| 04 | Verifiable on Etherscan | Every disbursement produces a transaction hash recipients and auditors can check on-chain. |

**No emoji anywhere** — numerals only.

---

## 7. Footer

`text-align:center;padding:24px;border-top:1px solid var(--cb-border);font-size:12px;color:var(--cb-muted2)` — text: *ChainBase — Citizens Dividend Portal*

---

## 8. The animated globe background

A fixed full-viewport `<canvas>` behind all content, with the `--cb-veil` radial gradient layered on top for text legibility. It renders a rotating wireframe globe: hub nodes at real city coordinates, great-circle "chains" between distant hubs, and pulses travelling along them — money moving worldwide.

### Setup
- Mount on `componentDidMount`: build geometry, size the canvas, start a `requestAnimationFrame` loop, listen for `resize`. Cancel the RAF and remove the listener on unmount.
- DPR-aware: `dpr = Math.min(devicePixelRatio || 1, 2)`; set `canvas.width/height = size * dpr` and `ctx.setTransform(dpr,0,0,dpr,0,0)`.
- Geometry:
  - `R = Math.min(w * 0.46, h * 0.72)` — the globe fills the viewport
  - `cx = w * 0.5`, `cy = h * 0.5`
- Projection: rotate about Y by `rot = t * 0.055` rad/s, then tilt `0.36` rad; orthographic to screen. Return `[x, y, z]` where `z > 0` means the front hemisphere.

```js
project(v, rot){
  const tilt = 0.36;
  const ca = Math.cos(rot), sa = Math.sin(rot);
  const x = v[0]*ca + v[2]*sa;
  let z = -v[0]*sa + v[2]*ca;
  const y0 = v[1], ct = Math.cos(tilt), st = Math.sin(tilt);
  const y = y0*ct - z*st;
  z = y0*st + z*ct;
  return [this.cx + x*this.R, this.cy - y*this.R, z];
}
```

### Data
- **Hubs** — 32 `[lat, lon]` pairs (NYC, LA, Mexico City, São Paulo, Lima, Bogotá, London, Paris, Berlin, Rome, Moscow, Stockholm, Cairo, Lagos, Nairobi, Johannesburg, Abuja, Dubai, Mumbai, Delhi, Chennai, Singapore, Jakarta, Hong Kong, Shanghai, Beijing, Seoul, Tokyo, Sydney, Auckland, Toronto, Buenos Aires), converted to unit vectors:
  `[cos(lat)cos(lon), sin(lat), cos(lat)sin(lon)]`
- **Links** — sparse on purpose. For every *even-indexed* hub, sort the other hubs by descending distance and pick one at random from the six farthest; dedupe pairs. Each link stores `{a, b, speed: 0.055 + rand*0.1, phase: rand, hue: index % 4}`. Roughly 16 arcs total — **do not add more, it gets messy.**
- **Dust** — 620 points on a Fibonacci lattice over the sphere.

### Palette (all blue — four close navy shades)
```js
const PRISM = light
  ? ['21,58,138','17,74,168','13,44,110','26,86,190']
  : ['46,86,178','38,102,206','30,64,146','58,116,220'];
const GLOW = light ? '18,64,170' : '34,92,225';
const C = light
  ? { grid:'25,60,120',   dust:'40,72,130',   halo:'rgba(31,102,224,.13)' }
  : { grid:'150,190,255', dust:'150,185,255', halo:'rgba(75,139,244,.20)' };
```

### Draw order (per frame, after `clearRect`)
1. **Halo** — radial gradient from `C.halo` to transparent, radius `R * 1.35`.
2. **Sphere body** — radial gradient offset to the upper-left (`cx - .35R, cy - .4R`), `rgba(31,102,224,.07)` → `rgba(31,102,224,.015)` light / `rgba(90,140,235,.13)` → `rgba(20,32,60,.03)` dark. Gives the globe volume.
3. **Limb** — a 1.4px circle at radius `R` in `rgba(C.grid, .30–.32)`. This edge is what makes it read as a sphere; don't drop it.
4. **Graticule** — latitudes at −60/0/+60°, longitudes every 45° (plus mirrored copies). Sampled every 3°, alpha `.19` dark / `.22` light. Segments with `z <= 0` are skipped so the back of the sphere is hidden.
5. **Dust** — 1.3px squares, alpha `(light ? .26 : .32) * (0.25 + z*0.75)` (depth fade).
6. **Arcs** — 40-segment great circles via slerp, lifted off the surface by `1 + 0.16*sin(π·s)`. Drawn twice: a 3px soft pass at alpha `.3` (dark) / `.2` (light), then a 1.1px core at `.85` / `.55`.
7. **Pulses** — one travelling dot per arc at `t = (time*speed + phase) % 1`, faded by `sin(π·t)`: 11px halo (α .13), 5.5px glow (α .26), 2.6px core (α ~1).
8. **Hub nodes** — for each front-facing hub, with `breathe = 0.55 + 0.45*sin(t*1.5 + i)` and `a = (light?0.9:1) * (0.45 + z*0.55)`:
   - wide radial bloom, radius `16 + breathe*8`, stops `GLOW@a*.5*breathe` → `GLOW@a*.16*breathe` → transparent
   - inside `ctx.save()`: `shadowColor = rgba(GLOW,a)`, `shadowBlur = 10 + breathe*8`; stroke a `4.5 + breathe*1.6` ring at `α = a*.55`, then fill a 2.8px core in `GLOW` at `α = a`
   - a 1.1px specular pinpoint in `rgba(190,215,255)` dark / `rgba(120,170,255)` light at `α = a*(0.45 + 0.4*breathe)`

`slerp(a,b,t)` is the standard spherical interpolation; fall back to `a` when `sin(Ω) < 1e-6`.

### Performance / a11y
- Everything is one canvas and one RAF loop; no per-frame allocation beyond gradients.
- Respect `prefers-reduced-motion`: render a single static frame and skip the loop.
- The canvas wrapper is `pointer-events:none` — it never intercepts clicks.

---

## 9. Rules to keep

- **Blue is the only accent.** Green appears solely as a status/verified signal (`--cb-good`); nothing else is colored.
- **Flat surfaces.** No glows, no gradient text, no colored card washes. Depth comes from `--cb-border` and, in light mode only, a 1px shadow.
- **No emoji.** Numerals, checkmarks, and SVG icons only.
- Radii: 8–9px controls, 14px cards, 999px pills.
- Body copy tops out at `--cb-muted`; reserve `--cb-text` for headings and values.
