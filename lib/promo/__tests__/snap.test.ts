import { describe, expect, it } from 'vitest'
import { snapBox, snapTargets } from '../layout/snap'

const canvas = { width: 1080, height: 1920, safeArea: { top: 250, bottom: 250 } }

describe('snapBox', () => {
  it('centres a layer on the canvas when it comes close', () => {
    const targets = snapTargets(canvas, [])
    const result = snapBox({ x: 437, y: 900, width: 200, height: 40 }, targets, 6)
    expect(result.x).toBe(440)
    expect(result.guides).toContainEqual({ orientation: 'vertical', position: 540 })
  })

  it('locks to the story safe-area line', () => {
    const targets = snapTargets(canvas, [])
    const result = snapBox({ x: 100, y: 1628, width: 300, height: 40 }, targets, 6)
    expect(result.y + 40).toBe(1670)
  })

  it('aligns with another layer and leaves distant layers alone', () => {
    const targets = snapTargets(canvas, [{ x: 110, y: 700, width: 860, height: 100 }])
    expect(snapBox({ x: 113, y: 1000, width: 300, height: 50 }, targets, 6).x).toBe(110)
    const far = snapBox({ x: 160, y: 1000, width: 300, height: 50 }, targets, 6)
    expect(far.x).toBe(160)
    expect(far.guides.filter((g) => g.orientation === 'vertical')).toHaveLength(0)
  })
})
