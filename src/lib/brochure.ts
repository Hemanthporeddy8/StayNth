import { jsPDF } from "jspdf";
import type { PropertyListing } from "@/lib/properties";
import { formatPrice, PROPERTY_TYPE_LABEL } from "@/lib/properties";
import { computeWalls, ROOM_COLORS } from "@/lib/plan";
import type { Plan } from "@/types";

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function planImage(plan: Plan) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 760;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.fillStyle = "#faf8f2";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const minX = Math.min(...plan.rooms.map((room) => room.x), 0);
  const minY = Math.min(...plan.rooms.map((room) => room.y), 0);
  const maxX = Math.max(...plan.rooms.map((room) => room.x + room.w), plan.width);
  const maxY = Math.max(...plan.rooms.map((room) => room.y + room.h), plan.depth);
  const scale = Math.min(1060 / Math.max(1, maxX - minX), 620 / Math.max(1, maxY - minY));
  const ox = 70 - minX * scale;
  const oy = 55 - minY * scale;
  plan.rooms.forEach((room) => {
    ctx.fillStyle = ROOM_COLORS[room.type].fill;
    ctx.fillRect(ox + room.x * scale, oy + room.y * scale, room.w * scale, room.h * scale);
    ctx.fillStyle = "#425b63";
    ctx.font = "600 17px sans-serif";
    ctx.textAlign = "center";
    if (room.w * scale > 70 && room.h * scale > 35) ctx.fillText(room.name, ox + (room.x + room.w / 2) * scale, oy + (room.y + room.h / 2) * scale);
  });
  ctx.strokeStyle = "#16313b";
  computeWalls(plan).forEach((wall) => {
    ctx.lineWidth = wall.exterior ? 7 : 4;
    ctx.beginPath();
    ctx.moveTo(ox + wall.x1 * scale, oy + wall.y1 * scale);
    ctx.lineTo(ox + wall.x2 * scale, oy + wall.y2 * scale);
    ctx.stroke();
  });
  return canvas.toDataURL("image/png");
}

export async function exportPropertyBrochure(listing: PropertyListing) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFillColor(22, 49, 59);
  doc.rect(0, 0, 210, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("STAYNTH PROPERTIES", 14, 15);
  doc.setTextColor(22, 49, 59);
  doc.setFontSize(24);
  doc.text(doc.splitTextToSize(listing.title, 175), 14, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(93, 114, 121);
  doc.text(`${listing.location}  ·  ${PROPERTY_TYPE_LABEL[listing.type]}  ·  ${listing.bedrooms} BHK`, 14, 50);
  doc.setTextColor(212, 101, 63);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(formatPrice(listing), 14, 61);

  if (listing.photos[0]) {
    try {
      const image = await loadImage(listing.photos[0].url);
      doc.addImage(image, "JPEG", 14, 70, 182, 88, undefined, "FAST");
    } catch {
      doc.setFillColor(243, 239, 229);
      doc.rect(14, 70, 182, 88, "F");
      doc.setTextColor(120, 130, 130);
      doc.setFontSize(10);
      doc.text("Property photo unavailable offline", 75, 114);
    }
  }

  doc.setTextColor(22, 49, 59);
  doc.setFontSize(12);
  doc.text("Property details", 14, 171);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const details = [
    `${listing.bedrooms} bedrooms  ·  ${listing.bathrooms} bathrooms  ·  ${listing.beds} beds`,
    `${listing.area.toLocaleString()} sq ft  ·  ${listing.floorPlans?.length ?? 1} floor(s)`,
    `Owner: ${listing.ownerName}  ·  ${listing.verification ?? "unverified"}`,
  ];
  doc.text(details, 14, 180);
  doc.setTextColor(75, 88, 92);
  doc.text(doc.splitTextToSize(listing.description, 178), 14, 196);
  doc.setTextColor(22, 49, 59);
  doc.setFont("helvetica", "bold");
  doc.text("Amenities", 14, 232);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(75, 88, 92);
  doc.text(doc.splitTextToSize(listing.amenities.join("  ·  "), 178), 14, 241);
  doc.setFontSize(8);
  doc.setTextColor(140, 145, 140);
  doc.text("Generated locally by StayNth. This brochure is not a booking confirmation or legal document.", 14, 282);

  doc.addPage();
  doc.setTextColor(22, 49, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Floor plan", 14, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(93, 114, 121);
  doc.text(`${listing.title}  ·  ${activePlanLabel(listing)}`, 14, 29);
  const image = planImage(listing.floorPlans?.[0]?.plan ?? listing.plan);
  doc.addImage(image, "PNG", 14, 40, 182, 115);
  let y = 170;
  if (listing.inventory?.length) {
    doc.setTextColor(22, 49, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Room & bed inventory", 14, y);
    y += 9;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    listing.inventory.forEach((item) => {
      doc.text(`${item.name}  ·  capacity ${item.capacity}  ·  $${item.price}  ·  ${item.available} available`, 14, y);
      y += 7;
    });
  }
  doc.setFontSize(8);
  doc.setTextColor(140, 145, 140);
  doc.text(`Plan reference: ${listing.id}  ·  Created ${new Date().toLocaleDateString()}`, 14, 282);
  doc.save(`${listing.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-brochure.pdf`);
}

function activePlanLabel(listing: PropertyListing) {
  const plan = listing.floorPlans?.[0]?.plan ?? listing.plan;
  return `${plan.width}' × ${plan.depth}' · ${plan.rooms.length} rooms`;
}
