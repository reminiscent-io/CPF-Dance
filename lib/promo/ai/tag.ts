import { z } from 'zod'
import { BACKGROUND_TYPES, SHOT_TYPES, type AssetPose, type AssetTags } from '../types'
import { mergePoseTags } from '../tags'

export const TagResultSchema = z.object({
  photos: z.array(
    z.object({
      id: z.string(),
      shot_types: z.array(z.enum(SHOT_TYPES)),
      background: z.enum(BACKGROUND_TYPES),
      mood: z.string(),
      description: z.string(),
      subject: z
        .object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() })
        .nullable(),
    })
  ),
})

export type TagResult = z.infer<typeof TagResultSchema>

export const TAG_INSTRUCTIONS = `You tag a professional dance instructor's own photos so a design tool can place them in promo templates.

For each photo, return:
- shot_types: every type that applies. full_body (head to feet in frame), three_quarter (head to knees or thighs), headshot (head and shoulders), kick (a leg raised above hip height), arms_up (both arms raised above the head), floor (sitting or lying on the floor), detail (a body part or shoes without the face), group (more than one person).
- background: plain_light (light seamless or plain wall), plain_dark, studio (mirrors, barres, studio fixtures), stage, outdoor, busy (cluttered or high-detail).
- mood: two to four words about the energy of the shot, for example "poised and editorial".
- description: one short line about pose and outfit. Never guess names, age or identity.
- subject: the box around the person as fractions of the image (x, y, w, h from the top-left), or null if no person.

Use each photo's id exactly as given.`

/** Merges a model result into stored tags and pose. Pose-derived anchors win over vision boxes. */
export function applyTagResult(
  current: { tags: AssetTags; pose: AssetPose | null },
  result: TagResult['photos'][number]
): { tags: AssetTags; pose: AssetPose | null } {
  const clamp = (value: number) => Math.min(1, Math.max(0, value))
  let pose = current.pose
  if (!pose && result.subject) {
    pose = {
      source: 'vision',
      subject: {
        x: clamp(result.subject.x),
        y: clamp(result.subject.y),
        w: clamp(result.subject.w),
        h: clamp(result.subject.h),
      },
    }
  }
  const tags: AssetTags = mergePoseTags(
    {
      ...current.tags,
      shotTypes: result.shot_types,
      background: result.background,
      mood: result.mood.slice(0, 80),
      description: result.description.slice(0, 240),
    },
    current.pose
  )
  return { tags, pose }
}
