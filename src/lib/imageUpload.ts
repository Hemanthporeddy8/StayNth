import type { RoomImage } from "@/types";
import { uid } from "@/lib/plan";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_EDGE = 1400;
const JPEG_QUALITY = 0.8;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("This image format is not supported by your browser"));
    img.src = url;
  });
}

/** Reads a real local image and compresses it so it can be saved with the plan. */
export async function fileToRoomImage(file: File): Promise<RoomImage> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image`);
  if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is larger than 15 MB`);

  const source = await readAsDataUrl(file);
  const img = await loadImage(source);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) throw new Error(`${file.name} has no readable image data`);

  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image processing is unavailable in this browser");

  // A neutral background also handles transparent PNGs cleanly.
  ctx.fillStyle = "#faf8f2";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return {
    id: uid("img"),
    url: canvas.toDataURL("image/jpeg", JPEG_QUALITY),
    name: file.name,
  };
}

/** Reads a real equirectangular 360° photograph (approximately 2:1). */
export async function fileToPanorama(file: File): Promise<RoomImage> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image`);
  if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is larger than 15 MB`);
  const source = await readAsDataUrl(file);
  const img = await loadImage(source);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  const ratio = width / height;
  if (ratio < 1.8 || ratio > 2.2) {
    throw new Error("A 360° photo must be equirectangular with an approximately 2:1 width-to-height ratio.");
  }
  const scale = Math.min(1, 3000 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image processing is unavailable in this browser");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { id: uid("pano"), url: canvas.toDataURL("image/jpeg", 0.88), name: file.name };
}
