# StayNth — Floor Plan Studio & Property Marketplace

A modern, browser-native **2D/3D floor plan studio** combined with a **property marketplace**, built with React, TypeScript, Vite, and Tailwind CSS.

## ✨ Features

### 🏠 Floor Plan Studio (Draftline)
- **Draw rooms** by dragging — snap to a 6″ grid with auto-labelling
- **Add walls, doors & windows** with dedicated tools
- **Auto-generate layouts** — choose BHK configuration, size, and furnishing
- **Smart auto-furnishing** — places appropriate furniture in every room
- **Multi-floor support** — add/remove floors with stairs auto-inserted
- **3D view** — orbit a live Three.js model of the house
- **Inside preview** — furnished top-down walkthrough view
- **Room photos / 360° panoramas** — attach real photos to any room marker
- **Export** — SVG, PNG (with title block), or `.json` plan file
- **Keyboard shortcuts** — `V`, `W`, `R`, `D`, `N`, `F`, `I`, `E`, `H`, Ctrl+Z/Y

### 🏢 Property Marketplace
- **List properties** — attach the studio floor plan + room photos
- **Explore & filter** — by type (apartment/house/hostel), BHK, mode (stay/rent/sale), price, area
- **Map view** — Leaflet-powered property map
- **3D walkthrough** from the listing
- **Availability calendar** — per-inventory date blocking
- **Booking & viewing requests** — approve/decline with overlap detection
- **Compare tool** — compare up to 3 properties side-by-side
- **Reviews & reports** — stored locally
- **Workspace export/import** — backup all data as JSON

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Build for production (outputs a single self-contained HTML file)
npm run build
```

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Bundler | Vite 7 |
| Styling | Tailwind CSS v4 |
| 3D Rendering | Three.js |
| Maps | Leaflet |
| PDF Export | jsPDF |
| Icons | Lucide React |
| Output | Single-file HTML (via `vite-plugin-singlefile`) |

## 📁 Project Structure

```
src/
├── components/
│   ├── PlanCanvas.tsx       # Main 2D canvas (rooms, walls, openings, furniture)
│   ├── House3D.tsx          # Three.js 3D house renderer
│   ├── Inspector.tsx        # Right-hand properties panel
│   ├── ToolRail.tsx         # Left sidebar tool palette
│   ├── Header.tsx           # Top navigation bar
│   ├── Dialogs.tsx          # Generate & shortcuts dialogs
│   ├── PropertiesApp.tsx    # Property marketplace app
│   ├── PropertyDetail.tsx   # Property detail modal
│   ├── ListPropertyDialog.tsx # Create/edit listing dialog
│   ├── PropertyMap.tsx      # Leaflet map view
│   ├── CompareDialog.tsx    # Side-by-side comparison
│   ├── AvailabilityCalendar.tsx # Date blocking calendar
│   ├── RoomPhotoViewer.tsx  # Photo/panorama lightbox
│   ├── Panorama360.tsx      # 360° panorama viewer
│   ├── FurnitureSymbol.tsx  # SVG furniture icons
│   └── WorkspaceDialog.tsx  # Profile & data backup
├── lib/
│   ├── plan.ts              # Floor plan generation & geometry
│   ├── export.ts            # SVG/PNG/JSON export
│   ├── properties.ts        # Property listing data model
│   ├── listingDraft.ts      # Draft persistence helpers
│   ├── imageUpload.ts       # Client-side image compression
│   ├── brochure.ts          # PDF brochure generator
│   └── roomPhotos.ts        # Room photo helpers
├── utils/
│   └── cn.ts                # Tailwind class merging
├── types.ts                 # Shared TypeScript types
├── App.tsx                  # Root app + state management
├── main.tsx                 # React entry point
└── index.css                # Global styles & design tokens
```

## 🎨 Design Tokens

The app uses a custom Tailwind palette:
- **`paper`** / **`paper-deep`** — warm off-white backgrounds
- **`ink`** / **`ink-soft`** / **`ink-faint`** — text hierarchy
- **`accent`** — terracotta highlight colour
- **`blueprint`** — blueprint blue
- **`moss`** — green for confirmations
- **`line`** / **`line-soft`** — border colours

## 📄 License

MIT
