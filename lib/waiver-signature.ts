import { createAdminClient } from '@/lib/supabase/admin'

export const WAIVER_SIGNATURE_BUCKET = 'waiver-signatures'

const SIGNED_URL_TTL_SECONDS = 10 * 60

// waivers.signature_image_url holds an object path in the private
// waiver-signatures bucket. Call this only after the caller's access to the
// waiver has been checked: the service-role client bypasses storage RLS.
export async function signedSignatureUrl(path: string | null): Promise<string | null> {
  if (!path) return null

  try {
    const { data, error } = await createAdminClient()
      .storage
      .from(WAIVER_SIGNATURE_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
    if (error) throw error
    return data.signedUrl
  } catch (error) {
    console.error('Error creating waiver signature URL:', error)
    return null
  }
}
