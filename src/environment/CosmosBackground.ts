import { Scene, ShaderMaterial, SphereGeometry, Mesh, MathUtils, DoubleSide, Camera } from "three";
import { PerformanceManager } from "../utils/PerformanceManager";
import { cosmosVertexShader, buildCosmosFragmentShader } from "./cosmosShaders";
export class CosmosBackground {
  mesh;
  material;
  targetOpacity = 1;
  currentOpacity = 1;
  constructor(e) {
    const t = PerformanceManager.getOptimalSettings();
    this.material = new ShaderMaterial({
      vertexShader: cosmosVertexShader,
      fragmentShader: buildCosmosFragmentShader(),
      uniforms: {
        uTime: {
          value: 0
        },
        uOpacity: {
          value: 1
        }
      },
      side: DoubleSide,
      transparent: true
    });
    const n = new SphereGeometry(1000, t.sphereSegments, t.sphereSegments);
    this.mesh = new Mesh(n, this.material);
    e.add(this.mesh);
    console.log("🌌 CosmosBackground создан с поддержкой fade");
  }
  update(e, t) {
    this.mesh.position.copy(t.position);
    this.material.uniforms.uTime.value += e;
    if (Math.abs(this.currentOpacity - this.targetOpacity) > 0.01) {
      this.currentOpacity = MathUtils.lerp(this.currentOpacity, this.targetOpacity, e * 2);
      this.material.uniforms.uOpacity.value = this.currentOpacity;
    }
  }
  setVisible(e) {
    if (this.mesh) {
      this.mesh.visible = e;
    }
  }
  fadeOut(e = 1) {
    this.targetOpacity = 0;
    console.log("🌑 Звезды гаснут...");
  }
  fadeIn(e = 1) {
    this.targetOpacity = 1;
    console.log("✨ Звезды возвращаются...");
  }
  setOpacity(e) {
    this.targetOpacity = e;
    this.currentOpacity = e;
    this.material.uniforms.uOpacity.value = e;
  }
}
