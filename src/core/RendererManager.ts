import { WebGLRenderer, PCFSoftShadowMap } from "three";
import { PerformanceManager } from "../utils/PerformanceManager";
export class RendererManager {
  renderer;
  settings = PerformanceManager.getOptimalSettings();
  constructor() {
    this.renderer = new WebGLRenderer({
      antialias: this.settings.antialias,
      powerPreference: PerformanceManager.isMobile() ? "low-power" : "high-performance",
      stencil: false,
      depth: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(this.settings.pixelRatio);
    if (this.settings.enableShadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = PCFSoftShadowMap;
    }
    if (PerformanceManager.isMobile()) {
      const gl = this.renderer.getContext();
      gl.getExtension("WEBGL_lose_context");
    }
    document.body.appendChild(this.renderer.domElement);
    console.log(`📱 Рендерер настроен для ${PerformanceManager.isMobile() ? "мобильных" : "desktop"} устройств`);
  }
  render(e, t) {
    this.renderer.render(e, t);
  }
  onResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
