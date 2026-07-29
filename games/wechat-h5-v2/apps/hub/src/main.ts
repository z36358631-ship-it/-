import { createAccessibilityController } from "@gamehub/h5-accessibility";
import "./hub.css";
import { GAME_CATALOG } from "./catalog";

const app = document.querySelector<HTMLElement>("#app");
const liveRegion = document.querySelector<HTMLElement>("#live-region");
if (!app || !liveRegion) throw new Error("HUB_DOM_MISSING");

const accessibility = createAccessibilityController({ root: app, liveRegion });
app.style.setProperty("--hub-key-art", 'url("./assets/hub-key-art.webp")');
let history: Record<string, { lastPlayedAt: number; runs: number }> = {};
try {
  history = JSON.parse(
    localStorage.getItem("hub:recent-games") ?? "{}",
  ) as typeof history;
} catch {
  localStorage.removeItem("hub:recent-games");
}

app.innerHTML = `
  <header class="hero">
    <p class="eyebrow">GAMEHUB ORIGINALS · H5 PLAYGROUND</p>
    <h1>奇想游乐场</h1>
    <p class="hero-copy">三种完全不同的手感。选一款，先玩三局再下判断。</p>
    <button class="motion-toggle" type="button" aria-pressed="${accessibility.snapshot().reducedMotion}">
      减少动态效果
    </button>
  </header>
  <section class="game-list" aria-label="可试玩游戏">
    ${GAME_CATALOG.map((game, index) => {
      const recent = history[game.id];
      return `
        <article class="game-card" style="--accent:${game.accent}">
          <img src="${game.art}" width="960" height="540" alt="" decoding="${index === 0 ? "sync" : "async"}" fetchpriority="${index === 0 ? "high" : "low"}">
          <div class="card-shade"></div>
          <div class="card-copy">
            <p class="kicker">${game.kicker}</p>
            <h2>${game.title}</h2>
            <p>${game.description}</p>
            <div class="meta"><span>${game.coreInput}</span><span>${game.duration}</span></div>
            <a class="play" data-game-id="${game.id}" href="${game.href}">
              ${recent ? `继续挑战 · 已玩 ${recent.runs} 局` : "开始试玩"}
            </a>
          </div>
        </article>`;
    }).join("")}
  </section>
  <footer>本地试玩不会要求微信登录、支付或分享。</footer>
`;

app.querySelector<HTMLButtonElement>(".motion-toggle")
  ?.addEventListener("click", (event) => {
    const next = !accessibility.snapshot().reducedMotion;
    accessibility.setReducedMotion(next);
    const button = event.currentTarget as HTMLButtonElement;
    button.setAttribute("aria-pressed", String(next));
    accessibility.announce(next ? "已减少动态效果" : "已恢复完整动态效果");
  });

app.querySelectorAll<HTMLAnchorElement>("[data-game-id]").forEach((link) => {
  link.addEventListener("click", () => {
    const gameId = link.dataset.gameId;
    if (!gameId) return;
    const previous = history[gameId];
    history[gameId] = {
      lastPlayedAt: Date.now(),
      runs: previous?.runs ?? 0,
    };
    localStorage.setItem("hub:recent-games", JSON.stringify(history));
  });
});
