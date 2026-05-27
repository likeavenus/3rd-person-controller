import { Scene, AmbientLight, DirectionalLight, HemisphereLight } from "three";
export class LightingManager {
  ambientLight;
  directionalLight;
  hemisphereLight;
  fillLight;
  constructor(e) {
    this.ambientLight = new AmbientLight(1710638, 0.3);
    e.add(this.ambientLight);
    this.hemisphereLight = new HemisphereLight(8900331, 3351057, 0.4);
    this.hemisphereLight.position.set(0, 50, 0);
    e.add(this.hemisphereLight);
    this.directionalLight = new DirectionalLight(16777215, 0.5);
    this.directionalLight.position.set(10, 20, 5);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 100;
    this.directionalLight.shadow.camera.left = -30;
    this.directionalLight.shadow.camera.right = 30;
    this.directionalLight.shadow.camera.top = 30;
    this.directionalLight.shadow.camera.bottom = -30;
    this.directionalLight.shadow.bias = -0.0001;
    e.add(this.directionalLight);
    this.fillLight = new DirectionalLight(4482815, 0.3);
    this.fillLight.position.set(-5, 10, -5);
    e.add(this.fillLight);
    console.log("💡 Профессиональное освещение настроено");
  }
  update(e) {
    const t = Math.sin(e * 0.5) * 0.1 + 0.9;
    this.hemisphereLight.intensity = t * 0.4;
  }
}
