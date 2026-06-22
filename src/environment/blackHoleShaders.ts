export const blackHoleVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const blackHoleFragmentShader = `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform sampler2D uBackgroundTexture;

  varying vec2 vUv;

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

  void main() {
    // Плоскость квадратная в мире -> круг в UV = круг в мире = круг на экране.
    // Радиус всегда вписан в квадрат, поэтому края не обрезаются геометрией.
    vec2 center = vUv - 0.5;
    float dist = length(center) * 2.0; // 0 в центре, 1 на середине стороны квадрата

    if (dist > 1.0) {
      discard; // углы квадрата за пределами круга
    }

    // Искажение фона (линзирование как в Interstellar) — в экранных координатах
    vec2 screenUV = gl_FragCoord.xy / uResolution.xy;
    float swirlMask = smoothstep(0.95, 0.15, dist);
    vec2 distortionDir = normalize(center + 1e-6);
    float distortionStrength = 0.16 * pow(swirlMask, 2.0);
    float swirlAngle = (1.0 / (dist + 0.1)) * 2.0 - uTime * 1.5;
    vec2 offset = rotate(distortionDir, swirlAngle) * distortionStrength;
    vec4 bgColor = texture2D(uBackgroundTexture, screenUV + offset * swirlMask);

    // Аккреционный диск
    float angle = atan(center.y, center.x) + uTime * 0.5;
    float spiralBase = angle * 3.0 + dist * 30.0 + uTime * 8.0;
    float spiral = sin(spiralBase) * 0.5 + 0.5;
    float turbulence = fbm(vec2(angle * 4.0, dist * 8.0 + uTime * 2.0));

    float innerRadius = 0.18;
    float middleRadius = 0.45;
    float outerRadius = 0.82;

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

    // Горизонт событий
    if (dist < innerRadius) {
      finalColor = vec3(0.0);
    }

    // Тонкий голубой ободок линзы
    float horizon = smoothstep(innerRadius, innerRadius + 0.015, dist)
                  * smoothstep(innerRadius + 0.03, innerRadius + 0.015, dist);
    finalColor += vec3(0.4, 0.7, 1.0) * horizon * 1.5;

    // Мягкий край круга -> прозрачность до достижения стороны квадрата
    float alpha = smoothstep(1.0, 0.8, dist);
    gl_FragColor = vec4(finalColor, alpha);
  }
`;
