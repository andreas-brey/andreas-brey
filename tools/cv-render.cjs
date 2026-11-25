/* Régénère cv/andreas-brey-cv.pdf à partir de tools/cv-template.html.

   Le PDF est balisé (arbre de structure, langue, titre, signets) : Chromium
   reprend la sémantique du gabarit. Playwright n'est pas une dépendance du site,
   voir og-render.cjs :
     PLAYWRIGHT_PATH=/chemin/vers/node_modules/playwright node tools/cv-render.cjs */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "cv", "andreas-brey-cv.pdf");
const TYPES = { ".html": "text/html; charset=utf-8", ".woff2": "font/woff2" };

/* Petit serveur local : le gabarit charge les polices du site. */
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://localhost").pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/tools/cv-template.html`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: OUT, preferCSSPageSize: true, printBackground: true, tagged: true, outline: true });
  await browser.close();
  server.close();
  console.log(`${path.relative(ROOT, OUT)} : ${fs.statSync(OUT).size} octets`);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
