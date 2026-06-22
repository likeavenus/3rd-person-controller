import type { PoiInfo } from "../world/pointsData";

const STYLE = `
  #about-panel { position: fixed; left: 50%; bottom: 7vh; transform: translateX(-50%) translateY(24px);
    width: min(760px, 92vw); display: flex; gap: 22px; align-items: center;
    padding: 22px; border-radius: 20px; z-index: 850; pointer-events: none;
    font-family: "Space Grotesk", system-ui, sans-serif; color: #eaf2ff;
    background: linear-gradient(135deg, rgba(14,22,46,0.55), rgba(8,12,30,0.45));
    border: 1px solid rgba(130,190,255,0.28); backdrop-filter: blur(16px);
    box-shadow: 0 20px 70px rgba(20,50,140,0.35);
    opacity: 0; transition: opacity 0.4s ease, transform 0.4s cubic-bezier(.2,.8,.2,1); }
  #about-panel.show { opacity: 1; transform: translateX(-50%) translateY(0); }

  #about-panel .photo { width: 150px; height: 150px; flex: 0 0 150px; border-radius: 16px;
    object-fit: cover; border: 1px solid rgba(150,200,255,0.35);
    box-shadow: 0 0 30px rgba(80,140,255,0.25); }
  #about-panel .content { flex: 1; min-width: 0; }
  #about-panel .badge { display: inline-block; font-family: "Orbitron", sans-serif;
    font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase;
    color: #0a1430; background: var(--accent, #6fb4ff); padding: 4px 10px; border-radius: 8px; }
  #about-panel h3 { font-family: "Orbitron", sans-serif; font-weight: 700; font-size: 22px;
    margin: 10px 0 10px; line-height: 1.15; }
  #about-panel p { font-size: 14.5px; line-height: 1.6; color: #c4d4ee; margin: 0 0 8px; }

  @media (max-width: 560px) {
    #about-panel { flex-direction: column; text-align: center; bottom: 12vh; }
    #about-panel .photo { width: 120px; height: 120px; flex-basis: 120px; }
  }
`;

export class AboutPanel {
  private root: HTMLDivElement;
  private photo: HTMLImageElement;
  private badge: HTMLElement;
  private titleEl: HTMLElement;
  private body: HTMLElement;
  private currentId: string | null = null;

  constructor() {
    const style = document.createElement("style");
    style.textContent = STYLE;
    document.head.appendChild(style);

    this.root = document.createElement("div");
    this.root.id = "about-panel";
    this.root.innerHTML = `
      <img class="photo" alt="" />
      <div class="content">
        <span class="badge"></span>
        <h3></h3>
        <div class="text"></div>
      </div>
    `;
    document.body.appendChild(this.root);

    this.photo = this.root.querySelector(".photo")!;
    this.badge = this.root.querySelector(".badge")!;
    this.titleEl = this.root.querySelector("h3")!;
    this.body = this.root.querySelector(".text")!;
  }

  show(info: PoiInfo) {
    if (this.currentId !== info.id) {
      this.currentId = info.id;
      const accent = "#" + info.color.toString(16).padStart(6, "0");
      this.root.style.setProperty("--accent", accent);
      this.photo.src = `${import.meta.env.BASE_URL}images/about/${info.image}`;
      this.badge.textContent = info.badge;
      this.titleEl.textContent = info.title;
      this.body.innerHTML = info.text.map((t) => `<p>${t}</p>`).join("");
    }
    this.root.classList.add("show");
  }

  hide() {
    this.root.classList.remove("show");
    this.currentId = null;
  }
}
