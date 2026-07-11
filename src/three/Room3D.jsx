import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber/native';

import { LIGHTING } from './lighting';

// Camera orbit rig. `angles` is a ref: { azimuth, polar, radius } in radians/units.
export function CameraRig({ angles, target }) {
  const { camera } = useThree();
  useFrame(() => {
    const { azimuth, polar, radius } = angles.current;
    const clampedPolar = Math.max(0.15, Math.min(Math.PI / 2 - 0.05, polar));
    const x = target[0] + radius * Math.sin(clampedPolar) * Math.cos(azimuth);
    const y = target[1] + radius * Math.cos(clampedPolar);
    const z = target[2] + radius * Math.sin(clampedPolar) * Math.sin(azimuth);
    camera.position.set(x, y, z);
    camera.lookAt(target[0], target[1], target[2]);
    camera.updateProjectionMatrix();
  });
  return null;
}

function Wall({ x, z, w, d, h, color }) {
  return (
    <mesh position={[x, h / 2, z]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function FurnitureBox({ item, cx, cz }) {
  const w = item.w * item.scale;
  const d = item.d * item.scale;
  const h = item.h * item.scale;
  return (
    <mesh
      position={[item.x - cx, h / 2, item.y - cz]}
      rotation={[0, (-item.rotation * Math.PI) / 180, 0]}
      castShadow
    >
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={item.color} />
    </mesh>
  );
}

// Builds the room from a floor-plan model, centered at the origin.
export default function Room3D({ plan, lighting = 'golden', angles }) {
  const preset = LIGHTING[lighting];
  const cx = plan.width / 2;
  const cz = plan.length / 2;
  const t = 0.12;
  const h = plan.wallHeight;
  const rigTarget = useRef([0, h * 0.35, 0]).current;

  return (
    <>
      <color attach="background" args={[preset.background]} />
      <ambientLight color={preset.ambient.color} intensity={preset.ambient.intensity} />
      <directionalLight
        color={preset.directional.color}
        intensity={preset.directional.intensity}
        position={preset.directional.position}
      />
      {lighting === 'night' ? (
        <pointLight color="#FFD8A0" intensity={1.2} position={[0, h - 0.4, 0]} distance={8} />
      ) : null}

      <CameraRig angles={angles} target={rigTarget} />

      {/* floor */}
      <mesh position={[0, -0.02, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[plan.width, plan.length]} />
        <meshStandardMaterial color={preset.floor} />
      </mesh>

      {/* perimeter walls (back + left kept low-opacity so we can see inside) */}
      <Wall x={0} z={-cz} w={plan.width} d={t} h={h} color={preset.floor} />
      <Wall x={-cx} z={0} w={t} d={plan.length} h={h} color={preset.floor} />

      {/* furniture */}
      {plan.furniture.map((f) => (
        <FurnitureBox key={f.id} item={f} cx={cx} cz={cz} />
      ))}
    </>
  );
}
