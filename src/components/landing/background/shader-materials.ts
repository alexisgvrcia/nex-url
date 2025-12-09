import * as THREE from 'three';

const periodicNoiseGLSL =  `
  float periodicNoise(vec3 p, float time) {
    float noise = 0.0;
    noise += sin(p.x * 2.0 + time) * cos(p.z * 1.5 + time);
    noise += sin(p.x * 3.2 + time * 2.0) * cos(p.z * 2.1 + time) * 0.6;
    noise += sin(p.x * 1.7 + time) * cos(p.z * 2.8 + time * 3.0) * 0.4;
    noise += sin(p.x * p.z * 0.5 + time * 2.0) * 0.3;
    return noise * 0.3;
  }
`;

function getPlane(count: number, components: number, size: number = 512, scale: number = 1.0) {
  const length = count * components;
  const data = new Float32Array(length);
  
  for (let i = 0; i < count; i++) {
    const i4 = i * components;
    const x = (i % size) / (size - 1);
    const z = Math.floor(i / size) / (size - 1);
    
    data[i4 + 0] = (x - 0.5) * 2 * scale;
    data[i4 + 1] = 0;
    data[i4 + 2] = (z - 0.5) * 2 * scale;
    data[i4 + 3] = 1.0;
  }
  return data;
}

interface SimulationUniforms {
  [key: string]: { value: any };
  positions: { value: THREE.DataTexture };
  uTime: { value: number };
  uNoiseScale: { value: number };
  uNoiseIntensity: { value: number };
  uTimeScale: { value: number };
  uLoopPeriod: { value: number };
}

export class SimulationMaterial extends THREE.ShaderMaterial {
  declare uniforms: SimulationUniforms;

