// Minimal PNG header reader. The build and validation tools only need the
// canvas size, so this avoids any image-processing dependency.
import fs from 'node:fs';

export function pngSize(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const head = Buffer.alloc(24);
    fs.readSync(fd, head, 0, 24, 0);
    const signature = head.toString('hex', 0, 8);
    if (signature !== '89504e470d0a1a0a') {
      throw new Error(`${file} is not a PNG (bad signature)`);
    }
    return [head.readUInt32BE(16), head.readUInt32BE(20)];
  } finally {
    fs.closeSync(fd);
  }
}

export function walkFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}
