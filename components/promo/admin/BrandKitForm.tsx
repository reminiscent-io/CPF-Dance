'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button, Input, PageHeader, SegmentedControl, Select, Textarea, useToast } from '@/components/ui'
import { useAsyncData } from '@/lib/hooks/useAsyncData'
import { COLOR_TOKEN_LABELS, DEFAULT_BRAND_TOKENS, isHexColor } from '@/lib/promo/brand'
import { canvasMeasure, loadFontsForLayout } from '@/lib/promo/client/fonts'
import { fontsForRole } from '@/lib/promo/fonts'
import { buildScene } from '@/lib/promo/layout/scene'
import { STAND_IN_PHOTOS, stressDocument } from '@/lib/promo/template-edits'
import { COLOR_TOKENS, FONT_ROLES, type BrandIdentity, type BrandTokens, type FontRole, type TemplateDefinition } from '@/lib/promo/types'
import { promoFetch } from '../hooks'
import { PromoCanvas } from '../PromoCanvas'

const ROLE_LABELS: Record<FontRole, string> = {
  display: 'Display (titles, dates)',
  caps: 'Capitals (labels, body)',
  script: 'Script (signature)',
}

const IDENTITY_FIELDS: { key: keyof BrandIdentity; label: string }[] = [
  { key: 'name', label: 'Name line' },
  { key: 'ledBy', label: '“Led by” label' },
  { key: 'signature', label: 'Signature' },
  { key: 'credentialPrimary', label: 'Credential' },
  { key: 'credentialSecondary', label: 'Credential details' },
]

interface Loaded {
  tokens: BrandTokens
  definition: TemplateDefinition | null
}

/** Studio brand kit: colors, fonts by role, name lines and voice, with a live Template #1 preview. */
export default function BrandKitForm() {
  const { data, error } = useAsyncData<Loaded>(async (signal) => {
    const [kit, templates] = await Promise.all([
      promoFetch<{ tokens: BrandTokens }>('/api/promo/brand-kit', { signal }),
      promoFetch<{ templates: { definition: TemplateDefinition }[] }>('/api/promo/templates', { signal }),
    ])
    return { tokens: kit.tokens, definition: templates.templates[0]?.definition ?? null }
  }, [])

  if (error) return <p className="py-10 text-center text-charcoal-600">{error}</p>
  if (!data) return <div className="skeleton-shimmer h-96 rounded-lg" aria-busy="true" />
  return <BrandEditor initial={data.tokens} definition={data.definition} />
}

