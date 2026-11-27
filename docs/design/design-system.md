# SarayaTech design system

What the site actually uses today, and the rules a change must keep. The source of truth is the code:
tokens live in [`src/index.css`](../../src/index.css), Tailwind wiring in
[`tailwind.config.ts`](../../tailwind.config.ts). When this page and the code disagree, the code wins
and this page is out of date. Fix it in the same change.

Stack: Tailwind 3, shadcn/ui primitives in `src/components/ui/`, framer-motion, Poppins (self-hosted).

## 1. Colour tokens

All colours are HSL triples in CSS variables, used through Tailwind as `hsl(var(--x))`
(`bg-primary`, `text-muted-foreground`, `bg-gold`). A component uses the token, never a hex code.
Since B8 the chat launcher and panel use tokens too (section 7); no raw colour is left in the chat.

### Light (`:root`, the theme the site ships)

| Token | HSL | Purpose |
| --- | --- | --- |
| `--background` | `0 0% 100%` | Page background (white) |
| `--foreground` | `220 30% 15%` | Body text |
| `--card` / `--card-foreground` | `0 0% 100%` / `220 30% 15%` | Card surface and text |
| `--popover` / `--popover-foreground` | `0 0% 100%` / `220 30% 15%` | Menus, popovers |
| `--primary` | `220 70% 25%` | Navy brand: headings, links, secondary (default) buttons, navy bands |
| `--primary-foreground` | `0 0% 100%` | Text on navy |
| `--primary-light` | `220 60% 35%` | Navy hover, lightest navy band stop |
| `--primary-dark` | `220 80% 18%` | Darkest navy (gradients) |
| `--accent` | `0 85% 47%` | Red call to action (darkened from 55% in STS-041) |
| `--accent-foreground` | `0 0% 100%` | CTA label |
| `--accent-hover` | `0 85% 40%` | CTA hover, `#BD0F0F` (design audit B1: darker, never lighter) |
| `--accent-active` | `0 85% 35%` | CTA pressed, `#A50D0D` |
| `--gold` | `45 90% 60%` | The chat launcher only (B8: the user bubble, avatar and badge moved to navy) |
| `--gold-foreground` | `220 70% 25%` | Navy text on gold |
| `--secondary` | `215 15% 42%` | Slate secondary text and secondary buttons (42% since STS-041) |
| `--secondary-foreground` | `0 0% 100%` | Text on `--secondary` |
| `--secondary-light` | `215 15% 55%` | Decorative slate only. Not tested as text: do not use it for text |
| `--muted` | `220 15% 95%` | Quiet section backgrounds (`bg-muted`, `bg-muted/30`) |
| `--muted-foreground` | `220 15% 40%` | Supporting text |
| `--surface-subtle` | `220 20% 97%` | Alternate section bands (replaces ad-hoc `bg-muted/30`) |
| `--destructive` / `--destructive-foreground` | `0 85% 45%` / `0 0% 100%` | Error text, destructive buttons |
| `--destructive-surface` | `0 85% 97%` | Inline error panel background |
| `--success` / `--success-foreground` | `152 65% 26%` / `0 0% 100%` | Success text and icons, confirmation states |
| `--success-surface` | `152 45% 95%` | Success panel background |
| `--warning` / `--warning-surface` | `26 90% 22%` / `48 100% 96%` | Caution text on its panel (the legal draft notice), `text-warning` / `bg-warning-surface` |
| `--warning-border` | `32 95% 44%` | Caution panel edge, `border-warning-border` (3.04:1 on the surface) |
| `--brand-azure` | `211 93% 49%` | **Decorative only**: icons, rules, illustration. 4.18:1 on white, so never text under 24 px |
| `--border` | `220 15% 88%` | Decorative dividers and card edges only (1.34:1, not a control boundary) |
| `--border-strong` | `220 15% 80%` | Card edges on `--surface-subtle` (decorative, 1.54:1 there) |
| `--input` | `220 15% 55%` | Form control boundary (3:1, WCAG 1.4.11) |
| `--ring` | `220 70% 25%` | Focus ring |
| `--header-h` | `5rem` | Fixed header height (Header `h-20`); drives `html { scroll-padding-top }` |

**Radius** (design audit B1): `--radius-sm` 8 px (`rounded-sm`: chips, small tags), `--radius` 12 px
(`rounded-md`: buttons, inputs), `--radius-lg` 16 px (`rounded-lg`: cards), `--radius-xl` 24 px
(`rounded-xl`: feature panels, the hero visual frame).

**Shadows** (design audit B1), navy-tinted, used as Tailwind `shadow-xs` / `shadow-sm` / `shadow-md` /
`shadow-lg`:

