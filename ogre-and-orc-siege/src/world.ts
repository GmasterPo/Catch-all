import * as THREE from 'three';
import { GRID_X, GRID_Z, HALF_X, HALF_Z, TKEY, inBounds, tileCenterX, tileCenterZ, type Tile } from './config';
import { hash2 } from './util';
import { bushTexture, flowerTexture, rockTexture, treeTexture } from './art';

interface Deco {
  key: number;
  wx: number;
  wz: number;
  rot: number;
  scale: number;
  tone: number;
}

export interface World {
  decoTiles: Set<number>;
  pickPlane: THREE.Mesh;
  setPath(tiles: Set<number>, prep: boolean): void;
  setBuildable(tiles: Set<number>): void;
  setNoBuild(tiles: Set<number>): void;
  setHidden(hidden: Set<number>): void;
  /** Positions one portal per spawn entrance; extras are hidden. */
  setPortals(tiles: Tile[]): void;
  animate(dt: number, time: number): void;
}

function tileQuadGeometry(
  tiles: Set<number>,
  size: number,
  y: number,
  hue: number,
  sat: number,
  light: number,
  lightVar: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const s = size / 2;
  const c = new THREE.Color();
  for (const key of tiles) {
    const x = Math.floor(key / GRID_Z);
    const z = key % GRID_Z;
    const cx = tileCenterX(x);
    const cz = tileCenterZ(z);
    const h = hash2(x * 3.1 + 1, z * 2.3 + 5);
    c.setHSL(hue, sat, light + (h - 0.5) * lightVar);
    const quad = [
      cx - s, y, cz - s,
      cx - s, y, cz + s,
      cx + s, y, cz + s,
      cx - s, y, cz - s,
      cx + s, y, cz + s,
      cx + s, y, cz - s,
    ];
    for (let i = 0; i < 6; i++) {
      positions.push(quad[i * 3], quad[i * 3 + 1], quad[i * 3 + 2]);
      colors.push(c.r, c.g, c.b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function buildGround(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(GRID_X, GRID_Z, GRID_X, GRID_Z);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const fine = hash2(x * 2.1 + 3, z * 1.7 + 9);
    const patch = hash2(Math.floor((x + HALF_X) / 6) * 1.3, Math.floor((z + HALF_Z) / 6) * 1.7);
    const t = fine * 0.55 + patch * 0.45;
    c.setHSL(0.26 + t * 0.04, 0.46 + t * 0.12, 0.22 + t * 0.1);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.97,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = false;
  return mesh;
}

function buildGridLines(): THREE.LineSegments {
  const pts: number[] = [];
  for (let i = 0; i <= GRID_X; i++) {
    const p = i - HALF_X;
    pts.push(p, 0.055, -HALF_Z, p, 0.055, HALF_Z);
  }
  for (let i = 0; i <= GRID_Z; i++) {
    const p = i - HALF_Z;
    pts.push(-HALF_X, 0.055, p, HALF_X, 0.055, p);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0xd8f0c8, transparent: true, opacity: 0.09 });
  return new THREE.LineSegments(geo, mat);
}

function boxMesh(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  mat: THREE.Material,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

function buildCastle(): THREE.Group {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x8b8679, roughness: 0.93, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x615d53, roughness: 0.95, flatShading: true });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x6d302b, roughness: 0.8, flatShading: true });
  const iron = new THREE.MeshStandardMaterial({ color: 0x3a3730, metalness: 0.6, roughness: 0.5, flatShading: true });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd8b45e, metalness: 0.55, roughness: 0.4 });
  const banner = new THREE.MeshStandardMaterial({ color: 0x8c2a26, roughness: 0.85, side: THREE.DoubleSide });

  const WX = HALF_X + 0.8;

  g.add(boxMesh(1.5, 5.2, 48.2, WX, 2.6, -25.9, stone));
  g.add(boxMesh(1.5, 5.2, 47.2, WX, 2.6, 26.4, stone));
  g.add(boxMesh(2.0, 6.8, 2.0, WX, 3.4, -2.9, dark));
  g.add(boxMesh(2.0, 6.8, 2.0, WX, 3.4, 3.9, dark));
  g.add(boxMesh(1.7, 1.5, 8.8, WX, 7.1, 0.5, dark));

  const gate = boxMesh(0.3, 4.6, 4.6, WX - 0.5, 2.3, 0.5, iron);
  g.add(gate);
  for (let i = 0; i < 5; i++) {
    g.add(boxMesh(0.12, 4.5, 0.1, WX - 0.68, 2.3, -1.4 + i * 0.95, gold));
  }
  // torch glows at the gate
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0.85 });
  const glowL = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), glowMat);
  glowL.position.set(WX - 0.9, 4.2, -2.4);
  g.add(glowL);
  const glowR = glowL.clone();
  glowR.position.z = 3.4;
  g.add(glowR);

  // gate towers
  for (const z of [-5.2, 6.2]) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.8, 8.4, 12), stone);
    tower.position.set(WX, 4.2, z);
    g.add(tower);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.5, 12), dark);
    top.position.set(WX, 8.6, z);
    g.add(top);
    const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.9, 8), gold);
    stud.position.set(WX, 9.2, z);
    g.add(stud);
  }

  // merlons along the walls
  const dummy = new THREE.Object3D();
  const merlonGeo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
  const merlons = new THREE.InstancedMesh(merlonGeo, stone, 56);
  let mi = 0;
  const placeMerlon = (z: number) => {
    dummy.position.set(WX, 5.7, z);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    merlons.setMatrixAt(mi++, dummy.matrix);
  };
  for (let z = -49; z < -3.2 && mi < 56; z += 2.3) placeMerlon(z);
  for (let z = 4.2; z < 50 && mi < 56; z += 2.3) placeMerlon(z);
  merlons.count = mi;
  merlons.instanceMatrix.needsUpdate = true;
  g.add(merlons);

  // banners on the wall
  for (const z of [-9, 14]) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.2), banner);
    b.position.set(WX - 0.85, 3.6, z);
    b.rotation.y = -Math.PI / 2;
    g.add(b);
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2.6), gold);
    stripe.position.set(WX - 0.87, 3.65, z);
    stripe.rotation.y = -Math.PI / 2;
    g.add(stripe);
  }

  // keep behind the wall
  const keep = boxMesh(12, 14, 16, WX + 8, 7, 0.5, stone);
  g.add(keep);
  const keepTop = boxMesh(13, 1.0, 17, WX + 8, 14.4, 0.5, dark);
  g.add(keepTop);

  // flat stone roof on the keep
  const roofGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
  const keepRoof = new THREE.Mesh(roofGeo, dark);
  keepRoof.scale.set(6.8, 0.5, 8.4);
  keepRoof.position.set(WX + 8, 15.0, 0.5);
  g.add(keepRoof);
  const bannerTop = new THREE.Mesh(new THREE.PlaneGeometry(5, 6), banner);
  bannerTop.rotation.x = -Math.PI / 2;
  bannerTop.position.set(WX + 8, 15.3, 0.5);
  g.add(bannerTop);

  // round towers punctuating the wall
  for (const z of [-27, 28]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 7.6, 10), stone);
    t.position.set(WX + 0.35, 3.8, z);
    g.add(t);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.5, 10), dark);
    c.position.set(WX + 0.35, 7.9, z);
    g.add(c);
  }
  for (const [kx, kz] of [
    [WX + 3, -6.5],
    [WX + 3, 7.5],
    [WX + 13, -6.5],
    [WX + 13, 7.5],
  ]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 6, 10), stone);
    t.position.set(kx, 17, kz);
    g.add(t);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.4, 10), dark);
    c.position.set(kx, 20.1, kz);
    g.add(c);
  }
  return g;
}

