/* Régénère img/og.png à partir de tools/og-template.html.

   Playwright n'est pas une dépendance du site. L'installer à côté, ou indiquer
   une installation existante :
     PLAYWRIGHT_PATH=/chemin/vers/node_modules/playwright node tools/og-render.cjs */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "img", "og.png");
const TYPES = { ".html": "text/html; charset=utf-8", ".woff2": "font/woff2", ".webp": "image/webp" };

/* Petit serveur local : le gabarit charge les polices et le portrait du site. */
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
  /* Rendu à 2x puis réduction : le texte est lissé, sans franges de couleur. */
  const browser = await chromium.launch({ headless: true, args: ["--disable-lcd-text"] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
  await page.goto(`http://127.0.0.1:${server.address().port}/tools/og-template.html`, { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await document.querySelector("img").decode();
  });

  const big = await page.screenshot({ type: "png" });
  const small = await page.evaluate(async data => {
    const image = new Image();
    image.src = data;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const context = canvas.getContext("2d");
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, 1200, 630);
    return canvas.toDataURL("image/png");
  }, `data:image/png;base64,${big.toString("base64")}`);

  fs.writeFileSync(OUT, Buffer.from(small.split(",")[1], "base64"));
  await browser.close();
  server.close();
  console.log(`${path.relative(ROOT, OUT)} : ${fs.statSync(OUT).size} octets`);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
