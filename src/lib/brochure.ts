import { jsPDF } from "jspdf";
import type { PropertyListing } from "@/lib/properties";
import { formatPrice, PROPERTY_TYPE_LABEL } from "@/lib/properties";

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
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

  doc.save(`${listing.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-brochure.pdf`);
}
