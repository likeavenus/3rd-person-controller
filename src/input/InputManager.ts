import { PerformanceManager } from "../utils/PerformanceManager";
import { MobileControls } from "./MobileControls";
export class InputManager {
  keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false,
    space: false,
    e: false,
    t: false
  };
  mouseButtons = {
    left: false,
    right: false
  };
  mouseDelta = {
    x: 0,
    y: 0
  };
  mouseWheel = 0;
  pointerLocked = false;
  mobileControls = null;
  constructor() {
    this.setupKeyboardListeners();
    this.setupMouseListeners();
    if (PerformanceManager.isMobile()) {
      this.mobileControls = new MobileControls();
      console.log("📱 Мобильное управление активировано");
    } else {
      this.setupPointerLock();
    }
  }
  setupPointerLock() {
    document.addEventListener("click", () => {
      if (!this.pointerLocked) {
        document.body.requestPointerLock();
      }
    });
    document.addEventListener("pointerlockchange", () => {
      this.pointerLocked = document.pointerLockElement === document.body;
      if (this.pointerLocked) {
        console.log("🔒 Pointer locked - камера управляется мышью");
      } else {
        console.log("🔓 Pointer unlocked");
      }
    });
  }
  setupKeyboardListeners() {
    window.addEventListener("keydown", e => {
      const t = e.key.toLowerCase();
      if (t in this.keys) {
        this.keys[t] = true;
      }
      if (t === "escape") {
        document.exitPointerLock();
      }
    });
    window.addEventListener("keyup", e => {
      const t = e.key.toLowerCase();
      if (t in this.keys) {
        this.keys[t] = false;
      }
    });
  }
  setupMouseListeners() {
    window.addEventListener("mousedown", e => {
      if (e.button === 0) {
        this.mouseButtons.left = true;
      }
      if (e.button === 2) {
        this.mouseButtons.right = true;
      }
    });
    window.addEventListener("mouseup", e => {
      if (e.button === 0) {
        this.mouseButtons.left = false;
      }
      if (e.button === 2) {
        this.mouseButtons.right = false;
      }
    });
    window.addEventListener("mousemove", e => {
      this.mouseDelta.x = e.movementX * 7;
      this.mouseDelta.y = e.movementY * 7;
    });
    window.addEventListener("wheel", e => {
      this.mouseWheel = e.deltaY;
    });
    window.addEventListener("contextmenu", e => e.preventDefault());
  }
  getKeys() {
    if (this.mobileControls) {
      const e = this.mobileControls.getKeys();
      return {
        ...this.keys,
        w: this.keys.w || e.w,
        a: this.keys.a || e.a,
        s: this.keys.s || e.s,
        d: this.keys.d || e.d,
        shift: this.keys.shift || e.shift,
        space: this.keys.space || e.space,
        e: this.keys.e || e.e
      };
    }
    return this.keys;
  }
  getMouseButtons() {
    return this.mouseButtons;
  }
  getMouseDelta() {
    const e = {
      ...this.mouseDelta
    };
    this.mouseDelta = {
      x: 0,
      y: 0
    };
    return e;
  }
  getMouseWheel() {
    const e = this.mouseWheel;
    this.mouseWheel = 0;
    return e;
  }
  isPointerLocked() {
    return this.pointerLocked;
  }
}