function BrandEditor({ initial, definition }: { initial: BrandTokens; definition: TemplateDefinition | null }) {
  const { addToast } = useToast()
  const [tokens, setTokens] = useState<BrandTokens>(initial)
  const [hexDrafts, setHexDrafts] = useState<Record<string, string>>({})
  const [banned, setBanned] = useState(initial.voice.bannedWords.join(', '))
  const [variant, setVariant] = useState('ivory')
  const [saving, setSaving] = useState(false)
  const [fontsReady, setFontsReady] = useState<string | null>(null)

  const layout = definition?.formats.ig_post
  const fontKey = FONT_ROLES.map((role) => tokens.fonts[role]).join('|')

  // Color and text edits keep the same fonts object, so this reruns only when a role's font changes.
  const fonts = tokens.fonts
  useEffect(() => {
    if (!layout) return
    let cancelled = false
    const key = FONT_ROLES.map((role) => fonts[role]).join('|')
    loadFontsForLayout(layout, { ...DEFAULT_BRAND_TOKENS, fonts })
      .then(() => {
        if (!cancelled) setFontsReady(key)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [layout, fonts])

  const scene = useMemo(() => {
    if (!definition || !layout || fontsReady !== fontKey) return null
    const document = stressDocument(definition, { sessions: 3, lists: 'usual', longest: false, variant })
    // Brand lines come from the kit being edited, not the template's sample words.
    for (const slot of definition.slots) if (slot.binding === 'brand') delete document.values[slot.id]
    return buildScene({ definition, format: 'ig_post', document, brand: tokens, measure: canvasMeasure, assets: STAND_IN_PHOTOS })
  }, [definition, layout, fontsReady, fontKey, tokens, variant])

  const setIdentity = (key: keyof BrandIdentity, value: string) =>
    setTokens((current) => ({ ...current, identity: { ...current.identity, [key]: value } }))

  const save = async () => {
    setSaving(true)
    try {
      const body: BrandTokens = {
        ...tokens,
        voice: {
          ...tokens.voice,
          bannedWords: banned
            .split(',')
            .map((word) => word.trim())
            .filter(Boolean)
            .slice(0, 60),
        },
      }
      const result = await promoFetch<{ tokens: BrandTokens }>('/api/promo/brand-kit', { method: 'PUT', json: { tokens: body } })
      setTokens(result.tokens)
      addToast('Brand kit saved. New promos use it; existing ones keep theirs.', 'success')
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Couldn’t save the brand kit.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Brand kit"
        subtitle="Colors, type and name lines every new promo starts from."
        action={
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        }
      />
      <div className="mt-header-gap grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="space-y-8">
          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal-950">Colors</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {COLOR_TOKENS.map((token) => (
                <label key={token} className="flex items-center gap-3 rounded-lg border border-champagne-200 bg-champagne-50 p-2">
                  <input
                    type="color"
                    aria-label={`${COLOR_TOKEN_LABELS[token]} color`}
                    value={tokens.colors[token]}
                    onChange={(event) => {
                      setTokens((current) => ({ ...current, colors: { ...current.colors, [token]: event.target.value } }))
                      setHexDrafts((current) => ({ ...current, [token]: event.target.value }))
                    }}
                    className="h-10 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-charcoal-700">{COLOR_TOKEN_LABELS[token]}</span>
                    <input
                      aria-label={`${COLOR_TOKEN_LABELS[token]} hex value`}
                      value={hexDrafts[token] ?? tokens.colors[token]}
                      onChange={(event) => {
                        const value = event.target.value.trim()
                        setHexDrafts((current) => ({ ...current, [token]: value }))
                        if (isHexColor(value)) {
                          setTokens((current) => ({ ...current, colors: { ...current.colors, [token]: value } }))
                        }
                      }}
                      className="w-full bg-transparent font-mono text-xs text-charcoal-500 focus:outline-none"
                    />
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal-950">Type</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              {FONT_ROLES.map((role) => (
                <Select
                  key={role}
                  label={ROLE_LABELS[role]}
                  name={`font-${role}`}
                  value={tokens.fonts[role]}
                  onChange={(event) =>
                    setTokens((current) => ({ ...current, fonts: { ...current.fonts, [role]: event.target.value } }))
                  }
                  options={fontsForRole(role).map((font) => ({ value: font.id, label: font.label }))}
                />
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-charcoal-950">Name lines</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {IDENTITY_FIELDS.map((field) => (
                <Input
                  key={field.key}
                  label={field.label}
                  name={`identity-${field.key}`}
                  value={tokens.identity[field.key]}
                  maxLength={field.key === 'credentialSecondary' ? 160 : 120}
                  onChange={(event) => setIdentity(field.key, event.target.value)}
                />
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-semibold text-charcoal-950">Voice</h2>
            <Textarea
              label="How the copy should sound"
              name="voice-notes"
              rows={4}
              maxLength={2000}
              value={tokens.voice.notes}
              onChange={(event) => setTokens((current) => ({ ...current, voice: { ...current.voice, notes: event.target.value } }))}
            />
            <Input
              label="Words the AI must never use"
              name="voice-banned"
              helperText="Separate with commas."
              value={banned}
              onChange={(event) => setBanned(event.target.value)}
            />
          </section>

          <div className="border-t border-champagne-200 pt-6">
            <Button
              variant="ghost"
              onClick={() => {
                setTokens(DEFAULT_BRAND_TOKENS)
                setBanned(DEFAULT_BRAND_TOKENS.voice.bannedWords.join(', '))
                setHexDrafts({})
              }}
            >
              Restore the defaults
            </Button>
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-xl font-semibold text-charcoal-950">Preview</h2>
            <SegmentedControl<string>
              aria-label="Preview variant"
              options={Object.entries(definition?.variants ?? {}).map(([value, item]) => ({ value, label: item.label }))}
              value={variant}
              onChange={setVariant}
            />
          </div>
          <div className="mt-3 rounded-lg bg-champagne-100 p-4">
            {scene ? (
              <div className="mx-auto shadow-soft" style={{ width: 360 }}>
                <PromoCanvas scene={scene} images={{}} displayWidth={360} ariaLabel="Brand kit preview" />
              </div>
            ) : (
              <div className="skeleton-shimmer mx-auto aspect-[4/5] w-full max-w-[360px] rounded" />
            )}
          </div>
          <p className="mt-2 text-xs text-charcoal-500">Template #1 with sample words. Photos show as blank frames here.</p>
        </aside>
      </div>
    </>
  )
}
