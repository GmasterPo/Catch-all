// SpriteAnimator — plays a clip from ASSET_INDEX.json on a 2D canvas.
//
//   const animator = new SpriteAnimator({ asset, clip, image, scale: 3 });
//   animator.play('walk');
//   function frame(t) { animator.update(t - last); animator.draw(ctx, x, y); }
//
// Frames carry their own rectangles, so trimmed frames (frameWidth/offsetX in
// the original Sparrow data) line up with the untrimmed sprite box.
export class SpriteAnimator {
  constructor({ asset, clip, image, clips, scale = 1, flipX = false }) {
    if (!asset) throw new Error('SpriteAnimator needs an asset');
    if (!image) throw new Error('SpriteAnimator needs a loaded image');
    this.asset = asset;
    this.image = image;
    this.scale = scale;
    this.flipX = flipX;
    this.clips = new Map();
    for (const entry of asset.clips ?? []) this.clips.set(entry.name, entry);
    for (const entry of clips ?? []) this.clips.set(entry.name, entry);
    this.onComplete = null;
    this.elapsed = 0;
    this.index = 0;
    this.finished = false;
    this.clip = clip ?? this.clips.values().next().value;
    if (!this.clip) throw new Error(`asset ${asset.id} has no clips`);
  }

  get clipName() {
    return this.clip?.name;
  }

  get frame() {
    return this.clip.frames[Math.min(this.index, this.clip.frames.length - 1)];
  }

  get frameCount() {
    return this.clip.frameCount;
  }

  play(name) {
    const next = this.clips.get(name);
    if (!next) throw new Error(`asset ${this.asset.id} has no clip "${name}"`);
    this.clip = next;
    this.elapsed = 0;
    this.index = 0;
    this.finished = false;
    return this;
  }

  reset() {
    this.elapsed = 0;
    this.index = 0;
    this.finished = false;
    return this;
  }

  // dt is in milliseconds.
  update(dt = 16.6667) {
    if (!this.clip || this.finished) return this;
    const fps = this.clip.fps > 0 ? this.clip.fps : 0;
    if (fps === 0 || this.clip.frameCount <= 1) {
      if (!this.clip.loop) this.finished = true;
      return this;
    }
    this.elapsed += dt;
    const frameDuration = 1000 / fps;
    while (this.elapsed >= frameDuration) {
      this.elapsed -= frameDuration;
      this.index += 1;
      if (this.index >= this.clip.frameCount) {
        if (this.clip.loop) {
          this.index = 0;
        } else {
          this.index = this.clip.frameCount - 1;
          this.finished = true;
          if (typeof this.onComplete === 'function') this.onComplete(this);
          break;
        }
      }
    }
    return this;
  }

  // Draws at the current frame. anchor: 'bottom-center' (default) or 'top-left'.
  draw(ctx, x, y, { anchor = 'bottom-center', scale = this.scale, flipX = this.flipX } = {}) {
    const frame = this.frame;
    if (!frame) return;
    const drawW = frame.w * scale;
    const drawH = frame.h * scale;
    const offsetX = (frame.offsetX ?? 0) * scale;
    const offsetY = (frame.offsetY ?? 0) * scale;
    const originX = anchor === 'bottom-center' ? x - drawW / 2 : x;
    const originY = anchor === 'bottom-center' ? y - drawH : y;

    ctx.save();
    if (flipX) {
      ctx.translate(originX + drawW, originY);
      ctx.scale(-1, 1);
      ctx.drawImage(this.image, frame.x, frame.y, frame.w, frame.h, offsetX, offsetY, drawW, drawH);
    } else {
      ctx.drawImage(this.image, frame.x, frame.y, frame.w, frame.h, originX + offsetX, originY + offsetY, drawW, drawH);
    }
    ctx.restore();
  }
}

export default SpriteAnimator;
