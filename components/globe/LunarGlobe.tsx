'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { LOCATIONS } from './locations'
import type { LunarLocation } from './types'

// Design tokens
const COLOR_FROST    = 0xe8edf5
const COLOR_FROST_4  = 0x4a5368
const COLOR_CYAN     = 0x7dd3fc
const COLOR_BASE     = 0x050c1a

// Globe constants
const SPHERE_RADIUS   = 1
const SPHERE_SEGS     = 64     // smooth at full viewport
const DOT_RADIUS      = 0.018
const DOT_SEGS        = 8
const DOT_SURFACE_GAP = 1.015  // dots sit slightly above the surface
const AUTO_ROT_SPEED  = 0.0008 // radians/frame — slow, purposeful
const CAMERA_DIST     = 2.5
const AMBIENT_INTENSITY = 0.15
const SUN_INTENSITY     = 1.2

// Sun direction — from upper-right, creates a visible terminator across the sphere
const SUN_POS = new THREE.Vector3(5, 3, 4).normalize()

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
  const [selected, setSelected] = useState<LunarLocation | null>(null)

  useEffect(() => {
    const mount = mountRef.current as HTMLDivElement
    if (!mount) return

    // ── Scene ───────────────────────────────────────────────────────────────
    const scene = new THREE.Scene()

    // ── Camera ──────────────────────────────────────────────────────────────
    // Positioned on the +x axis so lon=0 (near-side prime meridian) faces forward
    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100,
    )
    camera.position.set(CAMERA_DIST, 0, 0)
    camera.lookAt(0, 0, 0)

    // ── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setClearColor(COLOR_BASE, 0) // transparent — body background shows through
    mount.appendChild(renderer.domElement)

    // ── Lights ───────────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, AMBIENT_INTENSITY)
    scene.add(ambient)

    const sun = new THREE.DirectionalLight(0xfff8e8, SUN_INTENSITY)
    sun.position.set(5, 3, 4)
    scene.add(sun)

    // ── Moon group (rotates; dots are children so they move with it) ─────────
    const moonGroup = new THREE.Group()
    scene.add(moonGroup)

    // ── Moon sphere ──────────────────────────────────────────────────────────
    const sphereGeo = new THREE.SphereGeometry(SPHERE_RADIUS, SPHERE_SEGS, SPHERE_SEGS)
    const textureLoader = new THREE.TextureLoader()
    const moonTex = textureLoader.load('/textures/lunar_surface.jpg')
    const sphereMat = new THREE.MeshPhongMaterial({
      map: moonTex,
      specular: new THREE.Color(0x060c18),
      shininess: 4,
    })
    const moonMesh = new THREE.Mesh(sphereGeo, sphereMat)
    moonGroup.add(moonMesh)

    // ── Location dots ────────────────────────────────────────────────────────
    const dotGeo = new THREE.SphereGeometry(DOT_RADIUS, DOT_SEGS, DOT_SEGS)
    const dotMeshes: THREE.Mesh[] = []
    const dotMats: THREE.MeshBasicMaterial[] = []

    for (const loc of LOCATIONS) {
      const mat = new THREE.MeshBasicMaterial({ color: COLOR_FROST })
      const mesh = new THREE.Mesh(dotGeo, mat)
      const pos = latLonToVec3(loc.lat, loc.lon, DOT_SURFACE_GAP)
      mesh.position.copy(pos)
      mesh.userData.locationId = loc.id
      moonGroup.add(mesh)
      dotMeshes.push(mesh)
      dotMats.push(mat)
    }

    // ── Raycaster ────────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster()
    raycaster.params.Points = { threshold: 0.02 }
    const mouse = new THREE.Vector2()

    let hoveredIdx = -1
    let selectedIdx = -1
    let autoRotating = true
    let pulseT = 0

    // ── Dot colour pass ──────────────────────────────────────────────────────
    // Runs every frame; uses world-space position to test if dot is in shadow.
    const sunDir = sun.position.clone().normalize()
    const worldPos = new THREE.Vector3()

    function refreshDots() {
      for (let i = 0; i < dotMeshes.length; i++) {
        const mesh = dotMeshes[i]!
        const mat = dotMats[i]!

        if (i === selectedIdx) {
          // Cyan pulse — scale 1.0→1.35 over ~3 s
          const pulse = 1.0 + 0.35 * (0.5 + 0.5 * Math.sin(pulseT * 2.1))
          mesh.scale.setScalar(pulse)
          mat.color.setHex(COLOR_CYAN)
          mat.opacity = 1
          mat.transparent = false
          continue
        }

        mesh.scale.setScalar(i === hoveredIdx ? 1.3 : 1.0)

        if (i === hoveredIdx) {
          mat.color.setHex(COLOR_CYAN)
          mat.opacity = 1
          mat.transparent = false
          continue
        }

        // Shadow test: project dot world position onto sun direction
        mesh.getWorldPosition(worldPos)
        const lit = worldPos.dot(sunDir) > 0

        if (lit) {
          mat.color.setHex(COLOR_FROST)
          mat.opacity = 1
          mat.transparent = false
        } else {
          mat.color.setHex(COLOR_FROST_4)
          mat.opacity = 0.4
          mat.transparent = true
        }
      }
    }

    // ── Input handlers ───────────────────────────────────────────────────────
    function screenToNdc(e: MouseEvent) {
      const rect = mount.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }

    function handleMouseMove(e: MouseEvent) {
      screenToNdc(e)
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(dotMeshes)
      const prev = hoveredIdx
      hoveredIdx = hits.length > 0 ? dotMeshes.indexOf(hits[0]!.object as THREE.Mesh) : -1
      mount.style.cursor = hoveredIdx >= 0 ? 'pointer' : 'default'
      if (prev !== hoveredIdx) refreshDots()
    }

    function handleClick(e: MouseEvent) {
      screenToNdc(e)
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(dotMeshes)

      if (hits.length > 0) {
        const idx = dotMeshes.indexOf(hits[0]!.object as THREE.Mesh)
        if (idx !== -1) {
          selectedIdx = idx
          autoRotating = false
          const loc = LOCATIONS[idx] ?? null
          setSelected(loc)
          onLocationSelect?.(loc)
        }
      }
    }

    mount.addEventListener('mousemove', handleMouseMove)
    mount.addEventListener('click', handleClick)

    // ── Resize ───────────────────────────────────────────────────────────────
    function handleResize() {
      const w = mount.clientWidth
      const h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(mount)

    // ── Animation loop ───────────────────────────────────────────────────────
    let raf: number
    const clock = new THREE.Clock()

    function animate() {
      raf = requestAnimationFrame(animate)
      const dt = clock.getDelta()
      pulseT += dt

      if (autoRotating) {
        moonGroup.rotation.y += AUTO_ROT_SPEED
      }

      refreshDots()
      renderer.render(scene, camera)
    }

    animate()

    // ── Cleanup ──────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      mount.removeEventListener('mousemove', handleMouseMove)
      mount.removeEventListener('click', handleClick)

      renderer.dispose()
      sphereGeo.dispose()
      sphereMat.dispose()
      moonTex.dispose()
      dotGeo.dispose()
      for (const m of dotMats) m.dispose()

      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [onLocationSelect])

  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}
