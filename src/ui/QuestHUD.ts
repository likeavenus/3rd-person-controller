import type { PlanetInfo } from "../solar/planetData";
import type { PlanetScreenInfo } from "../solar/SolarMapController";

const STYLE = `
  :root { --font-display: "Orbitron", "Segoe UI", sans-serif;
    --font-body: "Space Grotesk", "Segoe UI", system-ui, sans-serif; }

  #quest-hud { position: fixed; inset: 0; pointer-events: none; z-index: 900;
    font-family: var(--font-body); color: #eaf2ff; opacity: 0;
    transition: opacity 0.8s ease; }
  #quest-hud.visible { opacity: 1; }

  #quest-bar { position: absolute; top: 24px; left: 50%; transform: translateX(-50%);
    min-width: 300px; max-width: 92vw; padding: 16px 26px; text-align: center;
    background: linear-gradient(180deg, rgba(14,22,46,0.72), rgba(8,12,30,0.72));
    border: 1px solid rgba(120, 190, 255, 0.28); border-radius: 16px;
    backdrop-filter: blur(14px); box-shadow: 0 10px 50px rgba(30, 70, 180, 0.28); }
  #quest-counter { font-family: var(--font-display); font-size: 11px; font-weight: 600;
    letter-spacing: 3px; text-transform: uppercase; color: #6fd2ff; margin-bottom: 6px; }
  #quest-objective { font-family: var(--font-display); font-size: 16px; font-weight: 600;
    letter-spacing: 0.5px; }
  #quest-progress { margin-top: 12px; height: 5px; border-radius: 3px;
    background: rgba(120, 160, 255, 0.16); overflow: hidden; }
  #quest-progress > div { height: 100%; width: 0%; border-radius: 3px;
    background: linear-gradient(90deg, #4ea9ff, #9b6bff); transition: width 0.6s ease;
    box-shadow: 0 0 12px rgba(120,150,255,0.6); }

  .planet-label { position: absolute; transform: translate(-50%, -160%);
    font-family: var(--font-display); font-size: 12px; font-weight: 500; letter-spacing: 1.5px;
    text-transform: uppercase; white-space: nowrap; pointer-events: none;
    padding: 4px 11px; border-radius: 11px; color: #d4ebff;
    background: rgba(8, 14, 32, 0.5); border: 1px solid rgba(120, 180, 255, 0.22);
    text-shadow: 0 1px 6px rgba(0,0,0,0.6); transition: opacity 0.2s ease; }
  .planet-label.visited { color: #8effc0; border-color: rgba(120, 255, 180, 0.4); }
  .planet-label .check { color: #8effc0; margin-left: 6px; }

  #quest-panel { position: absolute; top: 0; right: 0; height: 100%;
    width: min(440px, 92vw); padding: 84px 38px 44px; box-sizing: border-box;
    background: linear-gradient(180deg, rgba(12,18,42,0.97), rgba(6,9,24,0.99));
    border-left: 1px solid rgba(120, 190, 255, 0.28);
    transform: translateX(110%); transition: transform 0.55s cubic-bezier(.2,.8,.2,1);
    pointer-events: auto; overflow-y: auto; box-shadow: -24px 0 70px rgba(0,0,0,0.55); }
  #quest-panel.open { transform: translateX(0); }
  #quest-panel .tag { font-family: var(--font-display); font-size: 11px; font-weight: 600;
    letter-spacing: 4px; text-transform: uppercase; color: #6fd2ff; }
  #quest-panel h2 { font-family: var(--font-display); font-weight: 700; margin: 10px 0 22px;
    font-size: 27px; line-height: 1.2; }
  #quest-panel p { font-size: 15.5px; line-height: 1.7; color: #c4d4ee; margin: 0 0 15px; }
  #quest-panel .close { position: absolute; top: 24px; right: 24px; width: 40px; height: 40px;
    border-radius: 50%; border: 1px solid rgba(150,190,255,0.4); background: rgba(255,255,255,0.05);
    color: #fff; font-size: 22px; line-height: 1; cursor: pointer; pointer-events: auto;
    transition: background 0.2s ease; }
  #quest-panel .close:hover { background: rgba(255,255,255,0.14); }
  #quest-panel .back { font-family: var(--font-display); font-size: 12px; font-weight: 600;
    letter-spacing: 1px; margin-top: 18px; padding: 14px 18px; border-radius: 12px;
    border: 1px solid rgba(120,180,255,0.4); background: rgba(80,140,255,0.12);
    color: #eaf2ff; cursor: pointer; pointer-events: auto; width: 100%;
    transition: background 0.2s ease; }
  #quest-panel .back:hover { background: rgba(80,140,255,0.24); }

  #quest-complete { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%) scale(0.9);
    text-align: center; padding: 44px 52px; border-radius: 22px; opacity: 0; pointer-events: none;
    background: rgba(10,16,38,0.88); border: 1px solid rgba(150,120,255,0.5);
    box-shadow: 0 0 90px rgba(120,90,255,0.42); transition: all 0.6s ease; }
  #quest-complete.show { opacity: 1; transform: translate(-50%,-50%) scale(1); }
  #quest-complete h1 { font-family: var(--font-display); font-weight: 800; font-size: 30px; margin: 0 0 12px; }
  #quest-complete p { color: #c4d4ee; margin: 0; }

  #map-hint { position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%);
    font-family: var(--font-body); font-size: 13px; color: #9cc0ec; background: rgba(8,14,32,0.5);
    padding: 9px 18px; border-radius: 11px; border: 1px solid rgba(120,180,255,0.18); }
`;

