import {
  Group,
  Mesh,
  Box3,
  Vector3,
  BoxGeometry,
  MeshStandardMaterial,
  PointLight,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AnimationManager } from "./AnimationManager";
import type { InputManager } from "../input/InputManager";
export class Character {
  scene;
  model = null;
  animationManager = null;
  inputManager;
  camera;
  loader;
  velocity = new Vector3();
  direction = new Vector3();
  currentSpeed = 0;
  walkSpeed = 2;
  runSpeed = 5;
  spacePressed = false;
  tPressed = false;
  useFallback = false;
  isRolling = false;
  isFlying = false;
  controlLocked = false;
  animationLocked = false;
  constructor(e, t, n) {
    this.scene = e;
    this.inputManager = t;
    this.camera = n;
    this.loader = new GLTFLoader();
  }
  async load() {
    const e = `${import.meta.env.BASE_URL}models/MainChar.glb`;
    console.log("🔍 Загружаем модель из:", e);
    return new Promise<void>((resolve) => {
      this.loader.load(
        e,
        (gltf) => {
          this.model = gltf.scene;
          this.setupModel(gltf);
          console.log("✅ Персонаж добавлен на сцену");
          resolve();
        },
        (progress) => {
          console.log(`📦 Загрузка: ${((progress.loaded / progress.total) * 100).toFixed(0)}%`);
        },
        (error) => {
          console.error("❌ Ошибка загрузки модели:", error);
          console.warn("⚠️ Модель не найдена, используем fallback куб");
          this.createFallbackCharacter();
          resolve();
        },
      );
    });
  }
  createFallbackCharacter() {
    this.useFallback = true;
    const e = new BoxGeometry(1, 2, 1);
    const t = new MeshStandardMaterial({
      color: 65416,
      roughness: 0.5,
      metalness: 0.3
    });
    const n = new Mesh(e, t);
    n.castShadow = true;
    n.receiveShadow = true;
    n.position.y = 1;
    this.model = new Group();
    this.model.add(n);
    this.scene.add(this.model);
    console.log("📦 Fallback персонаж (куб) создан");
  }
  setupModel(e) {
    if (!this.model) {
      return;
    }
    this.model.traverse(i => {
      if (i instanceof Mesh) {
        i.castShadow = true;
        i.receiveShadow = true;
      }
    });
    const n = new Box3().setFromObject(this.model).getCenter(new Vector3());
    this.model.position.set(-n.x, 0, -n.z);
    this.scene.add(this.model);
    this.animationManager = new AnimationManager(this.model, e.animations);
    this.animationManager.play("idle");
  }
  update(e) {
    if (this.model) {
      if (this.isRolling) {
        const n = new Vector3(0, 0, 1).applyQuaternion(this.model.quaternion);
        this.model.position.add(n.multiplyScalar(e * 4));
        this.animationManager?.update(e);
        return;
      }
      if (!this.useFallback && this.animationManager) {
        if (!this.controlLocked) {
          this.handleOneShotAnimations();
          if (!this.animationLocked) {
            this.updateAnimation();
          }
        }
        this.animationManager.update(e);
      }
      if (!this.controlLocked) {
        this.updateMovement(e);
      }
    }
  }
  handleOneShotAnimations() {
    if (!this.animationManager) {
      return;
    }
    const e = this.inputManager.getKeys();
    if (e.space && !this.spacePressed) {
      this.animationManager.playOneShot("jump");
      this.spacePressed = true;
    }
    if (!e.space) {
      this.spacePressed = false;
    }
    if (e.t && !this.tPressed) {
      this.playFallingAnimation();
      this.tPressed = true;
    }
    if (!e.t) {
      this.tPressed = false;
    }
  }
  playLandingRoll(e) {
    console.log("TODO: Реализовать playLandingRoll");
    e();
  }
  updateMovement(e) {
    if (!this.model) {
      return;
    }
    const t = this.inputManager.getKeys();
    this.direction.set(0, 0, 0);
    const n = new Vector3();
    this.camera.getWorldDirection(n);
    n.y = 0;
    n.normalize();
    const i = new Vector3();
    i.crossVectors(new Vector3(0, 1, 0), n).normalize();
    const r = new Vector3();
    if (t.w) {
      r.add(n);
    }
    if (t.s) {
      r.sub(n);
    }
    if (t.a) {
      r.add(i);
    }
    if (t.d) {
      r.sub(i);
    }
    if (r.length() > 0) {
      r.normalize();
      this.direction.copy(r);
      const a = t.shift ? this.runSpeed : this.walkSpeed;
      this.currentSpeed = this.direction.length() > 0 ? a : 0;
      if (this.currentSpeed > 0 && (this.model.position.x += this.direction.x * this.currentSpeed * e, this.model.position.z += this.direction.z * this.currentSpeed * e, this.direction.length() > 0.1)) {
        let c = Math.atan2(this.direction.x, this.direction.z) - this.model.rotation.y;
        while (c > Math.PI) {
          c -= Math.PI * 2;
        }
        while (c < -Math.PI) {
          c += Math.PI * 2;
        }
        const h = c * Math.min(e * 10, 1);
        this.model.rotation.y += h;
      }
    } else {
      this.currentSpeed = 0;
    }
  }
  playLandingAnimation(e, t) {
    if (!this.animationManager) {
      t();
      return;
    }
    console.log(`🎬 Старт кувырка: ${e}`);
    this.animationLocked = true;
    this.controlLocked = true;
    this.animationManager.switchTo(e, 0.1);
    this.isRolling = true;
    setTimeout(() => {
      console.log("✅ Кувырок завершен");
      this.isRolling = false;
      this.animationLocked = false;
      this.animationManager?.switchTo("idle", 0.2);
      t();
    }, 1500);
  }
  updateAnimation() {
    if (!this.animationManager) {
      return;
    }
    const e = this.currentSpeed > 0;
    const t = this.currentSpeed === this.runSpeed;
    let n = "idle";
    if (e) {
      n = t ? "run" : "walk";
    }
    this.animationManager.switchTo(n);
  }
  playFallingAnimation() {
    if (!this.animationManager) {
      console.warn("⚠️ AnimationManager не инициализирован");
      return;
    }
    const available = this.animationManager.getAvailableAnimations();
    const t =
      available.find((n) => /fall/i.test(n)) ??
      available.find((n) => /idle/i.test(n));
    if (t) {
      this.animationLocked = true;
      this.animationManager.switchTo(t, 0.3);
    } else {
      console.warn("⚠️ Анимация fall не найдена. Доступны:", available);
    }
  }
  initFallingToBlackHole(triggerRadius: number, _currentDist: number) {
    this.playFallingAnimation();
    const model = this.getModel();
    if (model) {
      model.scale.set(1, 1, 1);
    }
    console.log(`🕳️ Засасывание: радиус ${triggerRadius}, анимация падения`);
  }

