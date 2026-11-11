import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  Box,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  Footprints,
  Home,
  RotateCcw,
  Rotate3D,
  Sun,
} from "lucide-react";
import type { FurnitureItem, Opening, Plan, WallSegment } from "@/types";
import { clamp, computeWalls, ROOM_COLORS } from "@/lib/plan";
import { cn } from "@/utils/cn";

type NavigationMode = "orbit" | "walk";
type DesignStyle = "natural" | "white" | "dark";
type LightingPreset = "day" | "sunset" | "night";
type MaterialMap = Record<string, THREE.Material>;

interface CollisionData {
  walls: WallSegment[];
  openings: Opening[];
}

interface Engine {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  setMode: (mode: NavigationMode) => void;
  reset: () => void;
}

const DOOR_HEIGHT = 7;
const WINDOW_SILL = 3;
const WALK_EYE_HEIGHT = 5.35;

function worldX(plan: Plan, x: number) {
  return x - plan.width / 2;
}
function worldZ(plan: Plan, y: number) {
  return y - plan.depth / 2;
}

function makeMaterials(style: DesignStyle = "natural"): MaterialMap {
  const standard = (color: string, roughness = 0.8, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const palette = style === "white"
    ? { wall: "#fbfbf8", exterior: "#f0f0eb", wood: "#c7b9a4", fabric: "#b8c1bd" }
    : style === "dark"
      ? { wall: "#686d68", exterior: "#575e5a", wood: "#73543e", fabric: "#657b72" }
      : { wall: "#f1ede3", exterior: "#e5dfd2", wood: "#a98258", fabric: "#9faa92" };
  return {
    wall: standard(palette.wall, 0.92),
    exterior: standard(palette.exterior, 0.94),
    ceiling: standard("#f5f2e9", 0.96),
    wood: standard(palette.wood, 0.72),
    darkWood: standard("#6f523b", 0.76),
    fabric: standard(palette.fabric, 0.98),
    linen: standard("#ddd3c1", 1),
    white: standard("#eeeDE8", 0.72),
    dark: standard("#3e4645", 0.6),
    metal: standard("#9da5a3", 0.35, 0.55),
    leaf: standard("#67835d", 0.94),
    pot: standard("#a87855", 0.9),
    water: new THREE.MeshPhysicalMaterial({ color: "#a8c9cc", roughness: 0.18, transparent: true, opacity: 0.65 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: "#b9d6d8",
      roughness: 0.08,
      metalness: 0,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
    }),
  };
}

function addBox(
  parent: THREE.Object3D,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
  shadows = true,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  parent.add(mesh);
  return mesh;
}

function addCylinder(
  parent: THREE.Object3D,
  radius: number,
  height: number,
  position: [number, number, number],
  material: THREE.Material,
  segments = 16,
) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function disposeGroup(group: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      geometries.add(object.geometry);
      const list = Array.isArray(object.material) ? object.material : [object.material];
      list.forEach((material) => materials.add(material));
    }
  });
  group.clear();
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

function wallOpenings(wall: WallSegment, openings: Opening[]) {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const length = Math.hypot(dx, dy);
  if (!length) return [];
  const ux = dx / length;
  const uy = dy / length;
  return openings
    .map((opening) => {
      const rx = opening.x - wall.x1;
      const ry = opening.y - wall.y1;
      const along = rx * ux + ry * uy;
      const perpendicular = Math.abs(rx * -uy + ry * ux);
      const orientationMatches = Math.abs(ux) > 0.7 ? opening.angle === 0 : opening.angle === 90;
      if (!orientationMatches || perpendicular > 0.5 || along < -0.4 || along > length + 0.4) return null;
      return { opening, along };
    })
    .filter((entry): entry is { opening: Opening; along: number } => Boolean(entry))
    .sort((a, b) => a.along - b.along);
}

function addWallPiece(
  parent: THREE.Group,
  plan: Plan,
  wall: WallSegment,
  start: number,
  end: number,
  bottom: number,
  top: number,
  material: THREE.Material,
) {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const length = Math.hypot(dx, dy);
  const height = top - bottom;
  if (!length || end - start < 0.04 || height < 0.04) return;
  const ux = dx / length;
  const uy = dy / length;
  const pieceLength = end - start;
  const mid = (start + end) / 2;
  const px = wall.x1 + ux * mid;
  const py = wall.y1 + uy * mid;
  const thickness = wall.exterior ? 0.46 : 0.3;
  const mesh = addBox(
    parent,
    [pieceLength, height, thickness],
    [worldX(plan, px), bottom + height / 2, worldZ(plan, py)],
    material,
  );
  mesh.rotation.y = -Math.atan2(dy, dx);
}

