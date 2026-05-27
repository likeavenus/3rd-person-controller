import {
  Scene,
  BufferGeometry,
  BufferAttribute,
  ShaderMaterial,
  Points,
  AdditiveBlending,
  Vector3,
} from "three";
export class ParticleTunnel {
  particleSystem;
  geometry;
  material;
  particleCount = 8000;
  positions;
  colors;
  sizes;
  speeds;
  scene;
  isActive = false;
  tunnelProgress = 0;
  constructor(e) {
    this.scene = e;
    this.geometry = new BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.sizes = new Float32Array(this.particleCount);
    this.speeds = new Float32Array(this.particleCount);
    this.initParticles();
    this.geometry.setAttribute("position", new BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("color", new BufferAttribute(this.colors, 3));
    this.geometry.setAttribute("size", new BufferAttribute(this.sizes, 1));
    this.material = new ShaderMaterial({
      uniforms: {
        uTime: {
          value: 0
        }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          alpha = pow(alpha, 2.0);
          
          float core = smoothstep(0.3, 0.0, dist);
          vec3 finalColor = vColor + vec3(core * 0.5);
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      vertexColors: true,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false
    });
    this.particleSystem = new Points(this.geometry, this.material);
    this.particleSystem.visible = false;
    e.add(this.particleSystem);
    console.log("🌌 ParticleTunnel создан с", this.particleCount, "частиц");
  }
  initParticles() {
    for (let e = 0; e < this.particleCount; e++) {
      const t = e * 3;
      const n = e / this.particleCount * 500;
      const i = n * 0.6 + Math.random() * 0.5;
      const o = 8 + Math.floor(Math.random() * 3) * 4 + Math.sin(n * 0.15) * 2;
      this.positions[t] = Math.cos(i) * o;
      this.positions[t + 1] = Math.sin(i) * o;
      this.positions[t + 2] = -n;
      const c = e / this.particleCount;
      if (Math.random() > 0.7) {
        this.colors[t] = 1;
        this.colors[t + 1] = 0.8;
        this.colors[t + 2] = 0.3;
      } else {
        this.colors[t] = 1 - c * 0.6;
        this.colors[t + 1] = 0.5 - c * 0.3;
        this.colors[t + 2] = c * 0.8;
      }
      this.sizes[e] = Math.random() * 3 + 1;
      this.speeds[e] = Math.random() * 0.8 + 0.4;
    }
  }
  activate(e) {
    this.isActive = true;
    this.tunnelProgress = 0;
    this.particleSystem.visible = true;
    this.particleSystem.position.copy(e);
    console.log("🌌 Туннель активирован на позиции:", e);
  }
  update(e, t) {
    if (!this.isActive) {
      return 0;
    }
    this.tunnelProgress += e * 5;
    const n = this.geometry.getAttribute("position");
    for (let i = 0; i < this.particleCount; i++) {
      const r = i * 3;
      this.positions[r + 2] += this.speeds[i] * 50 * e;
      if (this.positions[r + 2] > 20) {
        this.positions[r + 2] -= 520;
      }
    }
    n.needsUpdate = true;
    this.particleSystem.rotation.z += e * 0.4;
    this.material.uniforms.uTime.value += e;
    return this.tunnelProgress;
  }
  deactivate() {
    this.isActive = false;
    this.particleSystem.visible = false;
    console.log("🌌 Туннель деактивирован");
  }
  isRunning() {
    return this.isActive;
  }
  getPosition() {
    return this.particleSystem.position.clone();
  }
}
