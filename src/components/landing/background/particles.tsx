"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { Canvas, createPortal, useFrame } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";
import { SimulationMaterial, DofPointsMaterial } from "./shader-materials";
import { useTheme } from "next-themes";

interface ParticlesSceneProps {
  speed?: number;
  noiseScale?: number;
  noiseIntensity?: number;
  timeScale?: number;
  pointSize?: number;
  opacity?: number;
  planeScale?: number;
  size?: number;
  focus?: number;
  aperture?: number;
  color?: string;
}

const ParticlesScene: React.FC<ParticlesSceneProps> = ({
  speed = 1.0,
  noiseScale = 0.6,
  noiseIntensity = 0.52,
  timeScale = 0.5,
  pointSize = 2.0,
  opacity = 0.8,
  planeScale = 10.0,
  size = 512,
  focus = 3.8,
  aperture = 1.79,
  color = "#ffffff",
}) => {
  const revealStartTime = useRef<number | null>(null);
  const [isRevealing, setIsRevealing] = useState(true);
  const revealDuration = 3.5;

  const simulationMaterial = useMemo(() => {
    return new SimulationMaterial(planeScale);
  }, [planeScale]);

  const target = useFBO(size, size, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
  });

  const dofPointsMaterial = useMemo(() => {
    const m = new DofPointsMaterial();
    m.uniforms.positions.value = target.texture;
    m.uniforms.initialPositions.value = simulationMaterial.uniforms.positions.value;
    m.uniforms.uColor = { value: new THREE.Color(color) }; // Initialize uColor
    return m;
  }, [simulationMaterial, target.texture, color]); // Add color to dependency array

  useEffect(() => {
    if (dofPointsMaterial) {
      dofPointsMaterial.uniforms.uColor.value.set(color);
    }
  }, [color, dofPointsMaterial]);

  const [scene] = useState(() => new THREE.Scene());
  const [camera] = useState(
    () => new THREE.OrthographicCamera(-1, 1, 1, -1, 1 / Math.pow(2, 53), 1)
  );

  const [positions] = useState(
    () =>
      new Float32Array([
        -1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0,
      ])
  );

  const [uvs] = useState(
    () => new Float32Array([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0])
  );

  const particles = useMemo(() => {
    const length = size * size;
    const particles = new Float32Array(length * 3);
    for (let i = 0; i < length; i++) {
      const i3 = i * 3;
      particles[i3 + 0] = (i % size) / size;
      particles[i3 + 1] = i / size / size;
    }
    return particles;
  }, [size]);

  useFrame((state, delta) => {
    if (!dofPointsMaterial || !simulationMaterial) return;

    state.gl.setRenderTarget(target);
    state.gl.clear();
    state.gl.render(scene, camera);
    state.gl.setRenderTarget(null);

    const currentTime = state.clock.elapsedTime;

    if (revealStartTime.current === null) {
      revealStartTime.current = currentTime;
    }

    const revealElapsed = currentTime - revealStartTime.current;
    const revealProgress = Math.min(revealElapsed / revealDuration, 1.0);
    const easedProgress = 1 - Math.pow(1 - revealProgress, 3);
    const revealFactor = easedProgress * 4.0;

    if (revealProgress >= 1.0 && isRevealing) {
      setIsRevealing(false);
    }

    dofPointsMaterial.uniforms.uTime.value = currentTime;
    dofPointsMaterial.uniforms.uFocus.value = focus;
    dofPointsMaterial.uniforms.uBlur.value = aperture;

    simulationMaterial.uniforms.uTime.value = currentTime;
    simulationMaterial.uniforms.uNoiseScale.value = noiseScale;
    simulationMaterial.uniforms.uNoiseIntensity.value = noiseIntensity;
    simulationMaterial.uniforms.uTimeScale.value = timeScale * speed;

    dofPointsMaterial.uniforms.uPointSize.value = pointSize;
    dofPointsMaterial.uniforms.uOpacity.value = opacity;
    dofPointsMaterial.uniforms.uRevealFactor.value = revealFactor;
    dofPointsMaterial.uniforms.uRevealProgress.value = easedProgress;
  });

  return (
    <>
      {createPortal(
        <mesh material={simulationMaterial}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[positions, 3]}
            />
            <bufferAttribute attach="attributes-uv" args={[uvs, 2]} />
          </bufferGeometry>
        </mesh>,
        scene
      )}
      <points material={dofPointsMaterial}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles, 3]} />
        </bufferGeometry>
      </points>
    </>
  );
};

interface ParticlesProps {
  className?: string;
}

export const Particles: React.FC<ParticlesProps> = ({
  className = ""
}) => {
  const { resolvedTheme } = useTheme();
  const [config, setConfig] = useState({
    color: "#ffffff",
    pointSize: 2.0,
    opacity: 0.8,
  });

  useEffect(() => {
    if (resolvedTheme === "light") {
      setConfig({
        color: "#000000",
        pointSize: 6.0,
        opacity: 1.0,
      });
    } else {
      setConfig({
        color: "#ffffff",
        pointSize: 2.0,
        opacity: 0.8,
      });
    }
  }, [resolvedTheme]);

  return (
    <div className={className} aria-hidden="true">
      <Canvas
        camera={{
          position: [0, 3, 1],
          rotation: [-Math.PI / 3, 0, 0],
          fov: 50,
          near: 0.01,
          far: 300,
        }}
        gl={{ alpha: true, antialias: false }}
      >
        <ParticlesScene {...config} />
      </Canvas>
    </div>
  );
};