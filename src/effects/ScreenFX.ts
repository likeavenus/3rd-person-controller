import {
  Scene,
  OrthographicCamera,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
} from "three";
import type { WebGLRenderer } from "three";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uProgress; // 0..1 — сила засасывания в чёрную дыру
  uniform float uBlack;    // 0..1 — плоское затемнение (для fade in/out)
  uniform vec2 uResolution;

  void main() {
    vec2 c = vUv - 0.5;
    c.x *= uResolution.x / max(uResolution.y, 1.0); // круглый эффект на любом экране
    float r = length(c);
    float a = atan(c.y, c.x);

    // Спиральные потоки материи, ускоряющиеся к центру
    float spiral = a * 4.0 + log(r + 0.03) * 9.0 - uTime * 5.0 - uProgress * 14.0;
    float streaks = pow(sin(spiral) * 0.5 + 0.5, 3.0);
    float falloff = smoothstep(1.1, 0.05, r);
    float glow = streaks * falloff * (0.4 + uProgress * 2.4);
    vec3 color = mix(vec3(1.0, 0.55, 0.12), vec3(1.0, 0.92, 0.65), streaks) * glow;

    // Растущий горизонт событий — чёрный диск, поглощающий экран
    float blackR = uProgress * uProgress * 1.5;
    float hole = smoothstep(blackR, blackR - 0.18, r);
    color = mix(color, vec3(0.0), hole);

    // Финальное полное затемнение к концу засасывания
    color = mix(color, vec3(0.0), smoothstep(0.82, 1.0, uProgress));

    float warpAlpha = max(hole, glow);
    warpAlpha = mix(warpAlpha, 1.0, smoothstep(0.72, 1.0, uProgress));

    // Плоское затемнение (fade)
    color = mix(color, vec3(0.0), uBlack);
    float alpha = max(warpAlpha, uBlack);

    if (alpha <= 0.001) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

/** Полноэкранный пост-оверлей, рисуется отдельным проходом поверх сцены. */
export class ScreenFX {
  scene = new Scene();
  camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  material: ShaderMaterial;

  private warpActive = false;
  private warpTime = 0;
  private warpDuration = 2.2;
  private warpProgress = 0;
  private onWarpComplete: (() => void) | null = null;

  private blackValue = 0;
  private blackTarget = 0;
  private blackSpeed = 1.2;
  private onFadeDone: (() => void) | null = null;

  constructor(resolution: Vector2) {
    this.material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uBlack: { value: 0 },
        uResolution: { value: resolution.clone() },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const quad = new Mesh(new PlaneGeometry(2, 2), this.material);
    quad.frustumCulled = false;
    this.scene.add(quad);
  }

  startWarp(duration: number, onComplete: () => void) {
    this.warpActive = true;
    this.warpTime = 0;
    this.warpProgress = 0;
    this.warpDuration = duration;
    this.onWarpComplete = onComplete;
  }

  /** Экран сейчас полностью чёрный -> плавно проявить сцену. */
  fadeFromBlack(speed = 0.8, onDone?: () => void) {
    this.material.uniforms.uProgress.value = 0;
    this.warpProgress = 0;
    this.material.uniforms.uBlack.value = 1;
    this.blackValue = 1;
    this.blackTarget = 0;
    this.blackSpeed = speed;
    this.onFadeDone = onDone ?? null;
  }

  setBlack(v: number) {
    this.blackValue = v;
    this.blackTarget = v;
    this.material.uniforms.uBlack.value = v;
  }

  /** Плавно затемнить экран в чёрный, затем выполнить колбэк. */
  fadeToBlack(speed = 2.0, onDone?: () => void) {
    this.material.uniforms.uProgress.value = 0;
    this.warpProgress = 0;
    this.warpActive = false;
    this.blackTarget = 1;
    this.blackSpeed = speed;
    this.onFadeDone = onDone ?? null;
  }

  update(dt: number) {
    this.material.uniforms.uTime.value += dt;

    if (this.warpActive) {
      this.warpTime += dt;
      this.warpProgress = Math.min(this.warpTime / this.warpDuration, 1);
      this.material.uniforms.uProgress.value = this.warpProgress;
      if (this.warpProgress >= 1) {
        this.warpActive = false;
        this.material.uniforms.uBlack.value = 1;
        this.blackValue = 1;
        this.blackTarget = 1;
        const cb = this.onWarpComplete;
        this.onWarpComplete = null;
        if (cb) cb();
      }
    }

    if (Math.abs(this.blackValue - this.blackTarget) > 0.002) {
      const step = Math.min(dt * this.blackSpeed, 1);
      this.blackValue += (this.blackTarget - this.blackValue) * step;
      this.material.uniforms.uBlack.value = this.blackValue;
    } else if (this.blackValue !== this.blackTarget || this.onFadeDone) {
      this.blackValue = this.blackTarget;
      this.material.uniforms.uBlack.value = this.blackValue;
      if (this.onFadeDone) {
        const cb = this.onFadeDone;
        this.onFadeDone = null;
        cb();
      }
    }
  }

  private get isVisible() {
    return this.warpProgress > 0 || this.blackValue > 0.002;
  }

  render(renderer: WebGLRenderer) {
    if (!this.isVisible) return;
    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.render(this.scene, this.camera);
    renderer.autoClear = prevAutoClear;
  }

  onResize(resolution: Vector2) {
    (this.material.uniforms.uResolution.value as Vector2).copy(resolution);
  }
}