| Token | Value | Use |
| --- | --- | --- |
| `--shadow-xs` | `0 1px 2px hsl(220 30% 15% / 0.06)` | Resting interactive card |
| `--shadow-sm` | `0 1px 2px hsl(220 30% 15% / 0.04), 0 2px 8px -2px hsl(220 30% 15% / 0.08)` | Cards |
| `--shadow-md` | `0 2px 4px hsl(220 30% 15% / 0.04), 0 12px 32px -12px hsl(220 70% 25% / 0.18)` | Card hover, raised panels |
| `--shadow-lg` | `0 24px 64px -16px hsl(220 70% 25% / 0.28)` | Overlays: menu, chat, dialog, consent |

`.shadow-elegant` (= `--shadow-md`) and `.shadow-card` (= `--shadow-sm`) are aliases kept for one batch;
new code uses the Tailwind names. The red glow under CTAs (`--shadow-accent`) is gone.

**Gradients:** `--gradient-primary` (navy 25% to 18%) and `--gradient-hero` (25% / 35% / 25%), used as
`.gradient-*` classes. B1 deleted the unused `--gradient-accent` and `--gradient-gold`.

**Section rhythm:** `.section` = `py-16 lg:py-24`, `.section-tight` = `py-12 lg:py-16`
(`@layer components`).

Removed by the design audit B1: `--accent-light` (hover now goes darker), `--gradient-accent`,
`--gradient-gold`, `--shadow-glow`, `--shadow-accent`, `--transition-smooth`, `--transition-bounce`.
B3 then removed Tailwind's `accent-light` alias and the `.transition-smooth` / `.hover-lift` classes.

### Dark (`.dark`)

Defined but **not switched on anywhere**: nothing adds the `dark` class today. Only the CTA and error
pairs are tested in dark. Test the rest before enabling it.

| Token | HSL | | Token | HSL |
| --- | --- | --- | --- | --- |
| `--background` | `220 70% 8%` | | `--secondary` | `215 15% 55%` |
| `--foreground` | `0 0% 98%` | | `--secondary-foreground` | `0 0% 98%` |
| `--card` / `--popover` | `220 60% 12%` | | `--muted` | `220 40% 15%` |
| `--card-foreground` / `--popover-foreground` | `0 0% 98%` | | `--muted-foreground` | `220 15% 65%` |
| `--primary` | `220 60% 35%` | | `--destructive` | `0 85% 45%` |
| `--primary-foreground` | `0 0% 100%` | | `--destructive-foreground` | `0 0% 100%` |
| `--primary-light` | `220 50% 45%` | | `--border` | `220 40% 20%` |
| `--primary-dark` | `220 70% 25%` | | `--input` | `220 40% 20%` |
| `--accent` / `--accent-foreground` | `0 85% 47%` / `0 0% 100%` | | `--ring` | `220 60% 35%` |
| `--gold` / `--gold-foreground` | `45 90% 60%` / `220 70% 25%` | | | |

`--accent-hover`, `--accent-active`, the surface, success and azure tokens, `--secondary-light`,
gradients and shadows have no dark value and inherit the light ones.

## 2. Contrast

WCAG 2.1 AA: 4.5:1 for text, 3:1 for large text, control boundaries and focus indicators.
The ratios below were computed with [`src/design/contrast.ts`](../../src/design/contrast.ts) from the
current token values. The test reads `src/index.css` itself, so a token edit that breaks a pair fails CI.

Enforced by [`src/design/contrast.test.ts`](../../src/design/contrast.test.ts):