function addWindow(parent: THREE.Group, plan: Plan, opening: Opening, wallHeight: number, mats: MaterialMap) {
  const top = Math.min(DOOR_HEIGHT, wallHeight - 0.3);
  const height = Math.max(1, top - WINDOW_SILL);
  const group = new THREE.Group();
  group.position.set(worldX(plan, opening.x), 0, worldZ(plan, opening.y));
  group.rotation.y = opening.angle === 0 ? 0 : -Math.PI / 2;
  addBox(group, [opening.width - 0.18, height - 0.16, 0.07], [0, WINDOW_SILL + height / 2, 0], mats.glass, false);
  addBox(group, [0.12, height, 0.18], [-opening.width / 2, WINDOW_SILL + height / 2, 0], mats.white);
  addBox(group, [0.12, height, 0.18], [opening.width / 2, WINDOW_SILL + height / 2, 0], mats.white);
  addBox(group, [opening.width, 0.12, 0.18], [0, WINDOW_SILL, 0], mats.white);
  addBox(group, [opening.width, 0.12, 0.18], [0, top, 0], mats.white);
  addBox(group, [0.07, height - 0.15, 0.12], [0, WINDOW_SILL + height / 2, 0], mats.white);
  parent.add(group);
}

function addDoor(parent: THREE.Group, plan: Plan, opening: Opening, wallHeight: number, mats: MaterialMap) {
  const height = Math.min(DOOR_HEIGHT, wallHeight - 0.25);
  const baseRotation = opening.angle === 0 ? 0 : -Math.PI / 2;
  const frame = new THREE.Group();
  frame.position.set(worldX(plan, opening.x), 0, worldZ(plan, opening.y));
  frame.rotation.y = baseRotation;
  addBox(frame, [0.12, height, 0.2], [-opening.width / 2, height / 2, 0], mats.darkWood);
  addBox(frame, [0.12, height, 0.2], [opening.width / 2, height / 2, 0], mats.darkWood);
  addBox(frame, [opening.width, 0.12, 0.2], [0, height, 0], mats.darkWood);
  parent.add(frame);

  const hingeX = opening.x - (opening.angle === 0 ? opening.width / 2 : 0);
  const hingeY = opening.y - (opening.angle === 90 ? opening.width / 2 : 0);
  const door = new THREE.Group();
  door.position.set(worldX(plan, hingeX), 0, worldZ(plan, hingeY));
  door.rotation.y = baseRotation + opening.swing * Math.PI * 0.31;
  const panelWidth = Math.max(1, opening.width - 0.14);
  addBox(door, [panelWidth, height - 0.08, 0.11], [panelWidth / 2, height / 2, 0], mats.wood);
  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mats.metal);
  handle.position.set(panelWidth - 0.25, height * 0.48, 0.1);
  door.add(handle);
  parent.add(door);
}

function buildWalls(parent: THREE.Group, plan: Plan, wallHeight: number, mats: MaterialMap) {
  const walls = computeWalls(plan);
  for (const wall of walls) {
    const length = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
    if (!length) continue;
    const hits = wallOpenings(wall, plan.openings);
    const material = wall.exterior ? mats.exterior : mats.wall;
    let cursor = 0;

    for (const { opening, along } of hits) {
      const start = clamp(along - opening.width / 2, 0, length);
      const end = clamp(along + opening.width / 2, 0, length);
      if (end - start < 0.25) continue;
      addWallPiece(parent, plan, wall, cursor, start, 0, wallHeight, material);
      if (opening.kind === "door") {
        const top = Math.min(DOOR_HEIGHT, wallHeight - 0.25);
        addWallPiece(parent, plan, wall, start, end, top, wallHeight, material);
        addDoor(parent, plan, opening, wallHeight, mats);
      } else {
        const top = Math.min(DOOR_HEIGHT, wallHeight - 0.3);
        addWallPiece(parent, plan, wall, start, end, 0, WINDOW_SILL, material);
        addWallPiece(parent, plan, wall, start, end, top, wallHeight, material);
        addWindow(parent, plan, opening, wallHeight, mats);
      }
      cursor = Math.max(cursor, end);
    }
    addWallPiece(parent, plan, wall, cursor, length, 0, wallHeight, material);
  }
  return walls;
}

