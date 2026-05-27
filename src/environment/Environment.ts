import { Scene, PlaneGeometry, GridHelper, AdditiveBlending } from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
export class Environment {
  reflectorFloor;
  gridHelper;
  constructor(e) {
    const t = new PlaneGeometry(50, 50);
    this.reflectorFloor = new Reflector(t, {
      clipBias: 0.003,
      textureWidth: window.innerWidth * window.devicePixelRatio,
      textureHeight: window.innerHeight * window.devicePixelRatio,
      color: 2236996
    });
    this.reflectorFloor.rotation.x = -Math.PI / 2;
    this.reflectorFloor.position.y = 0;
    e.add(this.reflectorFloor);
    this.gridHelper = new GridHelper(50, 50, 4491519, 2245802);
    this.gridHelper.position.y = 0.01;
    this.gridHelper.material.opacity = 0.15;
    this.gridHelper.material.transparent = true;
    this.gridHelper.material.blending = AdditiveBlending;
    e.add(this.gridHelper);
    console.log("🪞 Отражающий пол создан");
  }
  setVisible(e) {
    this.reflectorFloor.visible = e;
    this.gridHelper.visible = e;
  }
  onResize() {}
}
