"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTheme } from "next-themes";

interface DitherConfig {
  color?: string;
  opacity?: number;
  cellSize?: number;
}

const ditherMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color("#888888") },
    uOpacity: { value: 0.4 },
    uCellSize: { value: 12 },
    uResolution: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uCellSize;
    uniform vec2 uResolution;
    varying vec2 vUv;

    // --- Simplex 2D noise (Ashima Arts) ---
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(
        0.211324865405187,   // (3.0-sqrt(3.0))/6.0
        0.366025403784439,   // 0.5*(sqrt(3.0)-1.0)
       -0.577350269189626,   // -1.0 + 2.0 * C.x
        0.024390243902439    // 1.0 / 41.0
      );
      vec2 i = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
      m = m * m;
      m = m * m;
      vec3 x_ = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x_) - 0.5;
      vec3 ox = floor(x_ + 0.5);
      vec3 a0 = x_ - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
      vec3 g;
      g.x = a0.x * x0.x + h.x * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    // --- Fractional Brownian Motion ---
    float fbm(vec2 p, float t) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      // 5 octaves for rich detail
      for (int i = 0; i < 5; i++) {
        value += amplitude * snoise(p * frequency + t);
        frequency *= 2.1;
        amplitude *= 0.48;
      }
      return value;
    }

    // --- Bayer 4x4 dither matrix ---
    float bayer4(vec2 cell) {
      vec2 p = mod(cell, 4.0);
      float index = p.x + p.y * 4.0;
      if (index < 0.5) return 0.0 / 16.0;
      if (index < 1.5) return 8.0 / 16.0;
      if (index < 2.5) return 2.0 / 16.0;
      if (index < 3.5) return 10.0 / 16.0;
      if (index < 4.5) return 12.0 / 16.0;
      if (index < 5.5) return 4.0 / 16.0;
      if (index < 6.5) return 14.0 / 16.0;
      if (index < 7.5) return 6.0 / 16.0;
      if (index < 8.5) return 3.0 / 16.0;
      if (index < 9.5) return 11.0 / 16.0;
      if (index < 10.5) return 1.0 / 16.0;
      if (index < 11.5) return 9.0 / 16.0;
      if (index < 12.5) return 15.0 / 16.0;
      if (index < 13.5) return 7.0 / 16.0;
      if (index < 14.5) return 13.0 / 16.0;
      return 5.0 / 16.0;
    }

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    float waveField(vec2 uv, float time) {
      float aspect = uResolution.x / uResolution.y;
      vec2 p = vec2(uv.x * aspect, uv.y);

      float field = 0.0;

      // Layer 1: Large sweeping diagonal waves
      float wave1 = fbm(p * 2.2 + vec2(time * 0.15, time * 0.08), time * 0.06);
      
      // Layer 2: Medium flowing shapes moving in a different direction
      float wave2 = fbm(p * 3.5 + vec2(-time * 0.12, time * 0.18), time * 0.09 + 10.0);
      
      // Layer 3: Fine detail ripples
      float wave3 = fbm(p * 5.8 + vec2(time * 0.22, -time * 0.1), time * 0.12 + 25.0);
      
      // Layer 4: Very large slow-moving shapes for macro structure
      float wave4 = snoise(p * 1.2 + vec2(time * 0.05, time * 0.03));

      // Combine layers with different weights
      field = wave1 * 0.4 + wave2 * 0.3 + wave3 * 0.15 + wave4 * 0.25;

      // Add sharp diagonal wave bands like in the reference
      float diag1 = sin((p.x + p.y) * 4.0 + time * 0.3) * 0.3;
      float diag2 = sin((p.x - p.y * 0.7) * 3.2 - time * 0.2) * 0.25;
      float diag3 = sin((p.x * 0.5 + p.y) * 5.5 + time * 0.15) * 0.15;
      
      field += diag1 + diag2 + diag3;

      // Edge density: reference shows denser dots near edges (top, bottom, corners)
      float edgeTop = smoothstep(0.3, 0.0, uv.y) * 0.5;
      float edgeBottom = smoothstep(0.7, 1.0, uv.y) * 0.4;
      float edgeLeft = smoothstep(0.2, 0.0, uv.x) * 0.35;
      float edgeRight = smoothstep(0.8, 1.0, uv.x) * 0.45;
      
      field += edgeTop + edgeBottom + edgeLeft + edgeRight;

      // Normalize to 0-1 range with contrast
      field = field * 0.5 + 0.5;
      field = smoothstep(0.25, 0.85, field);

      return field;
    }

    void main() {
      vec2 pixelUv = gl_FragCoord.xy / uCellSize;
      vec2 cell = floor(pixelUv);
      vec2 local = fract(pixelUv) - 0.5;
      
      // Square dot shape (slightly smaller gap for crisp look)
      float square = step(max(abs(local.x), abs(local.y)), 0.33);
      
      vec2 sampleUv = (cell + 0.5) * uCellSize / uResolution;
      float time = uTime;
      float field = waveField(sampleUv, time);
      
      // Bayer dithering threshold
      float threshold = bayer4(cell);
      float dithered = step(threshold, field);
      
      // Sparse twinkling background dots
      float noise = hash12(cell + floor(time * 0.4));
      float sparse = step(0.993, noise) * 0.15;
      
      // Combined: full opacity dithered dots + faint sparse dots
      float alpha = max(dithered * mix(0.35, 1.0, field), sparse) * square * uOpacity;
      
      if (alpha <= 0.001) discard;
      
      gl_FragColor = vec4(uColor, alpha);
    }
  `,
});

const DitherPlane: React.FC<DitherConfig> = ({
  color = "#888888",
  opacity = 0.4,
  cellSize = 12,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const material = useMemo(() => ditherMaterial.clone(), []);
  const { size } = useThree();

  useEffect(() => {
    material.uniforms.uColor.value.set(color);
    material.uniforms.uOpacity.value = opacity;
    material.uniforms.uCellSize.value = cellSize;
    material.uniforms.uResolution.value.set(size.width, size.height);
  }, [cellSize, color, material, opacity, size.height, size.width]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uResolution.value.set(size.width, size.height);
  });

  return (
    <mesh ref={meshRef} material={material} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
};

interface ParticlesProps {
  className?: string;
}

export const Particles: React.FC<ParticlesProps> = ({ className = "" }) => {
  const { resolvedTheme } = useTheme();
  const [config, setConfig] = useState({
    color: "#888888",
    opacity: 0.35,
    cellSize: 12,
  });

  useEffect(() => {
    if (resolvedTheme === "light") {
      setConfig({
        color: "#555555",
        opacity: 0.22,
        cellSize: 12,
      });
      return;
    }

    setConfig({
      color: "#888888",
      opacity: 0.35,
      cellSize: 12,
    });
  }, [resolvedTheme]);

  return (
    <div className={className} aria-hidden="true">
      <Canvas
        orthographic
        camera={{ position: [0, 0, 5], zoom: 100 }}
        gl={{ alpha: true, antialias: false }}
      >
        <DitherPlane {...config} />
      </Canvas>
    </div>
  );
};
