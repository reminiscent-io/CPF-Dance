# Product

## Register

product

## Users

**Courtney** is the sole instructor and the gravitational center of this platform. Multi-instructor scaffolding remains in the codebase but is functionally retired. Every product decision should assume a single coach using the instructor portal, not a marketplace of teachers.

**Dancers** are the volume audience. Real mix in age but skewed 15 to 25, primarily women, primarily aspiring professional dancers. They differ widely in intensity: some are training daily toward a career; others are serious students fitting dance around school or work. They share an aspirational mindset and treat Courtney's feedback as currency.

**Guardians** appear for dancers under 18: signing waivers, providing consent, occasionally paying. Not the daily user. Designed for, not designed around.

**Admin** is operational support, used by Courtney or someone helping her. Bypasses portal restrictions when needed.

The dancer portal carries the most weight: it is where dancers spend time, read notes from Courtney, request lessons, and track their own training. Optimize the dancer surface for a 19-year-old conservatory student checking notes between rehearsals on a phone, then for everyone else.

## Product Purpose

A closed, invite-only platform that holds the relationship between Courtney and her dancers. Not a SaaS, not a studio-management tool sold to other instructors, not a public marketplace. The marketing landing exists to convert prospective dancers (or guardians) into invited members; once inside, the app's job is to make Courtney's coaching feel proximate when she is not in the room.

The core loop:
1. Courtney teaches a lesson.
2. She leaves a note (rich text, voice-transcribed, sometimes paired with a video reference) on a dancer's record.
3. The dancer reads it on her phone, replies or journals against it, and uses it to shape her practice before the next lesson.

Schedules, payments, waivers, and lesson packs are infrastructure that exists so the loop above runs without friction. Success is dancers logging in unprompted, between lessons, because something they care about is waiting for them.

## Brand Personality

**Sophisticated. Warm. Precise.**

- *Sophisticated* in a Lincoln Center sense, not a Wall Street sense. References the high end of classical performance: editorial typography, considered restraint, the visual language of a program book.
- *Warm* because the relationship being mediated is intimate. Courtney knows these dancers personally. The app should never feel like a corporate intermediary.
- *Precise* because dancers are precise. Sloppy spacing, generic icons, vague microcopy: all read as disrespect to the craft. Every element is placed deliberately or removed.

Voice: confident, never breathless. Speaks to dancers as adults pursuing a serious thing, not as customers being marketed to. No exclamation points, no "amazing," no emoji in product copy. Quiet authority.

## Anti-references

**Generic SaaS dashboard.** Side nav with monochrome icons, KPI cards in a 4-column grid, a "Welcome back, Courtney 👋" greeting, hero metric in a gradient blue tile. Stripe-knockoff aesthetics applied to a craft. Reject.

**Heavy promotional site.** Long marketing scrolls with parallax, "Trusted by 10,000+ studios," testimonial carousels, gradient mesh hero, sticky CTA bars. The landing page sells one instructor to a handful of dancers, not a platform to a market. Treat it as a printed program, not a sales page.

**Low-end dance studio website.** Stock dancer silhouettes, Comic-Sans-adjacent script fonts, pink-on-pink with no contrast, autoplaying music, "Welcome to our family!" copy, recital photos crammed into a Wix grid. The aesthetic that made the brief say "vibe-coded." Reject the entire family.

**Specifically also avoid:** typical fitness-app gamification (streaks, badges, levels, "you crushed it!"), Patreon's content-creator-meets-paywall vibe, Notion's sterile generality, and any visual cliché tied to femininity that reads as condescending (excessive pink, hearts, tiaras, "girlboss" type).

## Design Principles

1. **Courtney's voice, not the app's voice.** The platform is a vehicle for one instructor's coaching. UI copy, empty states, and tone defaults should sound like something Courtney would say, not like a generic productivity tool. When in doubt, less product chrome, more direct language.

2. **Aspirational, not gamified.** Dancers do not need streaks, badges, or dopamine loops to engage. They are intrinsically motivated. Reward consistency by surfacing meaningful artifacts (a recent note, an upcoming lesson) rather than by scoring behavior.

3. **Private studio, not public app.** Notes, journal entries, and progress data are intimate. Default to restraint in how this content is displayed: no infinite scrolls, no social-feed framing, no public profile pages, no sharing affordances unless explicitly designed for. The dancer should feel that what is in here is between them and Courtney.

4. **Premium feel without paywall theater.** Dancers do not pay subscription fees, so the app must never lean on gating, upsells, or "unlock pro" patterns to feel valuable. The premium signal is craft: typography, spacing, considered motion, restraint. The interface earns its weight on every screen.

5. **Mobile is the primary surface for dancers, desktop for Courtney.** Dancers read notes on phones in studio hallways. Courtney writes notes on a laptop after a lesson. The same code serves both, but design decisions resolve in favor of the role most likely to be on each surface. Dancer screens get touch-first treatment; instructor screens can use density.

## Accessibility & Inclusion

Informal AA awareness, no audit gate. Specifically:

- **Contrast.** All body text and interactive elements meet WCAG AA contrast (4.5:1 for normal text, 3:1 for large text and UI). Ballet pink and gold accents are decorative only, never the sole carrier of meaning or low-contrast text.
- **Reduced motion.** Respect `prefers-reduced-motion`. Decorative animations (fades, slide-ins, the typewriter effect on the landing page) collapse to instant state changes when requested.
- **Keyboard.** All interactive surfaces operate from keyboard. The dancer portal in particular gets reviewed for tab-order sanity since it is the most-used surface.
- **Touch targets.** 44px minimum on dancer-facing mobile UI. Bottom-nav and modal close affordances especially.
- **Voice transcription.** OpenAI voice-to-notes is a feature, not a substitute for accessible input. Manual text entry remains a peer affordance, never hidden behind voice.
- **Body and identity.** Dancer-facing copy and imagery assume a wide range of body types and intensity levels among aspiring professionals. Avoid language and visuals that imply a single body ideal.

No formal screen-reader audit is in scope today. If a dancer joins who needs one, that becomes scope.
