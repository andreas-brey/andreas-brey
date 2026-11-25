/* Régénère les CV en PDF à partir de leurs gabarits HTML :
     tools/cv-template.html     -> cv/andreas-brey-cv.pdf
     tools/cv-template-en.html  -> cv/andreas-brey-cv-en.pdf

   Les PDF sont balisés (arbre de structure, langue, titre, signets) : Chromium
   reprend la sémantique des gabarits. Après un rendu, reporter la taille des
   fichiers dans les liens de index.html. Playwright n'est pas une dépendance du
   site, voir og-render.cjs :
     PLAYWRIGHT_PATH=/chemin/vers/node_modules/playwright node tools/cv-render.cjs */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");

const ROOT = path.join(__dirname, "..");
const JOBS = [
  ["tools/cv-template.html", "cv/andreas-brey-cv.pdf"],
  ["tools/cv-template-en.html", "cv/andreas-brey-cv-en.pdf"]
];
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".woff2": "font/woff2" };

/* Petit serveur local : les gabarits chargent leur feuille et les polices du site. */
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
  for (const [template, pdf] of JOBS) {
    const out = path.join(ROOT, pdf);
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/${template}`, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({ path: out, preferCSSPageSize: true, printBackground: true, tagged: true, outline: true });
    await page.close();
    console.log(`${pdf} : ${fs.statSync(out).size} octets`);
  }
  await browser.close();
  server.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