| Pair (foreground on background) | Ratio | Minimum |
| --- | --- | --- |
| CTA label on `--accent` | 5.01 | 4.5 |
| CTA label on `--accent-hover` (hover) | 6.50 | 4.5 |
| CTA label on `--accent-active` (pressed) | 7.87 | 4.5 |
| `--accent` as text on `--background` | 5.01 | 4.5 |
| `--destructive` on `--background` | 5.39 | 4.5 |
| `--destructive-foreground` on `--destructive` | 5.39 | 4.5 |
| `--destructive` on `--destructive-surface` | 4.89 | 4.5 |
| `--success` on `--background` | 6.31 | 4.5 |
| `--success` on `--success-surface` | 5.80 | 4.5 |
| `--success-foreground` on `--success` | 6.31 | 4.5 |
| `--warning` on `--warning-surface` | 9.78 | 4.5 |
| `--warning` on `--background` | 10.15 | 4.5 |
| `--warning-border` on `--warning-surface` | 3.04 | 3 |
| `--foreground` on `--surface-subtle` | 14.76 | 4.5 |
| `--secondary` on `--surface-subtle` | 5.25 | 4.5 |
| `--muted-foreground` on `--surface-subtle` | 5.81 | 4.5 |
| `--primary` on `--surface-subtle` | 11.62 | 4.5 |
| `--foreground` on `--background` | 15.85 | 4.5 |
| `--card-foreground` on `--card` | 15.85 | 4.5 |
| `--primary` on `--background` | 12.48 | 4.5 |
| `--primary` on `--muted` | 11.10 | 4.5 |
| `--secondary` on `--background` | 5.63 | 4.5 |
| `--secondary` on `--muted` | 5.01 | 4.5 |
| `--muted-foreground` on `--background` | 6.24 | 4.5 |
| `--muted-foreground` on `--muted` | 5.55 | 4.5 |
| `--secondary-foreground` on `--secondary` | 5.63 | 4.5 |
| `--gold-foreground` on `--gold` | 7.78 | 4.5 |
| `--primary-foreground` on `--primary` | 12.48 | 4.5 |
| `--primary-foreground` on `--primary-light` | 8.82 | 4.5 |
| `--primary-foreground` on `--primary-dark` | 15.44 | 4.5 |
| `text-white/85` on `--primary-light` (hero midpoint) | 6.88 | 4.5 |
| `text-primary-foreground/70` on `--primary` (footer copyright) | 6.91 | 4.5 |
| `text-white/80` on `--primary` | 8.54 | 4.5 |
| `text-white/70` on `--primary` (lowest text opacity allowed on navy) | 6.91 | 4.5 |
| `text-white/90` on `--primary-light` | 7.49 | 4.5 |
| `text-white/70` on `--primary-dark` (footer copyright since B7) | 8.14 | 4.5 |
| `text-white/80` on `--primary-dark` (footer links and address, B7) | 10.25 | 4.5 |
| `--primary` on `--gold` | 7.78 | 4.5 |
| `--foreground` on `--gold` | 9.89 | 4.5 |
| White on every stop of `--gradient-primary` | 12.48 / 15.44 | 4.5 |
| White on every stop of `--gradient-hero` | 12.48 / 8.82 / 12.48 | 4.5 |
| `--input` boundary on `--background` | 3.64 | 3 |
| `--input` boundary on `--muted` | 3.24 | 3 |
| `--ring` on `--background` | 12.48 | 3 |
| Footer focus ring (`--primary-foreground` on `--primary`) | 12.48 | 3 |
| Footer focus ring on `--primary-dark` (B7) | 15.44 | 3 |
| White focus-ring offset on `--primary-light` | 8.82 | 3 |
| `--input` boundary on `--surface-subtle` | 3.39 | 3 |
| `on-dark` button border (white/60) on `--primary` | 5.50 | 3 |
| White focus outline on `--primary-dark` | 15.44 | 3 |
| Dark: CTA label on `--accent` | 5.01 | 4.5 |
| Dark: `--destructive-foreground` on `--destructive` | 5.39 | 4.5 |

The test also pins `--accent` as a saturated red (hue 0, saturation >= 80%, lightness >= 40%), checks
that hover and pressed are darker red steps (never lighter), and that the retired tokens are gone.
Decorative tokens are measured but never used as small text: `--brand-azure` is 4.18:1 on white (3:1
non-text passes, 4.5:1 text does not) and 2.98:1 on `--primary`; `--border-strong` is 1.54:1 on
`--surface-subtle`. The audit's own figures (6.48, 6.34, 4.90, "7.9 or higher") were computed from rounded
hex codes; the table above is the helper's result from the exact HSL.

Chat panel pairs (B8), enforced by
[`src/components/chatbot/AminaChatbot.palette.test.tsx`](../../src/components/chatbot/AminaChatbot.palette.test.tsx):

| Pair | Ratio | Minimum |
| --- | --- | --- |
| `text-primary-foreground` on `bg-primary` (user bubble, header) | 12.47 | 4.5 |
| Timestamp `text-primary-foreground/80` on navy | 8.55 | 4.5 |
| `text-foreground` on `bg-muted` (Amina bubble) | 14.16 | 4.5 |
| Timestamp `text-muted-foreground` on `bg-muted` | 5.55 | 4.5 |
| Link `text-primary` on `bg-muted` | 11.11 | 4.5 |
| Privacy notice `text-muted-foreground` on `bg-background` | 6.23 | 4.5 |
| Typing dots `bg-muted-foreground` on `bg-muted` (non-text) | 5.55 | 3 |
| Launcher icon `text-gold-foreground` on `bg-gold` (non-text) | 7.79 | 3 |

## 3. Focus

- One base rule in `src/index.css` (`@layer base`) draws focus for every control that does not draw
  its own: `:focus-visible:not([tabindex="-1"]) { outline: 2px solid hsl(var(--ring)); outline-offset: 2px; box-shadow: 0 0 0 2px hsl(var(--background)); }`.
  The background halo keeps it visible on the navy bands.
