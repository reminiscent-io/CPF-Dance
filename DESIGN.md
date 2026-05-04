---
name: CPF Dance
description: Closed coaching platform between one elite instructor and her dancers, dressed as a printed program book.
colors:
  stage-rose: "#b06472"
  stage-rose-deep: "#945563"
  stage-rose-soft: "#f5e8ea"
  curtain-gilt: "#b89651"
  curtain-gilt-deep: "#997a45"
  champagne-silk: "#faf8f5"
  champagne-page: "#f5f1ea"
  champagne-stroke: "#ebe4d8"
  champagne-mute: "#dfd4c3"
  stage-black: "#0a0a0a"
  stage-ink: "#1a1a1a"
  stage-graphite: "#4d4d4d"
  ash-veil: "#999999"
typography:
  display:
    fontFamily: "'Cormorant Garamond', Georgia, Garamond, serif"
    fontSize: "clamp(2.5rem, 6vw, 4.5rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "'Cormorant Garamond', Georgia, Garamond, serif"
    fontSize: "clamp(2rem, 4.5vw, 3.5rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  title:
    fontFamily: "'Cormorant Garamond', Georgia, Garamond, serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body:
    fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0.01em"
  label:
    fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.04em"
rounded:
  none: "0px"
  sm: "0.25rem"
  md: "0.5rem"
  lg: "0.5rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  2xl: "3rem"
  3xl: "4rem"
components:
  button-primary:
    backgroundColor: "{colors.stage-rose}"
    textColor: "{colors.champagne-silk}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 1rem"
  button-primary-hover:
    backgroundColor: "{colors.stage-rose-deep}"
    textColor: "{colors.champagne-silk}"
  button-outline:
    backgroundColor: "{colors.champagne-silk}"
    textColor: "{colors.stage-rose}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 1rem"
  button-gold:
    backgroundColor: "{colors.curtain-gilt}"
    textColor: "{colors.champagne-silk}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 1rem"
  card:
    backgroundColor: "{colors.champagne-silk}"
    textColor: "{colors.stage-ink}"
    rounded: "{rounded.lg}"
    padding: "1.5rem"
  input:
    backgroundColor: "{colors.champagne-silk}"
    textColor: "{colors.stage-ink}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 1rem"
  chip-rose:
    backgroundColor: "{colors.stage-rose-soft}"
    textColor: "{colors.stage-rose-deep}"
    rounded: "{rounded.sm}"
    padding: "0.25rem 0.5rem"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.stage-graphite}"
    typography: "{typography.label}"
    padding: "0.5rem 0.75rem"
  nav-link-active:
    backgroundColor: "{colors.stage-rose-soft}"
    textColor: "{colors.stage-rose-deep}"
---

# Design System: CPF Dance

## 1. Overview

**Creative North Star: "The Ballet Noir Program"**

A printed program book from a serious classical season: champagne-paper stock, charcoal serif headlines, a single rose accent that reads as a velvet curtain ribbon, gilt detailing reserved for premium acts. The interface treats every screen as a page in that program. Generous margins. Considered hierarchy. Nothing shouts. The visual language is borrowed from Lincoln Center programs and editorial dance journals, not from SaaS marketing pages.

The system is restrained but not austere. Warmth comes from the champagne paper tone (off-white tinted toward gold) rather than from playful color or rounded geometry. Precision comes from typography: a single confident serif for display, a humanist sans for body, both tracked tightly. The aesthetic is feminine in the way classical performance is feminine, not in the way a stock-photo "girlboss" template is. There is no gradient, no glow, no glassmorphism, and no avatar with a default initial circle to be found.

This system explicitly rejects the SaaS dashboard idiom (KPI-card grids, sidebar with monochrome icons, gradient hero metrics), the heavy promotional landing page (parallax, testimonial carousels, "Trusted by" badge rows), and the low-end dance-studio website family (script fonts, autoplay music, Wix recital grids, excessive pink-on-pink, ribbon dividers). It also rejects the fitness-app gamification family (streaks, badges, "you crushed it!").

