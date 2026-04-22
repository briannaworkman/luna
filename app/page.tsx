import dynamic from 'next/dynamic'

// Three.js creates a WebGL context — must be client-only, no SSR
const LunarGlobe = dynamic(
  () => import('@/components/globe/LunarGlobe').then((m) => m.LunarGlobe),
  { ssr: false },
)

export default function Home() {
  return (
    <main className="fixed inset-0 overflow-hidden bg-luna-base">
      <LunarGlobe />
    </main>
  )
}