export class QuestHUD {
  root: HTMLDivElement;
  private counterEl!: HTMLDivElement;
  private objectiveEl!: HTMLDivElement;
  private progressFill!: HTMLDivElement;
  private panel!: HTMLDivElement;
  private complete!: HTMLDivElement;
  private hint!: HTMLDivElement;
  private labels = new Map<string, HTMLDivElement>();
  onBackToMap: (() => void) | null = null;

  constructor() {
    const style = document.createElement("style");
    style.textContent = STYLE;
    document.head.appendChild(style);

    this.root = document.createElement("div");
    this.root.id = "quest-hud";
    this.root.innerHTML = `
      <div id="quest-bar">
        <div id="quest-counter">Исследовано 0 / 0</div>
        <div id="quest-objective">—</div>
        <div id="quest-progress"><div></div></div>
      </div>
      <div id="quest-panel">
        <button class="close" aria-label="Закрыть">×</button>
        <div class="tag"></div>
        <h2></h2>
        <div class="body"></div>
        <button class="back">← Вернуться к карте</button>
      </div>
      <div id="quest-complete">
        <h1>🚀 Вселенная исследована!</h1>
        <p>Спасибо, что прошёл весь путь. Теперь ты знаешь обо мне всё — давай работать вместе.</p>
      </div>
      <div id="map-hint">Перетаскивай — вращение · колесо/щипок — зум · клик по планете — подлёт</div>
    `;
    document.body.appendChild(this.root);

    this.counterEl = this.root.querySelector("#quest-counter")!;
    this.objectiveEl = this.root.querySelector("#quest-objective")!;
    this.progressFill = this.root.querySelector("#quest-progress > div")!;
    this.panel = this.root.querySelector("#quest-panel")!;
    this.complete = this.root.querySelector("#quest-complete")!;
    this.hint = this.root.querySelector("#map-hint")!;

    this.panel.querySelector(".close")!.addEventListener("click", () => this.closePanel());
    this.panel.querySelector(".back")!.addEventListener("click", () => {
      this.closePanel();
      this.onBackToMap?.();
    });
  }

  show() {
    this.root.classList.add("visible");
  }

  setObjective(text: string) {
    this.objectiveEl.textContent = text;
  }

  setCounter(visited: number, total: number) {
    this.counterEl.textContent = `Исследовано ${visited} / ${total}`;
    this.progressFill.style.width = `${(visited / total) * 100}%`;
  }

  openPanel(info: PlanetInfo) {
    (this.panel.querySelector(".tag") as HTMLElement).textContent = info.tagline;
    (this.panel.querySelector("h2") as HTMLElement).textContent = info.title;
    const body = this.panel.querySelector(".body") as HTMLElement;
    body.innerHTML = info.body.map((p) => `<p>${p}</p>`).join("");
    this.panel.classList.add("open");
  }

  closePanel() {
    this.panel.classList.remove("open");
  }

  showComplete() {
    this.complete.classList.add("show");
    setTimeout(() => this.complete.classList.remove("show"), 6000);
  }

  updateLabels(labels: PlanetScreenInfo[], visited: Set<string>) {
    for (const l of labels) {
      let el = this.labels.get(l.id);
      if (!el) {
        el = document.createElement("div");
        el.className = "planet-label";
        this.root.appendChild(el);
        this.labels.set(l.id, el);
      }
      const isVisited = visited.has(l.id);
      el.innerHTML = `${l.name}${isVisited ? '<span class="check">✓</span>' : ""}`;
      el.classList.toggle("visited", isVisited);
      if (l.visible) {
        el.style.opacity = "1";
        el.style.left = `${l.x}px`;
        el.style.top = `${l.y}px`;
      } else {
        el.style.opacity = "0";
      }
    }
  }
}
