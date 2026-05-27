import { AnimationMixer, LoopRepeat, LoopOnce, type AnimationClip, type Object3D } from "three";
export class AnimationManager {
  mixer;
  actions = new Map();
  currentAnimation = "idle";
  isPlayingOneShot = false;
  constructor(e, t) {
    this.mixer = new AnimationMixer(e);
    this.setupAnimations(t);
  }
  setupAnimations(e) {
    e.forEach(t => {
      const n = this.mixer.clipAction(t);
      const i = t.name.toLowerCase();
      if (i === "fall" || i === "falling") {
        n.setLoop(LoopRepeat, Infinity);
        n.setEffectiveTimeScale(1.5);
        console.log(`🔄 "${t.name}" - Loop анимация (ускорена x1.5)`);
      } else if (["idle", "walk", "run"].includes(i)) {
        n.setLoop(LoopRepeat, Infinity);
        console.log(`🔄 "${t.name}" - Loop анимация`);
      } else if (["jump", "high_kick"].includes(i)) {
        n.setLoop(LoopOnce, 1);
        n.clampWhenFinished = true;
        n.setEffectiveTimeScale(1);
        console.log(`⚡ "${t.name}" - One-shot анимация`);
      } else {
        n.setLoop(LoopRepeat, Infinity);
        console.log(`🔄 "${t.name}" - Loop анимация (default)`);
      }
      this.actions.set(t.name, n);
    });
    console.log("🎬 Все анимации загружены:", Array.from(this.actions.keys()));
  }
  play(e) {
    const t = this.actions.get(e);
    if (t) {
      t.play();
      this.currentAnimation = e;
    }
  }
  switchTo(e, t = 0.2) {
    if (this.currentAnimation === e) {
      return;
    }
    const n = this.actions.get(e);
    if (!n) {
      console.warn(`⚠️ Анимация "${e}" не найдена!`);
      return;
    }
    const i = n.loop === LoopOnce;
    if (this.isPlayingOneShot && i) {
      console.log("⏸️ One-shot анимация уже играет, пропускаем");
      return;
    }
    const r = this.actions.get(this.currentAnimation);
    if (r) {
      r.fadeOut(t);
    }
    n.reset();
    n.fadeIn(t);
    n.play();
    this.currentAnimation = e;
    if (!i) {
      this.isPlayingOneShot = false;
    }
    console.log(`🎬 Переключение: → ${e} (loop: ${n.loop === LoopRepeat})`);
  }
  playOneShot(e) {
    const t = this.actions.get(e);
    if (!t) {
      console.warn(`⚠️ Анимация "${e}" не найдена`);
      return;
    }
    if (this.isPlayingOneShot) {
      return;
    }
    this.isPlayingOneShot = true;
    const n = this.currentAnimation;
    const i = this.actions.get(this.currentAnimation);
    if (i) {
      i.fadeOut(0.1);
    }
    t.reset().fadeIn(0.1).play();
    const r = a => {
      if (a.action === t) {
        this.mixer.removeEventListener("finished", r);
        t.fadeOut(0.2);
        const o = this.actions.get(n);
        if (o) {
          o.reset().fadeIn(0.2).play();
        }
        this.isPlayingOneShot = false;
        this.currentAnimation = n;
        console.log(`✅ Анимация "${e}" завершена`);
      }
    };
    this.mixer.addEventListener("finished", r);
  }
  update(e) {
    this.mixer.update(e);
  }
  hasAnimation(e) {
    return this.actions.has(e);
  }
  isPlaying(e) {
    const t = this.actions.get(e);
    if (t) {
      return t.isRunning();
    } else {
      return false;
    }
  }
  getAvailableAnimations() {
    return Array.from(this.actions.keys());
  }
  getAnimationInfo(e) {
    const t = this.actions.get(e);
    if (t) {
      return {
        duration: t.getClip().duration,
        loop: t.loop === LoopRepeat
      };
    } else {
      return null;
    }
  }
}