  applyBlackHoleStretch(stretch: number, pullDirection: Vector3) {
    const model = this.getModel();
    if (!model) return;
    model.lookAt(model.position.clone().add(pullDirection));
    model.scale.set(1, 1 / Math.sqrt(stretch), stretch);
  }
  setPosition(e) {
    if (this.model) {
      this.model.position.copy(e);
    }
  }
  setControlLocked(e) {
    this.controlLocked = e;
  }
  unlockAnimation() {
    this.animationLocked = false;
  }
  lookAt(e) {
    if (this.model) {
      this.model.lookAt(e);
    }
  }
  setVisible(e) {
    if (this.model) {
      this.model.visible = e;
    }
  }
  getPosition() {
    if (this.model) {
      return this.model.position.clone();
    } else {
      return new Vector3();
    }
  }
  getModel() {
    return this.model;
  }
  addFlashlight() {
    if (!this.model || this.model.getObjectByName("CharLight")) {
      return;
    }
    const e = new PointLight(16755200, 30, 20);
    e.name = "CharLight";
    e.position.set(0, 2, 1);
    e.castShadow = true;
    this.model.add(e);
  }
  resetVelocity() {
    this.velocity.set(0, 0, 0);
    this.direction.set(0, 0, 0);
    this.currentSpeed = 0;
    this.animationLocked = false;
    if (this.animationManager) {
      this.animationManager.switchTo("idle");
    }
  }
  setFlyingMode(e) {
    this.isFlying = e;
    if (e) {
      this.resetVelocity();
    }
  }
}
