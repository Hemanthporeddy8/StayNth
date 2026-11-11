import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Move3D, Rotate3D } from "lucide-react";
import type { Room, RoomImage } from "@/types";
import { clamp } from "@/lib/plan";

function hotspotSprite(label: string, roomId: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "rgba(22,49,59,0.9)";
    ctx.fillRect(4, 4, 504, 120);
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 504, 120);
    ctx.fillStyle = "#d4653f";
    ctx.beginPath();
    ctx.arc(52, 64, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "500 30px sans-serif";
    ctx.textBaseline = "middle";
    const text = label.length > 23 ? `${label.slice(0, 22)}…` : label;
    ctx.fillText(text, 84, 65);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(5.2, 1.3, 1);
  sprite.userData.roomId = roomId;
  sprite.userData.hotspot = true;
  return sprite;
}

export function Panorama360({
  image,
  rooms,
  currentRoomId,
  onNavigate,
}: {
  image: RoomImage;
  rooms: Room[];
  currentRoomId: string;
  onNavigate: (roomId: string) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const navigateRef = useRef(onNavigate);
  navigateRef.current = onNavigate;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    setLoading(true);
    setError(null);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / Math.max(1, mount.clientHeight), 0.1, 120);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth || 800, mount.clientHeight || 500);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";

    const geometry = new THREE.SphereGeometry(50, 64, 40);
    const material = new THREE.MeshBasicMaterial({ side: THREE.BackSide });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    const loader = new THREE.TextureLoader();
    let disposed = false;
    loader.load(
      image.url,
      (texture) => {
        if (disposed) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        material.map = texture;
        material.needsUpdate = true;
        setLoading(false);
      },
      undefined,
      () => {
        setLoading(false);
        setError("The 360° image could not be loaded.");
      },
    );

    const sprites: THREE.Sprite[] = [];
    const destinations = rooms.filter((room) => room.id !== currentRoomId).slice(0, 7);
    destinations.forEach((room, index) => {
      const angle = (index / Math.max(1, destinations.length)) * Math.PI * 2 + 0.5;
      const sprite = hotspotSprite(room.name, room.id);
      sprite.position.set(Math.cos(angle) * 13, index % 2 ? 1.2 : -0.4, Math.sin(angle) * 13);
      scene.add(sprite);
      sprites.push(sprite);
    });

    let lon = 0;
    let lat = 0;
    let startLon = 0;
    let startLat = 0;
    let startX = 0;
    let startY = 0;
    let downX = 0;
    let downY = 0;
    let dragging = false;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onDown = (event: PointerEvent) => {
      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      downX = startX;
      downY = startY;
      startLon = lon;
      startLat = lat;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (!dragging) return;
      lon = startLon + (startX - event.clientX) * 0.12;
      lat = clamp(startLat + (event.clientY - startY) * 0.12, -82, 82);
    };
    const onUp = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (Math.hypot(event.clientX - downX, event.clientY - downY) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(sprites, false)[0];
      if (hit?.object.userData.roomId) navigateRef.current(String(hit.object.userData.roomId));
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      camera.fov = clamp(camera.fov + event.deltaY * 0.025, 42, 92);
      camera.updateProjectionMatrix();
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointercancel", () => { dragging = false; });
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    const resize = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box?.width || !box?.height) return;
      renderer.setSize(box.width, box.height);
      camera.aspect = box.width / box.height;
      camera.updateProjectionMatrix();
    });
    resize.observe(mount);

    const target = new THREE.Vector3();
    let frame = 0;
    const render = () => {
      frame = requestAnimationFrame(render);
      const phi = THREE.MathUtils.degToRad(90 - lat);
      const theta = THREE.MathUtils.degToRad(lon);
      target.set(50 * Math.sin(phi) * Math.cos(theta), 50 * Math.cos(phi), 50 * Math.sin(phi) * Math.sin(theta));
      camera.lookAt(target);
      renderer.render(scene, camera);
    };
    render();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      material.map?.dispose();
      material.dispose();
      geometry.dispose();
      sprites.forEach((sprite) => {
        sprite.material.map?.dispose();
        sprite.material.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [image.url, rooms, currentRoomId]);

  return (
    <div className="absolute inset-0 z-20 overflow-hidden bg-ink">
      <div ref={mountRef} className="absolute inset-0" />
      {loading && <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] uppercase tracking-wide text-white/70">Loading 360° panorama</div>}
      {error && <div className="absolute inset-0 flex items-center justify-center p-5 text-center text-[12px] text-white">{error}</div>}
      <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ink/65 px-3 py-1.5 text-[10px] text-white backdrop-blur">
        <Move3D className="h-3.5 w-3.5" /> Drag to look · scroll to zoom · click room labels to move
      </div>
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-ink/65 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wide text-white backdrop-blur">
        <Rotate3D className="h-3 w-3" /> True 360° · {rooms.length - 1} hotspots
      </div>
    </div>
  );
}
