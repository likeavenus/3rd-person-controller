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
  cameraTouchId = null;
  constructor(e, t) {
    this.camera = e;
    this.inputManager = t;
    if (PerformanceManager.isMobile()) {
      this.setupTouchControls();
    }
  }
  setupTouchControls() {
    const isUiTouch = target => {
      const el = target;
      return !!(el && el.closest && el.closest("#joystick-container, #buttons-container"));
    };

    window.addEventListener(
      "touchstart",
      e => {
        if (this.isTouching) return;
        // Берём первый палец, который НЕ на UI — им вращаем камеру.
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (isUiTouch(touch.target)) continue;
          this.isTouching = true;
          this.cameraTouchId = touch.identifier;
          this.touchStartX = touch.clientX;
          this.touchStartY = touch.clientY;
          break;
        }
      },
      { passive: true }
    );

    window.addEventListener(
      "touchmove",
      e => {
        if (!this.isTouching) return;
        const touch = this.findTouch(e.changedTouches, this.cameraTouchId);
        if (!touch) return;
        const dx = touch.clientX - this.touchStartX;
        const dy = touch.clientY - this.touchStartY;
        this.yaw -= dx * this.sensitivity;
        this.pitch -= dy * this.sensitivity;
        this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
      },
      { passive: true }
    );

    const release = e => {
      if (!this.isTouching) return;
      if (this.findTouch(e.changedTouches, this.cameraTouchId)) {
        this.isTouching = false;
        this.cameraTouchId = null;
      }
    };
    window.addEventListener("touchend", release);
    window.addEventListener("touchcancel", release);
  }
  findTouch(touchList, id) {
    if (id === null) return null;
    for (let i = 0; i < touchList.length; i++) {
      if (touchList[i].identifier === id) return touchList[i];
    }
    return null;
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
