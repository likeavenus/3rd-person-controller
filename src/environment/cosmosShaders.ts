import { PerformanceManager } from "../utils/PerformanceManager";

export const cosmosVertexShader = `
  varying vec3 vPosition;
  varying vec2 vUv;
  
  void main() {
    vPosition = position;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export function buildCosmosFragmentShader(): string {
  const settings = PerformanceManager.getOptimalSettings();
  const isMobile = PerformanceManager.isMobile();
  const precision = isMobile ? "mediump" : "highp";
  const starDensity = isMobile ? "0.91" : settings.starDensity.toFixed(2);

  const desktopVoidDetail = isMobile
    ? ""
    : `
    float detailNoise = fbm(coord * 0.003);
    voidMask *= smoothstep(0.25, 0.55, detailNoise);
    
    float breakupNoise = noise(coord * 0.004 + vec3(300.0));
    voidMask = mix(voidMask, voidMask * breakupNoise, 0.3);
    `;

  const mediumStarsBlock = isMobile
    ? ""
    : `
    float mediumStars = stars(coord, 0.8, 0.035);
    vec3 mediumStarColor = vec3(0.9, 0.95, 1.0) * mediumStars * 1.2 * voidMask;
    `;

  const mediumStarsSum = isMobile ? "" : "finalColor += mediumStarColor;";

  const bluePurpleNebula = isMobile
    ? ""
    : `
    float blueNebula = fbm(nebulaCoord * 1.3 + vec3(0.0, 3.0, 0.0));
    blueNebula = pow(blueNebula, 3.0);
    
    float purpleNebula = fbm(nebulaCoord * 0.8 + vec3(0.0, 0.0, 7.0));
    purpleNebula = pow(purpleNebula, 2.0);
    `;

  const bluePurpleColor = isMobile
    ? ""
    : `
    nebulaColor += vec3(0.1, 0.4, 1.0) * blueNebula * 0.12 * nebulaMask;
    nebulaColor += vec3(0.8, 0.2, 1.0) * purpleNebula * 0.1 * nebulaMask;
    `;

  return `
  precision ${precision} float;
  varying vec3 vPosition;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uOpacity;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    
    float n = p.x + p.y * 157.0 + 113.0 * p.z;
    return mix(
      mix(mix(hash(vec3(n + 0.0)), hash(vec3(n + 1.0)), f.x),
          mix(hash(vec3(n + 157.0)), hash(vec3(n + 158.0)), f.x), f.y),
      mix(mix(hash(vec3(n + 113.0)), hash(vec3(n + 114.0)), f.x),
          mix(hash(vec3(n + 270.0)), hash(vec3(n + 271.0)), f.x), f.y),
      f.z
    );
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for(int i = 0; i < ${settings.nebulaQuality}; i++) {
      value += amplitude * noise(p * frequency);
      frequency *= 2.0;
      amplitude *= 0.5;
    }
    
    return value;
  }

  float voidRegions(vec3 coord) {
    vec3 voidCoord1 = coord * 0.0015;
    vec3 voidCoord2 = coord * 0.0023 + vec3(100.0, 50.0, 75.0);
    vec3 voidCoord3 = coord * 0.0008 + vec3(200.0, 150.0, 250.0);
    
    float voidNoise1 = fbm(voidCoord1);
    float voidNoise2 = fbm(voidCoord2);
    float voidNoise3 = fbm(voidCoord3);
    
    float combinedNoise = voidNoise1 * 0.5 + voidNoise2 * 0.3 + voidNoise3 * 0.2;
    
    float voidMask = smoothstep(0.28, 0.42, combinedNoise);
    ${desktopVoidDetail}
    return voidMask;
  }

  float realisticTwinkle(float seed, float time) {
    float slowWave = sin(time * 0.5 + seed * 6.28) * 0.5 + 0.5;
    float fastWave = sin(time * 2.0 + seed * 12.56) * 0.5 + 0.5;
    float twinkle = mix(slowWave, fastWave, 0.3);
    return 0.85 + twinkle * 0.15;
  }

  float stars(vec3 coord, float scale, float size) {
    vec3 grid = coord * scale;
    vec3 gridId = floor(grid);
    vec3 gridUv = fract(grid);
    
    float starHash = hash(gridId);
    
    if(starHash < ${starDensity}) return 0.0;
    
    vec2 starPos = vec2(
      hash(gridId + vec3(1.0)), 
      hash(gridId + vec3(2.0))
    );
    
    float dist = length(gridUv.xy - starPos);
    float twinkle = realisticTwinkle(starHash, uTime);
    
    float starCore = smoothstep(size * 1.5, 0.0, dist);
    float starGlow = smoothstep(size * 3.0, 0.0, dist) * 0.3;
    
    return (starCore + starGlow) * twinkle;
  }

  void main() {
    vec3 direction = normalize(vPosition);
    vec3 coord = direction * 500.0;
    
    float voidMask = voidRegions(coord);
    
    vec3 baseColor = mix(
      vec3(0.0, 0.0, 0.0),
      vec3(0.02, 0.02, 0.03),
      voidMask
    );
    
    float smallStars = stars(coord, 1.5, 0.025);
    vec3 smallStarColor = vec3(1.0, 0.95, 0.9) * smallStars * 0.8 * voidMask;
    ${mediumStarsBlock}
    float largeStars = stars(coord, 0.4, 0.05);
    vec3 largeStarColor = vec3(1.0, 0.98, 0.95) * largeStars * 1.5 * voidMask;
    
    vec3 nebulaCoord = coord * 0.002 + vec3(uTime * 0.01);
    
    float redNebula = fbm(nebulaCoord + vec3(5.0, 0.0, 0.0));
    redNebula = pow(redNebula, 2.5);
    ${bluePurpleNebula}
    
    float nebulaMask = mix(0.2, 1.0, voidMask);
    
    vec3 nebulaColor = vec3(0.0);
    nebulaColor += vec3(1.0, 0.2, 0.3) * redNebula * 0.15 * nebulaMask;
    ${bluePurpleColor}
    
    vec3 finalColor = baseColor;
    finalColor += smallStarColor;
    ${mediumStarsSum}
    finalColor += largeStarColor;
    finalColor += nebulaColor;
    
    float vignette = 1.0 - length(vUv - 0.5) * 0.3;
    finalColor *= vignette;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
}
