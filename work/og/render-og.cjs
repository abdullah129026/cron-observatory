// Renders public/og.png (1200x630) from tokens + Inter, via headless Chromium.
// Run from the repo root: node work/og/render-og.cjs (script lives in work/, not shipped).
// Needs playwright-core resolvable (NODE_PATH=../../work/pw/node_modules from the goal
// workspace) and network for the Inter font on first run; the font is cached in work/og/.
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "public", "og.png");
const FONT_PATH = path.join(__dirname, "inter-var.woff2");
const FONT_URL = "https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2";

function fetchFont() {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(FONT_PATH)) return resolve();
    https.get(FONT_URL, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`font fetch: ${res.statusCode}`));
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => { fs.writeFileSync(FONT_PATH, Buffer.concat(chunks)); resolve(); });
    }).on("error", reject);
  });
}

(async () => {
  await fetchFont();
  const font = fs.readFileSync(FONT_PATH).toString("base64");

  // 30-day tick strip: mostly green, one amber late, one red down.
  const ticks = Array.from({ length: 30 }, (_, i) => {
    const c = i === 21 ? "#F87171" : i === 12 ? "#FBBF24" : "#34D399";
    return `<span style="background:${c}"></span>`;
  }).join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "Inter"; src: url(data:font/woff2;base64,${font}) format("woff2"); font-weight: 100 900; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; background: #0A0D13; color: #E9EDF3; font-family: Inter, sans-serif; overflow: hidden; }
.frame { width: 1200px; height: 630px; padding: 72px 80px; display: flex; flex-direction: column; justify-content: space-between; }
.mark { display: flex; align-items: center; gap: 16px; }
.mark span { font-size: 20px; font-weight: 600; letter-spacing: 0.02em; color: #A7B0BE; }
h1 { font-size: 76px; line-height: 1.05; font-weight: 700; letter-spacing: -0.02em; }
h1 em { font-style: normal; color: #34D399; }
p.tag { font-size: 30px; line-height: 1.35; color: #A7B0BE; max-width: 760px; margin-top: 24px; }
.strip { display: flex; gap: 6px; margin-top: 40px; }
.strip span { width: 18px; height: 18px; border-radius: 4px; }
.foot { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #222B3B; padding-top: 24px; }
.foot .mono { font-family: ui-monospace, monospace; font-size: 20px; color: #8A94A3; }
.foot .url { font-size: 20px; color: #8A94A3; }
</style></head><body><div class="frame">
<div>
<div class="mark">
<svg width="34" height="34" viewBox="0 0 34 34" fill="none"><circle cx="17" cy="17" r="15" stroke="#34D399" stroke-width="2"/><path d="M17 17 L17 4 A13 13 0 0 1 30 17 Z" fill="#34D399" opacity="0.35"/><circle cx="17" cy="17" r="3" fill="#34D399"/></svg>
<span>CRON JOB OBSERVATORY</span>
</div>
<h1 style="margin-top:36px">Know the minute<br>a cron job <em>fails</em>.</h1>
<p class="tag">Not when customers tell you. One line wraps the job, Slack gets one message per incident.</p>
<div class="strip">${ticks}</div>
</div>
<div class="foot"><span class="mono">wrap(&quot;nightly-backup&quot;, runBackup)</span><span class="url">cron-observatory.vercel.app</span></div>
</div></body></html>`;

  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html, { waitUntil: "load" });
  await page.waitForTimeout(400);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT });
  await browser.close();
  console.log("wrote", OUT, fs.statSync(OUT).size, "bytes");
})();