  constructor(scale: number = 10.0) {
    const size = 512;
    const positionsTexture = new THREE.DataTexture(
      getPlane(size * size, 4, size, scale),
      size,
      size,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    positionsTexture.needsUpdate = true;

    super({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D positions;
        uniform float uTime;
        uniform float uNoiseScale;
        uniform float uNoiseIntensity;
        uniform float uTimeScale;
        uniform float uLoopPeriod;
        varying vec2 vUv;

        ${periodicNoiseGLSL}

        void main() {
          vec3 originalPos = texture2D(positions, vUv).rgb;
          float continuousTime = uTime * uTimeScale * (6.28318530718 / uLoopPeriod);
          
          vec3 noiseInput = originalPos * uNoiseScale;
          
          // Radial flow logic
          float dist = length(vUv - 0.5);
          float radialWave = sin(dist * 10.0 - continuousTime) * 0.5;
          
          float displacementX = periodicNoise(noiseInput + vec3(0.0, 0.0, 0.0), continuousTime) * 0.5;
          float displacementY = radialWave * uNoiseIntensity + periodicNoise(noiseInput, continuousTime) * 0.5;
          float displacementZ = periodicNoise(noiseInput + vec3(0.0, 50.0, 0.0), continuousTime) * 0.5;
          
          vec3 distortion = vec3(displacementX, displacementY, displacementZ);
          vec3 finalPos = originalPos + distortion;
          
          gl_FragColor = vec4(finalPos, 1.0);
        }
      `,
      uniforms: {
        positions: { value: positionsTexture },
        uTime: { value: 0 },
        uNoiseScale: { value: 1.0 },
        uNoiseIntensity: { value: 0.5 },
        uTimeScale: { value: 1 },
        uLoopPeriod: { value: 24.0 }
      }
    });
  }
}

interface DofPointsUniforms {
  [key: string]: { value: any };
  positions: { value: THREE.Texture | null };
  initialPositions: { value: THREE.Texture | null };
  uTime: { value: number };
  uFocus: { value: number };
  uFov: { value: number };
  uBlur: { value: number };
  uPointSize: { value: number };
  uOpacity: { value: number };
  uRevealFactor: { value: number };
  uRevealProgress: { value: number };
  uTransition: { value: number };
  uColor: { value: THREE.Color };
}

export class DofPointsMaterial extends THREE.ShaderMaterial {
  declare uniforms: DofPointsUniforms;

  constructor() {
    super({
      vertexShader:  `
        uniform sampler2D positions;
        uniform sampler2D initialPositions;
        uniform float uTime;
        uniform float uFocus;
        uniform float uFov;
        uniform float uBlur;
        uniform float uPointSize;
        varying float vDistance;
        varying float vPosY;
        varying vec3 vWorldPosition;
        varying vec3 vInitialPosition;
        void main() { 
          vec3 pos = texture2D(positions, position.xy).xyz;
          vec3 initialPos = texture2D(initialPositions, position.xy).xyz;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          vDistance = abs(uFocus - -mvPosition.z);
          vPosY = pos.y;
          vWorldPosition = pos;
          vInitialPosition = initialPos;
          gl_PointSize = max(vDistance * uBlur * uPointSize, 3.0);
        }
      `,
      fragmentShader:  `
        uniform float uOpacity;
        uniform float uRevealFactor;
        uniform float uRevealProgress;
        uniform float uTime;
        varying float vDistance;
        varying float vPosY;
        varying vec3 vWorldPosition;
        varying vec3 vInitialPosition;
        uniform float uTransition;
        uniform vec3 uColor;

        ${periodicNoiseGLSL}

        float sparkleNoise(vec3 seed, float time) {
          float hash = sin(seed.x * 127.1 + seed.y * 311.7 + seed.z * 74.7) * 43758.5453;
          hash = fract(hash);
          float slowTime = time * 1.0;
          float sparkle = 0.0;
          sparkle += sin(slowTime + hash * 6.28318) * 0.5;
          sparkle += sin(slowTime * 1.7 + hash * 12.56636) * 0.3;
          sparkle += sin(slowTime * 0.8 + hash * 18.84954) * 0.2;
          
          float hash2 = sin(seed.x * 113.5 + seed.y * 271.9 + seed.z * 97.3) * 37849.3241;
          hash2 = fract(hash2);
          
          float sparkleMask = sin(hash2 * 6.28318) * 0.7;
          sparkleMask += sin(hash2 * 12.56636) * 0.3;
          
          if (sparkleMask < 0.3) {
            sparkle *= 0.05;
          }
          
          float normalizedSparkle = (sparkle + 1.0) * 0.5;
          float smoothCurve = pow(normalizedSparkle, 4.0);
          float blendFactor = normalizedSparkle * normalizedSparkle;
          float finalBrightness = mix(normalizedSparkle, smoothCurve, blendFactor);
          
          return 0.7 + finalBrightness * 1.3;
        }

        float sdCircle(vec2 p, float r) {
          return length(p) - r;
        }

        void main() {
          vec2 cxy = 2.0 * gl_PointCoord - 1.0;
          float sdf = sdCircle(cxy, 0.5);
          if (sdf > 0.0) discard;

          float distanceFromCenter = length(vWorldPosition.xz);
          float noiseValue = periodicNoise(vInitialPosition * 4.0, 0.0);
          float revealThreshold = uRevealFactor + noiseValue * 0.3;
          float revealMask = 1.0 - smoothstep(revealThreshold - 0.2, revealThreshold + 0.1, distanceFromCenter);
          
          float sparkleBrightness = sparkleNoise(vInitialPosition, uTime);
          
          float alpha = (1.04 - clamp(vDistance, 0.0, 1.0)) * clamp(smoothstep(-0.5, 0.25, vPosY), 0.0, 1.0) * uOpacity * revealMask * uRevealProgress * sparkleBrightness;

          gl_FragColor = vec4(uColor, mix(alpha, sparkleBrightness - 1.1, uTransition));
        }
      `,
      uniforms: {
        positions: { value: null },
        initialPositions: { value: null },
        uTime: { value: 0 },
        uFocus: { value: 5.1 },
        uFov: { value: 50 },
        uBlur: { value: 30 },
        uTransition: { value: 0.0 },
        uPointSize: { value: 2.0 },
        uOpacity: { value: 1.0 },
        uRevealFactor: { value: 0.0 },
        uRevealProgress: { value: 0.0 },
        uColor: { value: new THREE.Color("white") }
      },
      transparent: true,
      depthWrite: false
    });
  }
}

export const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    offset: { value: 0.5 },
    darkness: { value: 1.5 },
  },
  vertexShader:  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader:  `
    uniform float offset;
    uniform float darkness;
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - 0.5) * vec2(offset);
      gl_FragColor = vec4(mix(texel.rgb, vec3(1.0 - darkness), dot(uv, uv)), texel.a);
    }
  `
};
