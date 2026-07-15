import { useRef, useMemo } from 'react'
import { Canvas, useFrame, type ThreeElements } from '@react-three/fiber'
import { Icosahedron, Float, MeshDistortMaterial, Sparkles } from '@react-three/drei'
import * as THREE from 'three'

/** The distorting inner core of the AI orb — reacts subtly to pointer position. */
function OrbCore(props: ThreeElements['mesh']) {
  const mesh = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!mesh.current) return
    const t = state.clock.elapsedTime
    mesh.current.rotation.y = t * 0.18
    mesh.current.rotation.z = t * 0.06
    // Ease the orb a touch toward the pointer for a "reactive intelligence" feel.
    const { x, y } = state.pointer
    mesh.current.position.x = THREE.MathUtils.lerp(mesh.current.position.x, x * 0.3, 0.05)
    mesh.current.position.y = THREE.MathUtils.lerp(mesh.current.position.y, y * 0.3, 0.05)
  })

  return (
    <Icosahedron ref={mesh as any} args={[1.15, 12] as any} {...props}>
      <MeshDistortMaterial
        color="#6366f1"
        emissive="#4338ca"
        emissiveIntensity={0.5}
        roughness={0.18}
        metalness={0.85}
        distort={0.38}
        speed={1.6}
      />
    </Icosahedron>
  )
}

/** Translucent outer shell for a layered, holographic look. */
function OrbShell() {
  const mesh = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (mesh.current) mesh.current.rotation.y = -state.clock.elapsedTime * 0.1
  })
  return (
    <Icosahedron ref={mesh as any} args={[1.65, 3] as any}>
      <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.12} />
    </Icosahedron>
  )
}

/**
 * AIOrb — cinematic 3D centerpiece for the hero. Mouse-reactive core, holographic
 * shell, floating sparkle field, and pointer-tracked lighting. Renders inside its
 * own Canvas so it stays isolated from the DOM layout.
 */
export function AIOrb() {
  // Memoize the sparkle seed so it doesn't re-randomize on every render.
  const sparkleColor = useMemo(() => new THREE.Color('#a855f7'), [])

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 5], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 4, 4]} intensity={2.2} color="#818cf8" />
      <pointLight position={[-4, -2, 2]} intensity={1.6} color="#22d3ee" />
      <Float speed={1.4} rotationIntensity={0.5} floatIntensity={0.9}>
        <OrbCore />
        <OrbShell />
      </Float>
      <Sparkles count={60} scale={6} size={2.4} speed={0.4} color={sparkleColor} opacity={0.6} />
    </Canvas>
  )
}
