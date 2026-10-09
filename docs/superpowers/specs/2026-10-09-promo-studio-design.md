# Promo Studio

Date: 2026-10-09
Owner: Kevin. First user: Courtney.
Status: MVP (Phases 1 to 5) built on `claude/exciting-carson-33kkgm`; see Build status. Setup steps are in [docs/promo-studio-setup.md](../../promo-studio-setup.md).
Inputs: the Promo Studio feature request and the "Precision Workshop" reference poster (Template #1).

## Summary

- A promo is a JSON document: an immutable template version, a snapshot of the brand kit, and the design's own slot values, photo crops and nudges. Text stays live until export.
- One renderer draws everything. Konva runs in her browser for the editor and for the export, so a PNG or PDF matches the screen because it comes from the same draw calls. No server renderer, no Chromium on Replit.
- The text model writes copy slots only. Code fills dates, times, location, level and price from the linked class rows and the form, so the model has no slot to put a fact in. A validator also rejects copy containing digits, prices, month names or clock times.
- The image model never receives her. Background edits send a plate with her cut out, her original pixels go back on top through a matte, and a pixel check confirms the protected region is unchanged before the edit is offered. OpenAI's edit mask doesn't guarantee untouched pixels, so the guarantee has to live in our code.
- The MVP (acceptance criteria 1 to 8) uses no image generation. AI photo prep is Phase 6, behind a feasibility spike on her actual photos.
- Every library the MVP adds is MIT or Apache-2.0, and every font is OFL. OpenAI usage (your key) and the existing Replit hosting are the only costs. The Supabase project is on the Free plan, and its 1 GB storage cap is the tightest limit in the design.
- Rough size: seven to nine weeks to MVP for one developer working with Claude Code.

## Build status (October 9, 2026)

Phases 1 to 5 are built: photo library, document model and renderer, editor and publishing, AI generation and revisions, and the template editor with brand kit and usage pages. Phases 6 and 7 are not started, and the S1 to S4 spikes still need her phone and her photos.

Decisions as built:
- D1. Courtney's profile is `admin`, so template, brand kit and usage pages sit under `/admin/promo` behind `requireRole('admin')` and admin-only RLS. There is no `promo_editors` table.
- D2. DESIGN.md names three promo-only roles: Poster Display, Poster Capitals and Signature Script.
- D3. Originals are capped at 16 MP.
- D4. Tagging sends 400 px thumbnails as base64 from the server; every Responses API call sets `store: false`.
- D5. Publishing copies a web-size JPEG into the public `assets` bucket and table and can set it as a class image. No new public page yet.
- D6. No HEIC decoder; a browser that can't read a HEIC gets a clear message.
- D7. Poster PDFs have no bleed by default. The exporter takes a bleed and writes trim and bleed boxes once a print shop's spec is known.
- D8. Looks are render-time overlays across the whole photo, off with one tap. Courtney still needs to say whether that counts as altering her.
- D9. The default monthly cap is $10, set per instructor on the usage page.
- D10. A workshop is several class rows picked together.

Changes from the plan above:
- Photos and designs are deleted outright, files included; there are no `deleted_at` columns. Upload states live in the browser's IndexedDB queue, so `promo_assets.status` only holds ready, pending_review and rejected.
- Publishing posts the render straight to the publish route instead of staging it in the private bucket first.
- Format siblings copy values without AI shortening. Overflowing slots show a warning with "Shorten with AI", which goes through the revise route.
- The revise route returns the revised document to the browser, which applies it as one undoable step and autosaves it. The route records a revision row and never writes the design row, so it can't race autosave.
- "Update to latest template" (Phase 5, task 4) is built: the editor offers it when a newer version is live and lists anything that didn't carry over.
- Text model: `gpt-6-luna` by default, falling back to `gpt-4.1-mini` if the API rejects it. Pose detection loads MediaPipe from jsDelivr and Google storage; both URLs are configurable.

An independent review of the API routes and migrations led to these fixes before handoff: publication rows are written only by the service role, and unpublishing deletes only the promo's own public copy; unpublishing keeps the chain of class images intact and keeps a copy a class still uses; republishing puts the new copy up before the old one comes down; the fact guard catches lowercase and plural day and month names and spoken times; tagging and retried uploads no longer overwrite tags she edited; every AI attempt is logged, with no hidden SDK retries; and deleting a profile that published a template version works. It also found that production lets users change their own `role` and `linked_profile_id`, which migration 48 closes.

Verified here: 610 unit and route tests (149 of them for Promo Studio), lint, typecheck and a production build; migrations 46 to 48 and their RLS against a local Postgres; every page through Playwright against a fake API (`/dev/promo/*`). Not verified here: anything against the live Supabase project or OpenAI, which this environment can't reach.

## 1. Codebase read

### 1.1 What this builds on

| Area | What exists | Where |
|---|---|---|
| Role guards | `requireRole()` and `requireInstructor()`; admins pass every guard | `lib/auth/server-auth.ts`, `lib/auth/privileges.ts` |
| Routing | Prefix rules, so anything under `/instructor/promo` inherits instructor access with no proxy change | `lib/auth/portal-routing.ts` |
| Classes | `class_type` includes `workshop`; title, description, location, `studio_id` (studio name, address, city, state), start and end times, pricing fields, `is_public`, `external_signup_url` | `supabase-schema.sql`, migration 13 |
| Class times | Entered and shown in America/New_York | `lib/utils/et-timezone.ts:14` |
| Class promo image | `classes.asset_id` points at the `assets` table; the class form has an asset picker; files live in the public `assets` bucket | migrations 14, 17, 18; `components/AssetSelector.tsx` |
| Per-user storage folders | `{uid}/...` paths checked with `storage.foldername()` in RLS | migrations 18, 25 |
| OpenAI | SDK 6.15 installed; note formatting and voice notes call `gpt-4o-mini` through Chat Completions with free-text output | `app/api/notes/format/route.ts`, `app/api/voice-to-notes/route.ts` |
| Validation | zod 4.4 already sits in `node_modules` (pulled in by openai and eslint), and `openai/helpers/zod` accepts it | `package-lock.json` |
| UI kit | `Sheet` (full screen under 640px), `Modal`, `SegmentedControl`, `Toast`, skeletons; DESIGN.md tokens in Tailwind | `components/ui/` |
| Fonts | Cormorant Garamond and Manrope through `next/font/google` | `app/layout.tsx:9` |
| Admin | `/admin` dashboard backed by a stats route; Recharts installed | `app/api/admin/stats/route.ts` |
| SQL helper pattern | `SECURITY DEFINER`, `SET search_path = public, pg_temp`, subject read from `auth.uid()` inside the function | migration 45 |
| Brand voice | "Confident, never breathless... No exclamation points, no 'amazing,' no emoji" | `PRODUCT.md:38` |
| Palette | The reference poster's palette already exists as tokens: Champagne paper, Stage Black and Stage Ink, Curtain Gilt | `DESIGN.json` |
| Supabase project | "Dance", Free plan. Five buckets (`assets`, `headshots`, `Public_Images`, `studio logos`, `waiver-signatures`), all public, about 19 MB used of 1 GB. Read with metadata-only queries through the Supabase connector; no user rows. | |

### 1.2 What's missing

- Private storage. Every bucket is public, and nothing in the code issues signed URLs or authenticated downloads.
- Resumable, multi-file upload. Uploads post one file through a Next.js route as FormData, capped at 10 MB (`app/api/assets/route.ts:45`, `:60`).
- Image processing: no HEIC handling, no metadata stripping, no thumbnails.
- A canvas editor, PDF writer, upload client or editor state library.
- Structured AI output, AI call logging, cost caps.
- An `is_admin()` SQL helper. Existing policies inline `SELECT role FROM profiles` subqueries.
- Workshop grouping. A three-day workshop is three unrelated class rows. There's no `level` column, and price lives in per-row pricing fields.
- Anywhere public to publish to. There's no public class or workshop page, and the dancer class list doesn't select `asset` (`app/api/dancer/public-classes/route.ts:15`), so class promo images never reach dancers today.

### 1.3 Existing code that will bite this feature

1. The service worker caches every successful GET in a cache that never expires, cross-origin requests included (`public/sw.js:44-51`). Private photos loaded by the editor would stay on her phone after logout, as would `/api` JSON. The `/api` part already applies to notes today. Phase 1 limits the cache to same-origin static assets.
2. Profile linking (`docs/profile-linking.md`) lets an instructor sign in with two emails. `getCurrentUserWithRole()` swaps in the primary profile, but storage RLS sees whichever `auth.uid()` signed in. Folders keyed on `auth.uid()` would split her library by email. Ownership keys on the primary profile through a SQL helper (4.6).
3. `role` holds one value per profile, and `getDefaultInstructorId()` finds the instructor by `role = 'instructor'` (`lib/auth/server-auth.ts:148`). So Courtney is almost certainly `instructor`, a `requireRole('admin')` gate would lock her out of template editing, and the proxy redirects her away from `/admin/*`. Decision D1.
4. DESIGN.md bans script fonts (`DESIGN.md:273`) and all-caps Cormorant headings (`DESIGN.md:180`). The reference poster uses both. Decision D2.
5. react-konva 19.3.0 requires React ^19.3.0, and the repo has 19.2.3. Pin react-konva 19.2.7, or bump React in its own PR first.
6. Supabase Image Transformations are Pro-only, so thumbnails can't come from the storage CDN.

## 2. Architecture

### 2.1 A promo is a document

```
template version (immutable: layers per format, slot definitions, variants)
  + brand snapshot (colors, font roles, name and credential lines, voice notes)
  + design document (slot values, photo crops, nudges, variant, frozen text layout)
  -> Konva scene -> editor canvas, PNG, PDF
```

Changing a date edits one value in the document, and no image gets regenerated.

### 2.2 One renderer

The editor and the export run the same react-konva scene at different scales. Design units equal output pixels (1080×1350, 1080×1920, 3300×5100), and the editor scales the stage down to fit the screen.

Two details keep exports identical across devices.

- Frozen text layout. When a text layer is laid out, the document stores the computed font size and line breaks with a hash of the text, style and box. Any device draws the stored lines until one of those inputs changes. Safari and Chrome measure text slightly differently; without this, a design edited on her phone could wrap differently when exported from her laptop.
- Fonts load through the FontFace API from self-hosted WOFF2 files, and the renderer awaits every face a document uses before the first draw and before export.

Poster exports render in four 3300×1275 strips (about 17 MB of pixels each) placed on one PDF page. iOS 18 and later allow 8192² canvases, but iOS 17 caps canvas area at 4096², which 3300×5100 exceeds by 0.3%, and the per-tab memory ceiling is undocumented. Strips cover both.

### 2.3 Flow

1. Upload. A worker on her phone decodes each photo, applies orientation, caps its resolution (16 MP proposed, D3), and re-encodes it as JPEG, which drops all metadata, GPS included. It also makes 1600 px and 400 px renditions. Files go to a private bucket over TUS. Pose detection runs locally; one server-side vision call tags the batch.
2. Generate. The server builds a JSON schema from the template's slots, runs three text calls in parallel, validates them, fills fact slots in code, and streams three documents back. Her browser renders them.
3. Edit. Everything runs client-side; the document autosaves.
4. Revise. The server sends the document and her instruction, gets back a list of operations from an allowlist, then validates and applies them as a new revision.
5. Export. Her browser renders at native size and hands the file to the iOS share sheet.
6. Publish. Her browser uploads the render; the server copies it into the public `assets` bucket and links it to the class.

### 2.4 Pages and routes

Pages: `/instructor/promo` (history), `/instructor/promo/new` (brief), `/instructor/promo/[id]` (editor), `/instructor/promo/library`, `/instructor/promo/templates[/id]` and `/instructor/promo/brand` (template editors only, per D1), `/admin/promo/usage`.

API: `/api/promo/assets` (finalize, tags, favorite, delete), `/api/promo/assets/tag`, `/api/promo/designs[/id]`, `/api/promo/generate`, `/api/promo/designs/[id]/revise`, `/api/promo/designs/[id]/siblings`, `/api/promo/designs/[id]/publish`, `/api/promo/templates[/id][/publish]`, `/api/promo/brand-kit`, `/api/admin/promo/usage`, and in Phase 6 `/api/promo/assets/[id]/prepare`.

Navigation: "Promo Studio" in the instructor sidebar's Schedule group next to Assets, "New promo" in the mobile plus menu (DESIGN.md caps the bottom nav at four tabs), and a dashboard link.

## 3. Tools

### 3.1 Picks

| Part | Pick | Alternative | Why the pick |
|---|---|---|---|
| Editor canvas | Konva 10.7 and react-konva (MIT) | Fabric.js 7.4 (MIT) | The React binding renders the design JSON directly, so the JSON stays the only state, and AI operations, undo and autosave all act on it. Fabric keeps state in its own object model, which you sync back. Fabric does ship snapping guides, crop controls and in-place text editing in `fabric/extensions`; with Konva we write snapping and crop UX ourselves (about two days). Polotno, a paid editor of exactly this shape, is built on Konva. |
| Editor state, undo | zustand 5 and zundo 2.3 (MIT) | Immer patches (MIT) | A temporal store over the document, throttled during drags, under 1 KB. |
| Text input | Phone: a bottom-sheet field per text slot. Laptop: a textarea positioned over the text, Konva's documented pattern. | Fabric's IText | Poster credential lines are about 4 px tall on a 390 px screen, too small to tap. Fields at 16 px or larger also stop iOS from zooming. |
| Validation | zod 4 with `openai/helpers/zod` | Ajv (MIT) | One schema, built at runtime from the template, drives the API's strict mode and our post-parse checks. |
| Fonts | Self-hosted OFL WOFF2 from Fontsource, loaded with FontFace | `next/font/local` | Canvas needs explicit load promises and stable family names; `next/font` hashes names and loads lazily. |
| PNG export | Browser canvas: Konva `toCanvas()` then `toBlob()` at native size | Server render with Konva 10's skia-canvas backend (MIT) | Same draw calls on the same device as the editor, so the file matches the screen. No server infra, cold starts or font installs. The server Skia path is the fallback for old phones and the route to vector-text PDFs (Phase 7). |
| Poster PDF | @cantoo/pdf-lib 2.11 (MIT) | jsPDF 4.2 (MIT) | Maintained fork of pdf-lib, which last shipped in 2021. `embedJpg` passes JPEG bytes through without re-encoding, and `setTrimBox` and `setBleedBox` exist for print shops. jsPDF has no public setter for those boxes. |
| Save to phone | Web Share API with files; `<a download>` on desktop | Long-press "Save to Photos" on an `<img>` preview | The share sheet offers "Save Image" for image files (iOS 14+). Share the file alone, because adding text or a URL can remove "Save Image". |
| Upload transport | tus-js-client 4.3 (MIT) against Supabase's resumable endpoint, with a small IndexedDB queue (idb-keyval, Apache-2.0) | Uppy 6 headless: core, tus, golden-retriever (MIT) | Our pipeline runs before upload (normalize, renditions, pose), and tus-js-client is one dependency. The queue holds processed blobs, so uploads resume after a reload without re-picking photos; tus-js-client alone needs the file selected again. Golden Retriever caps stored blobs at 10 MiB each. |
| Image processing | In the browser: `createImageBitmap` with resize (Safari 15+) and `OffscreenCanvas` in a worker (Safari 16.4+), JPEG output | sharp 0.35 on the server (Apache-2.0) | GPS never leaves the phone, and the work costs neither Replit CPU nor Supabase egress. Safari can't encode WebP from a canvas, so renditions are JPEG. |
| HEIC | Native decode in Safari 17+ on iOS and macOS. iPhone Photos picks already arrive as JPEG. | heic-to 1.6 (LGPL-3.0, wasm), lazy-loaded for Chrome | Skipping the wasm avoids LGPL obligations and HEVC patent exposure for a path Courtney may never hit. Decision D6. |
| Pose and subject box | MediaPipe Pose Landmarker via @mediapipe/tasks-vision 1.1 (Apache-2.0), lite model about 5.5 MB, in the browser | Tags from the vision model alone | 33 landmarks give exact head and feet positions for crops, plus rule-based tags (arms up, kick, full body), at no cost. Vision models return loose boxes, and a crop that cuts off her feet ruins a full-body hero. |
| Segmentation (Phase 6) | BiRefNet-lite (MIT code and weights) via onnxruntime-node 1.30 (MIT), or transformers.js 4.3 on WebGPU (Safari 26+) | MODNet (Apache-2.0, 25 MB, portrait-tuned) | The best hair edges I found among models licensed for commercial use. Spike S4 picks the runtime. |
| Server image ops (Phase 6) | sharp 0.35 (Apache-2.0) | skia-canvas 3.0 (MIT) | Fast compositing and resizing. The server never needs HEIC. |
| Copy model | `gpt-6-luna` through the Responses API, strict `json_schema`, low reasoning effort. $0.10 in and $0.50 out per 1M tokens. | `gpt-5.6-luna` | The cheapest model not on a retirement schedule, reported at about 0.8 s to first token. The model ID lives in an env var; S3 confirms strict-mode support. Stay on openai 6.x; v7 only adds a Node 22 floor. |
| Image model (Phase 6) | `gpt-image-2` edits on a subject-free plate | `gpt-image-2.5-flare` | Accepts custom sizes (multiples of 16, up to about 8.3 MP), so plates can match slot aspect ratios. |

### 3.2 Ruled out

- Polotno SDK. Proprietary; its license allows a 60-day evaluation, then a paid subscription for production.
- tldraw. Production use requires a license key, and it's a whiteboard SDK.
- react-moveable. DOM-only, with no release since December 2023.
- Satori or `next/og` as an export renderer. Satori's README disclaims matching browser layout, and previewing with one engine while exporting with another is how layouts drift. Next 16.3 also bundles an old Satori (0.25).
- BRIA RMBG-1.4 and 2.0 (non-commercial), @imgly/background-removal (AGPL-3.0), and rembg's default model (now BRIA; override it if rembg is ever used).
- `gpt-image-1` and the rest of the 1.x family, which OpenAI retires between Oct 23 and Dec 1, 2026, and `gpt-5-mini` and `gpt-5-nano`, retiring Dec 11, 2026 (dates from OpenAI's deprecations page as quoted in search results).

### 3.3 Free-only check

| Requirement | Free path | Where free runs out |
|---|---|---|
| Thumbnails | Generated on the phone at upload | Supabase Image Transformations need Pro |
| Storage | Supabase Free, 1 GB | About 150 photos at the 16 MP cap. Beyond that, Supabase Pro ($25 a month) or Cloudflare R2's free tier (10 GB) as a second store |
| Egress | 5 GB plus 5 GB cached per month | Ample for one instructor; originals load only for poster export |
| Uploads that continue while Safari is in the background | None for a web app | iOS suspends background tabs. TUS resumes when she returns; true background transfer needs a native app. Screen Wake Lock during uploads helps where supported |
| Background removal | BiRefNet or MODNet | Hosted commercial removal (BRIA) is paid |
| Print PDF | 300 dpi raster made on the phone, which meets AC8 | Vector text needs the server Skia path, still free (Phase 7) |
| AI | Your OpenAI key | Paid by design; roughly $1 to $2 a month at expected volume (5.5) |

## 4. Data model, storage, permissions

### 4.1 Tables

Migration 46 ships with Phase 1 and 47 with Phase 2. Run `ls migrations` first; numbers have collided before.

| Table | Columns | Notes |
|---|---|---|
| `promo_editors` | `profile_id` PK, `added_by` | Who may edit templates and brand kits besides admins (D1). Admin-writable only. Kept off `profiles` so no self-update policy can grant it. |
| `promo_assets` | `id`, `owner_id`, `parent_id` (derived edits), `status` (uploading, ready, failed, pending_review, rejected), `original_path`, `display_path`, `thumb_path`, `matte_path`, `width`, `height`, `bytes`, `sha256`, `tags` jsonb, `pose` jsonb, `tags_edited`, `derivation` jsonb, `favorite`, `deleted_at` | Partial unique index on (`owner_id`, `sha256`) where not deleted, for dedupe. `derivation` records the op, model, params, AI call and pixel-check result. |
| `promo_brand_kits` | `id`, `owner_id` (null for the studio default), `tokens` jsonb, `updated_by` | Colors, font roles, name, credential lines, "Led by" label, voice notes, logo path. |
| `promo_templates` | `id`, `slug`, `name`, `status`, `current_version_id` | |
| `promo_template_versions` | `id`, `template_id`, `version`, `definition` jsonb, `definition_format`, `published_at`, `published_by`, `notes` | A trigger rejects UPDATE and DELETE once `published_at` is set. `definition_format` lets the renderer read old shapes after the schema evolves. |
| `promo_designs` | `id`, `owner_id`, `title`, `template_version_id`, `format`, `group_id`, `class_ids` uuid[], `brief` jsonb, `document` jsonb, `brand_snapshot` jsonb, `revision`, `deleted_at` | `group_id` ties post, story and poster siblings together. `revision` drives optimistic autosave. |
| `promo_design_revisions` | `design_id`, `revision`, `document`, `source` (generate, ai_revise, checkpoint, restore), `instruction`, `ai_call_id` | AI results and periodic checkpoints. Backs "Undo AI change" and history. |
| `promo_publications` | `design_id`, `asset_id` (existing `assets` table), `class_id`, `previous_class_asset_id`, `revision`, `published_at`, `unpublished_at` | Unpublish restores whatever image the class had before. |
| `promo_ai_calls` | `owner_id`, `kind` (tag, generate, revise, shorten, photo_edit), `model`, `status` (ok, invalid, error, capped), token counts, `cost_micros`, `latency_ms`, `design_id`, `asset_id`, `error_code` | Insert-only, from the server. Costs are integer micro-dollars because a $0.002 call rounds to zero cents; CLAUDE.md's integer-cents rule targets `DECIMAL(10,2)` money columns. |
| `promo_ai_budgets` | `owner_id` PK, `monthly_cap_micros`, `updated_by` | Falls back to `PROMO_AI_DEFAULT_CAP_USD`. |
| `promo_ai_monthly` (view, `security_invoker`) | `owner_id`, `month`, `kind`, `calls`, `cost_micros` | Feeds the usage page and the cap check. |

### 4.2 Template definition and design document

```ts
type Format = 'ig_post' | 'ig_story' | 'poster'
type FontRole = 'display' | 'caps' | 'script'
type ColorToken = 'paper' | 'paperDeep' | 'ink' | 'accent' | 'accentSoft' | 'darkBlock' | 'onDark'

interface TemplateDefinition {
  slots: Record<string, SlotDef>                                     // shared by every format
  variants: Record<string, Partial<Record<ColorToken, ColorToken>>>  // 'ivory', 'noir'
  formats: Partial<Record<Format, FormatLayout>>
}

interface SlotDef {
  binding: 'copy' | 'fact' | 'brand' | 'photo'
  source?: string          // 'fact.sessions', 'fact.level', 'brand.credentialLines'
  label: string            // phone Content panel label
  aliases?: string[]       // words that name this slot in a revision instruction
  guidance?: string        // copy slots: what to write
  maxChars?: number
  maxLines?: number
  list?: { min: number; max: number }
  preferredShots?: ShotType[]
  required: boolean
}

interface FormatLayout {
  width: number; height: number                  // output pixels
  safeArea?: { top: number; bottom: number }     // story: 250 / 250
  bleed?: number                                 // poster, if D7 says so
  layers: Layer[]                                // back to front
}

type Layer =
  | { kind: 'shape'; id: string; box: Box; shape: 'rect' | 'ellipse' | 'line'; fill?: ColorToken; stroke?: ColorToken }
  | { kind: 'text'; id: string; box: Box; slot?: string; text?: string; style: TextStyle; fit: 'shrink' | 'wrap' }
  | { kind: 'photo'; id: string; box: Box; slot: string; mask?: 'rect' | 'ellipse' }
  | { kind: 'repeater'; id: string; box: Box; slot: string; direction: 'row' | 'column'; gap: number;
      item: { width: number; height: number; layers: Layer[] }; overflow: 'scale' | 'wrap' }

interface TextStyle {
  font: FontRole; size: number; minSize: number; weight: number
  tracking: number; lineHeight: number; align: 'left' | 'center' | 'right'
  uppercase?: boolean; color: ColorToken
}

interface DesignDocument {
  variant: string
  values: Record<string, string | string[] | FactOverride>
  photos: Record<string, { assetId: string; crop: { x: number; y: number; scale: number }; look?: PhotoLook }>
  edited: string[]                               // slots she changed by hand
  nudges: Record<string, Partial<Box>>           // her moves and resizes, by layer id
  layout: Record<string, { hash: string; size: number; lines: string[] }>
}
```

Layers reference color tokens and font roles only, and the brand snapshot resolves them, so a template can't hard-code a color or font. An admin can mark a layer `allowOffBrand`; everywhere else the instructor editor offers tokens and roles only.

### 4.3 Who fills each slot

| Binding | Filled by | Template #1 slots | She can edit |
|---|---|---|---|
| `brand` | Code, from the brand snapshot | Eyebrow name, "Led by", script name, credential lines | Per design, or in the brand kit |
| `fact` | Code, from linked class rows and the form, formatted in America/New_York | Date circles (weekday, date, time range), level line ("All levels welcome") | Yes. The Content panel marks an override that differs from the class schedule |
| `copy` | The model, then her | Title line 1 (ink) and line 2 (gilt), tagline, focus keywords (3 to 6), description, feature pills (2 to 6) | Yes |
| `photo` | The model picks from an enum of the photo IDs she selected | Hero, strip 1 to 4 | Yes: swap, replace, crop |

Fixing a time (AC4) is a fact override, with no AI call involved.

### 4.4 Versioning

- Each template has one mutable draft. Publishing freezes the draft as version N+1, and the trigger keeps it frozen. Designs pin `template_version_id`, so publishing never changes a saved design (AC7). An optional "Update to latest template" maps slot values by slot ID and nudges by layer ID, and lists anything it drops.
- Designs copy the brand tokens at creation (`brand_snapshot`). Brand edits reach old designs only through an explicit "Apply current brand kit".
- Fonts live in a code registry (`lib/promo/fonts.ts`) mapping font IDs to files. A font file stays in the repo as long as any snapshot can reference it, and new fonts get new IDs.

### 4.5 Storage layout and access

- New private bucket `promo-private`, 50 MB file limit (the Free plan maximum), JPEG and PNG only.
  - `{owner}/assets/{asset_id}/original.jpg` (capped per D3), `display.jpg` (1600 px), `thumb.jpg` (400 px), `matte.png` (Phase 6)
  - `{owner}/renders/{design_id}/{revision}.png`, written only when she publishes
- Published copies go into the existing public `assets` bucket with a row in the `assets` table, so `classes.asset_id`, the class form's asset picker and `/instructor/assets` work unchanged. Published objects get `cacheControl: 300`, so an unpublish clears CDN copies within about five minutes.
- No signed URLs. The browser reads private files with supabase-js `download()`, which sends her JWT in a header, and turns them into `blob:` URLs that exist only inside her tab. No URL anywhere works without her session (AC2). Blob URLs are same-origin, so Konva can export without tainting the canvas. Supabase signed URLs also can't be revoked before they expire.
- Exports saved to her phone aren't stored. Only published renders take space.
- Server routes read files through the caller's session client, so RLS applies, and send them to OpenAI as base64. The publish route verifies ownership, then uses `createAdminClient()` to copy the object and insert the `assets` row.

### 4.6 Policies

Helpers follow migration 45's pattern:

```sql
create or replace function public.promo_owner_id() returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(p.linked_profile_id, p.id) from public.profiles p where p.id = (select auth.uid())
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
$$;

-- can_edit_promo_templates(): is_admin(), or promo_owner_id() appears in promo_editors
```

| Object | Read | Write |
|---|---|---|
| `promo_assets`, `promo_designs`, `promo_design_revisions`, `promo_publications` | `owner_id = promo_owner_id()`, or admin | Same |
| `promo_templates`, `promo_template_versions` | Instructors and admins see published versions; editors see drafts | Editors, drafts only (trigger) |
| `promo_brand_kits` | Instructors and admins | Editors |
| `promo_ai_calls` | Own rows, or admin | Service role only; no update or delete |
| `promo_ai_budgets` | Own row, or admin | Admin |
| `storage.objects` in `promo-private` | `(storage.foldername(name))[1] = promo_owner_id()::text`, or admin | Same |
| Anyone without a session | Nothing | Nothing |

Policies call helpers as `(select public.promo_owner_id())` so Postgres evaluates them once per statement, the same fix migration 31 applied to `auth.uid()`.

### 4.7 Template #1 as data

- Post, 1080×1350. The reference layout, which is already close to 4:5: hero full-body photo on the left, a vertical strip of up to four photos on the right, the type stack between them, the dark bio block across the bottom.
- Story, 1080×1920. The same stack in one column with the strip as a row of three, all text between y = 250 and y = 1670.
- Poster, 3300×5100, plus bleed per D7. The post structure stretched to 11:17, with the extra height going to the hero and the type stack.
- Variants: Ivory (champagne paper, ink and gilt type) and Noir (stage-black paper, champagne and gilt type). "Darker, more dramatic" switches to Noir.
- Repeaters: date circles 1 to 4 (four circles scale down to fit the row) and pills 2 to 6 (a second column past four in the post format).
- The reference has no location or signup line. I'd add an optional location line under the date circles, hidden when empty. Courtney's call.

## 5. AI pipeline

### 5.1 Tagging, once per photo

- Local and free: orientation and aspect; pose landmarks feed shot-type rules (both wrists above the nose means arms up; an ankle above hip height means kick; nose and both ankles spanning over 70% of the frame height means full body; no hips means headshot; legs without a face means detail) and give head and feet anchors for cropping; color variance in a border band hints at a plain backdrop.
- Server: one vision call per upload batch with the 400 px thumbnails at low detail, returning background type, mood and a one-line description through a strict schema. About a tenth of a cent per 10-photo batch at `gpt-6-luna` prices.
- She corrects tags in a sheet; `tags_edited` stops automatic overwrites.

### 5.2 Generation (AC3)

- Input: the brief (form plus linked class rows); each copy slot's guidance, max characters, max lines and list counts; brand voice notes, seeded from PRODUCT.md's voice line and anti-references; photo IDs with tags; a read-only fact summary for context.
- Once a format has more than one template, each call also picks a template ID from an enum of the active ones, and the slot schema follows that choice. With Template #1 alone, variations differ in copy, photo assignment and variant.
- Three parallel calls, each with a different angle (technique, performance, strength) and hero preference, each returning one variation. `Promise.allSettled` with a 12 s timeout. The route streams NDJSON so the first card appears as soon as it validates.
- Validation after parsing:
  - Lengths and list counts. Strict mode's support for `maxLength` is unverified, so limits go in field descriptions and get checked in code either way.
  - Photo IDs unique and drawn from her selection.
  - Banned words from the voice notes, and no exclamation points.
  - Fact guard: copy slots may not contain digits, currency, month or weekday names, or clock times, and number words must agree with the facts ("three days" needs three dates).
  - One retry carrying the specific errors; after that the variation is dropped.
- Fallback: a facts-only document (template defaults, fact slots, her title idea), so the editor never opens blank.
- Speed: fonts and the display renditions of her selected photos prefetch while she fills in the form, leaving model latency plus about a second of rendering. Replit cold starts after 15 idle minutes add a few seconds to the first request.
- Cost: about 3 × (3,000 tokens in + 400 out), roughly $0.0015 per generation.

### 5.3 Revisions (AC5)

- The model receives a document summary, the instruction, the locked slots (everything in `edited`), and a strict schema of allowed operations: `set_copy`, `set_list`, `assign_photo`, `swap_photos`, `set_variant`, `set_photo_look`.
- It returns `{ ops, summary }`. Code validates each op and drops any that touch a locked slot unless the instruction names that slot by label or alias. "Make the tagline punchier" may rewrite a tagline she edited; "make it more dramatic" may not.
- The result saves as a revision with a one-tap Undo.
- "Make it more dramatic" typically becomes `set_variant('noir')`, `set_photo_look('dramatic')` on the hero, and copy changes in unlocked slots.
- Format siblings copy slot values into the other format's layout and call the model only to shorten values that exceed the target's limits.

### 5.4 Photo prep and the face rule (Phase 6)

OpenAI's cookbook says a masked edit may still change regions the mask protects, and developers report full-frame regeneration. `input_fidelity` raises facial likeness without promising identical pixels, and `gpt-image-2` doesn't take it (OpenAI says its output is high-fidelity by default). The guarantee has to come from compositing.

1. Segment once with BiRefNet and store the matte as a derived file.
2. Build the protected mask: the matte plus her contact shadow, feathered a few pixels outward.
3. Build a plate: the photo with the protected mask's area, slightly dilated, made transparent. The image model only ever receives the plate, so it has nothing of her to redraw, and its moderation sees an empty studio. The edits endpoint has no `moderation` setting to relax, and dancewear has drawn reported false positives on `gpt-image-2`; plates sidestep both.
4. Request the extension or backdrop on the plate at the slot's aspect ratio, at or below 2560×1440 worth of pixels (larger sizes are marked experimental).
5. Scale the result to the original's size and composite the original back through the protected mask. Wherever the mask is 0.98 or more, pixels are copied from the original byte for byte; only the feathered edge blends.
6. Before encoding, check that every pixel where the mask is 0.98 or more equals the original. A failure discards the result, and the edit isn't offered.
7. Save as a new derived asset (`parent_id` set, `status = pending_review`). A before/after slider lets her accept or reject. Originals are never written after upload.

Deterministic options come first and cost nothing: smart crop from pose anchors; extending a plain backdrop by edge sampling plus grain when the border band is uniform; background-only color matching through the matte.

Offer rules: extend only on sides her silhouette doesn't touch, because otherwise the model would have to invent a foot; offer nothing when the matte fails a quality heuristic; never offer edits on group shots.

Cost: `gpt-image-2` at medium quality runs about $0.05 per 1024² output plus input tokens, so roughly $0.10 to $0.20 per edit.

### 5.5 Cost logging and caps

- Every OpenAI call goes through one wrapper that writes a `promo_ai_calls` row, success or failure, with tokens from the response's `usage` and cost from a dated price table in `lib/promo/ai/pricing.ts`.
- Before each call the server sums the month from `promo_ai_monthly`. At the cap it returns 402, and the UI says editing still works.
- `/admin/promo/usage` shows this month by instructor and kind, the last six months, and the cap.
- Expected spend for Courtney: 20 promos, 10 revisions and 30 tagged photos a month cost a few cents; ten photo edits add $1 to $2.

## 6. Workplan

Sizes assume one developer working with Claude Code, and they're rough. Phases 1 and 2, and Phases 4 and 5, can run in parallel with a second person or session.

| Phase | Delivers | Depends on | Size |
|---|---|---|---|
| 0. Spikes and decisions | Numbers for the risky parts; D1 to D10 answered | Nothing | 3 to 4 days |
| 1. Photo library | AC1, AC2 | 0 | 6 to 8 days |
| 2. Document, renderer, export | Template #1 in three formats; AC8 | 0 | 7 to 9 days |
| 3. Editor and publish | AC4, AC6 | 1, 2 | 8 to 10 days |
| 4. AI fill and revisions | AC3, AC5 | 1, 2, 3 | 5 to 7 days |
| 5. Template editor and usage admin | AC7 | 2, 3 | 7 to 9 days |
| MVP | AC1 to AC8 | | 7 to 9 weeks |
| 6. AI photo prep | FR5 | MVP, spike S4 | 6 to 8 days |
| 7. Site and print | Published promos on the site, vector PDF, more templates | MVP | Open |

Critical path: 0, then 2, then 3, then 4 and 5.

Rules for every phase:
- Promo Studio's own screens follow DESIGN.md and PRODUCT.md, with semantic spacing tokens and `app/(portal)/instructor/students/page.tsx` as the reference page.
- Every API route calls its guard first, uses `@/lib/supabase/server`, and reaches for `createAdminClient()` only after authorizing the caller.
- Migrations are applied by hand in the SQL editor; each phase's notes include the verification queries.
- CI stays green: eslint with zero warnings, `tsc`, tests, build.

### Phase 0. Spikes and decisions

Tasks
1. S1 Render parity. Hand-build Template #1's post layout in react-konva with the candidate fonts. Export on her iPhone (Safari and the home-screen app) and on a Mac (Safari and Chrome). Diff the exports against the on-screen stage and against each other. Render the poster in strips into a PDF and print it at 11×17 at the shop she'll use.
2. S2 Upload. Send 10 photos over TUS into a scratch private bucket on cellular. Toggle airplane mode mid-upload, switch apps, reload. Check sha256 integrity and run `exiftool` on the downloads. Record what iOS hands over from Photos, Files and the camera.
3. S3 Copy model. Run 20 generations each on `gpt-6-luna`, `gpt-5.6-luna` and `gpt-4.1-mini` against Template #1's schema. Record p50 and p90 latency, validation pass rate and strict-mode support. Courtney ranks the outputs blind.
4. S4 Photo prep feasibility. Run six of her photos (curls, sheer sleeves, a kick) through BiRefNet-lite on Replit CPU and in browser WebGPU, and through MODNet. Composite each over plain paper and time it. Courtney judges the edges. Send three plates through `gpt-image-2` edits and record any moderation blocks.
5. Answer D1 to D10.

Definition of done
- A spike note (`docs/superpowers/specs/`) records the numbers and each decision.
- Phase 6 has a go, reduce (deterministic edits only) or drop call.

### Phase 1. Photo library

Tasks
1. Migration 46: helpers, `promo_editors`, `promo_assets`, `promo_ai_calls`, `promo_ai_budgets`, the monthly view and their RLS; the `promo-private` bucket and its storage policies.
2. Service worker: cache only same-origin static assets (`/_next/static/`, icons, `offline.html`) and send everything else to the network uncached. Rename the cache so the activate handler deletes old entries.
3. Upload pipeline (`lib/promo/upload/`): decode with resize in a worker, orientation, the D3 resolution cap, JPEG originals at quality 0.9, 1600 px and 400 px renditions, sha256; the IndexedDB queue; tus-js-client to `https://<project>.storage.supabase.co/storage/v1/upload/resumable` with 6 MB chunks (Supabase requires exactly that) and a token refresh in `onBeforeRequest`; finalize through `POST /api/promo/assets`; Screen Wake Lock while the queue runs.
4. Pose detection on the 1600 px rendition, with the lite model and wasm self-hosted under `/public/models`; tag rules; crop anchors.
5. `POST /api/promo/assets/tag`: one vision call per batch, logged and capped.
6. Library at `/instructor/promo/library`: thumbnail grid, filters (shot type, background, orientation, favorites), tag sheet, favorite, delete (soft delete plus removal of every rendition), per-photo progress and resume state, and a storage meter against the 1 GB cap.
7. Navigation entries (2.4).
8. An AC2 verification script.

Depends on: S2, D3, D4, D6.

Definition of done
- AC1: on her iPhone over cellular, 10 photos appear with thumbnails and tags, and `exiftool` finds no GPS in the downloaded originals.
- AC2: the script gets no bytes and no rows when logged out, as a dancer test account and as a second instructor test account, through public URLs, authenticated URLs and table reads.
- Unit tests cover orientation, cap math, tag rules and queue resume.

### Phase 2. Document, renderer, export

Tasks
1. zod schemas for the template definition and the design document (`lib/promo/schema.ts`), `definition_format` 1.
2. Font registry and loader for the D2 fonts.
3. Migration 47: brand kits, templates, versions with the immutability trigger, designs, revisions, publications.
4. Brand kit seeded from DESIGN.json (paper Champagne Page, ink Stage Black, accent Curtain Gilt, dark block Stage Ink), plus a form at `/instructor/promo/brand` for editors covering tokens, name lines, voice notes and logo.
5. Template #1 definition for post, story and poster with both variants (4.7).
6. Layout engine (`lib/promo/layout/`, pure functions): shrink-to-fit text with a minimum size, max lines, tracking and uppercase; frozen lines; repeater layout with scale-to-fit and wrap; photo crops from anchors. Display titles use zero tracking, because Konva drops kerning when letter spacing is non-zero.
7. Fact formatters: class rows to date blocks in America/New_York, level phrases, and price through `lib/utils/pricing.ts`.
8. react-konva renderer that loads, for each slot, the smallest rendition that covers its output size.
9. Export: PNG and JPEG at native size; poster strips encoded as JPEG at quality 0.95 onto a Tabloid page (792×1224 pt) with trim and bleed boxes per D7; the share sheet on iPhone and a download elsewhere.

Depends on: S1, D2, D7. Phase 1 isn't needed; sample photos stand in.

Definition of done
- Template #1 lays out in all three formats with 1 to 4 dates and 2 to 6 pills without overlap, covered by snapshot tests of the layout output.
- Exports have exact pixel dimensions, and the same document exported on her iPhone and on a Mac has identical line breaks.
- AC8: Courtney signs off on a test print at 11×17.

### Phase 3. Editor and publish

Tasks
1. `/instructor/promo` history, filterable by format and class, and the `/instructor/promo/[id]` editor.
2. Design API: create, read, autosave `PATCH` with a revision check (409 on conflict), duplicate, delete; a checkpoint every five minutes of editing.
3. Phone layout: the canvas on top, with tabs below for Content (one field per text slot, live preview), Photos (tap a slot then a library photo to replace it; tap two slots to swap; pinch and drag in a crop sheet), Style (variant, photo look) and Export.
4. Laptop layout: click text to edit in place, drag and resize with Konva's Transformer, snapping to the center, margins and other layers, arrow-key nudges, a DOM layer list in tab order (Enter edits, Esc deselects), Cmd/Ctrl+Z and Shift+Z.
5. Brand lock: style controls offer tokens and font roles only, unless a layer allows off-brand values.
6. Undo and redo through zundo, throttled during drags.
7. "Make story", "Make poster" and "Make all formats" create siblings in the same group by copying slot values, and flag slots that overflow. AI shortening arrives in Phase 4.
8. Publish and unpublish: upload the render to `promo-private`; the publish route copies it to the public `assets` bucket, inserts the `assets` row, optionally sets `classes.asset_id`, and records the previous value for unpublish.

Depends on: Phases 1 and 2.

Definition of done
- AC4: the tagline change, hero swap and time fix add zero rows to `promo_ai_calls`.
- AC6: post and story exports match the editor on her iPhone, and "Save Image" puts them in Photos.
- Autosave survives a reload mid-edit, a keyboard-only pass works on a laptop, and phone tap targets measure 44 px or more.

### Phase 4. AI fill and revisions

Tasks
1. `lib/promo/ai/`: a Responses API client with strict `json_schema` through `zodTextFormat`, the price table, the logging wrapper and the cap check.
2. Brief flow at `/instructor/promo/new`: format; class rows (multi-select by title and dates, D10); 1 to 5 photos from the library or uploaded inline; a short form (class type, title idea, focus points, level, price, vibe notes); Generate.
3. `POST /api/promo/generate` (5.2), including the fallback document.
4. Variation picker: three rendered cards, and picking one creates the design.
5. `POST /api/promo/designs/[id]/revise` (5.3) with Undo.
6. Shortening for format siblings.
7. Error states: a failed call leaves the design untouched and shows an inline retry; at the cap, editing continues.

Depends on: Phases 1 to 3, S3, D9.

Definition of done
- AC3: across 10 timed runs on her iPhone on cellular, with a linked three-day workshop and 4 photos, p90 is 15 s or less and every run yields at least two variations.
- AC5: after "make it more dramatic", her edited slots are byte-identical and the variant or look has changed.
- Fact-guard tests reject, for example, a pill reading "Nov 14 only", and every call appears in `promo_ai_calls` with a cost.

### Phase 5. Template editor and usage admin

Tasks
1. `/instructor/promo/templates` and `/instructor/promo/templates/[id]`, gated by `can_edit_promo_templates()` in the page, the API and RLS. Laptop-only; phones get a notice.
2. Template mode in the editor: a layer palette (text slot, static text, photo slot, shape, line, repeater); an inspector (binding, label, aliases, max characters and lines, font role, size and minimum size, tracking, alignment, color token, preferred shots); repeater item editing; format tabs; the story safe-zone overlay, with a check that blocks publishing; a stress preview (minimum and maximum repeater counts, longest allowed copy); a sample brief.
3. Draft autosave, Publish with notes, and read-only version history.
4. "Update to latest template" on a design.
5. `/admin/promo/usage` with the cap editor.

Depends on: Phases 2 and 3, D1.

Definition of done
- AC7: Courtney, listed in `promo_editors`, moves the date row, raises the pill repeater's default count from 4 to 5, and publishes. A previously saved design exports byte-identical before and after.
- The usage page shows month totals, and a test proves the cap blocks calls.

### Phase 6. AI photo prep

Tasks
1. Segmentation on the runtime S4 picked, with mattes stored as derived files.
2. Deterministic ops: smart crop, plain-backdrop extension, background-only color match.
3. Plate builder, `gpt-image-2` edit, composite-back and pixel check.
4. Before/after review, with derived assets shown under their original in the library.
5. Offer rules, an estimated cost shown before each run, and the cap check.

Depends on: the MVP, a go from S4, D4, D8.

Definition of done
- Every accepted derived asset records a passing pixel check, and every original keeps its sha256.
- No extension is offered on a side the subject touches.
- Courtney accepts at least three of five edits on her own photos in a review session.

### Phase 7. Site and print

- Show published promos where dancers see classes, or on a public workshop page (D5).
- Vector-text poster PDFs from the server through Konva's skia-canvas backend with TTF fonts, after confirming the native module runs on Replit Autoscale.
- A QR code for `external_signup_url` on posters.
- Per-instructor brand kit UI, more templates, carousel posts.

### Acceptance criteria map

| AC | Phase | Verified by |
|---|---|---|
| 1. iPhone upload, thumbnails, tags, GPS stripped | 1 | Her phone on cellular; `exiftool` on downloaded originals |
| 2. Photos unreachable without her session | 1 | Script run logged out, as a dancer and as a second instructor |
| 3. Two or more variations in about 15 s | 4 | 10 timed runs on her phone |
| 4. Edits without AI | 3 | `promo_ai_calls` row count unchanged |
| 5. "More dramatic" keeps her edits | 4 | Document diff of her edited slots |
| 6. Post and story match the editor and save on iPhone | 2, 3 | Export against stage diff; "Save Image" on her phone |
| 7. A template edit leaves old designs alone | 5 | Export diff before and after publishing |
| 8. Poster prints sharp at 300 dpi | 2 | A test print she signs off |

## 7. Decisions to make before Phase 1

D1. Who edits templates. Courtney's profile is almost certainly `instructor`, so admin-only gates exclude her. I recommend the `promo_editors` allowlist: Kevin passes as admin, and Courtney is listed. A simpler alternative lets every instructor edit templates, which amounts to the same thing while she's the only instructor. Changing her role to `admin` would break `getDefaultInstructorId()`.

D2. Promo typography and DESIGN.md. The poster needs an ALL-CAPS display serif and a script, both banned in the app UI. I recommend naming two promo-only roles in DESIGN.md: "Poster Display" (Bodoni Moda, or Cormorant Garamond SemiBold in caps if it holds up in the S1 renders) and "Signature Script" (shortlist: Great Vibes, Allura, Mrs Saint Delafield). Manrope, already on-system, serves as the tracked caps sans; Jost is closer to the reference's geometric caps if she prefers it. All are OFL. Courtney picks from the S1 renders.

D3. Original resolution cap. At 16 MP (my recommendation) an original runs about 5 to 7 MB, 1 GB holds about 150 photos, and a hero filling the poster's height prints at about 280 dpi. At 24 MP the same hero clears 300 dpi, and 1 GB holds about 100 photos.

D4. Sending her photos to OpenAI. Tagging sends 400 px thumbnails, and photo prep sends plates with her removed. Is that acceptable? Check OpenAI's current API data-retention terms before Phase 1.

D5. Where published promos appear. Today, nowhere public. The options are the dancer Open Classes detail sheet (portal only), the landing page's "Classes and workshops" section, or a new public `/workshops/[id]` page. Phase 3's publish creates the public URL and the class link; the surface itself is Phase 7.

D6. HEIC in Chrome. I recommend skipping the wasm decoder in v1 and telling her to open that photo in Safari or export it as JPEG. The alternative, heic-to, brings LGPL compliance (a separate unmodified file, the license text, a source offer) and HEVC patent exposure.

D7. Print spec. Where will posters print? A shop printing edge to edge wants 0.125 in of bleed, a 3375×5175 canvas with a trim box. Output is RGB, which digital print shops accept; offset printing wants CMYK and is out of scope.

D8. Photo looks and the face rule. The "warm" and "dramatic" looks change contrast and color across the whole photo at render time, regenerate nothing, and switch off with one tap. Does that count as altering her? If it does, looks apply to the background only, which needs the matte and moves to Phase 6.

D9. Default monthly AI cap. I suggest $10 per instructor, against expected use of $1 to $2.

D10. Linking a workshop. I recommend multi-selecting class rows, which needs no schema change; Template #1 takes up to four dates. The alternative adds a `series_id` to `classes`.

## 8. Risks

Free-only pressure
- 1 GB of storage is the binding limit. The resolution cap, sha256 dedupe, deleting renditions with their photo and the storage meter hold it off. Past that, Supabase Pro ($25 a month) or Cloudflare R2's free tier as a second store.
- Replit Autoscale bills compute per use, scales to zero after 15 idle minutes, and doesn't document a request timeout. Client-side rendering keeps server work to short API calls; AI routes set `maxDuration` and stay well under 30 s.
- OpenAI model churn. `gpt-image-1`, the other 1.x image models, and `gpt-5-mini` and `gpt-5-nano` all retire by Dec 11, 2026. Model IDs live in env vars and prices in one dated table.

The face rule
- OpenAI masks don't lock pixels. Plates, composite-back and the pixel check cover it (5.4).
- Matte edges on curls and sheer fabric. The blend ring mixes her edge pixels with new background, and a bad matte shows as a halo. S4 measures this on her photos, and the review step and offer rules contain it.
- Moderation false positives on dancewear. Plates contain no person, and tagging sends small thumbnails to a text model; S3 and S4 confirm both paths.
- BiRefNet's matting and portrait weights were reportedly trained partly on non-commercial datasets. Prefer the general or lite weights, and check before Phase 6.

iPhone
- Safari suspends background tabs, so uploads pause when she leaves the app. The queue resumes when she returns, Screen Wake Lock keeps the screen on where supported, and the UI asks her to stay on the page.
- Share activation lasts 5 s after a tap. Render first, then show a Save button whose tap calls `navigator.share()` immediately. Instagram as a direct share target is unverified; "Save Image" and posting from Photos always works.
- Canvas limits and memory (2.2). Strips and per-slot renditions keep peak memory low.
- What iOS hands a file input has changed several times; Safari 27's release notes mention a HEIC conversion fix. The pipeline re-encodes every file, so the incoming format doesn't matter.

Product
- Free-form layout on a phone is impractical at poster scale. Phone edits go through the Content and Photos panels, and free-form moves happen on the laptop.
- Copy quality is a matter of taste. S3's blind ranking and the editable voice notes are the controls.
- If Instagram changes its sizes, a format is template data, so the fix is a template edit.

## Sources

Checked October 8 and 9, 2026. Several official sites (openai.com, supabase.com, webkit.org, docs.replit.com) were blocked from this environment, so most facts come from the same docs' sources on GitHub.

- OpenAI image models, sizes, `input_fidelity`, edit parameters: [openai-node images.ts](https://github.com/openai/openai-node/blob/master/src/resources/images.ts), [cookbook: Generate Images With GPT Image](https://github.com/openai/openai-cookbook/blob/main/examples/Generate_Images_With_GPT_Image.ipynb), [cookbook: image model prompting guide](https://github.com/openai/openai-cookbook/blob/main/examples/multimodal/image-gen-models-prompting-guide.ipynb), [OpenAPI spec](https://github.com/openai/openai-openapi/blob/master/openapi.yaml)
- OpenAI text model IDs and prices: [openai-node shared.ts](https://github.com/openai/openai-node/blob/master/src/resources/shared.ts), [LiteLLM price table](https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json), [VentureBeat on GPT-6 Luna](https://venturebeat.com/technology/openai-releases-gpt-6-sol-and-luna-models-slashing-api-costs-50-or-more); retirement dates from [OpenAI deprecations](https://developers.openai.com/api/docs/deprecations) as quoted in search results
- Structured Outputs keyword support (unverified for `maxLength`): [OpenAI community thread](https://community.openai.com/t/structured-outputs-gets-nifty-improvements/1266968)
- Moderation reports: [gpt-image-2 over-refusals](https://community.openai.com/t/api-issue-moderation-over-refusals-on-gpt-image-2-with-moderation-low-where-chatgpt-always-succeeds/1388964), [swimwear flagged](https://community.openai.com/t/inconsistent-image-safety-blocks-ordinary-adult-swimwear-repeatedly-classified-as-sexual/1392919)
- Supabase limits: [plans.ts](https://github.com/supabase/supabase/blob/master/packages/shared-data/plans.ts), [resumable uploads](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/storage/uploads/resumable-uploads.mdx), [file limits](https://supabase.com/docs/guides/storage/uploads/file-limits), [image transformations](https://supabase.com/docs/guides/storage/serving/image-transformations), [downloads and signed URLs](https://supabase.com/docs/guides/storage/serving/downloads)
- iOS Safari: [WebKit CanvasBase.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/CanvasBase.cpp), [WKFileUploadPanel.mm](https://github.com/WebKit/WebKit/blob/main/Source/WebKit/UIProcess/ios/forms/WKFileUploadPanel.mm), [Navigator.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/Navigator.cpp), [MDN browser-compat-data](https://github.com/mdn/browser-compat-data), [Safari 26 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes), [Safari 27 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-27-release-notes)
- Editor and PDF libraries: [Konva changelog](https://github.com/konvajs/konva/blob/master/CHANGELOG.md), [react-konva](https://github.com/konvajs/react-konva), [Fabric.js](https://github.com/fabricjs/fabric.js), [tldraw license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md), [pdf-lib](https://github.com/Hopding/pdf-lib), [@cantoo/pdf-lib](https://www.npmjs.com/package/@cantoo/pdf-lib)
- Images and models: [sharp install notes](https://github.com/lovell/sharp/blob/main/docs/src/content/docs/install.md), [BiRefNet](https://github.com/ZhengPeng7/BiRefNet), [MediaPipe Pose Landmarker for web](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js)
- Replit Autoscale billing and scale-to-zero: [Replit usage-based billing](https://docs.replit.com/billing/about-usage-based-billing), as quoted in search results
- Versions and licenses of every npm package named above: the npm registry, October 9, 2026
