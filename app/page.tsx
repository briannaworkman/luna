import dynamic from 'next/dynamic'

// Three.js creates a WebGL context — must be client-only, no SSR
const LunarGlobe = dynamic(
  () => import('@/components/globe/LunarGlobe').then((m) => m.LunarGlobe),
  { ssr: false },
)

export default function Home() {
  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        background: '#050C1A',
        overflow: 'hidden',
      }}
    >
      <LunarGlobe />
    </main>
  )
}