function addFurniture(parent: THREE.Group, plan: Plan, item: FurnitureItem, mats: MaterialMap) {
  const group = new THREE.Group();
  const w = Math.max(0.2, item.w);
  const d = Math.max(0.2, item.h);
  group.position.set(worldX(plan, item.x + w / 2), 0.08, worldZ(plan, item.y + d / 2));
  group.rotation.y = -(item.rot * Math.PI) / 180;

  const leg = (x: number, z: number, height: number, material = mats.darkWood) =>
    addBox(group, [0.12, height, 0.12], [x, height / 2, z], material);
  const fourLegs = (height: number, inset = 0.2) => {
    leg(-w / 2 + inset, -d / 2 + inset, height);
    leg(w / 2 - inset, -d / 2 + inset, height);
    leg(-w / 2 + inset, d / 2 - inset, height);
    leg(w / 2 - inset, d / 2 - inset, height);
  };

  switch (item.type) {
    case "bed": {
      addBox(group, [w, 0.55, d], [0, 0.35, 0], mats.darkWood);
      addBox(group, [w * 0.94, 0.45, d * 0.9], [0, 0.82, d * 0.03], mats.linen);
      addBox(group, [w, 2.1, 0.16], [0, 1.05, -d / 2], mats.wood);
      addBox(group, [w * 0.4, 0.2, d * 0.16], [-w * 0.23, 1.14, -d * 0.3], mats.white);
      addBox(group, [w * 0.4, 0.2, d * 0.16], [w * 0.23, 1.14, -d * 0.3], mats.white);
      break;
    }
    case "sofa": {
      addBox(group, [w, 0.65, d], [0, 0.48, 0], mats.fabric);
      addBox(group, [w * 0.86, 0.32, d * 0.68], [0, 0.94, d * 0.08], mats.linen);
      addBox(group, [w, 1.35, 0.34], [0, 1.25, -d / 2 + 0.15], mats.fabric);
      addBox(group, [0.28, 1.05, d], [-w / 2 + 0.12, 0.85, 0], mats.fabric);
      addBox(group, [0.28, 1.05, d], [w / 2 - 0.12, 0.85, 0], mats.fabric);
      break;
    }
    case "dining-table":
    case "coffee-table":
    case "desk": {
      const height = item.type === "coffee-table" ? 1.25 : 2.45;
      addBox(group, [w, 0.16, d], [0, height, 0], mats.wood);
      fourLegs(height - 0.05, Math.min(0.25, w * 0.12));
      break;
    }
    case "chair":
    case "balcony-chair": {
      addBox(group, [w, 0.18, d], [0, 1.35, 0], mats.wood);
      addBox(group, [w, 1.35, 0.16], [0, 2, -d / 2 + 0.08], mats.fabric);
      fourLegs(1.3, 0.16);
      break;
    }
    case "plant": {
      addCylinder(group, Math.min(w, d) * 0.28, 0.65, [0, 0.33, 0], mats.pot);
      for (let i = 0; i < 6; i += 1) {
        const angle = (i / 6) * Math.PI * 2;
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(Math.min(w, d) * 0.28, 10, 8), mats.leaf);
        leaf.scale.set(0.65, 1.6, 0.65);
        leaf.position.set(Math.cos(angle) * w * 0.18, 1.25 + (i % 2) * 0.35, Math.sin(angle) * d * 0.18);
        leaf.castShadow = true;
        group.add(leaf);
      }
      break;
    }
    case "rug":
      addBox(group, [w, 0.035, d], [0, 0.02, 0], mats.linen, false);
      break;
    case "wardrobe":
    case "bookshelf": {
      const height = item.type === "wardrobe" ? 7 : 6;
      addBox(group, [w, height, d], [0, height / 2, 0], mats.wood);
      if (item.type === "bookshelf") {
        for (let y = 1; y < height; y += 1.1) addBox(group, [w * 0.92, 0.08, d * 1.02], [0, y, 0], mats.darkWood);
      }
      break;
    }
    case "tv": {
      addBox(group, [w, 1.2, d], [0, 0.6, 0], mats.darkWood);
      addBox(group, [Math.max(0.15, w * 0.25), Math.min(3, d * 0.62), d * 0.82], [0, 2.25, 0], mats.dark);
      break;
    }
    case "counter":
    case "vanity": {
      addBox(group, [w, 2.75, d], [0, 1.38, 0], mats.white);
      addBox(group, [w + 0.08, 0.14, d + 0.08], [0, 2.82, 0], mats.darkWood);
      if (item.type === "vanity") addBox(group, [w * 0.55, 0.12, d * 0.55], [0, 2.94, 0], mats.water, false);
      break;
    }
    case "sink": {
      addBox(group, [w, 2.7, d], [0, 1.35, 0], mats.white);
      addBox(group, [w * 0.75, 0.18, d * 0.7], [0, 2.78, 0], mats.water, false);
      break;
    }
    case "stove": {
      addBox(group, [w, 2.75, d], [0, 1.38, 0], mats.metal);
      for (const x of [-0.25, 0.25]) for (const z of [-0.25, 0.25])
        addCylinder(group, Math.min(w, d) * 0.12, 0.05, [x * w, 2.8, z * d], mats.dark);
      break;
    }
    case "fridge": {
      addBox(group, [w, 6, d], [0, 3, 0], mats.metal);
      addBox(group, [0.08, 1.5, 0.08], [w * 0.28, 3.6, d / 2 + 0.05], mats.dark);
      break;
    }
    case "toilet": {
      addBox(group, [w * 0.75, 1.1, d * 0.7], [0, 0.55, d * 0.08], mats.white);
      addBox(group, [w, 1.7, d * 0.3], [0, 1.35, -d * 0.34], mats.white);
      addCylinder(group, w * 0.36, 0.18, [0, 1.18, d * 0.12], mats.white);
      break;
    }
    case "bathtub": {
      addBox(group, [w, 1.8, d], [0, 0.9, 0], mats.white);
      addBox(group, [w * 0.82, 0.15, d * 0.7], [0, 1.82, 0], mats.water, false);
      break;
    }
    case "shower": {
      addBox(group, [w, 0.18, d], [0, 0.09, 0], mats.white);
      addBox(group, [w, 7, 0.07], [0, 3.5, -d / 2], mats.glass, false);
      addBox(group, [0.07, 7, d], [-w / 2, 3.5, 0], mats.glass, false);
      break;
    }
    case "washer": {
      addBox(group, [w, 2.9, d], [0, 1.45, 0], mats.white);
      const drum = addCylinder(group, Math.min(w, d) * 0.28, 0.08, [0, 1.45, d / 2 + 0.04], mats.dark);
      drum.rotation.x = Math.PI / 2;
      break;
    }
    case "nightstand":
      addBox(group, [w, 1.8, d], [0, 0.9, 0], mats.wood);
      break;
    case "stairs": {
      const count = 10;
      for (let index = 0; index < count; index += 1) {
        const stepDepth = d / count;
        const height = (index + 1) * 0.85;
        addBox(group, [w, height, stepDepth + 0.03], [0, height / 2, -d / 2 + stepDepth * (index + 0.5)], mats.wood);
      }
      addBox(group, [0.08, 1, d], [-w / 2, 3.7, 0], mats.metal);
      break;
    }
    default:
      addBox(group, [w, 1.5, d], [0, 0.75, 0], mats.wood);
  }
  group.userData.furnitureId = item.id;
  group.traverse((object) => { object.userData.furnitureId = item.id; });
  parent.add(group);
}

