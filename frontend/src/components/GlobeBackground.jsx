import { useEffect, useRef } from 'react'

// [lat, lon] in degrees for 32 world hubs (NYC, LA, Mexico City, São Paulo, Lima,
// Bogotá, London, Paris, Berlin, Rome, Moscow, Stockholm, Cairo, Lagos, Nairobi,
// Johannesburg, Abuja, Dubai, Mumbai, Delhi, Chennai, Singapore, Jakarta, Hong Kong,
// Shanghai, Beijing, Seoul, Tokyo, Sydney, Auckland, Toronto, Buenos Aires).
const HUBS_DEG = [
  [40.7, -74.0], [34.0, -118.2], [19.4, -99.1], [-23.5, -46.6],
  [-12.0, -77.0], [4.7, -74.1], [51.5, -0.1], [48.9, 2.3],
  [52.5, 13.4], [41.9, 12.5], [55.8, 37.6], [59.3, 18.1],
  [30.0, 31.2], [6.5, 3.4], [-1.3, 36.8], [-26.2, 28.0],
  [9.1, 7.4], [25.2, 55.3], [19.1, 72.9], [28.6, 77.2],
  [13.1, 80.3], [1.35, 103.8], [-6.2, 106.8], [22.3, 114.2],
  [31.2, 121.5], [39.9, 116.4], [37.6, 127.0], [35.7, 139.7],
  [-33.9, 151.2], [-36.8, 174.8], [43.7, -79.4], [-34.6, -58.4],
]

function toVec([latDeg, lonDeg]) {
  const lat = (latDeg * Math.PI) / 180
  const lon = (lonDeg * Math.PI) / 180
  return [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)]
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function slerp(a, b, t) {
  const cosOmega = Math.max(-1, Math.min(1, dot(a, b)))
  const omega = Math.acos(cosOmega)
  const sinOmega = Math.sin(omega)
  if (sinOmega < 1e-6) return a
  const wa = Math.sin((1 - t) * omega) / sinOmega
  const wb = Math.sin(t * omega) / sinOmega
  return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb]
}

function fibonacciDust(n) {
  const pts = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2
    const radius = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = golden * i
    pts.push([Math.cos(theta) * radius, y, Math.sin(theta) * radius])
  }
  return pts
}

function buildLinks(hubs) {
  const seen = new Set()
  const links = []
  hubs.forEach((h, i) => {
    if (i % 2 !== 0) return
    const distances = hubs
      .map((other, j) => ({ j, d: dot(h, other) }))
      .filter(x => x.j !== i)
      .sort((a, b) => a.d - b.d) // ascending dot === descending distance
    const farthestSix = distances.slice(0, 6)
    const pick = farthestSix[Math.floor(Math.random() * farthestSix.length)]
    const key = [i, pick.j].sort((a, b) => a - b).join('-')
    if (seen.has(key)) return
    seen.add(key)
    links.push({ a: i, b: pick.j, speed: 0.055 + Math.random() * 0.1, phase: Math.random(), hue: links.length % 4 })
  })
  return links
}

