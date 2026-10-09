'use client'

/**
 * Stand-in photos for the dev preview: a studio backdrop and a simple figure
 * in the poses Template #1 expects. Drawn on canvases, so the preview needs
 * no network or real photos.
 */

export interface SamplePhoto {
  id: string
  label: string
  canvas: HTMLCanvasElement
  width: number
  height: number
}

type Pose = 'stand' | 'kick' | 'arms_up' | 'headshot' | 'heels'

function backdrop(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = ctx.createRadialGradient(width * 0.5, height * 0.35, width * 0.1, width * 0.5, height * 0.5, height * 0.8)
  gradient.addColorStop(0, '#e9dfd2')
  gradient.addColorStop(1, '#c9b9a5')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = 'rgba(80, 60, 40, 0.08)'
  ctx.fillRect(0, height * 0.82, width, height * 0.18)
}

function limb(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, width: number, color: string) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

function figure(ctx: CanvasRenderingContext2D, w: number, h: number, pose: Pose) {
  const tights = '#3a2620'
  const top = '#121212'
  const skin = '#e8c3a8'
  const hair = '#a2401f'
  const cx = w * 0.5
  if (pose === 'headshot') {
    ctx.fillStyle = hair
    ctx.beginPath()
    ctx.ellipse(cx, h * 0.42, w * 0.3, h * 0.34, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = skin
    ctx.beginPath()
    ctx.ellipse(cx, h * 0.42, w * 0.17, h * 0.22, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = top
    ctx.fillRect(w * 0.18, h * 0.72, w * 0.64, h * 0.3)
    return
  }
  if (pose === 'heels') {
    limb(ctx, w * 0.2, 0, w * 0.55, h * 0.75, w * 0.12, tights)
    limb(ctx, w * 0.75, 0, w * 0.45, h * 0.8, w * 0.12, tights)
    ctx.fillStyle = '#0d0d0d'
    ctx.fillRect(w * 0.5, h * 0.74, w * 0.22, h * 0.05)
    ctx.fillRect(w * 0.36, h * 0.79, w * 0.22, h * 0.05)
    return
  }
  const headY = h * 0.14
  const headR = w * 0.07
  const shoulderY = h * 0.25
  const hipY = h * 0.5
  const footY = h * 0.92
  // legs
  if (pose === 'kick') {
    limb(ctx, cx, hipY, cx - w * 0.04, footY, w * 0.07, tights)
    limb(ctx, cx, hipY, cx + w * 0.38, h * 0.12, w * 0.07, tights)
  } else {
    limb(ctx, cx - w * 0.03, hipY, cx - w * 0.12, footY, w * 0.07, tights)
    limb(ctx, cx + w * 0.03, hipY, cx + w * 0.1, footY, w * 0.07, tights)
  }
  // torso
  ctx.fillStyle = top
  ctx.beginPath()
  ctx.moveTo(cx - w * 0.11, shoulderY)
  ctx.lineTo(cx + w * 0.11, shoulderY)
  ctx.lineTo(cx + w * 0.09, hipY + h * 0.03)
  ctx.lineTo(cx - w * 0.09, hipY + h * 0.03)
  ctx.closePath()
  ctx.fill()
  // arms
  if (pose === 'arms_up') {
    limb(ctx, cx - w * 0.1, shoulderY, cx - w * 0.3, h * 0.04, w * 0.04, top)
    limb(ctx, cx + w * 0.1, shoulderY, cx + w * 0.3, h * 0.04, w * 0.04, top)
  } else {
    limb(ctx, cx - w * 0.1, shoulderY, cx - w * 0.2, hipY - h * 0.02, w * 0.04, top)
    limb(ctx, cx + w * 0.1, shoulderY, cx + w * 0.16, hipY + h * 0.02, w * 0.04, top)
  }
  // head and hair
  ctx.fillStyle = hair
  ctx.beginPath()
  ctx.ellipse(cx, headY + headR * 0.3, headR * 1.6, headR * 1.9, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = skin
  ctx.beginPath()
  ctx.arc(cx, headY, headR, 0, Math.PI * 2)
  ctx.fill()
}

function make(id: string, label: string, width: number, height: number, pose: Pose): SamplePhoto {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx) {
    backdrop(ctx, width, height)
    figure(ctx, width, height, pose)
  }
  return { id, label, canvas, width, height }
}

export function createSamplePhotos(): SamplePhoto[] {
  return [
    make('00000000-0000-4000-8000-000000000001', 'Full body', 1200, 1600, 'stand'),
    make('00000000-0000-4000-8000-000000000002', 'Kick', 1200, 1600, 'kick'),
    make('00000000-0000-4000-8000-000000000003', 'Headshot', 1200, 1500, 'headshot'),
    make('00000000-0000-4000-8000-000000000004', 'Arms up', 1200, 1600, 'arms_up'),
    make('00000000-0000-4000-8000-000000000005', 'Heels', 1400, 1200, 'heels'),
  ]
}