function buildPortal(): { group: THREE.Group; disc: THREE.Mesh; ring: THREE.Mesh } {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a4550, roughness: 0.9, flatShading: true });
  const runeMat = new THREE.MeshStandardMaterial({
    color: 0x8a5cff,
    emissive: 0x5a2acc,
    emissiveIntensity: 1.2,
    roughness: 0.5,
  });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const h = 0.55 + (i % 2) * 0.3;
    const s = new THREE.Mesh(new THREE.ConeGeometry(0.26, h, 5), stoneMat);
    s.position.set(Math.cos(a) * 2.3, h / 2, Math.sin(a) * 2.3);
    group.add(s);
  }
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.15, 0.1, 20), stoneMat);
  base.position.y = 0.05;
  group.add(base);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.22, 8, 32), runeMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.16;
  group.add(ring);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.58, 32),
    new THREE.MeshBasicMaterial({
      color: 0x9b6bff,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.set(0, 0.12, 0);
  group.add(disc);
  const core = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), new THREE.MeshBasicMaterial({ color: 0xe6d6ff, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }));
  core.rotation.x = -Math.PI / 2;
  core.position.set(0, 0.18, 0);
  group.add(core);
  return { group, disc, ring };
}

export function createWorld(scene: THREE.Scene): World {
  const decoTiles = new Set<number>();

  scene.add(new THREE.HemisphereLight(0xd6ecff, 0x3f5c31, 1.0));
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.75);
  sun.position.set(70, 110, 50);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.16));

  const skirt = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 700),
    new THREE.MeshStandardMaterial({ color: 0x30502a, roughness: 1 }),
  );
  skirt.rotation.x = -Math.PI / 2;
  skirt.position.y = -0.12;
  scene.add(skirt);

  const ground = buildGround();
  scene.add(ground);

  const grid = buildGridLines();
  scene.add(grid);

  const pathGroup = new THREE.Group();
  scene.add(pathGroup);
  let pathGlow: THREE.Mesh | null = null;

  const buildGroup = new THREE.Group();
  scene.add(buildGroup);

  const castle = buildCastle();
  // castle geometry is authored for a 100-tile map; scale it to the live grid
  const castleScale = GRID_Z / 100;
  castle.scale.setScalar(castleScale);
  castle.position.x = (HALF_X + 0.8) * (1 - castleScale);
  scene.add(castle);

  // endless can open six spawns, so the whole set is built up front and hidden
  const portals = Array.from({ length: 6 }, () => buildPortal());
  for (const p of portals) {
    p.group.scale.setScalar(Math.min(1, Math.max(0.45, GRID_Z / 50)));
    p.group.visible = false;
    scene.add(p.group);
  }

  // -------------------------------------------------------------------------
  // Decorations
  // -------------------------------------------------------------------------
  const trees: Deco[] = [];
  const rocks: Deco[] = [];
  const bushes: Deco[] = [];
  const flowers: Deco[] = [];

  for (let x = 1; x < GRID_X - 1; x++) {
    for (let z = 1; z < GRID_Z - 1; z++) {
      const h = hash2(x * 1.37 + 11, z * 2.11 + 7);
      if (h < 0.80) continue;
      const d: Deco = {
        key: TKEY(x, z),
        wx: tileCenterX(x) + (hash2(x + 5, z + 2) - 0.5) * 0.3,
        wz: tileCenterZ(z) + (hash2(x + 9, z + 3) - 0.5) * 0.3,
        rot: hash2(x + 13, z + 17) * Math.PI * 2,
        scale: 0.75 + hash2(x + 21, z + 23) * 0.55,
        tone: hash2(x + 31, z + 37),
      };
      if (h > 0.955) {
        trees.push(d);
        decoTiles.add(d.key);
      } else if (h > 0.925) {
        rocks.push(d);
        decoTiles.add(d.key);
      } else if (h > 0.875) {
        bushes.push(d);
        decoTiles.add(d.key);
      } else {
        flowers.push(d);
      }
    }
  }

  const decoGeo = new THREE.PlaneGeometry(1, 1);
  decoGeo.rotateX(-Math.PI / 2);

  function decoMat(texture: THREE.Texture): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      alphaTest: 0.02,
    });
  }

  const treeMesh = new THREE.InstancedMesh(decoGeo, decoMat(treeTexture()), Math.max(1, trees.length));
  const rockMesh = new THREE.InstancedMesh(decoGeo, decoMat(rockTexture()), Math.max(1, rocks.length));
  const bushMesh = new THREE.InstancedMesh(decoGeo, decoMat(bushTexture()), Math.max(1, bushes.length));
  const flowerMesh = new THREE.InstancedMesh(decoGeo, decoMat(flowerTexture()), Math.max(1, flowers.length));
  for (const m of [treeMesh, rockMesh, bushMesh, flowerMesh]) {
    m.frustumCulled = false;
    m.renderOrder = 1;
    scene.add(m);
  }

  const dummy = new THREE.Object3D();

  function fill(mesh: THREE.InstancedMesh, list: Deco[], hidden: Set<number>, size: number): void {
    let n = 0;
    for (const d of list) {
      if (hidden.has(d.key)) continue;
      const s = size * d.scale;
      dummy.position.set(d.wx, 0.1, d.wz);
      dummy.rotation.set(0, d.rot, 0);
      dummy.scale.set(s, 1, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(n++, dummy.matrix);
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
  }

  function applyHidden(hidden: Set<number>): void {
    fill(treeMesh, trees, hidden, 2.4);
    fill(rockMesh, rocks, hidden, 1.5);
    fill(bushMesh, bushes, hidden, 1.7);
    fill(flowerMesh, flowers, hidden, 1.0);
  }

  // Pick plane
  const pickPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
  );
  pickPlane.rotation.x = -Math.PI / 2;
  pickPlane.position.y = 0.08;
  scene.add(pickPlane);

  applyHidden(new Set());

  let pathTiles = new Set<number>();
  let prep = false;

  function setPath(tiles: Set<number>, isPrep: boolean): void {
    pathTiles = tiles;
    prep = isPrep;
    for (const child of [...pathGroup.children]) {
      pathGroup.remove(child);
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    }
    pathGlow = null;
    if (tiles.size === 0) return;

    const shoulderGeo = tileQuadGeometry(tiles, 1.26, 0.02, 0.075, 0.44, 0.14, 0.03);
    const shoulder = new THREE.Mesh(
      shoulderGeo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
    );
    pathGroup.add(shoulder);

    const dirtGeo = tileQuadGeometry(tiles, 1.02, 0.04, 0.075, 0.48, 0.26, 0.06);
    const dirt = new THREE.Mesh(dirtGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    pathGroup.add(dirt);

    // pebbles along the path
    const stoneGeo = new THREE.CircleGeometry(0.13, 7);
    stoneGeo.rotateX(-Math.PI / 2);
    const stoneMat = new THREE.MeshBasicMaterial({
      color: 0x7c6b57,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    const stoneCount = Math.min(180, Math.floor(tiles.size * 0.35));
    const stones = new THREE.InstancedMesh(stoneGeo, stoneMat, Math.max(1, stoneCount));
    const keys = [...tiles];
    for (let i = 0; i < stoneCount; i++) {
      const key = keys[Math.floor(hash2(i, 17) * keys.length)];
      const x = Math.floor(key / GRID_Z);
      const z = key % GRID_Z;
      dummy.position.set(
        tileCenterX(x) + (hash2(i, 21) - 0.5) * 0.8,
        0.06,
        tileCenterZ(z) + (hash2(i, 23) - 0.5) * 0.8,
      );
      dummy.rotation.set(0, hash2(i, 27) * 6, 0);
      dummy.scale.setScalar(0.6 + hash2(i, 29) * 1.0);
      dummy.scale.y = 1;
      dummy.updateMatrix();
      stones.setMatrixAt(i, dummy.matrix);
    }
    stones.count = stoneCount;
    stones.instanceMatrix.needsUpdate = true;
    stones.frustumCulled = false;
    pathGroup.add(stones);

    const glow = new THREE.Mesh(
      dirtGeo,
      new THREE.MeshBasicMaterial({
        color: 0x9fe8ff,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.position.y = 0.02;
    glow.visible = isPrep;
    pathGlow = glow;
    pathGroup.add(glow);
  }

  const noBuildGroup = new THREE.Group();
  scene.add(noBuildGroup);

  /** Warded ground around the portal — tinted red and outlined so the rule reads on the map. */
  function setNoBuild(tiles: Set<number>): void {
    for (const child of [...noBuildGroup.children]) {
      noBuildGroup.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
    if (tiles.size === 0) return;

    const geo = tileQuadGeometry(tiles, 1, 0.045, 0.99, 0.85, 0.5, 0.04);
    noBuildGroup.add(
      new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.3, depthWrite: false }),
      ),
    );

    // warning outline around the warded tiles
    const inZone = (x: number, z: number) => inBounds(x, z) && tiles.has(TKEY(x, z));
    const pts: number[] = [];
    const y = 0.07;
    const h = 0.5;
    for (const key of tiles) {
      const x = Math.floor(key / GRID_Z);
      const z = key % GRID_Z;
      const cx = tileCenterX(x);
      const cz = tileCenterZ(z);
      if (!inZone(x, z - 1)) pts.push(cx - h, y, cz - h, cx + h, y, cz - h);
      if (!inZone(x, z + 1)) pts.push(cx - h, y, cz + h, cx + h, y, cz + h);
      if (!inZone(x - 1, z)) pts.push(cx - h, y, cz - h, cx - h, y, cz + h);
      if (!inZone(x + 1, z)) pts.push(cx + h, y, cz - h, cx + h, y, cz + h);
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    noBuildGroup.add(
      new THREE.LineSegments(
        lineGeo,
        new THREE.LineBasicMaterial({ color: 0xff6a5a, transparent: true, opacity: 0.8 }),
      ),
    );
  }

  function setBuildable(tiles: Set<number>): void {
    for (const child of [...buildGroup.children]) {
      buildGroup.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
    if (tiles.size === 0) return;

    const geo = tileQuadGeometry(tiles, 1, 0.03, 0.27, 0.5, 0.62, 0.03);
    buildGroup.add(
      new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.14, depthWrite: false }),
      ),
    );

    // gold outline along the lane edge so it reads over the ground patches
    const inLane = (x: number, z: number) => inBounds(x, z) && tiles.has(TKEY(x, z));
    const pts: number[] = [];
    const y = 0.05;
    const h = 0.5;
    for (const key of tiles) {
      const x = Math.floor(key / GRID_Z);
      const z = key % GRID_Z;
      const cx = tileCenterX(x);
      const cz = tileCenterZ(z);
      if (!inLane(x, z - 1)) pts.push(cx - h, y, cz - h, cx + h, y, cz - h);
      if (!inLane(x, z + 1)) pts.push(cx - h, y, cz + h, cx + h, y, cz + h);
      if (!inLane(x - 1, z)) pts.push(cx - h, y, cz - h, cx - h, y, cz + h);
      if (!inLane(x + 1, z)) pts.push(cx + h, y, cz - h, cx + h, y, cz + h);
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    buildGroup.add(
      new THREE.LineSegments(
        lineGeo,
        new THREE.LineBasicMaterial({ color: 0xe0bb63, transparent: true, opacity: 0.5 }),
      ),
    );
  }

  function setPortals(tiles: Tile[]): void {
    portals.forEach((p, i) => {
      const tile = tiles[i];
      p.group.visible = Boolean(tile);
      if (!tile) return;
      p.group.position.set(-HALF_X - 0.7 * p.group.scale.x, 0, tileCenterZ(tile.z));
    });
  }

  function animate(dt: number, time: number): void {
    portals.forEach((portal, i) => {
      if (!portal.group.visible) return;
      const phase = time + i * 1.7;
      portal.disc.scale.setScalar(1 + Math.sin(phase * 2.2) * 0.06);
      const discMat = portal.disc.material as THREE.MeshBasicMaterial;
      discMat.opacity = 0.38 + Math.sin(phase * 2.2) * 0.12;
      portal.ring.scale.setScalar(1 + Math.sin(phase * 1.7) * 0.03);
    });
    if (pathGlow) {
      const m = pathGlow.material as THREE.MeshBasicMaterial;
      m.opacity = prep ? 0.12 + Math.sin(time * 2.6) * 0.06 : 0.06;
    }
  }

  return {
    decoTiles,
    pickPlane,
    setPath,
    setBuildable,
    setNoBuild,
    setHidden: applyHidden,
    setPortals,
    animate,
  };
}
