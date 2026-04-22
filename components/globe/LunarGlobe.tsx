'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { LOCATIONS } from './locations'
import type { LunarLocation } from './types'

// Design tokens (--luna-fg, --luna-fg-4, --luna-cyan, --luna-base)
const COLOR_FROST    = 0xe8edf5
const COLOR_FROST_4  = 0x4a5368
const COLOR_CYAN     = 0x7dd3fc
const COLOR_BASE     = 0x050c1a

// Globe constants
const SPHERE_RADIUS     = 1
const SPHERE_SEGS       = 64
const MARKER_W          = 0.065
const DOT_SURFACE_GAP   = 1.003
const AUTO_ROT_SPEED    = 0.0838 // radians/second — one full rotation ≈ 75 s
const ROT_EASE_K        = 6      // exponential ease factor for stop/resume
const MARKER_HIT_RADIUS = 0.07   // invisible hit sphere — larger than visible marker for easy tapping
const DRAG_THRESHOLD    = 3      // px moved before a mousedown becomes a drag
const DRAG_SENSITIVITY  = 0.005  // radians per pixel
const RESUME_DELAY      = 2000   // ms after drag release before auto-rotation resumes
const CAMERA_FOV        = 45
const CAMERA_MARGIN     = 0.85
const AMBIENT_INTENSITY = 0.35
const SUN_INTENSITY     = 0.8

const SUN_DIR = new THREE.Vector3(5, 3, 4).normalize()

// Lucide MapPin icon rendered to canvas via Path2D — exact paths from lucide-react.
// viewBox is 0 0 24 24; we scale up to 128×128 for crisp rendering.
function makeMarkerTexture(): THREE.CanvasTexture {
  const size = 128
  const scale = size / 24
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, size, size)
  ctx.scale(scale, scale)

  // Pin body
  ctx.fillStyle = '#ffffff'
  ctx.fill(new Path2D(
    'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0',
  ))

  // Center circle cutout
  ctx.fillStyle = 'rgba(5, 12, 26, 0.5)'
  ctx.beginPath()
  ctx.arc(12, 10, 3, 0, Math.PI * 2)
  ctx.fill()

  return new THREE.CanvasTexture(canvas)
}

// Returns a quaternion that places the plane flat on the sphere surface with
// the pin head pointing roughly north (world +Y projected onto the tangent plane).
function surfaceOrientation(pos: THREE.Vector3): THREE.Quaternion {
  const normal = pos.clone().normalize()
  let right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), normal)
  if (right.lengthSq() < 0.001) right.set(1, 0, 0) // pole fallback
  right.normalize()
  const up = new THREE.Vector3().crossVectors(normal, right)
  return new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(right, up, normal),
  )
}

function cameraDist(aspect: number): number {
  const halfFov = (CAMERA_FOV / 2) * (Math.PI / 180)
  const halfAngle = aspect >= 1 ? halfFov : Math.atan(Math.tan(halfFov) * aspect)
  return SPHERE_RADIUS / (Math.sin(halfAngle) * CAMERA_MARGIN)
}

function latLonToVec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi = (lat * Math.PI) / 180
  const lam = (lon * Math.PI) / 180
  return new THREE.Vector3(
    r * Math.cos(phi) * Math.cos(lam),
    r * Math.sin(phi),
    r * Math.cos(phi) * Math.sin(lam),
  )
}

interface LunarGlobeProps {
  onLocationSelect?: (location: LunarLocation | null) => void
}