export default function GlobeBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const hubs = HUBS_DEG.map(toVec)
    const links = buildLinks(hubs)
    const dust = fibonacciDust(620)

    let isLight = document.documentElement.classList.contains('cb-light')
    const observer = new MutationObserver(() => {
      isLight = document.documentElement.classList.contains('cb-light')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    let w = 0, h = 0, R = 0, cx = 0, cy = 0
    function resize() {
      w = canvas.clientWidth
      h = canvas.clientHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      R = Math.min(w * 0.46, h * 0.72)
      cx = w * 0.5
      cy = h * 0.5
    }
    resize()
    window.addEventListener('resize', resize)

    function project(v, rot) {
      const tilt = 0.36
      const ca = Math.cos(rot), sa = Math.sin(rot)
      const x = v[0] * ca + v[2] * sa
      let z = -v[0] * sa + v[2] * ca
      const y0 = v[1]
      const ct = Math.cos(tilt), st = Math.sin(tilt)
      const y = y0 * ct - z * st
      z = y0 * st + z * ct
      return [cx + x * R, cy - y * R, z]
    }

    function strokePath(points, style, width) {
      ctx.beginPath()
      let started = false
      points.forEach(([x, y, z]) => {
        if (z <= 0) { started = false; return }
        if (!started) { ctx.moveTo(x, y); started = true }
        else ctx.lineTo(x, y)
      })
      ctx.strokeStyle = style
      ctx.lineWidth = width
      ctx.stroke()
    }

    let raf = null
    function draw(time) {
      const t = time / 1000
      const rot = t * 0.055
      const light = isLight

      const PRISM = light
        ? ['21,58,138', '17,74,168', '13,44,110', '26,86,190']
        : ['46,86,178', '38,102,206', '30,64,146', '58,116,220']
      const GLOW = light ? '18,64,170' : '34,92,225'
      const C = light
        ? { grid: '25,60,120', dust: '40,72,130', halo: 'rgba(31,102,224,.13)' }
        : { grid: '150,190,255', dust: '150,185,255', halo: 'rgba(75,139,244,.20)' }

      ctx.clearRect(0, 0, w, h)

      // 1. halo
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.35)
      halo.addColorStop(0, C.halo)
      halo.addColorStop(1, 'transparent')
      ctx.fillStyle = halo
      ctx.fillRect(0, 0, w, h)

      // 2. sphere body
      const body = ctx.createRadialGradient(cx - 0.35 * R, cy - 0.4 * R, 0, cx, cy, R)
      if (light) {
        body.addColorStop(0, 'rgba(31,102,224,.07)')
        body.addColorStop(1, 'rgba(31,102,224,.015)')
      } else {
        body.addColorStop(0, 'rgba(90,140,235,.13)')
        body.addColorStop(1, 'rgba(20,32,60,.03)')
      }
      ctx.fillStyle = body
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill()

      // 3. limb
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${C.grid},.31)`
      ctx.lineWidth = 1.4
      ctx.stroke()

      // 4. graticule
      const gratStyle = `rgba(${C.grid},${light ? .22 : .19})`
      ;[-60, 0, 60].forEach(latDeg => {
        const lat = (latDeg * Math.PI) / 180
        const pts = []
        for (let lon = -180; lon <= 180; lon += 3) {
          const lonRad = (lon * Math.PI) / 180
          pts.push(project([Math.cos(lat) * Math.cos(lonRad), Math.sin(lat), Math.cos(lat) * Math.sin(lonRad)], rot))
        }
        strokePath(pts, gratStyle, 1)
      })
      for (let lonBase = 0; lonBase < 360; lonBase += 45) {
        const lonRad = (lonBase * Math.PI) / 180
        const pts = []
        for (let lat = -90; lat <= 90; lat += 3) {
          const latRad = (lat * Math.PI) / 180
          pts.push(project([Math.cos(latRad) * Math.cos(lonRad), Math.sin(latRad), Math.cos(latRad) * Math.sin(lonRad)], rot))
        }
        strokePath(pts, gratStyle, 1)
      }

      // 5. dust
      dust.forEach(v => {
        const [x, y, z] = project(v, rot)
        if (z <= 0) return
        const a = (light ? .26 : .32) * (0.25 + z * 0.75)
        ctx.fillStyle = `rgba(${C.dust},${a})`
        ctx.fillRect(x - 0.65, y - 0.65, 1.3, 1.3)
      })

      // 6 & 7. arcs + travelling pulses
      links.forEach(link => {
        const a = hubs[link.a], b = hubs[link.b]
        const pts = []
        for (let s = 0; s <= 40; s++) {
          const st = s / 40
          const p = slerp(a, b, st)
          const lift = 1 + 0.16 * Math.sin(Math.PI * st)
          pts.push(project([p[0] * lift, p[1] * lift, p[2] * lift], rot))
        }
        const color = PRISM[link.hue]
        strokePath(pts, `rgba(${color},${light ? .2 : .3})`, 3)
        strokePath(pts, `rgba(${color},${light ? .55 : .85})`, 1.1)

        const pt = (t * link.speed + link.phase) % 1
        const pp = slerp(a, b, pt)
        const lift = 1 + 0.16 * Math.sin(Math.PI * pt)
        const [px, py, pz] = project([pp[0] * lift, pp[1] * lift, pp[2] * lift], rot)
        if (pz > 0) {
          const fade = Math.sin(Math.PI * pt)
          ctx.beginPath(); ctx.arc(px, py, 11, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${GLOW},${0.13 * fade})`; ctx.fill()
          ctx.beginPath(); ctx.arc(px, py, 5.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${GLOW},${0.26 * fade})`; ctx.fill()
          ctx.beginPath(); ctx.arc(px, py, 2.6, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${GLOW},${fade})`; ctx.fill()
        }
      })

      // 8. hub nodes
      hubs.forEach((hub, i) => {
        const [x, y, z] = project(hub, rot)
        if (z <= 0) return
        const breathe = 0.55 + 0.45 * Math.sin(t * 1.5 + i)
        const a = (light ? 0.9 : 1) * (0.45 + z * 0.55)

        const bloomR = 16 + breathe * 8
        const bloom = ctx.createRadialGradient(x, y, 0, x, y, bloomR)
        bloom.addColorStop(0, `rgba(${GLOW},${a * .5 * breathe})`)
        bloom.addColorStop(0.6, `rgba(${GLOW},${a * .16 * breathe})`)
        bloom.addColorStop(1, 'transparent')
        ctx.fillStyle = bloom
        ctx.beginPath(); ctx.arc(x, y, bloomR, 0, Math.PI * 2); ctx.fill()

        ctx.save()
        ctx.shadowColor = `rgba(${GLOW},${a})`
        ctx.shadowBlur = 10 + breathe * 8
        ctx.beginPath()
        ctx.arc(x, y, 4.5 + breathe * 1.6, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${GLOW},${a * .55})`
        ctx.lineWidth = 1.4
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(x, y, 2.8, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${GLOW},${a})`
        ctx.fill()
        ctx.restore()

        ctx.beginPath()
        ctx.arc(x, y, 1.1, 0, Math.PI * 2)
        ctx.fillStyle = light
          ? `rgba(120,170,255,${a * (0.45 + 0.4 * breathe)})`
          : `rgba(190,215,255,${a * (0.45 + 0.4 * breathe)})`
        ctx.fill()
      })

      if (!reduceMotion) raf = requestAnimationFrame(draw)
    }

    if (reduceMotion) draw(0)
    else raf = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      observer.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} aria-hidden="true" />
}