- shadcn controls draw their own ring with `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.
  `outline-none` is allowed **only** together with a `ring-*` replacement.
- Focus is never switched off globally. Script-only targets (`tabindex="-1"`, e.g. `<main>`) are excluded.
- Enforced by [`src/design/motion-focus.test.ts`](../../src/design/motion-focus.test.ts) (the base rule,
  and no global `outline: none`). The chat launcher keeps its ring: checked in
  [`AminaChatbot.test.tsx`](../../src/components/chatbot/AminaChatbot.test.tsx).

## 4. Motion

- **Reduced motion, CSS.** `@media (prefers-reduced-motion: reduce)` in `src/index.css` sets every
  animation and transition to 0.01 ms, one iteration and no delay. Every keyframe ends on its resting
  state, so nothing is left hidden or offset.
- **Reduced motion, framer-motion.** `MotionProvider` (`src/components/motion.tsx`) wraps the app in
  `MotionConfig reducedMotion="user"`. Its `motion` wrapper also renders the final state (no hidden
  `initial`) during prerender and hydration, and for reduced-motion users.
- **Per element.** Decorative motion also carries `motion-reduce:hidden` or `motion-reduce:animate-none`,
  and hover scaling carries `motion-reduce:hover:scale-100`.
- **WCAG 2.2.2 (Pause, Stop, Hide).** Motion that starts on its own must stop within 5 s, or come with a
  visible, keyboard-operable pause control. Prefer stopping. The chat launcher (STS-062, B8 / A11) runs two
  `--gold` waves at 35 % opacity, scale 1 to 1.6, 1 s apart (2.5 s each), and two 1.5 s icon bobs. All of
  it is over at **3.5 s**, then the launcher is static. The timing lives in the `chat-launcher-*` classes in
  `src/index.css`, inside `@layer components` so the `motion-reduce:*` utilities override them.
- **Pitfall: tailwindcss-animate.** Its `duration-*`, `delay-*` and `ease-*` utilities set the
  *animation* timing as well as the transition timing, and they override a component class. On an
  element that carries a CSS animation, give the transition its timing with an arbitrary property,
  e.g. `[transition-duration:300ms]`. (`duration-300` once cut the old launcher sweep from 4 s to 0.3 s.)
- **Animate `transform` and `opacity`**. (B8 removed the one exception, the launcher's
  `background-position` sweep.) Colour changes on hover use `transition-colors`, never `transition-all`.
- **Chat panel (A10).** Opens from `y: 12, scale: 0.98, opacity: 0` over `-slow` with `--ease-enter`;
  closes over `-base` with `--ease-exit`. No height animation. Under reduced motion framer-motion keeps
  only the cross-fade.
- **Motion tokens (design audit B1).** Durations `--duration-instant` 75 ms (press), `-fast` 120 ms
  (hover and focus colour), `-base` 200 ms (menus, chips, accordions, card hover), `-slow` 320 ms
  (entrance reveals, chat panel), `-page` 450 ms (the hero visual only). Easings `--ease-standard`
  `cubic-bezier(0.2,0,0,1)`, `--ease-enter` `cubic-bezier(0,0,0.2,1)`, `--ease-exit`
  `cubic-bezier(0.4,0,1,1)`. In Tailwind: `duration-instant|fast|base|slow|page` and
  `ease-standard|enter|exit`. Exits run one duration step faster than entrances.
- **Keyframes:** `animate-reveal` (12 px rise and fade, 320 ms, enter easing) and `animate-panel-in`
  (8 px drop and fade, 200 ms). The old `fade-in`, `fade-in-up` (30 px), `slide-in-right` (50 px) and
  `scale-in` are gone, and so are `hover-lift`'s `scale(1.05)` and the bounce curve.
- **Interactive card hover (A5):** `transition-[transform,box-shadow] duration-base ease-standard
  hover:shadow-md motion-safe:hover:-translate-y-0.5`. Under reduced motion only the shadow changes.
- **Fixed header offset:** `html { scroll-padding-top: calc(var(--header-h) + 1rem) }`, so a focused
  field (an empty form submit) or an in-page anchor lands below the header. Tested in
  `motion-focus.test.ts`.
- Enforced by [`src/design/motion-focus.test.ts`](../../src/design/motion-focus.test.ts) (the
  reduced-motion block) and
  [`src/components/chatbot/AminaChatbot.motion.test.tsx`](../../src/components/chatbot/AminaChatbot.motion.test.tsx)
  (launcher animations are finite, end by 3.5 s, end at rest, and are switched off for reduced motion;
  the panel's open and close timing).
- Known loops outside that budget. These are follow-ups, not precedent: the hero decorations
  `grid-animated` and `float-circle-*` in `src/index.css` are `infinite`, but no page uses them today.
  The chat typing dots loop while a reply is pending. `src/pages/Industries.tsx` has a
  `repeat: Infinity` pulse, but that page is not routed.

## 5. Type and spacing

Font: Poppins for headings and body (`font-heading`, `font-body`), self-hosted woff2, weights 400 to 800
(the 900 file was dropped in B1; no live page uses `font-black`). Running text is capped at `max-w-measure` (58ch: Poppins runs wide, and 65ch measured 81 characters a line).

Type scale tokens (design audit B1, Tailwind `text-*`): `display` clamp(40-64 px) 800, `h1` clamp(36-52 px)
800, `h2` clamp(28-40 px) 700, `h3` 22 px 700, `h4` 18 px 600, `body-lg` 18 px, `body` 16 px, `small`
14 px, `eyebrow` 13 px 600 tracked 0.08em. Pages use them from B4 on. Do not put these keys inside a
`cn()` / `cva` string next to a text colour: tailwind-merge cannot tell `text-small` from a colour and
drops one of them.

| Role | Class |
| --- | --- |
| Home `h1` | `text-display` (PageHero `size="display"`) |
| Inner page `h1` | `text-h1` (PageHero default) |
| Section `h2` | `text-h2` (SectionHeader) |
| Card `h3` / sub-heading | `text-h3` / `text-h4` |
| Lead and running text | `text-body-lg`, capped at `max-w-measure` |
| Meta, captions | `text-small` |
| Eyebrow | `text-eyebrow uppercase` |

Spacing: page gutter `container mx-auto px-4 sm:px-6 lg:px-8` (the container centres and caps at
1400 px at `2xl`). Card padding `p-6` or `p-8`. Stacks use `space-y-4`, `space-y-6` and `gap-4` to
`gap-8`. One heading per level, no skipped levels (enforced by [`src/a11y.test.tsx`](../../src/a11y.test.tsx)).

## 5a. Page layout (design audit B4)

- **One hero: [`PageHero`](../../src/components/PageHero.tsx).** Every page (home, services, each
  service, Our Work, About, Pricing, Contact, Free Audit, Insights, Careers) uses it. Start-aligned,
  `gradient-hero`, `pt-32 pb-20 lg:pt-36 lg:pb-24`, copy in `max-w-3xl` with the intro at the measure, and
  at most one `xl` CTA pair (primary, then `on-dark`). Props: `id` (the h1's), `title`, `eyebrow?`,
  `intro?`, `primaryCta?`, `secondaryCta?`, `meta?` (the service-area line), `aside?`, `size`.
  No entrance animation on the copy: the h1 is in the prerendered first paint.
- **Home hero aside ([`HeroFrames`](../../src/components/home/HeroFrames.tsx)).** At lg and up a 7/5
  split: the ASTA site in a browser frame, the BMV app screens overlapping it. Both link to Our Work
  and their alt text is the link's only name. Below lg the column is `hidden` and the screenshots
  sit in a `<source media="(min-width: 1024px)">`, so a phone downloads none of them. Never MIMAP (a
  stock person and an editor toolbar in its screenshot) or iSaraya (C11). Motion: `animate-frame-rise`
  (16 px, 450 ms, enter easing, `backwards` fill), second frame `[animation-delay:80ms]`, both behind
  `motion-safe:`.
- **Two section paddings.** `.section` (`py-16 lg:py-24`) and `.section-tight` (`py-12 lg:py-16`,
  small bands: other services, the standalone trust slot). No other `py-*` on a page section. Bands
  alternate `bg-background` and `bg-surface-subtle`.
- **[`SectionHeader`](../../src/components/SectionHeader.tsx).** Eyebrow (optional), the h2, a lead at
  the measure; 32 px (40 px at lg) to the content. Start-aligned everywhere.
- **Centring (FD-24).** Only statement sections centre, and only a one-line heading and a lead of at
  most 3 lines: the home Problem heading and the FinalCta. Running text is never centred.
- **Width.** Running text `max-w-measure` (about 72 characters; the audit check is 75 or fewer at 1440). A narrow column sits *inside* the container (`<div
  class="max-w-3xl">` in `container`), never as `container max-w-3xl`, which would centre the column
  and break the shared left edge.
- **LCP images (FF-12).** A page's first large image is `loading="eager"` with
  `fetchpriority="high"` (spread `HIGH_FETCH_PRIORITY` from `src/lib/responsiveImage.ts`: React 18
  warns on the camel-case prop). Every other image stays `loading="lazy"` with `width`/`height`.

## 5b. Cards, steps and the service grid (design audit B5)

- **One card: [`Card`](../../src/components/ui/card.tsx)**, variants in
  [`card-variants.ts`](../../src/components/ui/card-variants.ts). `rounded-lg`, `border`, `bg-card`,
  `shadow-xs`, a flex column (so `mt-auto` pins a footer link or price to the bottom and siblings
  in a grid row share one height with `h-full`). Props: `padding` (`default` `p-6 lg:p-8`, `compact`
  `p-6`, `none` for media cards), `interactive`, `highlighted` (2 px navy border), `asChild` (render
  as the `li`, `article` or `section` the content needs, never a wrapping `div`).
  `CardMedia` (16:9, `overflow-hidden`, top radius) and `CardBody` (`p-6`, flex column) build a media card.
- **Whole-card link.** `interactive` adds the hover (border-strong, `shadow-md`, 2 px lift behind
  `motion-safe:`) and a focus ring on the card through `has-[:focus-visible]`. The card's one real
  link takes `STRETCHED_LINK` (an `::after` covering the card), so the whole card is clickable while
  the link's visible text stays its only accessible name. No `aria-label` on the card, no second
  link inside it.
- **Icon tile.** [`IconTile`](../../src/components/ui/icon-tile.tsx): 44 px, `rounded-md bg-primary`,
  22 px lucide icon, `aria-hidden`. Replaces every `gradient-primary` tile (Contact's five moved in B6).
- **Service grid (FD-19).** A 6-column bento at lg: Websites and Apps span 3 each (large: icon,
  pillar `h3`, offering `h4`); Marketing's heading leads row 2 and its three offerings span 2 each.
  One column on mobile, 2 at md. `/services` renders the same component with `variant="index"`:
  each card adds three "what's included" points (`SERVICE_HIGHLIGHTS`, from each service page).
- **[`Steps`](../../src/components/Steps.tsx).** An `<ol>`; each step a 40 px navy circle with a white
  numeral (`aria-hidden`, the list order is the semantics), an `h3` title in `text-h4` and copy at the
  measure. A dashed connector runs down the left on mobile and along the circles' midline at lg.
  Used by How it works, the service-page process and Pricing "How a quote works" (title-less steps).
- **Proof cards (FD-20).** Media cards, 1 / 2 (md) / 3 (lg) columns, lazy screenshot on top.
  Deliberate deviation: the media box is 16:9 (`aspect-video`), not 16:10, so the ASTA crop stays
  above the portrait lower on that page. MIMAP shows a navy tile with its industry and domain
  (`aria-hidden`; the same words are in the card) because its screenshot holds a stock person (REQ-015).
- **Service pages (FD-22).** Price, Timeline and Management fee sit in one band of side-by-side cards
  (`data-service-band="price-and-timeline"`, stacked on mobile); each card is still a
  `[data-service-section]` with its own `h2`. Other services are 44 px chips.
- **Pricing (FD-25).** Package cards 1 / 2 / 3 columns, one `lg` button each, labelled
  "Get a quote for {Package}" (owner review); outline, except the last package, which is filled navy.
  No "Most chosen" badge until the owner names one.
- **About (FD-24).** Team cards are start-aligned: a 96 px portrait or initials beside the name and
  role, the bio below at the measure. 1 / 2 (md) / 3 (lg) columns.

## 5c. Forms (design audit B6)

One form system for the Free Audit and Contact forms, in
[`src/components/form/`](../../src/components/form/). The validation, the honeypot and the request
shape of both forms are the backend's wire contract and did not change; B6 is UX only.

- **Field.** `FormField` wires a label, an optional hint and an inline error to one control: it passes
  `id`, `aria-invalid` and `aria-describedby` (error id, then hint id) to the child. Label `text-small`
  semibold, required fields marked by an `aria-hidden` red `*` plus a visible
  required-fields note the form is described by. Hint above the error; the error is `text-destructive`
  with an `AlertCircle` (icon and text, never colour alone).
- **Controls.** `Input` and `NativeSelect` are 48 px (`h-12`), `Textarea` starts at 140 px; all share
  `FIELD_CONTROL` (`border-input`, `bg-background`, hover border, the focus ring, a destructive border
  when `aria-invalid`). Selects are native (`appearance-none` with a `ChevronDown`), never Radix: the
  mobile picker is the platform's, and the value is a real form value.
- **Scroll margin.** Every field, the error box and the success panel carry
  `scroll-mt-[calc(var(--header-h)+2.5rem)]`, so focusing one never hides it under the sticky header.
- **Invalid submit.** Forms are `noValidate`; the first invalid field takes focus (in visual order)
  and a single sr-only `role="alert"` summary is announced. No error box above the fields.
- **Send failure (FF-1).** `FormError` sits directly above the submit button, inside an always-mounted
  `aria-live="assertive"` region; the `role="alert"` box takes focus (`tabIndex=-1`, no ring) and what
  the visitor typed is kept. On Contact it carries the booking link only when booking is verified.
- **Success (FF-1).** `FormSuccess` replaces the form inside an always-mounted `role="status"`
  region: a success-surface panel with a 40 px check, an `h2` that takes focus, the body, the lead
  reference (monospace chip with a Copy button whose result is said in a polite live region) and two
  next steps, "See our work" and "Back to home". The section's `aria-labelledby` follows the heading
  shown. No modal.
- **Context (FF-10).** A service page's consultation CTA links to `/contact?service=<slug>` and a
  pricing card to `/contact?package=<id>` (only while booking is the contact form; a verified booking
  URL is used untouched). `contactContext()` reads them through an allow-list: exact, single values
  only; anything else is ignored. The value is never rendered or sent, only the matching option. The
  Free Audit form has no service field in its contract, so it takes no context.
- **Contact info column.** Five flat 44 px navy `IconTile`s (no gradient), `text-h3` "Get in Touch".

## 5d. Page end, 404 and navigation (design audit B7)

- **FinalCta.** One offer per block: the copy describes the primary button's offer (the free audit on
  the home page, a consultation on About, Insights and Pricing) and never names the secondary button's offer (guarded in `FinalCta.sitewide.test.tsx`).
  The legal pages (`/privacy`, `/terms`) end on the document, with no closing block
  (`NO_CLOSING_BLOCK_PATHS` in `src/content/trust/trust.ts`, mirrored by `NO_CLOSING_ROUTES` in the
  smoke test, which asserts zero `data-final-cta` there).
- **Footer.** `bg-primary-dark` with a `border-white/10` top border. One grid: 2 columns on mobile,
  6 at `md`, 12 at `lg` with brand 5, Services 3, Company 2, Legal 2, so the right half is never empty
  at 1440. The brand column holds the logo, one positioning line and the address. The bottom bar holds
  the copyright line only. Text links are `min-h-11` (44 px) rows everywhere and shrink to `min-h-7`
  (28 px, plus a 4 px list gap) only at `md` and up on a fine pointer, which meets WCAG 2.5.8 (24 px or
  spacing). Social icons are 44 px `white/10` circles.
- **404.** Start-aligned on `bg-background`, an eyebrow "Error 404", one `h1` "We can't find that
  page", one helper sentence and three routed links: home (primary `lg`), services and contact
  (outline `lg`), full width on mobile. `noindex` comes from `getSeo()`. A miss is not logged.
- **Scroll (FF-8).** `ScrollToTop` sets `history.scrollRestoration = "manual"` and records each history
  entry's position (sessionStorage, last 50). A new route starts at the top; Back and Forward restore
  the saved position; a hash link calls `scrollIntoView({ block: "start" })` on its target, and the
  `html { scroll-padding-top }` rule keeps it clear of the header. A `replace` that keeps the pathname
  keeps the position. Every scroll is instant, never smooth.
- **Route focus (FF-9).** `RouteAnnouncer` moves focus to `#main-content h1` (or `main`) with
  `tabindex="-1"` and `preventScroll` after a pushed navigation, and says the new page title in a
  polite, atomic, sr-only live region (no `role`, so each page keeps a single `role="status"`). Nothing
  happens on the first load; on Back and Forward the title is announced and focus is left alone.
