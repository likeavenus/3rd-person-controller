export const blackHoleVertexShader = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const blackHoleFragmentShader = `
  precision highp float;
  
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uCenterPix;
  uniform float uRadiusPix;
  uniform sampler2D uBackgroundTexture;
  
  vec2 rotate(vec2 v, float a) {
    float s = sin(a);
    float c = cos(a);
    mat2 m = mat2(c, -s, s, c);
    return m * v;
  }
  
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0,0.0)), f.x),
               mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for(int i=0; i<4; i++) { v += a*noise(p); p*=2.0; a*=0.5; }
    return v;
  }

  // Радиальная координата: круг в пикселях (учёт aspect), не в UV квадрата
  float radialDist() {
    vec2 p = gl_FragCoord.xy - uCenterPix;
    p.x *= uResolution.y / uResolution.x;
    return length(p) / max(uRadiusPix, 1.0);
  }
  
  void main() {
    float dist = radialDist();

    if (dist > 1.0) {
      discard;
    }
    
    vec2 screenUV = gl_FragCoord.xy / uResolution.xy;
    vec2 p = gl_FragCoord.xy - uCenterPix;
    p.x *= uResolution.y / uResolution.x;
    float swirlMask = smoothstep(0.9, 0.2, dist);
    vec2 distortionDir = normalize(p + 1e-6);
    float distortionStrength = 0.15 * pow(swirlMask, 2.0);
    float swirlAngle = (1.0 / (dist + 0.1)) * 2.0 - uTime * 1.5;
    vec2 offset = rotate(distortionDir, swirlAngle) * distortionStrength;
    vec4 bgColor = texture2D(uBackgroundTexture, screenUV + offset * swirlMask);
    
    float angle = atan(p.y, p.x) + uTime * 0.5;
    float spiralBase = angle * 3.0 + dist * 30.0 + uTime * 8.0;
    float spiral = sin(spiralBase) * 0.5 + 0.5;
    float turbulence = fbm(vec2(angle * 4.0, dist * 8.0 + uTime * 2.0));
    
    float innerRadius = 0.18;
    float middleRadius = 0.45;
    float outerRadius = 0.8;
    
    vec3 diskColor = vec3(0.0);
    float diskAlpha = 0.0;
    vec3 orange = vec3(1.0, 0.4, 0.05);
    vec3 brightYellow = vec3(1.0, 0.9, 0.5);
    
    if (dist > innerRadius && dist < middleRadius) {
      float t = (dist - innerRadius) / (middleRadius - innerRadius);
      float intensity = pow(spiral * turbulence, 1.2);
      diskColor = mix(orange, brightYellow, intensity) * 3.0 * (1.0 - t);
      diskAlpha = (1.0 - t) * 0.95;
    } else if (dist >= middleRadius && dist < outerRadius) {
      float t = (dist - middleRadius) / (outerRadius - middleRadius);
      float glow = pow(1.0 - t, 4.0);
      diskColor = orange * glow * 0.8;
      diskAlpha = glow * 0.6;
    }
    
    vec3 finalColor = bgColor.rgb;
    finalColor = mix(finalColor, diskColor, diskAlpha);
    
    if (dist < innerRadius) {
      finalColor = vec3(0.0);
    }
    
    float horizon = smoothstep(innerRadius, innerRadius + 0.015, dist)
                  * smoothstep(innerRadius + 0.03, innerRadius + 0.015, dist);
    finalColor += vec3(0.4, 0.7, 1.0) * horizon * 1.5;

    float alpha = smoothstep(1.0, 0.85, dist);
    gl_FragColor = vec4(finalColor, alpha);
  }
`;
