/* Écrit en/index.html, la version anglaise statique de index.html.

   Les robots des IA n'exécutent pas le JavaScript : chaque langue doit donc
   exister en HTML. tools/en.json porte les textes des noeuds [data-i18n] et
   les remplacements de l'en-tête et des liens. À relancer après toute
   modification de index.html ou de en.json :
     node tools/build-en.cjs */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const { text, replace } = JSON.parse(fs.readFileSync(path.join(__dirname, "en.json"), "utf8"));
let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

const fail = message => {
  console.error(message);
  process.exit(1);
};
const escapeHtml = value => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* Remplacements exacts : chacun doit exister une seule fois, sinon la page
   française a changé et en.json doit suivre. */
for (const [from, to] of replace) {
  const count = html.split(from).length - 1;
  if (count !== 1) { fail(`${count} occurrence(s) au lieu d'une : ${from}`); }
  html = html.replace(from, () => to);
}

/* Les noeuds traduits ne contiennent que du texte : on remplace ce texte. */
const used = new Set();
html = html.replace(/(<[^>]*\sdata-i18n="([^"]+)"[^>]*>)[^<]*(<\/)/g, (match, open, key, close) => {
  if (!(key in text)) { fail(`Pas de traduction pour : ${key}`); }
  used.add(key);
  return open + escapeHtml(text[key]) + close;
});
const unused = Object.keys(text).filter(key => !used.has(key));
if (unused.length) { fail(`Traductions sans noeud : ${unused.join(", ")}`); }

const banner = "<!-- Générée par tools/build-en.cjs depuis index.html et tools/en.json : ne pas modifier à la main. -->\n";
html = html.replace(/^<!doctype html>\n/i, doctype => doctype + banner);
fs.mkdirSync(path.join(ROOT, "en"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "en", "index.html"), html);
console.log(`en/index.html : ${used.size} textes, ${replace.length} remplacements`);