- **Hero frames.** At `lg+` the BMV phone frame sits at the bottom right of the ASTA desktop frame
  (`w-32`, `w-40` from `xl`), clear of the headline area.

## 6. Buttons and touch targets

One button system (design audit B3): [`src/components/ui/button.tsx`](../../src/components/ui/button.tsx),
tested in [`button.test.tsx`](../../src/components/ui/button.test.tsx). A caller picks a `variant` and a
`size` and adds **layout only** (`w-full sm:w-auto`, margins). It never restates colour, height or
whitespace: `grep 'bg-accent hover:bg-accent' src` finds `button.tsx` and nothing else.

| Variant | Rest | Hover | Pressed | Use |
| --- | --- | --- | --- | --- |
| `primary` | `--accent` (5.01:1) | `--accent-hover` `#BD0F0F` (6.50:1) | `--accent-active` (7.87:1) | The conversion action, at most one per view |
| `secondary` (default) | `--primary` | `--primary-light` | `--primary-dark` | Header CTA, package cards, teasers, consent |
| `outline` | white, `--primary` text, `primary/30` border | `--muted`, full `--primary` border | `--border` | Secondary action on a light surface |
| `on-dark` | `white/10`, white text, `white/60` border (5.50:1) | `white/20`, white border | `white/25` | Secondary action on navy (hero, FinalCta) |
| `ghost` | transparent, `--primary` text | `--muted` | `--border` | Toolbars |
| `link` | underlined `--primary` | full-strength underline | | Inline |

