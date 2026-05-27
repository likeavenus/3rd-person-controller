import { PerspectiveCamera, Vector3 } from "three";
import { PerformanceManager } from "../utils/PerformanceManager";
import type { InputManager } from "../input/InputManager";
export class CameraController {
  camera;
  inputManager;
  offset = new Vector3(0, 2.5, 8);
  lookAtOffset = new Vector3(0, 1.8, 0);
  smoothing = 0.2;
  currentDistance = 3;
  minDistance = 3;
  maxDistance = 20;
  yaw = 0;
  pitch = 0.1;
  sensitivity = PerformanceManager.isMobile() ? 0.003 : 0.002;
  minPitch = -Math.PI / 4;
  maxPitch = Math.PI / 2.5;
  touchStartX = 0;
  touchStartY = 0;
  isTouching = false;
  constructor(e, t) {
    this.camera = e;
    this.inputManager = t;
    if (PerformanceManager.isMobile()) {
      this.setupTouchControls();
    }
  }
  setupTouchControls() {
    window.addEventListener("touchstart", e => {
      if (e.touches.length === 1) {
        this.isTouching = true;
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
      }
    });
    window.addEventListener("touchmove", e => {
      if (this.isTouching && e.touches.length === 1) {
        const t = e.touches[0].clientX - this.touchStartX;
        const n = e.touches[0].clientY - this.touchStartY;
        if (this.touchStartX > window.innerWidth / 2) {
          this.yaw -= t * this.sensitivity;
          this.pitch -= n * this.sensitivity;
          this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
        }
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
      }
    });
    window.addEventListener("touchend", () => {
      this.isTouching = false;
    });
  }
  getCamera() {
    return this.camera;
  }
  update(e) {
    this.handleInput();
    const t = new Vector3(0, this.offset.y, this.currentDistance);
    t.applyAxisAngle(new Vector3(0, 1, 0), this.yaw);
    const n = new Vector3(1, 0, 0);
    n.applyAxisAngle(new Vector3(0, 1, 0), this.yaw);
    t.applyAxisAngle(n, this.pitch);
    const i = e.clone().add(t);
    this.camera.position.lerp(i, this.smoothing);
    const r = e.clone().add(this.lookAtOffset);
    this.camera.lookAt(r);
  }
  handleInput() {
    if (!PerformanceManager.isMobile()) {
      const t = this.inputManager.getMouseDelta();
      if (Math.abs(t.x) > 0 || Math.abs(t.y) > 0) {
        this.yaw -= t.x * this.sensitivity;
        this.pitch -= t.y * this.sensitivity;
        this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
      }
    }
    const e = this.inputManager.getMouseWheel();
    if (e !== 0) {
      this.currentDistance += e * 0.015;
      this.currentDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.currentDistance));
    }
  }
  setDistance(e) {
    this.currentDistance = Math.max(this.minDistance, Math.min(this.maxDistance, e));
  }
  reset() {
    this.yaw = 0;
    this.pitch = 0.1;
    this.currentDistance = 8;
  }
}
