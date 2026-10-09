import { createAdminClient } from '@/lib/supabase/admin'
import { completeBrandTokens, DEFAULT_BRAND_TOKENS } from '../brand'
import { BrandTokensSchema, TemplateDefinitionSchema } from '../schema'
import { buildPrecisionWorkshopDefinition, PRECISION_WORKSHOP_SLUG } from '../templates/precision-workshop'
import { DEFINITION_FORMAT, type BrandTokens, type TemplateDefinition } from '../types'
import { PromoError, type PromoContext } from './context'

/**
 * Templates and the brand kit. Built-in templates and the studio kit come from
 * code (lib/promo) and are inserted on first use, so their definitions stay
 * type-checked. Seeding uses the service role because only admins may write
 * these tables; it runs after the route has authorized an instructor, and the
 * rows it writes come from code, never from the request.
 */

const BUILT_IN_TEMPLATES = [
  {
    slug: PRECISION_WORKSHOP_SLUG,
    description: 'Hero photo, photo strip, title stack, date circles, feature pills and the bio block.',
    build: buildPrecisionWorkshopDefinition,
  },
]

let seeding: Promise<void> | null = null

async function seedBuiltIns(): Promise<void> {
  const admin = createAdminClient()
  const { data: existing, error } = await admin
    .from('promo_templates')
    .select('slug')
    .in(
      'slug',
      BUILT_IN_TEMPLATES.map((template) => template.slug)
    )
  if (error) throw error
  const have = new Set((existing ?? []).map((row) => row.slug as string))

  for (const template of BUILT_IN_TEMPLATES) {
    if (have.has(template.slug)) continue
    const definition = template.build()
    const { data: row, error: templateError } = await admin
      .from('promo_templates')
      .insert({ slug: template.slug, name: definition.name, description: template.description })
      .select('id')
      .single()
    if (templateError) {
      // Another request seeded it first.
      if (templateError.code === '23505') continue
      throw templateError
    }
    const { data: version, error: versionError } = await admin
      .from('promo_template_versions')
      .insert({
        template_id: row.id,
        version: 1,
        definition,
        definition_format: DEFINITION_FORMAT,
        notes: 'Built-in template',
        published_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (versionError) throw versionError
    const { error: linkError } = await admin
      .from('promo_templates')
      .update({ current_version_id: version.id })
      .eq('id', row.id)
    if (linkError) throw linkError
  }

  const { data: kit, error: kitError } = await admin
    .from('promo_brand_kits')
    .select('id')
    .is('owner_id', null)
    .maybeSingle()
  if (kitError) throw kitError
  if (!kit) {
    const { error: insertError } = await admin
      .from('promo_brand_kits')
      .insert({ owner_id: null, name: 'Studio brand', tokens: DEFAULT_BRAND_TOKENS })
    if (insertError && insertError.code !== '23505') throw insertError
  }
}

/** Seeds once per server process; a failure retries on the next request. */
export async function ensurePromoCatalog(): Promise<void> {
  seeding ??= seedBuiltIns().catch((error) => {
    seeding = null
    throw error
  })
  return seeding
}

export interface TemplateVersion {
  id: string
  templateId: string
  version: number
  definition: TemplateDefinition
  publishedAt: string | null
}

export function parseDefinition(raw: unknown, context: string): TemplateDefinition {
  const parsed = TemplateDefinitionSchema.safeParse(raw)
  if (!parsed.success) {
    console.error(`[promo] ${context}: stored template definition is invalid`, parsed.error.issues.slice(0, 5))
    throw new PromoError('This template can’t be read. Ask an admin to republish it.', 500, 'bad_template')
  }
  return parsed.data as TemplateDefinition
}

export async function loadTemplateVersion(
  supabase: PromoContext['supabase'],
  versionId: string
): Promise<TemplateVersion> {
  const { data, error } = await supabase
    .from('promo_template_versions')
    .select('id, template_id, version, definition, published_at')
    .eq('id', versionId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new PromoError('That template version isn’t available.', 404, 'no_template')
  return {
    id: data.id,
    templateId: data.template_id,
    version: data.version,
    definition: parseDefinition(data.definition, `version ${versionId}`),
    publishedAt: data.published_at,
  }
}

export interface ActiveTemplate {
  id: string
  slug: string
  name: string
  description: string | null
  version: TemplateVersion
}

/** Active templates with their current published version. */
export async function listActiveTemplates(supabase: PromoContext['supabase']): Promise<ActiveTemplate[]> {
  await ensurePromoCatalog()
  const { data, error } = await supabase
    .from('promo_templates')
    .select('id, slug, name, description, current_version_id')
    .eq('status', 'active')
    .not('current_version_id', 'is', null)
    .order('created_at', { ascending: true })
  if (error) throw error
  const templates: ActiveTemplate[] = []
  for (const row of data ?? []) {
    templates.push({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      version: await loadTemplateVersion(supabase, row.current_version_id as string),
    })
  }
  return templates
}

export async function activeTemplateBySlug(
  supabase: PromoContext['supabase'],
  slug: string = PRECISION_WORKSHOP_SLUG
): Promise<ActiveTemplate> {
  const templates = await listActiveTemplates(supabase)
  const template = templates.find((item) => item.slug === slug) ?? templates[0]
  if (!template) throw new PromoError('No promo templates are published yet.', 404, 'no_template')
  return template
}

/** The studio brand kit. Designs copy it at creation, so later edits never change them. */
export async function loadStudioBrand(supabase: PromoContext['supabase']): Promise<BrandTokens> {
  await ensurePromoCatalog()
  const { data, error } = await supabase
    .from('promo_brand_kits')
    .select('tokens')
    .is('owner_id', null)
    .maybeSingle()
  if (error) throw error
  const parsed = BrandTokensSchema.safeParse(data?.tokens)
  return completeBrandTokens(parsed.success ? (parsed.data as BrandTokens) : null)
}
