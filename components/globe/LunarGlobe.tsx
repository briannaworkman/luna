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
const AUTO_ROT_SPEED    = 0.084 // radians/second — ~75 s per full rotation
const CAMERA_FOV        = 45
const CAMERA_MARGIN     = 0.85
const AMBIENT_INTENSITY = 0.35
const SUN_INTENSITY     = 0.8

// Auto-rotation easing & drag constants
const ROT_EASE_TC       = 0.25   // seconds — time constant for speed lerp (~0.75 s to 95%)
const DRAG_SENSITIVITY  = 0.004  // radians per pixel
const DRAG_THRESHOLD    = 4      // pixels of movement before it counts as a drag
const DRAG_RESUME_MS    = 2000   // ms pause after drag before auto-rotation resumes

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
  const onSelectRef = useRef(onLocationSelect)
  useEffect(() => { onSelectRef.current = onLocationSelect })

  useEffect(() => {
    const mount = mountRef.current as HTMLDivElement
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
    const dotMeshes: THREE.Mesh[] = []
    const dotMats: THREE.MeshBasicMaterial[] = []

    for (let i = 0; i < LOCATIONS.length; i++) {
      const loc = LOCATIONS[i]!
      const mat = new THREE.MeshBasicMaterial({
        map: markerTex,
        color: COLOR_FROST,
        transparent: true,
        alphaTest: 0.05,
        depthTest: false,
        depthWrite: false,
      })
      const mesh = new THREE.Mesh(markerGeo, mat)
      const pos = latLonToVec3(loc.lat, loc.lon, DOT_SURFACE_GAP)
      mesh.position.copy(pos)
      mesh.quaternion.copy(surfaceOrientation(pos))
      mesh.userData.locationId = loc.id
      mesh.userData.dotIdx = i
      moonGroup.add(mesh)
      dotMeshes.push(mesh)
      dotMats.push(mat)
    }

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    let hoveredIdx = -1
    let selectedIdx = -1
    let pulseT = 0

    // ── Auto-rotation state ───────────────────────────────────────────────────
    // rotSpeedCurrent lerps toward rotSpeedTarget each frame.
    // rotSpeedTarget = AUTO_ROT_SPEED when idle, 0 when selected or dragging.
    let rotSpeedCurrent = AUTO_ROT_SPEED
    let rotSpeedTarget = AUTO_ROT_SPEED
    let dragResumeTimer: ReturnType<typeof setTimeout> | null = null

    // ── Drag state ────────────────────────────────────────────────────────────
    let isDragging = false
    let lastDragX = 0
    let pointerDownX = 0
    let pointerDownY = 0
    let dragMoved = false

    function clearResumeTimer() {
      if (dragResumeTimer !== null) {
        clearTimeout(dragResumeTimer)
        dragResumeTimer = null
      }
    }

    function scheduleResume() {
      clearResumeTimer()
      dragResumeTimer = setTimeout(() => {
        dragResumeTimer = null
        rotSpeedTarget = AUTO_ROT_SPEED
      }, DRAG_RESUME_MS)
    }

    const worldPos = new THREE.Vector3()

    function applyActive(mat: THREE.MeshBasicMaterial) {
      mat.color.setHex(COLOR_FROST)
      mat.opacity = 1
    }

    function refreshDots() {
      for (let i = 0; i < dotMeshes.length; i++) {
        const mesh = dotMeshes[i]!
        const mat = dotMats[i]!

        if (i === selectedIdx) {
          mesh.scale.setScalar(1.0 + 0.35 * (0.5 + 0.5 * Math.sin(pulseT * 2.1)))
          applyActive(mat)
          continue
        }

        if (i === hoveredIdx) {
          mesh.scale.setScalar(1.3)
          applyActive(mat)
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

    // ── Pointer events (replaces click + mousemove + touchend) ────────────────

    function handlePointerDown(e: PointerEvent) {
      // Only handle primary button for mouse; any touch pointer is fine
      if (e.pointerType === 'mouse' && e.button !== 0) return
      pointerDownX = e.clientX
      pointerDownY = e.clientY
      lastDragX = e.clientX
      dragMoved = false
      isDragging = true
      clearResumeTimer()
      rotSpeedTarget = 0
      mount.setPointerCapture(e.pointerId)
    }

    function handlePointerMove(e: PointerEvent) {
      if (!isDragging) {
        // Hover detection
        coordsToNdc(e.clientX, e.clientY)
        raycaster.setFromCamera(mouse, camera)
        const hits = raycaster.intersectObjects(dotMeshes)
        const prev = hoveredIdx
        hoveredIdx = hits.length > 0 ? (hits[0]!.object.userData.dotIdx as number) : -1
        mount.style.cursor = hoveredIdx >= 0 ? 'pointer' : 'default'
        if (prev !== hoveredIdx) refreshDots()
        return
      }

      const dx = e.clientX - pointerDownX
      const dy = e.clientY - pointerDownY
      if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) dragMoved = true

      if (dragMoved) {
        // Rotate Y axis only — no tilt drift
        moonGroup.rotation.y += (e.clientX - lastDragX) * DRAG_SENSITIVITY
      }
      lastDragX = e.clientX
    }

    function handlePointerUp(e: PointerEvent) {
      if (!isDragging) return
      isDragging = false

      if (!dragMoved) {
        // Treat as a click
        coordsToNdc(e.clientX, e.clientY)
        raycaster.setFromCamera(mouse, camera)
        const hits = raycaster.intersectObjects(dotMeshes)

        if (hits.length > 0) {
          const idx = hits[0]!.object.userData.dotIdx as number
          selectedIdx = idx
          rotSpeedTarget = 0  // keep stopped while a dot is selected
          onSelectRef.current?.(LOCATIONS[idx] ?? null)
        } else {
          // Click on empty space → deselect
          selectedIdx = -1
          onSelectRef.current?.(null)
          scheduleResume()
        }
      } else {
        // Drag ended — resume only if nothing is selected
        if (selectedIdx === -1) {
          scheduleResume()
        }
      }
    }

    mount.addEventListener('pointerdown', handlePointerDown)
    mount.addEventListener('pointermove', handlePointerMove)
    mount.addEventListener('pointerup', handlePointerUp)

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

      // Smoothly ease rotation speed toward target — exponential decay
      const alpha = 1 - Math.exp(-dt / ROT_EASE_TC)
      rotSpeedCurrent += (rotSpeedTarget - rotSpeedCurrent) * alpha
      moonGroup.rotation.y += rotSpeedCurrent * dt

      refreshDots()
      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(raf)
      clearResumeTimer()
      resizeObserver.disconnect()
      mount.removeEventListener('pointerdown', handlePointerDown)
      mount.removeEventListener('pointermove', handlePointerMove)
      mount.removeEventListener('pointerup', handlePointerUp)
      renderer.dispose()
      sphereGeo.dispose()
      sphereMat.dispose()
      moonTex.dispose()
      markerTex.dispose()
      markerGeo.dispose()
      for (const m of dotMats) m.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div ref={mountRef} style={{ width: '100%', height: '100%', display: 'block' }} />
  )
}