Hover and pressed go **darker, never lighter**, and `outline`, `ghost`, `on-dark` and `link` never turn
red. Focus is the base `:focus-visible` rule (section 3); `on-dark` switches to a white outline with a
navy halo. Only colour, border, shadow and transform transition (`duration-fast ease-standard`), and the
1 px press nudge is `motion-safe` only. The legacy shadcn names still type-check: `variant="default"` is
`secondary`, and `size="default"` / `size="sm"` are `md`, so nothing drops under 44 px.

| Size | Height | Type | Use |
| --- | --- | --- | --- |
| `md` (default) | `min-h-11`, 44 px | 16 px semibold | Forms, cards, the header CTA, dialogs |
| `lg` | `min-h-12`, 48 px | 16 px bold | Package cards, the 404, the Contact booking card |
| `xl` | `min-h-14`, 56 px, `h-auto`, wraps | 18 px, 20 px from `sm`, bold | Hero, FinalCta, page heroes, form submits |
| `icon` | `h-11 w-11` | | Icon only: needs an `aria-label` |

- **CTAs wrap on mobile.** `xl` is `whitespace-normal h-auto`; the caller adds `w-full sm:w-auto`, so a
  CTA pair stacks full width below `sm` (primary first, `gap-3`). Never `whitespace-nowrap` on a CTA: at
  320 px the label must wrap. Hero and teaser CTAs are enforced by
  [`src/a11y.test.tsx`](../../src/a11y.test.tsx).
