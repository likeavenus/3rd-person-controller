import { PerspectiveCamera, MathUtils } from "three";
export class CameraManager {
  camera;
  targetFOV = 75;
  constructor() {
    this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2500);
    this.camera.position.set(0, 2, 5);
  }
  setFOV(e) {
    this.targetFOV = e;
  }
  update(e) {
    if (Math.abs(this.camera.fov - this.targetFOV) > 0.1) {
      this.camera.fov = MathUtils.lerp(this.camera.fov, this.targetFOV, 0.05);
      this.camera.updateProjectionMatrix();
    }
  }
  toggleFov() {
    let e = 115;
    if (this.camera.fov === e) {
      e = 75;
    }
    this.camera.fov = e;
    this.camera.updateProjectionMatrix();
  }
  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}
