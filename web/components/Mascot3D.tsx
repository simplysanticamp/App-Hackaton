"use client";

// Boti: una semilla con botas (guiño a "bootstrap"; la idea que crece). Modelada con primitivas de three.js:
// no hay archivos de modelo ni texturas. Sigue el cursor con los ojos y cambia de ánimo según el agente.
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export type Mood = "idle" | "thinking" | "happy";

const C = {
  body: "#5fcf80",
  stem: "#3a9c5a",
  leaf: "#9be59a",
  cheek: "#ff9aa8",
  boot: "#a9662f",
  sole: "#f3dcae",
  ink: "#26211a",
};

const damp = THREE.MathUtils.damp;

function Boti({ mood, still }: { mood: Mood; still: boolean }) {
  const invalidate = useThree((st) => st.invalidate);
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const leaf = useRef<THREE.Group>(null);
  const pupilL = useRef<THREE.Mesh>(null);
  const pupilR = useRef<THREE.Mesh>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const smile = useRef<THREE.Mesh>(null);
  const oh = useRef<THREE.Mesh>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const look = useRef({ x: 0, y: 0 });

  // En modo "still" (movimiento reducido) el render es bajo demanda: se redibuja solo al cambiar el ánimo.
  useEffect(() => {
    invalidate();
  }, [mood, still, invalidate]);

  useEffect(() => {
    if (still) return;
    const onMove = (e: PointerEvent) => {
      look.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      look.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [still]);

  useFrame((state, delta) => {
    // Pose fija: tiempo detenido y suavizado instantáneo, sin rebotes, giros ni seguimiento del cursor.
    const t = still ? 0 : state.clock.elapsedTime;
    const dt = still ? 1 : delta;
    const r = root.current, b = body.current;
    if (!r || !b) return;

    // Rebote: suave en reposo, saltitos cuando está feliz, leve vibración cuando piensa.
    const hop = mood === "happy" ? Math.abs(Math.sin(t * 5)) * 0.2 : mood === "thinking" ? Math.sin(t * 3) * 0.03 : Math.sin(t * 2) * 0.06;
    r.position.y = damp(r.position.y, hop, 10, dt);
    const stretch = 1 + (mood === "happy" ? (0.2 - Math.abs(Math.sin(t * 5)) * 0.2) * -0.25 : 0);
    b.scale.y = damp(b.scale.y, stretch, 12, dt);

    // Mira hacia el cursor girando el cuerpo y desplazando las pupilas.
    b.rotation.y = damp(b.rotation.y, look.current.x * 0.55, 6, dt);
    b.rotation.x = damp(b.rotation.x, -look.current.y * 0.22, 6, dt);
    const px = damp(pupilL.current?.position.x ?? 0, look.current.x * 0.07, 10, dt);
    const py = damp(pupilL.current?.position.y ?? 0, look.current.y * 0.06, 10, dt);
    [pupilL.current, pupilR.current].forEach((p) => p?.position.set(px, py, 0.13));

    // Hoja: gira rápido al pensar.
    if (leaf.current) {
      if (!still) leaf.current.rotation.y += dt * (mood === "thinking" ? 9 : 0.9);
      leaf.current.rotation.z = Math.sin(t * 2) * 0.08;
    }

    // Brazos: saluda al estar feliz.
    const wave = mood === "happy" ? -2.5 + Math.sin(t * 11) * 0.45 : -0.45 + Math.sin(t * 2) * 0.05;
    if (armR.current) armR.current.rotation.z = damp(armR.current.rotation.z, wave, 12, dt);
    if (armL.current) armL.current.rotation.z = damp(armL.current.rotation.z, mood === "happy" ? 2.5 - Math.sin(t * 11 + 1) * 0.45 : 0.45 - Math.sin(t * 2) * 0.05, 12, dt);

    // Boca: sonrisa (más grande si está feliz) u "o" pensativa.
    if (smile.current) {
      smile.current.visible = mood !== "thinking";
      const s = mood === "happy" ? 1.15 : 1;
      smile.current.scale.set(s, s, 1);
    }
    if (oh.current) oh.current.visible = mood === "thinking";

    // La sombra se encoge cuando salta.
    if (shadow.current) {
      const s = 1 - r.position.y * 0.6;
      shadow.current.scale.set(s, s, s);
    }
  });

  const eye = (x: number, pupil: React.RefObject<THREE.Mesh | null>) => (
    <group position={[x, 0.16, 0.8]}>
      <mesh scale={[1, 1.1, 0.55]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
      <mesh ref={pupil} position={[0, 0, 0.13]}>
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshStandardMaterial color={C.ink} roughness={0.2} />
      </mesh>
    </group>
  );

  const boot = (x: number) => (
    <group position={[x, -1.14, 0.12]}>
      <mesh scale={[1, 0.7, 1.3]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color={C.boot} roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.13, 0.03]} scale={[1.05, 0.28, 1.36]}>
        <sphereGeometry args={[0.3, 32, 16]} />
        <meshStandardMaterial color={C.sole} roughness={0.7} />
      </mesh>
    </group>
  );

  const arm = (side: 1 | -1, ref: React.RefObject<THREE.Group | null>) => (
    <group ref={ref} position={[side * 1.06, 0.12, 0.05]}>
      <mesh position={[0, -0.32, 0]} scale={[0.85, 1.35, 0.85]}>
        <sphereGeometry args={[0.16, 24, 24]} />
        <meshStandardMaterial color={C.body} roughness={0.55} />
      </mesh>
    </group>
  );

  return (
    <group ref={root}>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.42, 0]}>
        <circleGeometry args={[0.95, 40]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.16} />
      </mesh>

      {boot(-0.42)}
      {boot(0.42)}

      <group ref={body}>
        <mesh scale={[1, 1.08, 0.95]}>
          <sphereGeometry args={[1, 48, 48]} />
          <meshStandardMaterial color={C.body} roughness={0.5} />
        </mesh>

        {eye(-0.36, pupilL)}
        {eye(0.36, pupilR)}

        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.62, -0.1, 0.68]} scale={[1, 0.7, 0.3]}>
            <sphereGeometry args={[0.15, 24, 24]} />
            <meshStandardMaterial color={C.cheek} roughness={0.8} />
          </mesh>
        ))}

        <mesh ref={smile} position={[0, -0.06, 0.96]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.2, 0.055, 16, 32, Math.PI]} />
          <meshStandardMaterial color={C.ink} roughness={0.4} />
        </mesh>
        <mesh ref={oh} position={[0, -0.14, 0.95]} scale={[1, 1.25, 0.5]} visible={false}>
          <sphereGeometry args={[0.11, 20, 20]} />
          <meshStandardMaterial color={C.ink} roughness={0.4} />
        </mesh>

        {arm(1, armR)}
        {arm(-1, armL)}

        <group ref={leaf} position={[0, 1.02, 0]}>
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.045, 0.06, 0.34, 12]} />
            <meshStandardMaterial color={C.stem} roughness={0.6} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.24, 0.38, 0]} rotation={[0, 0, s * -0.55]} scale={[1, 0.36, 0.6]}>
              <sphereGeometry args={[0.28, 24, 24]} />
              <meshStandardMaterial color={C.leaf} roughness={0.5} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

export default function Mascot3D({ mood, still = false }: { mood: Mood; still?: boolean }) {
  return (
    <Canvas frameloop={still ? "demand" : "always"} dpr={[1, 2]} camera={{ position: [0, 0.15, 6.6], fov: 32 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={1.05} />
      <directionalLight position={[3, 4, 5]} intensity={2.4} />
      <pointLight position={[-4, 1, 3]} intensity={12} color="#ffd9a0" />
      <Boti mood={mood} still={still} />
    </Canvas>
  );
}