export function LunarGlobe({ onLocationSelect }: LunarGlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const onSelectRef = useRef(onLocationSelect)
  useEffect(() => { onSelectRef.current = onLocationSelect })

  useEffect(() => {
    const mount = mountRef.current as HTMLDivElement
    const tooltip = tooltipRef.current as HTMLDivElement
    if (!mount) return

    const scene = new THREE.Scene()

    const aspect0 = mount.clientWidth / mount.clientHeight
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, aspect0, 0.1, 100)
    camera.position.set(cameraDist(aspect0), 0, 0)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setClearColor(COLOR_BASE, 0)
    mount.appendChild(renderer.domElement)

    const ambient = new THREE.AmbientLight(0xffffff, AMBIENT_INTENSITY)
    scene.add(ambient)
    const sun = new THREE.DirectionalLight(0xfff8e8, SUN_INTENSITY)
    sun.position.copy(SUN_DIR)
    scene.add(sun)

    const moonGroup = new THREE.Group()
    scene.add(moonGroup)

    const sphereGeo = new THREE.SphereGeometry(SPHERE_RADIUS, SPHERE_SEGS, SPHERE_SEGS)
    const textureLoader = new THREE.TextureLoader()
    const moonTex = textureLoader.load('/textures/lunar_surface.jpg')
    const sphereMat = new THREE.MeshPhongMaterial({
      map: moonTex,
      specular: new THREE.Color(0x060c18),
      shininess: 4,
    })
    moonGroup.add(new THREE.Mesh(sphereGeo, sphereMat))

    // ── Location pins ────────────────────────────────────────────────────────
    const markerTex = makeMarkerTexture()
    const markerGeo = new THREE.PlaneGeometry(MARKER_W, MARKER_W)
    const hitGeo    = new THREE.SphereGeometry(MARKER_HIT_RADIUS, 8, 8)
    const hitMat    = new THREE.MeshBasicMaterial({ visible: false })
    const dotMeshes: THREE.Mesh[] = []
    const dotMats:   THREE.MeshBasicMaterial[] = []
    const hitMeshes: THREE.Mesh[] = []

    for (let i = 0; i < LOCATIONS.length; i++) {
      const loc = LOCATIONS[i]!
      const pos = latLonToVec3(loc.lat, loc.lon, DOT_SURFACE_GAP)

      const mat = new THREE.MeshBasicMaterial({
        map: markerTex,
        color: COLOR_FROST,
        transparent: true,
        alphaTest: 0.05,
        depthTest: false,
        depthWrite: false,
      })
      const mesh = new THREE.Mesh(markerGeo, mat)
      mesh.position.copy(pos)
      mesh.quaternion.copy(surfaceOrientation(pos))
      mesh.userData.dotIdx = i
      moonGroup.add(mesh)
      dotMeshes.push(mesh)
      dotMats.push(mat)

      const hit = new THREE.Mesh(hitGeo, hitMat)
      hit.position.copy(pos)
      hit.userData.dotIdx = i
      moonGroup.add(hit)
      hitMeshes.push(hit)
    }

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    let hoveredIdx = -1
    let selectedIdx = -1
    let pulseT = 0

    // Auto-rotation state — smooth ease via rotSpeedFactor (0..1)
    let rotSpeedFactor = 1     // current multiplier (lerped each frame)
    let rotSpeedTarget = 1     // 1 = rotating, 0 = stopped
    let resumeTimer: ReturnType<typeof setTimeout> | null = null

    // Drag state
    let pointerDown = false
    let isDragging   = false
    let dragStartX   = 0
    let dragLastX    = 0

    function scheduleResume() {
      if (resumeTimer) clearTimeout(resumeTimer)
      resumeTimer = setTimeout(() => {
        if (selectedIdx === -1) rotSpeedTarget = 1
      }, RESUME_DELAY)
    }

    function stopRotation(clearPending = true) {
      rotSpeedTarget = 0
      if (clearPending && resumeTimer) { clearTimeout(resumeTimer); resumeTimer = null }
    }

    const worldPos = new THREE.Vector3()

    function refreshDots() {
      for (let i = 0; i < dotMeshes.length; i++) {
        const mesh = dotMeshes[i]!
        const mat = dotMats[i]!

        if (i === selectedIdx) {
          mesh.scale.setScalar(1.2 + 0.2 * Math.sin(pulseT * (Math.PI * 2 / 1.5)))
          mat.color.setHex(COLOR_CYAN)
          mat.opacity = 1
          continue
        }

        if (i === hoveredIdx) {
          mesh.scale.setScalar(1.3)
          mat.color.setHex(COLOR_CYAN)
          mat.opacity = 1
          continue
        }

        mesh.scale.setScalar(1.0)
        mesh.getWorldPosition(worldPos)

        // depthTest is off; manually hide back-hemisphere markers
        if (worldPos.x <= 0) {
          mat.opacity = 0
          continue
        }

        const lit = worldPos.dot(SUN_DIR) > 0
        if (lit) {
          mat.color.setHex(COLOR_FROST)
          mat.opacity = 1
        } else {
          mat.color.setHex(COLOR_FROST_4)
          mat.opacity = 0.35
        }
      }
    }

    function coordsToNdc(clientX: number, clientY: number) {
      const rect = mount.getBoundingClientRect()
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1
    }

    function handleMouseMove(e: MouseEvent) {
      coordsToNdc(e.clientX, e.clientY)
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(hitMeshes)
      const prev = hoveredIdx
      if (hits.length > 0) {
        hits[0]!.object.getWorldPosition(worldPos)
        hoveredIdx = worldPos.x > 0 ? (hits[0]!.object.userData.dotIdx as number) : -1
      } else {
        hoveredIdx = -1
      }
      mount.style.cursor = hoveredIdx >= 0 ? 'pointer' : 'default'

      if (tooltip) {
        if (hoveredIdx >= 0) {
          const rect = mount.getBoundingClientRect()
          tooltip.style.left = `${e.clientX - rect.left + 14}px`
          tooltip.style.top = `${e.clientY - rect.top - 36}px`
          tooltip.textContent = LOCATIONS[hoveredIdx]!.name
          tooltip.style.display = 'block'
        } else {
          tooltip.style.display = 'none'
        }
      }

      if (prev !== hoveredIdx) refreshDots()
    }

    // Resolve a tap/click — select a dot or deselect if tapping empty space
    function handleTap(clientX: number, clientY: number) {
      coordsToNdc(clientX, clientY)
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(hitMeshes)
      if (hits.length > 0) {
        hits[0]!.object.getWorldPosition(worldPos)
        if (worldPos.x <= 0) return  // dot is on far side of globe
        const idx = hits[0]!.object.userData.dotIdx as number
        selectedIdx = idx
        stopRotation()
        onSelectRef.current?.(LOCATIONS[idx] ?? null)
      } else if (selectedIdx !== -1) {
        selectedIdx = -1
        onSelectRef.current?.(null)
        scheduleResume()
      }
    }

    // ── Mouse drag-to-rotate ──────────────────────────────────────────────────
    function handleMouseDown(e: MouseEvent) {
      pointerDown = true
      isDragging   = false
      dragStartX   = e.clientX
      dragLastX    = e.clientX
    }

    function applyDragMove(clientX: number) {
      if (!pointerDown) return
      if (!isDragging && Math.abs(clientX - dragStartX) > DRAG_THRESHOLD) {
        isDragging = true
        stopRotation()
      }
      if (isDragging) {
        moonGroup.rotation.y += (clientX - dragLastX) * DRAG_SENSITIVITY
        dragLastX = clientX
      }
    }

    function handleMouseMoveGlobal(e: MouseEvent) { applyDragMove(e.clientX) }

    function handleMouseUpGlobal(e: MouseEvent) {
      if (!pointerDown) return
      pointerDown = false
      if (isDragging) {
        isDragging = false
        scheduleResume()
      } else {
        handleTap(e.clientX, e.clientY)
      }
    }

    // ── Touch drag-to-rotate ──────────────────────────────────────────────────
    function handleTouchStart(e: TouchEvent) {
      const t = e.touches[0]
      if (!t) return
      pointerDown = true
      isDragging   = false
      dragStartX   = t.clientX
      dragLastX    = t.clientX
    }

    function handleTouchMoveGlobal(e: TouchEvent) {
      const t = e.touches[0]
      if (t) applyDragMove(t.clientX)
    }

    function handleTouchEnd(e: TouchEvent) {
      if (!pointerDown) return
      pointerDown = false
      if (isDragging) {
        isDragging = false
        scheduleResume()
      } else {
        const touch = e.changedTouches[0]
        if (touch) handleTap(touch.clientX, touch.clientY)
      }
    }

    mount.addEventListener('mousemove', handleMouseMove)
    mount.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMoveGlobal)
    window.addEventListener('mouseup',   handleMouseUpGlobal)
    mount.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMoveGlobal, { passive: true })
    mount.addEventListener('touchend', handleTouchEnd)

    function handleResize() {
      const w = mount.clientWidth
      const h = mount.clientHeight
      const aspect = w / h
      camera.aspect = aspect
      camera.position.setX(cameraDist(aspect))
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(mount)

    let raf: number
    const clock = new THREE.Clock()

    function animate() {
      raf = requestAnimationFrame(animate)
      const dt = clock.getDelta()
      pulseT += dt

      // Ease rotation speed toward target (exponential approach)
      rotSpeedFactor += (rotSpeedTarget - rotSpeedFactor) * (1 - Math.exp(-ROT_EASE_K * dt))
      if (!isDragging) moonGroup.rotation.y += AUTO_ROT_SPEED * rotSpeedFactor * dt

      refreshDots()
      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(raf)
      if (resumeTimer) clearTimeout(resumeTimer)
      resizeObserver.disconnect()
      mount.removeEventListener('mousemove', handleMouseMove)
      mount.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMoveGlobal)
      window.removeEventListener('mouseup',   handleMouseUpGlobal)
      mount.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMoveGlobal)
      mount.removeEventListener('touchend', handleTouchEnd)
      renderer.dispose()
      sphereGeo.dispose()
      sphereMat.dispose()
      moonTex.dispose()
      markerTex.dispose()
      markerGeo.dispose()
      hitGeo.dispose()
      hitMat.dispose()
      for (const m of dotMats) m.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      <div
        ref={tooltipRef}
        style={{
          position: 'absolute',
          display: 'none',
          pointerEvents: 'none',
          background: 'rgba(5, 12, 26, 0.88)',
          border: '1px solid rgba(125, 211, 252, 0.35)',
          color: '#e8edf5',
          fontFamily: 'var(--font-geist-sans, sans-serif)',
          fontSize: '11px',
          letterSpacing: '0.06em',
          padding: '4px 8px',
          borderRadius: '3px',
          whiteSpace: 'nowrap',
          zIndex: 10,
        }}
      />
    </div>
  )
}
