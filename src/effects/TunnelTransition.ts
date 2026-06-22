import {
  Scene,
  PerspectiveCamera,
  BufferGeometry,
  BufferAttribute,
  Points,
  ShaderMaterial,
  AdditiveBlending,
} from "three";
import type { WebGLRenderer } from "three";
import { PerformanceManager } from "../utils/PerformanceManager";

const LENGTH = 600;

/** Полёт сквозь туннель из частиц (как гиперпространство в кино). Своя сцена и камера. */
export class TunnelTransition {
  scene = new Scene();
  camera: PerspectiveCamera;
  private points: Points;
  private geometry: BufferGeometry;
  private material: ShaderMaterial;
  private positions: Float32Array;
  private speeds: Float32Array;
  private count: number;

  private active = false;
  private time = 0;
  private duration = 3.4;

  constructor() {
    this.camera = new PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, LENGTH + 50);
    this.camera.position.set(0, 0, 0);

    this.count = PerformanceManager.isMobile() ? 1600 : 4200;
    this.geometry = new BufferGeometry();
    this.positions = new Float32Array(this.count * 3);
    this.speeds = new Float32Array(this.count);
    const colors = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      this.respawn(i, Math.random() * LENGTH);
      // палитра: голубой/бирюзовый/белый + редкие тёплые искры
      const warm = Math.random() > 0.82;
      if (warm) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.7;
        colors[i * 3 + 2] = 0.35;
      } else {
        const c = Math.random();
        colors[i * 3] = 0.5 + c * 0.5;
        colors[i * 3 + 1] = 0.75 + c * 0.25;
        colors[i * 3 + 2] = 1.0;
      }
      sizes[i] = 1.5 + Math.random() * 3.5;
      this.speeds[i] = 0.6 + Math.random() * 0.8;
    }

    this.geometry.setAttribute("position", new BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("color", new BufferAttribute(colors, 3));
    this.geometry.setAttribute("size", new BufferAttribute(sizes, 1));

    this.material = new ShaderMaterial({
      uniforms: { uSpeed: { value: 0 } },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vZ;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vZ = -mv.z;
          gl_PointSize = size * (320.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vZ;
        void main() {
          vec2 d = gl_PointCoord - vec2(0.5);
          float dist = length(d);
          if (dist > 0.5) discard;
          float alpha = pow(1.0 - smoothstep(0.0, 0.5, dist), 2.0);
          // дальние частицы тусклее
          float depth = clamp(1.0 - vZ / 600.0, 0.0, 1.0);
          gl_FragColor = vec4(vColor + vec3(0.3), alpha * (0.4 + depth * 0.6));
        }
      `,
      vertexColors: true,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });

    this.points = new Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  private respawn(i: number, z: number) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 6 + Math.random() * 26;
    this.positions[i * 3] = Math.cos(angle) * radius;
    this.positions[i * 3 + 1] = Math.sin(angle) * radius;
    this.positions[i * 3 + 2] = -z;
  }

  start(duration = 3.4) {
    this.active = true;
    this.time = 0;
    this.duration = duration;
  }

  /** @returns прогресс 0..1 */
  update(dt: number): number {
    if (!this.active) return 0;
    this.time += dt;
    const p = Math.min(this.time / this.duration, 1);

    // плавный разгон в середине, торможение к концу
    const ramp = Math.sin(p * Math.PI);
    const speed = (120 + ramp * 520) * dt;
    this.material.uniforms.uSpeed.value = speed;

    const pos = this.geometry.getAttribute("position") as BufferAttribute;
    for (let i = 0; i < this.count; i++) {
      this.positions[i * 3 + 2] += this.speeds[i] * speed;
      if (this.positions[i * 3 + 2] > 10) {
        this.respawn(i, LENGTH);
      }
    }
    pos.needsUpdate = true;
    this.points.rotation.z += dt * 0.5;

    return p;
  }

  render(renderer: WebGLRenderer) {
    renderer.render(this.scene, this.camera);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