- **Trailing arrow:** pass it as `iconEnd={<ArrowRight />}`. The button wraps it in an `aria-hidden`
  span that nudges 2 px on hover, motion-safe only. It works with `asChild` links too.
- **Loading:** `loading` (native buttons only; a link never loads) shows a 16 px spinner (a static dot
  under reduced motion) before `loadingLabel` (default "Sending..."), sets `disabled` and
  `aria-busy="true"`, and holds the resting width as `min-width` so the button does not jump. A busy
  button keeps full opacity (`aria-busy:opacity-100`) rather than the disabled 50% fade, so "Sending..."
  stays at the variant's contrast. Used by
  the Contact and Free Audit submits.
- **One consultation label:** [`src/content/cta.ts`](../../src/content/cta.ts). While the booking link
  is unverified the button reads "Request a Free Consultation" (design audit section 5: "Book" promises
  a calendar). Once the owner verifies a booking URL it reads "Book a Free Consultation" everywhere.
- The chat header controls and Send are `h-11 w-11` and the launcher `h-14 w-14` (checked in
  `AminaChatbot.test.tsx`). Chat quick actions are outline `<Button>`s at `min-h-11`.
- Icon-only buttons need `aria-label`, and their icon needs `aria-hidden="true"`.

## 6a. Logo (design audit B2)