function pointSegmentDistance(px: number, py: number, wall: WallSegment) {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const length2 = dx * dx + dy * dy;
  if (!length2) return { distance: Infinity, along: 0, length: 0 };
  const length = Math.sqrt(length2);
  const t = clamp(((px - wall.x1) * dx + (py - wall.y1) * dy) / length2, 0, 1);
  const x = wall.x1 + dx * t;
  const y = wall.y1 + dy * t;
  return { distance: Math.hypot(px - x, py - y), along: t * length, length };
}

function canWalkTo(plan: Plan, collision: CollisionData, x: number, z: number) {
  const px = x + plan.width / 2;
  const py = z + plan.depth / 2;
  if (px < 0.3 || py < 0.3 || px > plan.width - 0.3 || py > plan.depth - 0.3) return false;
  for (const wall of collision.walls) {
    const hit = pointSegmentDistance(px, py, wall);
    const thickness = wall.exterior ? 0.46 : 0.3;
    if (hit.distance > 0.34 + thickness / 2) continue;
    const door = wallOpenings(wall, collision.openings).find(
      ({ opening, along }) => opening.kind === "door" && Math.abs(along - hit.along) < opening.width / 2 + 0.12,
    );
    if (!door) return false;
  }
  return true;
}

export function House3D({ plan, onPlanChange }: { plan: Plan; onPlanChange?: (plan: Plan) => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<THREE.Group | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const sunRef = useRef<THREE.DirectionalLight | null>(null);
  const planRef = useRef(plan);
  planRef.current = plan;
  const onPlanChangeRef = useRef(onPlanChange);
  onPlanChangeRef.current = onPlanChange;
  const sceneRef = useRef<THREE.Scene | null>(null);
  const hemisphereRef = useRef<THREE.HemisphereLight | null>(null);
  const collisionRef = useRef<CollisionData>({ walls: [], openings: [] });
  const modeRef = useRef<NavigationMode>("orbit");
  const keysRef = useRef(new Set<string>());
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const [navigation, setNavigation] = useState<NavigationMode>("orbit");
  const [designStyle, setDesignStyle] = useState<DesignStyle>("natural");
  const [lighting, setLighting] = useState<LightingPreset>("day");
  const [moveFurniture, setMoveFurniture] = useState(false);
  const moveFurnitureRef = useRef(false);
  const [wallHeight, setWallHeight] = useState(9);
  const [showRoof, setShowRoof] = useState(false);
  const [sun, setSun] = useState(70);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      setError("WebGL is unavailable in this browser. Enable hardware acceleration to use the 3D view.");
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#e7e4dc");
    scene.fog = new THREE.Fog("#e7e4dc", 100, 230);
    sceneRef.current = scene;
    const width = mount.clientWidth || 900;
    const height = mount.clientHeight || 650;
    const camera = new THREE.PerspectiveCamera(47, width / height, 0.1, 500);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(260, 260),
      new THREE.MeshStandardMaterial({ color: "#d5d2c7", roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.2;
    ground.receiveShadow = true;
    scene.add(ground);
    const grid = new THREE.GridHelper(180, 90, "#bdb9ad", "#cfccc1");
    grid.position.y = -0.18;
    const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
    gridMaterials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0.28;
    });
    scene.add(grid);

    const hemisphere = new THREE.HemisphereLight("#fff8e9", "#778079", 1.5);
    scene.add(hemisphere);
    hemisphereRef.current = hemisphere;
    const sunlight = new THREE.DirectionalLight("#fff0d5", 2.1);
    sunlight.position.set(35, 55, 25);
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(2048, 2048);
    sunlight.shadow.camera.left = -70;
    sunlight.shadow.camera.right = 70;
    sunlight.shadow.camera.top = 70;
    sunlight.shadow.camera.bottom = -70;
    sunlight.shadow.camera.far = 180;
    sunlight.shadow.bias = -0.0004;
    scene.add(sunlight);
    sunRef.current = sunlight;

    const content = new THREE.Group();
    scene.add(content);
    contentRef.current = content;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.minDistance = 4;
    controls.maxDistance = 170;
    controls.maxPolarAngle = Math.PI / 2.04;
    controls.target.set(0, 2, 0);

    const resetOrbit = () => {
      const current = planRef.current;
      const size = Math.max(current.width, current.depth);
      camera.position.set(size * 0.78, size * 0.68, size * 0.92);
      controls.target.set(0, 2.2, 0);
      camera.lookAt(controls.target);
      controls.update();
    };
    const resetWalk = () => {
      const current = planRef.current;
      const room = current.rooms.find((r) => r.type === "hall") ?? current.rooms.find((r) => r.type === "living") ?? current.rooms[0];
      const px = room ? room.x + room.w / 2 : current.width / 2;
      const py = room ? room.y + room.h / 2 : current.depth / 2;
      camera.position.set(worldX(current, px), WALK_EYE_HEIGHT, worldZ(current, py));
      const dx = -camera.position.x;
      const dz = -camera.position.z;
      yawRef.current = Math.atan2(-dx, -dz);
      pitchRef.current = 0;
      camera.rotation.set(0, yawRef.current, 0, "YXZ");
    };
    const setMode = (mode: NavigationMode) => {
      controls.enabled = mode === "orbit";
      keysRef.current.clear();
      if (mode === "orbit") resetOrbit();
      else resetWalk();
    };
    engineRef.current = { camera, controls, setMode, reset: () => (modeRef.current === "orbit" ? resetOrbit() : resetWalk()) };
    resetOrbit();

    const resizeObserver = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box?.width || !box?.height) return;
      renderer.setSize(box.width, box.height);
      camera.aspect = box.width / box.height;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(mount);

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let furnitureDrag: { group: THREE.Group; item: FurnitureItem; offset: THREE.Vector3 } | null = null;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const groundPoint = new THREE.Vector3();
    const updatePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (moveFurnitureRef.current && modeRef.current === "orbit") {
        updatePointer(event);
        const hits = raycaster.intersectObjects(content.children, true);
        for (const hit of hits) {
          let object: THREE.Object3D | null = hit.object;
          while (object && object !== content && !object.userData.furnitureId) object = object.parent;
          if (!object?.userData.furnitureId || !(object instanceof THREE.Group)) continue;
          const item = planRef.current.furniture.find((entry) => entry.id === object.userData.furnitureId);
          if (!item || !raycaster.ray.intersectPlane(groundPlane, groundPoint)) continue;
          furnitureDrag = { group: object, item, offset: object.position.clone().sub(groundPoint) };
          controls.enabled = false;
          renderer.domElement.setPointerCapture(event.pointerId);
          return;
        }
      }
      if (modeRef.current !== "walk") return;
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (furnitureDrag) {
        updatePointer(event);
        if (raycaster.ray.intersectPlane(groundPlane, groundPoint)) {
          furnitureDrag.group.position.copy(groundPoint).add(furnitureDrag.offset);
          furnitureDrag.group.position.y = 0.08;
        }
        return;
      }
      if (!dragging || modeRef.current !== "walk") return;
      yawRef.current -= (event.clientX - lastX) * 0.005;
      pitchRef.current = clamp(pitchRef.current - (event.clientY - lastY) * 0.004, -1.15, 1.15);
      lastX = event.clientX;
      lastY = event.clientY;
      camera.rotation.set(pitchRef.current, yawRef.current, 0, "YXZ");
    };
    const onPointerUp = () => {
      if (furnitureDrag) {
        const current = planRef.current;
        const { group, item } = furnitureDrag;
        const x = clamp(group.position.x + current.width / 2 - item.w / 2, 0, Math.max(0, current.width - item.w));
        const y = clamp(group.position.z + current.depth / 2 - item.h / 2, 0, Math.max(0, current.depth - item.h));
        onPlanChangeRef.current?.({
          ...current,
          furniture: current.furniture.map((entry) => entry.id === item.id ? { ...entry, x: Math.round(x * 4) / 4, y: Math.round(y * 4) / 4 } : entry),
        });
        furnitureDrag = null;
        controls.enabled = modeRef.current === "orbit";
      }
      dragging = false;
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);

    const movementKeys = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight"]);
    const onKeyDown = (event: KeyboardEvent) => {
      if (modeRef.current !== "walk") return;
      const target = event.target as HTMLElement | null;
      if (target && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable)) return;
      if (event.code === "Escape") {
        setNavigation("orbit");
        return;
      }
      if (movementKeys.has(event.code)) {
        event.preventDefault();
        keysRef.current.add(event.code);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => keysRef.current.delete(event.code);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const clock = new THREE.Clock();
    let frame = 0;
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const movement = new THREE.Vector3();
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      if (modeRef.current === "walk") {
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        right.crossVectors(forward, camera.up).normalize();
        movement.set(0, 0, 0);
        const keys = keysRef.current;
        if (keys.has("KeyW") || keys.has("ArrowUp")) movement.add(forward);
        if (keys.has("KeyS") || keys.has("ArrowDown")) movement.sub(forward);
        if (keys.has("KeyD") || keys.has("ArrowRight")) movement.add(right);
        if (keys.has("KeyA") || keys.has("ArrowLeft")) movement.sub(right);
        if (movement.lengthSq() > 0) {
          const speed = keys.has("ShiftLeft") || keys.has("ShiftRight") ? 10 : 5.5;
          movement.normalize().multiplyScalar(speed * delta);
          const current = planRef.current;
          const collision = collisionRef.current;
          const nextX = camera.position.x + movement.x;
          const nextZ = camera.position.z + movement.z;
          if (canWalkTo(current, collision, nextX, camera.position.z)) camera.position.x = nextX;
          if (canWalkTo(current, collision, camera.position.x, nextZ)) camera.position.z = nextZ;
        }
        camera.position.y = WALK_EYE_HEIGHT;
      } else {
        controls.update();
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
      contentRef.current = null;
      engineRef.current = null;
      sunRef.current = null;
    };
  }, []);

  useEffect(() => {
    modeRef.current = navigation;
    engineRef.current?.setMode(navigation);
  }, [navigation]);

  useEffect(() => {
    moveFurnitureRef.current = moveFurniture;
    if (moveFurniture) setNavigation("orbit");
  }, [moveFurniture]);

  useEffect(() => {
    const preset = lighting === "night"
      ? { sun: 0.18, color: "#9eb8dc", hemi: 0.35, background: "#27323d" }
      : lighting === "sunset"
        ? { sun: 0.85, color: "#ffbd83", hemi: 0.8, background: "#c8a996" }
        : { sun: 1, color: "#fff0d5", hemi: 1.5, background: "#e7e4dc" };
    if (sunRef.current) {
      sunRef.current.intensity = (0.35 + (sun / 100) * 2.2) * preset.sun;
      sunRef.current.color.set(preset.color);
    }
    if (hemisphereRef.current) hemisphereRef.current.intensity = preset.hemi;
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(preset.background);
      if (sceneRef.current.fog instanceof THREE.Fog) sceneRef.current.fog.color.set(preset.background);
    }
  }, [sun, lighting]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    disposeGroup(content);
    const mats = makeMaterials(designStyle);

    for (const room of plan.rooms) {
      const color = ROOM_COLORS[room.type].inside;
      const floorMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.93 });
      addBox(
        content,
        [Math.max(0.1, room.w - 0.04), 0.16, Math.max(0.1, room.h - 0.04)],
        [worldX(plan, room.x + room.w / 2), -0.02, worldZ(plan, room.y + room.h / 2)],
        floorMaterial,
      );
      if (showRoof) {
        addBox(
          content,
          [room.w, 0.14, room.h],
          [worldX(plan, room.x + room.w / 2), wallHeight + 0.08, worldZ(plan, room.y + room.h / 2)],
          mats.ceiling,
        );
      }
    }

    const walls = buildWalls(content, plan, wallHeight, mats);
    collisionRef.current = { walls, openings: plan.openings };
    for (const item of plan.furniture) addFurniture(content, plan, item, mats);

    return () => {
      if (contentRef.current === content) disposeGroup(content);
    };
  }, [plan, wallHeight, showRoof, designStyle]);

  const holdKey = (code: string, held: boolean) => {
    if (held) keysRef.current.add(code);
    else keysRef.current.delete(code);
  };

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#e7e4dc]">
      <div ref={mountRef} className="absolute inset-0" />

      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <div className="max-w-sm rounded-xl border border-line bg-white p-5 shadow-xl">
            <Box className="mx-auto h-6 w-6 text-ink-faint" />
            <p className="mt-2 text-[13px] font-semibold text-ink">3D view unavailable</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">{error}</p>
          </div>
        </div>
      )}

      {!error && (
        <>
          <div className="pointer-events-none absolute left-3 top-[74px] flex items-center gap-1.5 rounded-full border border-white/60 bg-white/85 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.09em] text-ink-soft shadow-sm backdrop-blur sm:left-4 sm:top-[86px]">
            <Box className="h-3 w-3 text-accent" /> Real 3D geometry · offline
          </div>

          <div className="absolute bottom-3 left-3 w-[292px] max-w-[calc(100vw-24px)] rounded-xl border border-white/70 bg-white/92 p-2.5 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setNavigation("orbit")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition",
                  navigation === "orbit" ? "bg-ink text-white" : "text-ink-soft hover:bg-paper-deep",
                )}
              >
                <Rotate3D className="h-3.5 w-3.5" /> Orbit
              </button>
              <button
                onClick={() => { setMoveFurniture(false); setNavigation("walk"); }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition",
                  navigation === "walk" ? "bg-ink text-white" : "text-ink-soft hover:bg-paper-deep",
                )}
              >
                <Footprints className="h-3.5 w-3.5" /> Walk
              </button>
              <button
                onClick={() => engineRef.current?.reset()}
                className="rounded-lg border border-line bg-white p-2 text-ink-soft transition hover:bg-paper-deep hover:text-ink"
                title="Reset 3D camera"
                aria-label="Reset 3D camera"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <select value={designStyle} onChange={(event) => setDesignStyle(event.target.value as DesignStyle)} className="h-7 rounded-md border border-line bg-white px-1.5 text-[9px] text-ink-soft" aria-label="Material style">
                <option value="natural">Natural materials</option>
                <option value="white">White minimal</option>
                <option value="dark">Dark contemporary</option>
              </select>
              <select value={lighting} onChange={(event) => setLighting(event.target.value as LightingPreset)} className="h-7 rounded-md border border-line bg-white px-1.5 text-[9px] text-ink-soft" aria-label="Lighting preset">
                <option value="day">Daylight</option>
                <option value="sunset">Sunset</option>
                <option value="night">Night</option>
              </select>
            </div>
            {onPlanChange && (
              <button onClick={() => setMoveFurniture((value) => !value)} className={cn("mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-md border py-1.5 text-[9.5px] font-medium", moveFurniture ? "border-accent bg-accent-soft text-accent" : "border-line bg-white text-ink-soft")}>
                <Move3DIcon /> {moveFurniture ? "Finish moving furniture" : "Move furniture in 3D"}
              </button>
            )}

            <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 border-t border-line-soft pt-2">
              <label className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wide text-ink-faint">
                <Home className="h-3 w-3" /> Wall height
              </label>
              <span className="font-mono text-[9px] text-ink-soft">{wallHeight.toFixed(1)} ft</span>
              <input
                type="range"
                min={8}
                max={12}
                step={0.5}
                value={wallHeight}
                onChange={(event) => setWallHeight(Number(event.target.value))}
                className="col-span-2 h-1 w-full cursor-pointer accent-ink"
                aria-label="Wall height"
              />
              <label className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wide text-ink-faint">
                <Sun className="h-3 w-3" /> Sunlight
              </label>
              <button
                onClick={() => setShowRoof((value) => !value)}
                className={cn(
                  "rounded-md border px-2 py-1 font-mono text-[8.5px] uppercase tracking-wide transition",
                  showRoof ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft",
                )}
              >
                Roof {showRoof ? "on" : "off"}
              </button>
              <input
                type="range"
                min={15}
                max={100}
                value={sun}
                onChange={(event) => setSun(Number(event.target.value))}
                className="col-span-2 h-1 w-full cursor-pointer accent-ink"
                aria-label="Sunlight intensity"
              />
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-3 right-3 hidden rounded-full border border-white/60 bg-white/85 px-3 py-1.5 text-[10px] font-medium text-ink-soft shadow-sm backdrop-blur md:block">
            {moveFurniture ? "Drag a furniture object to reposition it · release to save to the plan" : navigation === "orbit" ? "Drag to orbit · scroll to zoom · right-drag to pan" : "WASD to move · drag to look · Shift to move faster · Esc for orbit"}
          </div>

          {navigation === "walk" && (
            <div className="absolute bottom-[178px] right-3 grid grid-cols-3 gap-1 rounded-xl border border-white/60 bg-white/80 p-1.5 shadow-lg backdrop-blur md:bottom-14">
              <span />
              <WalkButton code="KeyW" onHold={holdKey} label="Forward"><ChevronUp className="h-4 w-4" /></WalkButton>
              <span />
              <WalkButton code="KeyA" onHold={holdKey} label="Left"><ChevronLeft className="h-4 w-4" /></WalkButton>
              <WalkButton code="KeyS" onHold={holdKey} label="Backward"><ChevronDown className="h-4 w-4" /></WalkButton>
              <WalkButton code="KeyD" onHold={holdKey} label="Right"><ChevronRight className="h-4 w-4" /></WalkButton>
            </div>
          )}

          <div className="pointer-events-none absolute right-3 top-[62px] flex items-center gap-1 rounded-full bg-ink/65 px-2.5 py-1 font-mono text-[8.5px] uppercase tracking-wide text-white backdrop-blur sm:hidden">
            <Eye className="h-3 w-3" /> {navigation === "walk" ? "Drag to look" : "Drag to orbit"}
          </div>
        </>
      )}
    </div>
  );
}

function Move3DIcon() {
  return <Box className="h-3 w-3" />;
}

function WalkButton({
  code,
  onHold,
  label,
  children,
}: {
  code: string;
  onHold: (code: string, held: boolean) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onHold(code, true);
      }}
      onPointerUp={() => onHold(code, false)}
      onPointerLeave={() => onHold(code, false)}
      onPointerCancel={() => onHold(code, false)}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-ink-soft active:bg-ink active:text-white"
      aria-label={label}
    >
      {children}
    </button>
  );
}
