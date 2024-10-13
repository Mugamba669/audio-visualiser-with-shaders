import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const rippleShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec2 uResolution;
  varying vec2 vUv;

  #define PI 3.14159265359

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  vec2 wave(vec2 uv, float time, float frequency, float amplitude) {
    return vec2(
      uv.x + sin(uv.y * frequency + time) * amplitude,
      uv.y + sin(uv.x * frequency + time) * amplitude
    );
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    vec2 center = vec2(0.5, 0.5);
    float center_distance = length(uv - center);

    float frequency = 4.0 + uIntensity * 11.0;
    float amplitude = 0.05 + uIntensity * 0.15;
    float ripple_rate = 5.0 + uIntensity * 15.0;

    float ripple = sin(center_distance * -frequency * PI + ripple_rate * uTime) * amplitude / (center_distance + 1.0);

    vec2 ripple_uv = uv + (uv - center) / center_distance * ripple * amplitude;
    vec2 waved_uv = wave(ripple_uv, uTime, frequency, amplitude);

    vec3 color1 = vec3(0.1, 0.5, 0.9);
    vec3 color2 = vec3(0.9, 0.1, 0.5);
    vec3 color = mix(color1, color2, sin(uTime + uv.x * 2.0) * 0.5 + 0.5);

    float alpha = (1.0 - min(center_distance, 1.0)) * (ripple + 0.5) * 2.5;
    alpha = max(alpha - 0.1, 0.0);

    color *= 0.8 + uIntensity * 0.4;
    gl_FragColor = vec4(color, alpha);
  }
`;

const lightningShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec2 uResolution;
  varying vec2 vUv;

  const int lightning_number = 5;
  const vec2 amplitude = vec2(2.0, 1.0);
  const float offset = 0.45;
  const float thickness = 0.02;
  const float speed = 3.0;
  const vec4 base_color = vec4(1.0, 1.0, 1.0, 1.0);
  const float glow_thickness = 0.08;
  const vec4 glow_color = vec4(0.2, 0.0, 0.8, 0.0);
  const float alpha = 1.0;

  float plot(vec2 st, float pct, float half_width) {
    return smoothstep(pct - half_width, pct, st.y) - smoothstep(pct, pct + half_width, st.y);
  }

  vec2 hash22(vec2 uv) {
    uv = vec2(dot(uv, vec2(127.1, 311.7)), dot(uv, vec2(269.5, 183.3)));
    return 2.0 * fract(sin(uv) * 43758.5453123) - 1.0;
  }

  float noise(vec2 uv) {
    vec2 iuv = floor(uv);
    vec2 fuv = fract(uv);
    vec2 blur = smoothstep(0.0, 1.0, fuv);
    return mix(
      mix(dot(hash22(iuv + vec2(0.0, 0.0)), fuv - vec2(0.0, 0.0)),
          dot(hash22(iuv + vec2(1.0, 0.0)), fuv - vec2(1.0, 0.0)), blur.x),
      mix(dot(hash22(iuv + vec2(0.0, 1.0)), fuv - vec2(0.0, 1.0)),
          dot(hash22(iuv + vec2(1.0, 1.0)), fuv - vec2(1.0, 1.0)), blur.x),
      blur.y
    ) + 0.5;
  }

  float fbm(vec2 n) {
    float total = 0.0, amp = 1.0;
    for (int i = 0; i < 7; i++) {
      total += noise(n) * amp;
      n += n;
      amp *= 0.5;
    }
    return total;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    vec4 color = vec4(0.0, 0.0, 0.0, 0.0);

    for (int i = 0; i < lightning_number; i++) {
      vec2 t = uv * amplitude + vec2(float(i), -float(i)) - uTime * speed * (1.0 + uIntensity);
      float y = fbm(t) * offset;
      float pct = plot(uv, y, thickness);
      float buffer = plot(uv, y, glow_thickness);
      color += pct * base_color;
      color += buffer * glow_color;
    }

    color.rgb *= 0.8 + uIntensity * 0.4;
    color.a *= alpha;
    gl_FragColor = color;
  }
`;

const fractalShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec2 uResolution;
  varying vec2 vUv;

  void main() {
    float s = 0.0, v = 0.0;
    vec2 uv = (gl_FragCoord.xy / uResolution.xy) * 2.0 - 1.0;
    float itime = (uTime * 58.0 - 2.0) * (1.0 + uIntensity);
    vec3 col = vec3(0.0);
    vec3 init = vec3(sin(itime * 0.0032) * 0.3, 0.35 - cos(itime * 0.005) * 0.3, itime * 0.002);
    
    for (int r = 0; r < 100; r++) 
    {
      vec3 p = init + s * vec3(uv, 0.05);
      p.z = fract(p.z);
      
      for (int i = 0; i < 10; i++) {
        p = abs(p * 2.04) / dot(p, p) - 0.9;
      }
      
      v += pow(dot(p, p), 0.7) * 0.06;
      col += vec3(v * 0.2 + 0.4, 12.0 - s * 2.0, 0.1 + v * 1.0) * v * 0.00003;
      s += 0.025;
    }
    
    col = clamp(col, 0.0, 1.0);
    col = mix(col, vec3(1.0), uIntensity * 0.5); // Blend with white based on audio intensity
    gl_FragColor = vec4(col, 1.0);
  }
