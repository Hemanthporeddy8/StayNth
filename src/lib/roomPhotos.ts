import type { Room, RoomType } from "@/types";

export interface RoomPhoto {
  url: string;
  alt: string;
  photographer: string;
  source: string;
  kind: "reference" | "upload";
}

const photo = (
  id: number,
  alt: string,
  photographer: string,
  source: string,
): RoomPhoto => ({
  url: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1600`,
  alt,
  photographer,
  source,
  kind: "reference",
});

/** Curated real interior photography, grouped by the kind of space. */
export const ROOM_PHOTOS: Record<RoomType, RoomPhoto[]> = {
  living: [
    photo(7836571, "Bright modern living room with plants and cozy decor", "Stanislav Kondratiev", "https://www.pexels.com/photo/interior-of-a-living-room-7836571/"),
    photo(11408618, "Airy living room with tall windows and a fireplace", "Jack Davis", "https://www.pexels.com/photo/brown-sofa-in-a-living-room-11408618/"),
    photo(7614608, "Spacious contemporary living room with natural light", "Max Vakhtbovych", "https://www.pexels.com/photo/a-tv-set-in-a-living-room-7614608/"),
  ],
  bedroom: [
    photo(2140972, "Calm bedroom with a bed facing a large window", "Diana", "https://www.pexels.com/photo/vacant-bed-in-room-2140972/"),
    photo(7587809, "Warm modern bedroom with wooden cabinetry", "Max Vakhtbovych", "https://www.pexels.com/photo/bedroom-with-wooden-cabinets-7587809/"),
    photo(6487953, "Soft contemporary bedroom beside a bright window", "Max Vakhtbovych", "https://www.pexels.com/photo/home-interior-with-bed-with-rabbit-toy-near-window-6487953/"),
  ],
  kitchen: [
    photo(7167061, "High-end contemporary kitchen with modern appliances", "Max Vakhtbovych", "https://www.pexels.com/photo/a-modern-kitchen-with-appliances-7167061/"),
    photo(8134756, "Bright kitchen with sleek cabinets and a central island", "Max Vakhtbovych", "https://www.pexels.com/photo/white-kitchen-cabinet-near-white-kitchen-island-8134756/"),
    photo(6283972, "Minimalist kitchen and dining space with pendant lights", "Max Vakhtbovych", "https://www.pexels.com/photo/modern-interior-of-spacious-minimalist-kitchen-6283972/"),
  ],
  dining: [
    photo(7046002, "Contemporary dining room with table and chairs", "Max Vakhtbovych", "https://www.pexels.com/photo/modern-dining-room-interior-with-furniture-in-light-house-7046002/"),
    photo(14598479, "Elegant dining room with a statement table and lighting", "Furkan Tumer", "https://www.pexels.com/photo/luxury-dining-room-by-the-stairs-14598479/"),
  ],
  bath: [
    photo(7534282, "Minimalist bathroom with glass shower and tiled walls", "Max Vakhtbovych", "https://www.pexels.com/photo/spacious-bathroom-with-minimalist-design-and-shower-cabin-7534282/"),
    photo(7005268, "Modern bathroom with a glass shower and vanity mirror", "Max Vakhtbovych", "https://www.pexels.com/photo/interior-of-modern-bathroom-with-glass-shower-cabin-7005268/"),
    photo(6899357, "Bright washroom with a shower, sink and storage", "Max Vakhtbovych", "https://www.pexels.com/photo/restroom-interior-with-toilet-and-washing-machine-near-sink-6899357/"),
  ],
  hall: [
    photo(7166927, "Contemporary apartment hallway with warm wooden doors", "Max Vakhtbovych", "https://www.pexels.com/photo/wooden-doors-in-modern-apartment-interior-7166927/"),
    photo(7019012, "Light apartment entrance hall with built-in storage", "Max Vakhtbovych", "https://www.pexels.com/photo/corridor-at-entrance-of-modern-apartment-7019012/"),
  ],
  balcony: [
    photo(7534284, "Apartment balcony with a lounge chair and potted plant", "Max Vakhtbovych", "https://www.pexels.com/photo/interior-of-spacious-patio-with-chair-and-potted-plant-placed-near-brick-wall-7534284/"),
    photo(7534285, "Furnished balcony with chairs and a small coffee table", "Max Vakhtbovych", "https://www.pexels.com/photo/chairs-and-coffee-table-placed-in-patio-of-contemporary-apartment-7534285/"),
  ],
  study: [
    photo(6265942, "Home study with bookshelves and a wooden desk", "Max Vakhtbovych", "https://www.pexels.com/photo/carved-wooden-table-with-lamp-at-workplace-6265942/"),
    photo(23073436, "Stylish home office with a desk and book shelving", "Sakshi Maheshwari", "https://www.pexels.com/photo/chairs-at-a-table-with-shelves-with-books-and-figurines-in-the-background-23073436/"),
  ],
  storage: [
    photo(7587738, "Bright walk-in closet with open shelving", "Max Vakhtbovych", "https://www.pexels.com/photo/an-empty-walk-in-closet-7587738/"),
    photo(6580395, "Modern wardrobe storage with wooden shelving", "Max Vakhtbovych", "https://www.pexels.com/photo/modern-wardrobe-storage-6580395/"),
  ],
  laundry: [
    photo(17158638, "Clean laundry room with modern appliances and cabinets", "hi room", "https://www.pexels.com/photo/washing-machines-in-house-17158638/"),
    photo(7195865, "Utility space with an integrated washing machine", "Max Vakhtbovych", "https://www.pexels.com/photo/green-wall-tiles-with-white-counter-top-bathroom-7195865/"),
  ],
};

/** Uploaded photos come first, followed by rotated reference photography. */
export function getRoomPhotos(room: Room): RoomPhoto[] {
  const uploads: RoomPhoto[] = (room.images ?? []).map((image) => ({
    url: image.url,
    alt: image.name || `Uploaded photo of ${room.name}`,
    photographer: "Uploaded by you",
    source: "",
    kind: "upload",
  }));
  const photos = ROOM_PHOTOS[room.type] ?? ROOM_PHOTOS.living;
  const hash = Array.from(`${room.id}${room.name}`).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const offset = hash % photos.length;
  return [...uploads, ...photos.slice(offset), ...photos.slice(0, offset)];
}