**Key Characteristics:**
- Champagne paper as the surface, never `#fff` white.
- Stage rose as a single confident accent, never a gradient.
- Cormorant Garamond carries every heading; Manrope carries every paragraph.
- Soft shadows or none; depth is rare and quiet.
- Borders are champagne stroke at 1px; never a colored side stripe.

## 2. Colors: The Ballet Noir Palette

A four-family palette: champagne paper, stage charcoal, ballet rose, curtain gilt. Each family has a tonal scale; the names below are the canonical uses.

### Primary
- **Stage Rose** (#b06472, oklch ~58% 0.08 14): The single accent color. Primary CTAs, active nav state, destructive-confirm buttons, error punctuation. Treated as a velvet ribbon, not a brand color: it appears, it carries the action, it leaves. Used on roughly 5–10% of any screen at rest.
- **Stage Rose Deep** (#945563): Hover and pressed state for Stage Rose. Same hue, four steps darker.
- **Stage Rose Soft** (#f5e8ea): Background tint for active nav, selected chips, rose-on-rose moments where the surface needs to whisper the accent.

### Secondary
- **Curtain Gilt** (#b89651, oklch ~67% 0.07 80): Premium accent reserved for gold-tier moments: confirmed-paid badges, completed-milestone marks, premium CTAs (the `gold` button variant). Never used as a system color; never used at the same time as Stage Rose on the same surface unless the page is intentionally orchestrated for both.
- **Curtain Gilt Deep** (#997a45): Hover state for Curtain Gilt.

### Neutral
- **Champagne Silk** (#faf8f5): The default page surface. Replaces `#fff` everywhere. This is the paper.
- **Champagne Page** (#f5f1ea): Secondary surface for raised areas, alternating rows, subtle differentiation.
- **Champagne Stroke** (#ebe4d8): The default border color. Globally applied via `* { border-color: var(--color-champagne-200); }`.
- **Champagne Mute** (#dfd4c3): Disabled-state backgrounds, deepest dividers when `champagne-stroke` is too quiet.
- **Stage Black** (#0a0a0a): Display headings only. Used for the strongest typographic emphasis on the marketing landing.
- **Stage Ink** (#1a1a1a): Body text default. Charcoal-900, never pure black.
- **Stage Graphite** (#4d4d4d): Secondary text, captions, deemphasized labels.
- **Ash Veil** (#999999): Tertiary text, placeholder text, disabled text, helper hints. Never used for anything a dancer needs to read.

### Named Rules

**The One Ribbon Rule.** Stage Rose is the ribbon, not the wallpaper. It appears on no more than ~10% of any screen at rest. If a layout wants more rose, it is a layout problem, not a license. Curtain Gilt is similarly rare; the two never compete for attention on the same surface.

**The No-White Rule.** `#fff` is forbidden anywhere a surface or text is intended to be neutral. Champagne Silk is white. Component code that says `bg-white` or `text-white` against a colored background is a tech-debt marker, not a design choice.

**The No-Black Rule.** `#000` is forbidden. Modal scrims use `rgba(10, 10, 10, 0.5)` with backdrop-blur, not `rgba(0,0,0,0.5)`. Stage Black is the deepest ink available.

**The No Side-Stripe Rule.** Colored `border-left` greater than 1px is forbidden as a card or alert affordance. Rich-text blockquotes inside the editor are the single sanctioned exception (they emulate a printed pull-quote rule).

## 3. Typography

**Display Font:** Cormorant Garamond (with Georgia, Garamond, serif fallback)
**Body Font:** Manrope (with system sans fallback)

**Character:** Cormorant Garamond is a high-contrast transitional serif with theatrical proportions; Manrope is a low-contrast humanist sans with a calm, contemporary feel. Together they read as a program-book pairing, classical above the fold, modern in the running text. The serif carries every `h1`-`h6` globally; the sans carries every paragraph and every UI element.

### Hierarchy

- **Display** (600 weight, clamp(2.5rem, 6vw, 4.5rem), line-height 1.1, letter-spacing -0.04em): Hero headlines on the marketing landing only. Reserved.
- **Headline** (600, clamp(2rem, 4.5vw, 3.5rem), 1.15, -0.03em): Section openers on the landing, page titles inside the portal at desktop sizes.
- **Title** (600, 1.5rem, 1.25, -0.02em): Card titles, dialog titles, dashboard widget titles.
- **Body** (400, 1rem, 1.6, +0.01em): Paragraph text. Cap line length at 65–75ch in long-form contexts (privacy policy, terms, multi-paragraph notes).
- **Label** (500, 0.875rem, 1.4, +0.04em): Buttons, nav links, form labels. The slight positive tracking is the system's tell that the surface is interactive.

### Named Rules

**The Serif-For-Headings Rule.** Every `h1` through `h6` uses Cormorant Garamond, in every component, in every portal. No exceptions. If a heading wants Manrope it is not a heading, it is a label.

**The Tight-Tracking Rule.** Display and Headline are negatively tracked (-0.03 to -0.04em). Body is slightly positively tracked (+0.01em). Labels are positively tracked further (+0.04em). The tracking ladder is part of the hierarchy; do not flatten it.

**The No-All-Caps Rule.** Headings are never set in ALL CAPS. The display serif does not survive uppercase. Labels may be uppercase only when the typography spec for that component calls for it.

## 4. Elevation

The system is mostly flat. Surfaces sit on the champagne page; differentiation comes from tonal layering (champagne-silk on champagne-page) and from the global 1px champagne-stroke border, not from shadows. Shadows appear only as a quiet response to either elevation (a card lifted off the page) or focus state (a hovered link in a hover-capable context). When shadows do appear, they are diffuse and warm, not crisp and gray.

### Shadow Vocabulary

- **shadow-soft** (`box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06)`): The default card shadow. Cards rest with this shadow at all times. Quiet enough to read as paper-on-paper, not paper-on-floor.
- **shadow-soft-lg** (`box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08)`): Hover state for elevated cards (the `hover` prop on `Card`), and the modal dialog's resting shadow. The lift is real but not theatrical.
- **shadow-modal** (`box-shadow: 0 20px 60px rgba(10, 10, 10, 0.18)`): Reserved for the modal dialog when it sits over a blurred backdrop. The only place a noticeable shadow lives.

### Named Rules

**The Flat-By-Default Rule.** A surface with no shadow is the correct default. Add `shadow-soft` only when a card needs to read as a discrete paper artifact against the champagne page; otherwise let the border carry it.

**The No-Drop-Shadow-On-Buttons Rule.** Buttons do not carry shadows at rest. The `gold` button variant is the single exception, because Curtain Gilt is itself a premium signal and the shadow underlines that.

## 5. Components

### Buttons

- **Shape:** Lightly rounded (8px / `rounded-lg`). The radius is small enough to read as architectural, not playful.
- **Primary:** Stage Rose background, Champagne Silk text, 0.5rem × 1rem padding at the default size. Hover: Stage Rose Deep. Active: charcoal-tinted Stage Rose. Focus ring: 2px Stage Rose at 50% offset from a 2px champagne offset (the WCAG focus halo).
- **Secondary:** A charcoal-tinted variant historically called `mauve-600` in the Tailwind config; treat as deprecated unless explicitly documented for an existing screen. Prefer `outline` or `gold` for differentiation.
- **Outline:** 2px Stage Rose stroke on Champagne Silk, Stage Rose text. Hover: stroke darkens to Stage Rose Deep, fill becomes Stage Rose Soft.
- **Gold:** Curtain Gilt background, Champagne Silk text, 1px-`shadow-soft` resting elevation, hover deepens to Curtain Gilt Deep with `shadow-soft-lg`. Reserved for premium-gated CTAs (subscribe, upgrade lesson pack, complete payment). Never two gold buttons on one screen.
- **Sizes:** sm (0.375rem × 0.75rem, 0.875rem text), md (default), lg (0.75rem × 1.5rem, 1.125rem text). Touch targets on dancer-facing mobile must be ≥44px tall regardless of size token.

### Cards

- **Corner Style:** 8px radius (`rounded-lg`).
- **Background:** Champagne Silk on a Champagne Page surface. Champagne Page on a Champagne Silk surface. The two paper tones swap roles depending on which is the floor.
- **Shadow Strategy:** `shadow-soft` at rest. `shadow-soft-lg` on hover only when the card is a navigation affordance (clickable). Static informational cards do not animate on hover.
- **Border:** 1px Champagne Stroke is implicit via the global `*` rule; cards do not declare their own.
- **Internal Padding:** 1rem (sm) / 1.5rem (md, default) / 2rem (lg). Choose by content density, not by reflex.
- **Nesting:** Forbidden. A card inside a card is always wrong. Use a Champagne Page band or a hairline Champagne Stroke divider instead.

### Inputs

- **Style:** 1px Champagne Stroke border, Champagne Silk fill, 8px radius, 0.5rem × 1rem internal padding.
- **Focus:** Border becomes transparent, 2px Stage Rose ring appears outside via box-shadow. No border-color shift.
- **Error:** Stage Rose stroke (yes, the same accent — error is a Rose moment, not a separate destructive color). 0.875rem error message in Stage Rose Deep below the field.
- **Disabled:** Champagne Mute fill, Ash Veil text, 0.6 opacity is forbidden (it produces muddy gray; use the explicit colors).
- **Label:** Stage Graphite, label-typography, sits above the field with 0.25rem gap.

### Navigation

- **Style:** Sidebar (instructor / admin) and bottom-tab nav (dancer mobile). Both use Champagne Silk as the surface, label typography for items, Stage Graphite for resting links.
- **Active State:** Stage Rose Soft background, Stage Rose Deep text. No underline, no left stripe, no marker pill — the rose-on-rose tint carries it.
- **Hover:** Champagne Page background, Stage Ink text. Quiet.
- **Mobile bottom nav:** Fixed-position, 56px tall, respects iOS safe area via `safe-bottom` utility class. Five slots maximum on dancer; four maximum elsewhere.

### Modal

- **Surface:** Champagne Silk, 8px radius, `shadow-modal`, animated in with `slideUp` (0.3s ease-out) over a backdrop.
- **Backdrop:** `rgba(10, 10, 10, 0.5)` with `backdrop-filter: blur(4px)`. Never `rgba(0,0,0,*)`.
- **Header:** 1.5rem padding top/horizontal, 1px Champagne Stroke divider below title, title in Cormorant Garamond at Title scale, close affordance (X icon) in Stage Graphite at top-right.
- **Mobile behavior:** On viewports <768px, modal sits between iOS safe-area-top and (safe-area-bottom + 56px bottom nav). Never slides over the bottom nav.
- **First-thought ban:** A modal is the second answer. Inline reveal, slide-over panel, or in-page editing should be tried first.

### Chips

- **Rose Chip:** Stage Rose Soft fill, Stage Rose Deep text, 4px radius, 0.25rem × 0.5rem padding. Used for selected filters, status of "active student", "scheduled".
- **Neutral Chip:** Champagne Page fill, Stage Graphite text, same shape. Used for unselected filters, neutral metadata.
- **Gilt Chip:** Reserved for "paid", "premium", "completed" — uses Curtain Gilt at low chroma (#e8dbb8) with Curtain Gilt Deep text. Rare.

### Rich Text Editor (TipTap signature)

The notes editor is a load-bearing component because Courtney's notes are the product. Surface treatment:

- **Editor surface:** Champagne Silk fill, 1px Champagne Stroke border, 0.5rem radius, 1rem internal padding. The toolbar above is a single horizontal Champagne Page strip with icon-only Stage Graphite controls, becoming Stage Rose Deep when active.
- **Prose styles:** Body typography. Blockquotes get a 3px Stage Rose stroke as their `border-left` (the single sanctioned side stripe in the system, because it is emulating a printed pull-quote rule, not card chrome). Inline `code` gets a Champagne Page fill with monospace.
- **Voice recorder integration:** The mic button sits inline in the toolbar, becoming Stage Rose when actively recording. No pulsing ring; no "live" animation theater. A small text "Recording…" label is sufficient.

## 6. Do's and Don'ts

### Do:

- **Do** use Champagne Silk (#faf8f5) as the page surface and Champagne Page (#f5f1ea) for any raised area. The paper is the design.
- **Do** apply the global `* { border-color: var(--color-champagne-200); }` rule. Borders are 1px Champagne Stroke unless a component spec overrides.
- **Do** set every heading in Cormorant Garamond, every paragraph and label in Manrope. No exceptions.
- **Do** reserve Stage Rose for one accent role per screen, used on ≤10% of the surface.
- **Do** use Curtain Gilt only on premium-gated affordances (the `gold` button, paid badges). Never as decoration.
- **Do** swap surfaces by tonal layer (Silk on Page, Page on Silk) instead of by adding shadows.
- **Do** respect `prefers-reduced-motion` on every animation declared in `globals.css` (fadeIn, slideUp, slideDown, typewriter).
- **Do** maintain 44px minimum touch targets on dancer-facing mobile UI.

### Don't:

- **Don't** use `#fff` or `#000`. Champagne Silk replaces white; Stage Black replaces black.
- **Don't** ship the SaaS dashboard idiom: KPI-card grids, gradient hero metrics, sidebar with monochrome icons, "Welcome back, Courtney 👋" greetings. The PRODUCT.md anti-reference is binding.
- **Don't** ship the heavy promotional site idiom on the landing: parallax, testimonial carousels, "Trusted by" rows, gradient mesh hero, sticky CTA bars. Treat the landing as a printed program, not a sales page.
- **Don't** ship the low-end dance studio idiom: script fonts, stock dancer silhouettes, autoplay music, pink-on-pink with no contrast, ribbon dividers, "Welcome to our family!" copy. Reject the entire family.
- **Don't** ship gamification chrome: streaks, badges, levels, "you crushed it!", confetti.
- **Don't** use a colored `border-left` greater than 1px as a card or alert accent. Use a full hairline border or a Champagne Page background tint instead. (The TipTap blockquote rule is the single sanctioned exception, because it emulates a printed pull-quote.)
- **Don't** use gradient text (`background-clip: text` over a gradient). Solid color, weight contrast for emphasis.
- **Don't** use glassmorphism as decoration. The modal backdrop's blur is purposeful (separates the modal from the surface beneath); do not reach for blurred-glass cards in resting UI.
- **Don't** nest cards. A card inside a card is always wrong. Use a Champagne Page band or a Champagne Stroke hairline.
- **Don't** rely on raw Tailwind grays (`gray-50`..`gray-900`) when a Charcoal or Champagne family value is available. The current `Input.tsx` and `Modal.tsx` reach for `gray-*` and `bg-white` in places; these are tech debt and should be migrated to the named families on touch.
- **Don't** add a "modal as first thought" pattern. Try inline reveal, slide-over, or in-page editing before reaching for the dialog.
- **Don't** use uppercase set in Cormorant Garamond for headings. The serif does not survive caps.
- **Don't** introduce any color outside the four families (Champagne, Charcoal, Ballet Pink/Rose, Gold) without naming it as a new system role. Ad-hoc palette additions are how systems decay.
