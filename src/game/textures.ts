import * as THREE from 'three'
import type { GroundKind } from '../data/tracks'

// Prozedurale Texturen zur Laufzeit (Canvas) – kein externes Asset nötig.

export function makeGroundTexture(kind: GroundKind): THREE.Texture {
  switch (kind) {
    case 'candy':
      return makeCandyTexture()
    case 'rock':
      return makeRockTexture()
    case 'city':
      return makeCityTexture()
    case 'ice':
      return makeIceTexture()
    default:
      return makeGrassTexture()
  }
}

// Eis-Boden: helles Blauweiß mit Rissen und Glanz.
export function makeIceTexture(): THREE.Texture {
  const [c, ctx] = canvas(512)
  const g = ctx.createLinearGradient(0, 0, 512, 512)
  g.addColorStop(0, '#dff1ff')
  g.addColorStop(1, '#a9d6f5')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 512, 512)
  // glänzende Flecken
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = 0.35
    ctx.beginPath()
    ctx.arc(Math.random() * 512, Math.random() * 512, 4 + Math.random() * 16, 0, Math.PI * 2)
    ctx.fill()
  }
  // Risse
  ctx.strokeStyle = '#7fb6e0'
  ctx.globalAlpha = 0.5
  ctx.lineWidth = 1.5
  for (let i = 0; i < 26; i++) {
    ctx.beginPath()
    let x = Math.random() * 512
    let y = Math.random() * 512
    ctx.moveTo(x, y)
    for (let s = 0; s < 4; s++) {
      x += (Math.random() - 0.5) * 90
      y += (Math.random() - 0.5) * 90
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(45, 45)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  return [c, c.getContext('2d')!]
}

// Gras mit weichen Flecken für einen lebendigen, weniger flachen Boden.
export function makeGrassTexture(): THREE.Texture {
  const [c, ctx] = canvas(512)
  ctx.fillStyle = '#2f8f4e'
  ctx.fillRect(0, 0, 512, 512)
  const shades = ['#2a8147', '#359b56', '#287a42', '#3aa75e', '#256e3b']
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = shades[i % shades.length]
    const x = Math.random() * 512
    const y = Math.random() * 512
    const r = 2 + Math.random() * 7
    ctx.globalAlpha = 0.5
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(60, 60)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// Bonbon-Boden: Pastell mit Punkten.
export function makeCandyTexture(): THREE.Texture {
  const [c, ctx] = canvas(512)
  ctx.fillStyle = '#ffc8e6'
  ctx.fillRect(0, 0, 512, 512)
  const cols = ['#ff8fc4', '#b98cff', '#8fd0ff', '#fff09a', '#a0ffc0']
  for (let i = 0; i < 220; i++) {
    ctx.fillStyle = cols[i % cols.length]
    ctx.globalAlpha = 0.6
    ctx.beginPath()
    ctx.arc(Math.random() * 512, Math.random() * 512, 6 + Math.random() * 14, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(50, 50)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// Vulkan-Boden: dunkles Gestein mit glühenden Rissen.
export function makeRockTexture(): THREE.Texture {
  const [c, ctx] = canvas(512)
  ctx.fillStyle = '#3a2e2a'
  ctx.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 2500; i++) {
    const v = 30 + Math.floor(Math.random() * 40)
    ctx.fillStyle = `rgb(${v},${v - 6},${v - 10})`
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3)
  }
  ctx.strokeStyle = '#ff6a1f'
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.8
  for (let i = 0; i < 30; i++) {
    ctx.beginPath()
    let x = Math.random() * 512
    let y = Math.random() * 512
    ctx.moveTo(x, y)
    for (let s = 0; s < 5; s++) {
      x += (Math.random() - 0.5) * 80
      y += (Math.random() - 0.5) * 80
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(40, 40)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// City-Boden: dunkler Asphalt mit Neon-Gitter.
export function makeCityTexture(): THREE.Texture {
  const [c, ctx] = canvas(512)
  ctx.fillStyle = '#15182e'
  ctx.fillRect(0, 0, 512, 512)
  ctx.strokeStyle = '#00e5ff'
  ctx.globalAlpha = 0.25
  ctx.lineWidth = 2
  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke()
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(30, 30)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// Asphalt mit feinem Korn + Glanzpunkten -> realistischere Fahrbahn.
export function makeRoadTexture(): THREE.Texture {
  const [c, ctx] = canvas(256)
  ctx.fillStyle = '#3b3f52'
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 6000; i++) {
    const v = 40 + Math.floor(Math.random() * 50)
    ctx.fillStyle = `rgb(${v},${v},${v + 8})`
    ctx.globalAlpha = 0.4
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5)
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(2, 40)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// Rot/weiße Randsteine (klassische Rennstrecke).
export function makeKerbTexture(): THREE.Texture {
  const [c, ctx] = canvas(64)
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#e23b2e' : '#f5f5f5'
    ctx.fillRect(0, (i * 64) / 8, 64, 64 / 8)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(1, 60)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
