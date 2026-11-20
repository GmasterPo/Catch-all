import * as THREE from 'three';
import type { EnemyId, ProjectileKind, TowerId } from './defs';
import {
  ENEMY_SIZE,
  PROJECTILE_SIZE,
  TOWER_SIZE,
  enemyTexture,
  projectileTexture,
  towerTexture,
} from './art';

const flatGeo = new THREE.PlaneGeometry(1, 1);
flatGeo.rotateX(-Math.PI / 2);

function flatSprite(
  texture: THREE.Texture,
  size: number,
  y: number,
  opacity = 1,
  tint = 0xffffff,
  renderOrder = 1,
): THREE.Mesh {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    opacity,
    color: tint,
  });
  const mesh = new THREE.Mesh(flatGeo, material);
  mesh.scale.set(size, 1, size);
  mesh.position.y = y;
  mesh.renderOrder = renderOrder;
  return mesh;
}

export function buildTowerModel(id: TowerId, level: number): THREE.Group {
  const group = new THREE.Group();
  group.add(flatSprite(towerTexture(id, level), TOWER_SIZE[id], 0.16, 1, 0xffffff, 2));
  return group;
}

export function buildGhostModel(id: TowerId): THREE.Group {
  const group = new THREE.Group();
  group.add(flatSprite(towerTexture(id, 1), TOWER_SIZE[id], 0.17, 0.55, 0x9ae08a, 2));
  return group;
}

export function createEnemyMesh(id: EnemyId): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Group();
  body.name = 'body';
  const sprite = flatSprite(enemyTexture(id), ENEMY_SIZE[id], 0.18, 1, 0xffffff, 3);
  body.add(sprite);
  group.add(body);
  group.userData.size = ENEMY_SIZE[id];
  group.userData.sprite = sprite;
  return group;
}

export function makeProjectileMesh(kind: ProjectileKind): THREE.Object3D {
  return flatSprite(projectileTexture(kind), PROJECTILE_SIZE[kind], 0.22, 1, 0xffffff, 4);
}

export function buildRangeRing(): THREE.Mesh {
  const geo = new THREE.RingGeometry(0.985, 1, 64);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xf5d99a,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.08;
  mesh.visible = false;
  return mesh;
}