`;

const plasmaShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec2 uResolution;
  varying vec2 vUv;

  vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263, 0.416, 0.557);
    return a + b * cos(6.28318 * (c * t + d));
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution) / min(uResolution.x, uResolution.y);
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);

    for (float i = 0.0; i < 4.0; i++) {
      uv = fract(uv * 1.5) - 0.5;

      float d = length(uv) * exp(-length(uv0));

      vec3 col = palette(length(uv0) + i * 0.4 + uTime * 0.4);

      d = sin(d * 8.0 + uTime) / 8.0;
      d = abs(d);

      d = pow(0.01 / d, 1.2);

      finalColor += col * d;
    }

    finalColor *= 0.5 + uIntensity * 0.5;
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
// advanced shader
const enhancedPlasmaShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec2 uResolution;
  uniform float uBassIntensity;
  uniform float uMidIntensity;
  uniform float uHighIntensity;
  varying vec2 vUv;

  #define PI 3.14159265359
  #define NUM_LAYERS 6.0

  vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263, 0.416, 0.557);
    return a + b * cos(6.28318 * (c * t + d));
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(dot(sin(i * 1.23 + uTime), vec2(12.9898, 78.233)),
                   dot(sin((i + vec2(1.0, 0.0)) * 1.23 + uTime), vec2(12.9898, 78.233)), u.x),
               mix(dot(sin((i + vec2(0.0, 1.0)) * 1.23 + uTime), vec2(12.9898, 78.233)),
                   dot(sin((i + vec2(1.0, 1.0)) * 1.23 + uTime), vec2(12.9898, 78.233)), u.x), u.y);
  }

  float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for (int i = 0; i < 6; i++) {
      sum += noise(p * freq) * amp;
      amp *= 0.5;
      freq *= 2.0;
    }
    return sum;
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution) / min(uResolution.x, uResolution.y);
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);

    float time = uTime * (0.1 + uIntensity * 0.2);
    float bassEffect = uBassIntensity * 0.1;
    float midEffect = uMidIntensity * 0.05;
    float highEffect = uHighIntensity * 0.025;

    for (float i = 0.0; i < NUM_LAYERS; i++) {
      uv = fract(uv * 1.5) - 0.5;

      float d = length(uv) * exp(-length(uv0));

      vec2 distortedUV = uv0 + vec2(
        fbm(uv0 * 2.0 + time * 0.1 + i * 0.5),
        fbm(uv0 * 2.0 - time * 0.15 + i * 0.5)
      ) * (bassEffect + 0.02);

      vec3 col = palette(length(distortedUV) + i * 0.4 + time * 0.4);

      d = sin(d * (8.0 + midEffect * 20.0) + time + fbm(uv * 2.0) * PI) / 8.0;
      d = abs(d);

      d = pow(0.01 / d, 1.2 + highEffect * 2.0);

      col *= d;
      
      // Add some subtle variation based on audio frequencies
      col += vec3(bassEffect, midEffect, highEffect) * 0.2;

      // Create pulsating effect
      float pulse = sin(time * 4.0 + i * PI / NUM_LAYERS) * 0.5 + 0.5;
      pulse = smoothstep(0.0, 1.0, pulse);
      col *= 1.0 + pulse * uIntensity * 0.5;

      finalColor += col;
    }

    // Normalize and enhance colors
    finalColor /= NUM_LAYERS;
    finalColor = pow(finalColor, vec3(0.8 + uIntensity * 0.2));
    
    // Add subtle vignette effect
    float vignette = length(uv0);
    vignette = smoothstep(1.2, 0.5, vignette);
    finalColor *= vignette;

    // Final intensity adjustment
    finalColor *= 0.8 + uIntensity * 0.4;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
const particleVertexShader = `
  uniform float uTime;
  uniform float uIntensity;
  attribute float size;
  attribute vec3 customColor;
  varying vec3 vColor;

  float rand(vec2 co) {
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
  }

  void main() {
    vColor = customColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = `
  uniform float uTime;
  uniform float uIntensity;
  varying vec3 vColor;

  void main() {
    if (length(gl_PointCoord - vec2(0.5, 0.5)) > 0.475) discard;
    gl_FragColor = vec4(vColor * (1.0 + uIntensity), 1.0);
  }
`;
const pulseShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec2 uResolution;
  varying vec2 vUv;

  #define PI 3.14159265359

  float sdCircle(vec2 p, float r) {
    return length(p) - r;
  }

  float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  }

  float opUnion(float d1, float d2) {
    return min(d1, d2);
  }

  vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263, 0.416, 0.557);
    return a + b * cos(6.28318 * (c * t + d));
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);
    
    float time = uTime * (1.0 + uIntensity * 2.0);
    
    float pulse = sin(time * 4.0) * 0.5 + 0.5;
    pulse = smoothstep(0.0, 1.0, pulse);
    
    float d = 1000.0;
    
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float angle = time + fi * PI * 0.4;
      vec2 pos = vec2(cos(angle), sin(angle)) * (0.2 + fi * 0.1);
      
      float shape;
      if (i % 2 == 0) {
        shape = sdCircle(uv - pos, 0.1 + pulse * 0.05);
      } else {
        shape = sdBox(uv - pos, vec2(0.1 + pulse * 0.05));
      }
      
      d = opUnion(d, shape);
    }
    
    vec3 col = palette(d * 0.1 + time * 0.1);
    col *= 1.0 - exp(-0.002 * abs(d));
    col *= 0.8 + 0.2 * cos(150.0 * d);
    col = mix(col, vec3(1.0), 1.0 - smoothstep(0.0, 0.01, abs(d)));
    
    col *= 1.0 + uIntensity * 0.5;
    
    gl_FragColor = vec4(col, 1.0);
  }