- Header: `public/logo.png` (989 x 373) at `h-11`, `h-12` from 380 px (127 px wide, the audit asks for at
  least 120 px at 390), `h-14` from `sm`, `h-16` from `xl`. Its light grey backdrop (`#F7F7F7`) is baked
  into the JPEG; no box, padding, background or scale is added on top.
- Footer: `public/logo-white.webp` (300 x 200, transparent) in a `h-14 w-[152px]` box with
  `object-cover object-[center_-18px]`, which crops the file's empty margins instead of scaling the image past
  its own box.
- Both keep their intrinsic `width` / `height` attributes, so the box is reserved before load (no CLS).
- **Owner input:** a transparent colour `logo.svg` and a trimmed white logo. The mark is never redrawn or
  recoloured here. Tested in `Header.test.tsx` and `Footer.test.tsx`.

## 7. Chat palette (Amina)

B8 (design audit FD-31, FD-32) moved the chat onto tokens. Contrast pairs are in section 2.

- Header: `bg-primary text-primary-foreground`, title "Amina" (the dialog's name) and "AI assistant".
  Header controls are ghost icon buttons in white with the `on-dark` focus treatment (white outline,
  navy halo), 44 px.
- User bubble: `bg-primary text-primary-foreground`. Amina bubble: `bg-muted text-foreground`. Both
  `rounded-lg`, `max-w-[80%]`. Timestamps `text-xs`, `text-primary-foreground/80` or `text-muted-foreground`.
- Links in replies: `text-primary` underlined. Only live routes and the allow-listed hosts become links
  (FF-5, `src/components/chatbot/chatLinks.ts`); everything else stays text.
- Quick actions: `<Button variant="outline">` chips, one lucide icon each, no emoji.
- No "Powered by" line: the privacy notice above the input is the one statement of who processes the chat.
- Launcher: 56 px `bg-gold` with a `text-gold-foreground` (navy) icon, `shadow-md` (`shadow-lg` on
  hover), the shadcn focus ring. It is the site's one gold element. Motion budget in section 4.
- Panel: `bg-background`, `border-border`, `rounded-lg`, `shadow-lg`. `inset-x-2` (full width minus
  8 px) on phones, `sm:w-[380px]` from 640 px, never taller than the viewport. Long words wrap
  (`[overflow-wrap:anywhere]`).
- Behaviour: a modal dialog (focus moves in, Tab stays inside, Escape closes, focus returns to the
  launcher), replies announced in a polite log, one request at a time (FF-6, FF-7). The panel is a
  lazy chunk fetched on hover or focus of the launcher (FF-11).

## 8. Rules for a new component

1. Colours come from tokens (section 1). If you need a new colour, add the token to `src/index.css`
   (light, and dark if it differs) and add its text/background pair to `src/design/contrast.test.ts`.
2. Text is 4.5:1 and large text, control boundaries and focus indicators are 3:1, measured with
   `src/design/contrast.ts`. Use `--input` for control borders, never `--border`.
3. Every interactive element shows visible focus: the base rule, or `focus-visible:ring-2 ring-ring ring-offset-2`.
   Never `outline-none` without a ring.
4. Touch targets are 44 px or more. Use `<Button>` with a variant and size (section 6); never restyle it.
5. Mobile first: it must work at 320 px with no horizontal scroll. Desktop is the enhancement.
6. Motion: transform and opacity only. A reduced-motion variant (`motion-reduce:*`, or MotionConfig).
   Nothing that starts on its own runs past 5 s.
7. Status is never colour-only: pair it with an icon or a label. Every input has a visible `<label>`,
   because a placeholder is not a label.
8. Icon-only controls have an `aria-label`. Decorative icons are `aria-hidden="true"`.
9. Ship the states: loading (skeleton), empty, error, not just the happy path.
10. Add the test that holds the rule, next to the component, and link it here.
