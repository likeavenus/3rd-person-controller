import { PerformanceManager } from "../utils/PerformanceManager";
export class PointerLockPrompt {
  prompt;
  constructor() {
    if (!PerformanceManager.isMobile()) {
      this.prompt = document.createElement("div");
      this.prompt.id = "pointer-lock-prompt";
      this.prompt.innerHTML = `
      <style>
        #pointer-lock-prompt {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 10px 20px;
          border-radius: 5px;
          font-family: Arial, sans-serif;
          font-size: 14px;
          opacity: 1;
          transition: opacity 0.3s;
          z-index: 1000;
          pointer-events: none;
        }
        
        #pointer-lock-prompt.hidden {
          opacity: 0;
        }
      </style>
      <span>🖱️ Кликни для управления камерой | ESC для выхода</span>
    `;
      document.body.appendChild(this.prompt);
      setTimeout(() => {
        this.prompt.classList.add("hidden");
      }, 5000);
      document.addEventListener("pointerlockchange", () => {
        if (document.pointerLockElement !== document.body) {
          this.prompt.classList.remove("hidden");
        } else {
          this.prompt.classList.add("hidden");
        }
      });
    }
  }
}
