import { createCanvas, registerFont, type Canvas } from 'canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { drawEnemySprite, drawTowerSprite } from '../src/art';

type Ctx = CanvasRenderingContext2D;
const ANY = (c: unknown): any => c as any;

// Cinzel ships with the repo so the wordmark renders without system fonts.
registerFont('tools/fonts/Cinzel.ttf', { family: 'Cinzel', weight: 'bold' });
registerFont('tools/fonts/Cinzel.ttf', { family: 'Cinzel', weight: 'normal' });

function field(ctx: Ctx, S: number, glow = 0.34): void {
  const g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, '#17280f');
  g.addColorStop(0.55, '#0f1a0c');
  g.addColorStop(1, '#070a0f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);

  const rg = ctx.createRadialGradient(S * 0.5, S * 0.4, S * 0.04, S * 0.5, S * 0.52, S * 0.66);
  rg.addColorStop(0, `rgba(126,180,72,${glow})`);
  rg.addColorStop(0.55, 'rgba(60,110,40,0.10)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, S, S);

  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = Math.max(1, S / 640);
  const step = S / 8;
  for (let i = 1; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, S);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * step);
    ctx.lineTo(S, i * step);
    ctx.stroke();
  }

  const vg = ctx.createRadialGradient(S * 0.5, S * 0.5, S * 0.3, S * 0.5, S * 0.5, S * 0.8);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.62)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, S, S);
}

/** Boss sprite anchored so its feet sit at (cx, baseY). */
function drawOgreKing(ctx: Ctx, cx: number, baseY: number, box: number): void {
  ctx.save();
  ctx.translate(cx - box / 2, baseY - box * 0.8);
  drawEnemySprite(ctx, 'ogreking', box);
  ctx.restore();
}

/** The tower badge, drawn so its centre sits at cx/cy. */
function towerBadge(ctx: Ctx, cx: number, cy: number, box: number): void {
  ctx.save();
  ctx.translate(cx - box / 2, cy - box * 0.56);
  drawTowerSprite(ctx, 'archer', 3, box);
  ctx.restore();
}

function icon(ctx: Ctx, S: number): void {
  field(ctx, S);
  // warm threat glow behind the boss
  const glow = ctx.createRadialGradient(S * 0.5, S * 0.58, S * 0.02, S * 0.5, S * 0.58, S * 0.44);
  glow.addColorStop(0, 'rgba(255,120,80,0.20)');
  glow.addColorStop(1, 'rgba(255,120,80,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);

  ctx.beginPath();
  ctx.ellipse(S * 0.5, S * 0.74, S * 0.26, S * 0.06, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fill();

  drawOgreKing(ctx, S * 0.5, S * 0.74, S * 0.62);
}

function iconForeground(ctx: Ctx, S: number): void {
  // kept inside the adaptive-icon safe zone (inner ~66% of the canvas)
  drawOgreKing(ctx, S * 0.5, S * 0.72, S * 0.56);
}

function splash(ctx: Ctx, S: number): void {
  field(ctx, S, 0.4);

  // everything stays inside 0.22-0.78 so a 16:9 centre-crop keeps it intact
  drawOgreKing(ctx, S * 0.5, S * 0.45, S * 0.22);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = S * 0.012;
  ctx.shadowOffsetY = S * 0.004;
  ctx.fillStyle = '#f4d47a';
  ctx.font = `bold ${Math.round(S * 0.055)}px Cinzel`;
  ctx.fillText('OGRE & ORC SIEGE', S * 0.5, S * 0.552);
  ctx.restore();

  const mid = S * 0.612;
  const gap = S * 0.02;
  ctx.strokeStyle = 'rgba(244,212,122,0.55)';
  ctx.lineWidth = Math.max(1.5, S * 0.0016);
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(S * 0.5 + dir * gap, mid);
    ctx.lineTo(S * 0.5 + dir * (gap + S * 0.085), mid);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(S * 0.5, mid - S * 0.009);
  ctx.lineTo(S * 0.5 + S * 0.009, mid);
  ctx.lineTo(S * 0.5, mid + S * 0.009);
  ctx.lineTo(S * 0.5 - S * 0.009, mid);
  ctx.closePath();
  ctx.fillStyle = '#f4d47a';
  ctx.fill();

  ctx.fillStyle = 'rgba(214,226,255,0.74)';
  ctx.font = `${Math.round(S * 0.019)}px Cinzel`;
  ctx.fillText('HOLD THE EASTERN GATE', S * 0.5, S * 0.646);
  ctx.fillStyle = 'rgba(214,226,255,0.42)';
  ctx.font = `${Math.round(S * 0.014)}px Cinzel`;
  ctx.fillText('50 WAVES · 5 STAGES · ONE GATE', S * 0.5, S * 0.674);

  const horde: Array<['goblin' | 'orc' | 'troll' | 'ogre', number]> = [
    ['goblin', 0.55],
    ['orc', 0.62],
    ['troll', 0.72],
    ['orc', 0.62],
    ['goblin', 0.55],
  ];
  const sprite = S * 0.07;
  const gapX = sprite * 0.62;
  const total = horde.length * gapX;
  horde.forEach(([id, alpha], i) => {
    ctx.save();
    ctx.globalAlpha = alpha * 0.85;
    ctx.translate(S * 0.5 - total / 2 + i * gapX, S * 0.7);
    drawEnemySprite(ctx, id, sprite);
    ctx.restore();
  });
}

function render(name: string, S: number, paint: (ctx: Ctx, S: number) => void, transparent = false): void {
  const canvas: Canvas = createCanvas(S, S);
  const ctx = ANY(canvas.getContext('2d')) as Ctx;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (!transparent) {
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, S, S);
  }
  paint(ctx, S);
  const out = `assets/${name}.png`;
  writeFileSync(out, canvas.toBuffer('image/png'));
  console.log(`${out}  ${S}x${S}  ${Math.round(canvas.toBuffer('image/png').length / 1024)} kB`);
}

function maskable(ctx: Ctx, S: number): void {
  field(ctx, S);
  // stays inside the 80% safe circle Android and Chrome crop to
  drawOgreKing(ctx, S * 0.5, S * 0.68, S * 0.5);
}

mkdirSync('assets', { recursive: true });
render('icon', 1024, icon);
render('icon-foreground', 1024, iconForeground, true);
render('icon-background', 1024, (ctx, S) => field(ctx, S));
render('splash', 2732, splash);

// PWA icons: `npm run build` copies public/ into dist/ so the manifest resolves
mkdirSync('public/icons', { recursive: true });
for (const size of [192, 512]) {
  const canvas = createCanvas(size, size);
  icon(ANY(canvas.getContext('2d')) as Ctx, size);
  writeFileSync(`public/icons/icon-${size}.png`, canvas.toBuffer('image/png'));
  console.log(`public/icons/icon-${size}.png  ${size}x${size}`);
}
{
  const canvas = createCanvas(512, 512);
  maskable(ANY(canvas.getContext('2d')) as Ctx, 512);
  writeFileSync('public/icons/maskable-512.png', canvas.toBuffer('image/png'));
  console.log('public/icons/maskable-512.png  512x512');
}