`;
const spiralFluidShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec2 uResolution;
  varying vec2 vUv;

  #define PI 3.14159265359

  vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
  }

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  vec2 rotate(vec2 v, float a) {
    float s = sin(a);
    float c = cos(a);
    mat2 m = mat2(c, -s, s, c);
    return m * v;
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);
    
    float time = uTime * (0.5 + uIntensity * 2.0);
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    
    float spiral = sin(angle * 5.0 + radius * 10.0 - time * 2.0) * 0.5 + 0.5;
    spiral = smoothstep(0.3, 0.7, spiral);
    
    vec2 rotatedUV = rotate(uv, time * 0.2);
    float noise1 = noise(rotatedUV * 5.0 + time * 0.1);
    float noise2 = noise(rotatedUV * 10.0 - time * 0.2);
    
    vec3 color1 = vec3(0.1, 0.5, 0.9);
    vec3 color2 = vec3(0.9, 0.1, 0.5);
    vec3 mixedColor = mix(color1, color2, spiral);
    
    vec3 hsvColor = rgb2hsv(mixedColor);
    hsvColor.x += noise1 * 0.1 - 0.05;
    hsvColor.y += noise2 * 0.2 - 0.1;
    hsvColor.z += spiral * 0.2;
    
    vec3 finalColor = hsv2rgb(hsvColor);
    finalColor *= 1.0 + uIntensity * 0.5;
    
    float alpha = smoothstep(1.0, 0.8, radius);
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

const lightResponsiveVertexShader = `
  varying vec3 v_position;
  varying vec3 v_normal;

  void main() {
    v_position = position;
    v_normal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const lightResponsiveFragmentShader = `
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  uniform float u_time;
  uniform float u_intensity;

  varying vec3 v_position;
  varying vec3 v_normal;

  float diffuseFactor(vec3 normal, vec3 light_direction) {
    float df = dot(normalize(normal), normalize(light_direction));

    if (gl_FrontFacing) {
      df = -df;
    }

    return max(0.0, df);
  }

  void main() {
    float min_resolution = min(u_resolution.x, u_resolution.y);
    vec3 light_direction = -vec3((u_mouse - 0.5 * u_resolution) / min_resolution, 0.25);

    vec3 surface_color = vec3(0.5 + 0.5 * cos(2.0 * v_position.y + 3.0 * u_time));

    // Modify the surface color based on audio intensity
    surface_color = mix(surface_color, vec3(1.0, 0.5, 0.2), u_intensity * 0.5);

    surface_color *= diffuseFactor(v_normal, light_direction);

    // Add a pulsing effect based on audio intensity
    float pulse = 1.0 + sin(u_time * 10.0) * u_intensity * 0.3;
    surface_color *= pulse;

    gl_FragColor = vec4(surface_color, 1.0);
  }
`;

interface AudioVisualizerProps {
  audioElement: HTMLAudioElement | null;
  shaderType:
  | 'ripple'
  | 'lightning'
  | 'plasma'
  | 'fractal'
  | 'particles'
  | 'pulse'
  | 'spiralFluid'
  | 'lightResponsive'
  | 'enhancedPlasmaShader';
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioElement,
  shaderType,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const analyserRef = useRef<AnalyserNode | null>(null);
  const [isAudioSetup, setIsAudioSetup] = useState(false);
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  useEffect(() => {
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    if (!audioElement) return;

    if (!isAudioSetup) {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      sourceRef.current =
        audioContextRef.current.createMediaElementSource(audioElement);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);

      setIsAudioSetup(true);
    }

    if (!containerRef.current || !analyserRef.current) return;

    const analyser = analyserRef.current;
    analyser.fftSize = 256;
    analyser.maxDecibels = -10;
    analyser.minDecibels = -70;
    analyser.smoothingTimeConstant = 0.53;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const scene = new THREE.Scene();

    camera.position.z = 1;

    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    containerRef.current.appendChild(renderer.domElement);
    let material: THREE.ShaderMaterial | THREE.PointsMaterial;
    let mesh: THREE.Mesh | THREE.Points;

    if (shaderType === 'particles') {
      const particleCount = 5000;
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);

      const tubeRadius = 3;
      const tubeLength = 50;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const angle = Math.random() * Math.PI * 2;
        positions[i3] = Math.random() * tubeLength;
        positions[i3 + 1] = Math.sin(angle) * tubeRadius;
        positions[i3 + 2] = Math.cos(angle) * tubeRadius;

        colors[i3] = Math.random();
        colors[i3 + 1] = Math.random();
        colors[i3 + 2] = Math.random();

        sizes[i] = Math.random() * 2 + 1;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3)
      );
      geometry.setAttribute(
        'customColor',
        new THREE.BufferAttribute(colors, 3)
      );
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 0 },
        },
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        transparent: true,
      });

      mesh = new THREE.Points(geometry, material);
    } else if (shaderType === 'lightResponsive') {
      const geometry = new THREE.SphereGeometry(2, 32, 32);
      material = new THREE.ShaderMaterial({
        vertexShader: lightResponsiveVertexShader,
        fragmentShader: lightResponsiveFragmentShader,
        uniforms: {
          u_resolution: {
            value: new THREE.Vector2(
              containerRef.current.clientWidth,
              containerRef.current.clientHeight
            ),
          },
          u_mouse: { value: new THREE.Vector2() },
          u_time: { value: 0 },
          u_intensity: { value: 0 },
        },
      });
      mesh = new THREE.Mesh(geometry, material);
    } else {
      const geometry = new THREE.PlaneGeometry(2, 2);
      let fragmentShader;
      switch (shaderType) {
        case 'ripple':
          fragmentShader = rippleShader;
          break;
        case 'lightning':
          fragmentShader = lightningShader;
          break;
        case 'plasma':
          fragmentShader = plasmaShader;
          break;
        case 'fractal':
          fragmentShader = fractalShader;
          break;
        case 'pulse':
          fragmentShader = pulseShader;
          break;
        case 'spiralFluid':
          fragmentShader = spiralFluidShader;
          break;
        case 'enhancedPlasmaShader':
          fragmentShader = enhancedPlasmaShader;
          break;
        default:
          fragmentShader = rippleShader;
      }

      material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 0 },
          uResolution: { value: new THREE.Vector2(containerRef.current.clientWidth, containerRef.current.clientHeight,) },
          uBassIntensity: { value: 0 },
          uMidIntensity: { value: 0 },
          uHighIntensity: { value: 0 },
        },
        transparent: true,
      });

      mesh = new THREE.Mesh(geometry, material);
    }
    scene.add(mesh);

    const animate = (time: number) => {
      requestAnimationFrame(animate);

      analyser.getByteFrequencyData(dataArray);

      const intensity =
        dataArray.reduce((a, b) => a + b) / (bufferLength * 255);

      if (shaderType === 'lightResponsive') {
        (material as THREE.ShaderMaterial).uniforms.u_time.value = time * 0.001;
        (material as THREE.ShaderMaterial).uniforms.u_intensity.value =
          intensity;
        (material as THREE.ShaderMaterial).uniforms.u_mouse.value =
          mouseRef.current;
      } else {
        material.uniforms.uTime.value = time * 0.001;
        material.uniforms.uIntensity.value = intensity;
      }
      if (shaderType === 'particles') {
        const positions = (mesh as THREE.Points).geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i] -= 0.1 * (1 + intensity);
          if (positions[i] < 0) {
            positions[i] = 50;
          }
        }
        (mesh as THREE.Points).geometry.attributes.position.needsUpdate = true;
      }
      renderer.render(scene, camera);
    };

    animate(0);

    const handleResize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        renderer.setSize(width, height);
        camera.near = width / height;
        camera.updateProjectionMatrix();
        if (shaderType === 'lightResponsive') {
          (material as THREE.ShaderMaterial).uniforms.u_resolution.value.set(
            width,
            height
          );
        } else if (shaderType !== 'particles') {
          material.uniforms.uResolution.value.set(width, height);
        }

      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [audioElement, shaderType, isAudioSetup]);

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen fixed -z-10 top-0 left-0"
    />
  );
};

export default AudioVisualizer;
