// Builds a single-file build of the game: JS and CSS inlined into index.html,
// so it runs by double-clicking, with no server and no network at all.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

// the installable-app tags point at server paths that mean nothing beside a loose
// file, so the standalone build drops them
const html = readFileSync('index.html', 'utf8').replace(
  /^\s*<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n/gm,
  '',
);
const css = readFileSync('tools/.offline/main.css', 'utf8');
const js = readFileSync('tools/.offline/main.js', 'utf8');

const tag = '<script type="module" src="/src/main.ts"></script>';
if (!html.includes(tag)) throw new Error('entry script tag not found in index.html');

// a literal </script> inside the bundle would close the tag early
const safeJs = js.replace(/<\/script/gi, '<\\/script');

if (safeJs.includes('</script')) throw new Error('unescaped script closer survived');

const inline = `<style>\n${css}\n</style>\n<script>\n${safeJs}\n</script>`;

// function form on purpose: a replacement string would expand `$&`, `$1`, `$'`
// found inside the minified bundle into pieces of the matched tag
const out = html.replace(tag, () => inline);

if (out.includes('src="/src/main.ts"')) throw new Error('entry tag still present after inlining');
if ((out.match(/<script/g) ?? []).length !== (safeJs.match(/<script/g) ?? []).length + 1) {
  throw new Error('unexpected script tags in output');
}

const file = 'ogre-orc-siege-offline.html';
writeFileSync(file, out);

// a copy in public/ rides along with `npm run build`, so the hosted site can
// serve the same standalone file at its own URL
mkdirSync('public', { recursive: true });
writeFileSync(`public/${file}`, out);

console.log(`${file}  ${Math.round(Buffer.byteLength(out) / 1024)} kB  (js ${Math.round(safeJs.length / 1024)} kB, css ${Math.round(css.length / 1024)} kB)`);
