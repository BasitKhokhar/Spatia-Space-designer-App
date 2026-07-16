# Roadmap — Multi-Category Starter Ideas + Freeform Design

## Context

The app today can only start a project as **Home** or **Shop** (a 2-value toggle on
`NewProjectStartScreen`). The vision is a **free, more capable "Floor Plan Creator"**:
the user taps *Start Blank* → picks from a **broad set of construction categories**
(House, apartment building, plaza/mall, office, retail shop, café, warehouse, clinic,
school, parking, garden…) → sees **10+ professional furnished starter ideas** for that
category → either opens one (pre-furnished) or taps **Custom** to draw **any shape**
(non-rectangular walls, freeform perimeter). Longer term it should carry the full set of
construction trades (raw structure, electrical, sanitary, kitchen, doors, gardening,
parking, colors).

Good news from exploration: the foundation is already strong. The domain model
([src/domain/floorplan.js](src/domain/floorplan.js)) already supports arbitrary wall
segments (`addWall`), rectangular partitions (`addRoomRect`), doors/windows
(`addOpening`), materials, and furniture. The editor
([src/screens/editor/FloorPlanEditorScreen.jsx](src/screens/editor/FloorPlanEditorScreen.jsx))
already has a **polyline wall tool**, plus room/door/window/measure tools, a 3D view, and
a cost estimate. So most of this roadmap is **new content + a richer create flow**, with a
focused model upgrade for true freeform footprints, and a larger later effort for trade
layers.

This document is the agreed roadmap (user chose "full written roadmap first" and
"furnished layouts" as the target depth for each idea). On approval it will be copied to
`docs/DESIGN_ROADMAP.md` and Phase 1 implementation will begin.

---

## Current state (grounded)

- **Create flow:** `NewProjectStart` → `RoomType` → `Dimensions` → `FloorPlanEditor`
  (routes in [src/navigation/routes.js](src/navigation/routes.js)).
- **Taxonomy today = 2 categories:** `home` / `shop`, encoded on each row of
  [src/data/roomTypes.js](src/data/roomTypes.js) and filtered by
  `roomTypesByCategory()`. `NewProjectStartScreen` hard-codes a `home`/`shop`
  `SegmentedControl`.
- **Starter content:** [src/data/templates.js](src/data/templates.js) (8 templates,
  card thumbnails via `variant`) and
  [src/data/starterLayouts.js](src/data/starterLayouts.js) (`seedPlan(plan, roomTypeId)`
  places furniture as fractions of the room). Both keyed to a **single rectangular room**.
- **Store:** `createProject({ name, roomType, width, length, variant, seed })` in
  [src/store/useProjectsStore.js](src/store/useProjectsStore.js) builds a rectangular
  `createFloorPlan` and optionally calls `seedPlan`.
- **Thumbnails:** [src/components/graphics/PlanThumbnail.jsx](src/components/graphics/PlanThumbnail.jsx)
  renders one of **4 hard-coded SVG paths** by `variant` — not enough distinct art for
  10+ ideas × many categories.
- **Model is rectangle-bound:** `createFloorPlan`/`rectWalls`/`resizePlan` assume a
  `width × length` box; `planArea = width*length`. Interior geometry is already free-form,
  only the **perimeter/floor** is locked to a rectangle.

---

## Phase 1 — Category picker + 10+ furnished starter ideas (build first)

**Goal:** Replace the Home/Shop toggle with a real two-step browse: **Category grid →
Starter Ideas grid (10+ furnished layouts + a Custom tile)**, seeding a full furnished
plan on selection.

### Data model
- **New: [src/data/categories.js](src/data/categories.js)** — top-level construction
  categories. Each: `{ id, name, icon, blurb, ideaIds: [...] }`. Initial set (12):
  `house`, `apartment` (building/stories), `office`, `retail` (shop), `cafe`
  (café/restaurant), `salon` (salon/spa), `warehouse`, `clinic`, `school`, `parking`,
  `garden` (outdoor/landscape), `plaza` (mall/plaza). Provide `categoryById()` and keep
  the list ordered for the grid.
- **New: [src/data/starterIdeas.js](src/data/starterIdeas.js)** — richer than
  `templates.js`. Each idea:
  ```
  { id, categoryId, name, dimensions: {width,length},
    partitions: [ {x,y,w,h} ... ],        // interior rooms via addRoomRect (meters)
    furniture:  [ {catalogId, fx, fy, r} ], // fractional placement, reuses catalog
    materials:  { floor, wall },
    thumb:      derived from partitions+furniture (see thumbnails) }
  ```
  Author **≥10 furnished ideas per category** (see Content plan). Reuse existing catalog
  ids from [src/data/catalog.js](src/data/catalog.js); add missing category-specific
  fixtures where needed (e.g. car, hospital bed, desk pods) in the same file.
- **New builder in `starterIdeas.js`: `buildIdeaPlan(idea)`** — starts from
  `createFloorPlan({width,length})`, applies partitions with existing `addRoomRect`,
  places furniture with existing `addFurnitureItem` (+ `updateFurnitureItem` for
  rotation), applies `setMaterials`. This generalizes today's `seedPlan` to multi-room
  furnished layouts. Keep `seedPlan`/`starterLayouts.js` for the single-room Custom path.

### Store
- Extend `createProject` in
  [src/store/useProjectsStore.js](src/store/useProjectsStore.js) to accept an optional
  `ideaId` (or a prebuilt `plan`). When present, build the plan via `buildIdeaPlan(idea)`
  instead of the rectangular `seedPlan` branch. Keep the remote-sync path unchanged (it
  already serializes `plan`).

### Screens & navigation
- **New: `src/screens/project/CategoryScreen.jsx`** (route `ROUTES.category`) — scrollable
  grid of category cards (icon + name + blurb), following the card style already in
  `RoomTypeScreen`. Tapping a category → `StarterIdeasScreen`.
- **New: `src/screens/project/StarterIdeasScreen.jsx`** (route `ROUTES.starterIdeas`) —
  grid of the category's 10+ idea thumbnails (name + room count) **plus a "Custom / blank"
  tile** as the first cell. Selecting an idea → `createProject({ ideaId })` → `editor`.
  Selecting **Custom** → existing `RoomType` → `Dimensions` → freeform editor path.
- **Modify [src/screens/project/NewProjectStartScreen.jsx](src/screens/project/NewProjectStartScreen.jsx):**
  "Start Blank" now navigates to `ROUTES.category` (not straight to `RoomType`). Fold the
  existing "Use a Template" strip into the Ideas screen (templates become ideas), or keep
  a "Recent/Popular" shortcut row. Remove the Home/Shop `SegmentedControl`.
- **Register routes** in [src/navigation/routes.js](src/navigation/routes.js) and add the
  two screens to the stack navigator (locate via the file that imports
  `ROUTES.newProject`/`ROUTES.roomType`).

### Thumbnails (needed for visual variety)
- **Upgrade `PlanThumbnail` (or add `IdeaThumbnail`)** to render **from an idea's actual
  geometry** — map the idea's `dimensions`/`partitions` into the viewBox and draw wall
  strokes + furniture dots — instead of 4 static paths. This gives every idea distinct art
  and scales to any category without hand-drawing SVGs. Existing `PlanThumbnail` callers
  (project/template cards) keep working via the `variant` fallback.

### Reused utilities (do not re-implement)
`addRoomRect`, `addFurnitureItem`, `updateFurnitureItem`, `setMaterials`,
`createFloorPlan` (all in [src/domain/floorplan.js](src/domain/floorplan.js));
`catalogById` ([src/data/catalog.js](src/data/catalog.js)); card/selection UI patterns
from `RoomTypeScreen`; `Screen`/`HeaderBar`/`Button`/`Icon`/`Text` primitives.

---

## Phase 2 — True freeform footprints (draw any shape)

**Goal:** Let "Custom" draw a **non-rectangular** outer boundary (L-shape, angled, curved
approximations), not just a box. Interior free walls already work via the polyline wall
tool.

- **Model:** add optional `plan.footprint = [{x,y}, ...]` (ordered polygon, meters). When
  present it is the source of truth for the perimeter; `width/length` become the bounding
  box (kept for compatibility, thumbnails, and the default rectangular case).
- **Derive** perimeter walls from polygon edges (generalize `rectWalls`); `planArea` uses
  the **shoelace formula** when a footprint exists (extend
  [src/domain/units.js](src/domain/units.js) / `planArea`).
- **Editor:** new **`perimeter` tool** — tap to drop boundary points, tap to close;
  reuse the existing `pending`-point / snap pattern already used by the `wall` tool in
  [src/screens/editor/FloorPlanEditorScreen.jsx](src/screens/editor/FloorPlanEditorScreen.jsx).
- **3D + floor:** update the floor mesh in
  [src/three/Room3D.jsx](src/three/Room3D.jsx) to triangulate/extrude the polygon
  (currently a rectangle); update `ThreeDViewScreen` and the OBJ exporter accordingly.
- **`resizePlan`** must clamp/scale a footprint (not just regenerate rect walls).
- **Compatibility:** all existing rectangular plans (no `footprint`) behave exactly as
  today — footprint is purely additive.

---

## Phase 3 — Construction trades / layers (electrical, sanitary, garden, parking, doors, colors)

**Goal:** The "all tools" ambition — organize the design into toggleable trade layers with
their own symbol libraries.

- **Catalog groups:** extend [src/data/catalog.js](src/data/catalog.js) with
  `group: 'electrical' | 'plumbing' | 'garden' | 'parking' | 'structure'` and new items:
  electrical (outlet, switch, ceiling point, distribution board), plumbing/sanitary
  (floor drain, pipe run, water point — fixtures like sink/toilet/shower already exist),
  garden (tree, hedge, lawn zone, path), parking (car, parking bay, gate, ramp), plus
  main doors/color-driven materials. Add matching category chips in
  [src/screens/catalog/CatalogScreen.jsx](src/screens/catalog/CatalogScreen.jsx).
- **Symbols beyond furniture:** introduce `plan.symbols` for point/line trade elements
  (electrical points, pipe/wire runs) each carrying a `layer`. Furniture gets an optional
  `layer` too (defaults to `furniture`).
- **Editor layer system:** a layer toggle bar (Structure / Electrical / Plumbing / Garden
  / Parking / Furniture) that filters what renders and what is editable. Wire into the
  existing tool bar in `FloorPlanEditorScreen`.
- **Colors:** expand the material/color picker (already present via `RoomStyleSheet` +
  [src/data/materials.js](src/data/materials.js)) to cover walls, floors per-room, and
  fixture finishes.

*(This phase is the largest; it will be re-planned in detail once Phases 1–2 land.)*

---

## Phase 4 — Polish (multi-story, export, refinement)

- **Multi-story:** the vision mentions a 3-story house. Add `project.levels[]` (each a
  plan) with a level switcher; the store currently holds a single `plan` per project.
- **Export & sharing:** extend the existing OBJ/`ExportScreen` path to freeform footprints
  and multi-level.
- **Onboarding polish** for the new browse flow.

---

## Content plan — categories & starter ideas (Phase 1, ≥10 each, furnished)

Representative ideas per category (rest follow the same pattern; all reuse catalog items):

- **House** — Studio, 1-Bed Flat, 2-Bed, 3-Bed Family, Bungalow, Duplex Lower, L-Shaped
  Living, Open-Plan Kitchen+Living, Master Suite, Guest Annex.
- **Apartment building** — Bachelor Unit, 1-Bed Unit, 2-Bed Corner, Penthouse, Shared
  Lobby, Stairwell Core, Studio Block, Family Unit, Balcony Unit, Compact Unit.
- **Office** — Solo Studio, Startup Open Plan, 4-Person Team, Meeting-Room Suite,
  Reception + Lobby, Manager Cabin, Coworking Bay, Call-Center Rows, Boardroom,
  Break Room.
- **Retail shop** — Boutique, Grocery, Electronics, Pharmacy, Bakery, Bookstore, Corner
  Store, Showroom, Kiosk, Department Aisle.
- **Café / Restaurant** — Espresso Bar, Diner, Fine Dining, Fast-Food, Bakery Café,
  Rooftop Seating, Bistro, Food Court Stall, Bar+Lounge, Takeaway Counter.
- **Salon / Spa** — Hair Salon, Barber, Nail Bar, Spa Suite, Beauty Parlor, Massage Rooms,
  Makeup Studio, Unisex Salon, Waxing Rooms, Reception+Wait.
- **Warehouse** — Small Storage, Racked Aisles, Cold Storage, Loading Bay, Distribution,
  Mezzanine, Bulk Pallets, Workshop, Fulfilment, Archive.
- **Clinic** — GP Room, Dental, Waiting+Reception, Exam Suite, Pharmacy Counter, Lab,
  Physio, Consult+Ward, Small Hospital Wing, Vet Clinic.
- **School** — Classroom, Computer Lab, Library, Lecture Hall, Staff Room, Cafeteria,
  Science Lab, Art Room, Nursery, Admin Office.
- **Parking** — Small Lot, Multi-Row, Underground Bay, Angled Parking, Garage (home),
  Bike+Car, Valet Drop, EV Charging Row, Accessible Bays, Ramp+Entry.
- **Garden / Outdoor** — Backyard, Front Lawn, Patio, Vegetable Garden, Courtyard,
  Pool Deck, Rooftop Garden, Zen Garden, Play Area, Terrace.
- **Plaza / Mall** — Food Court, Anchor Store, Atrium, Kiosk Row, Cinema Lobby,
  Boutique Strip, Central Fountain, Escalator Core, Event Space, Parking Concourse.

Categories needing fixtures not yet in the catalog (car, hospital bed, classroom desk,
lab bench, garden tree/hedge, gym/parking markings) get those items added to
`catalog.js` as part of Phase 1 authoring.

---

## Open decisions (can be resolved during Phase 1)

1. **Templates screen:** fold the current 8 `templates.js` entries into `starterIdeas`
   and remove the old template strip, or keep a "Popular" shortcut on the start screen?
   *(Recommend: fold in — one content source.)*
2. **RoomType in Custom path:** keep the room-type picker for Custom (pick a starting
   room → dimensions), or send Custom straight to a blank freeform canvas?
   *(Recommend: keep it for Phase 1, revisit in Phase 2.)*

---

## Verification

- **Static:** `npx expo start` (Dev Client) builds without errors; no unresolved `@/`
  imports; lint clean on new files.
- **Flow (manual, on device/simulator):** Home → New Project → *Start Blank* → **Category
  grid shows 12 categories** → pick one → **Ideas grid shows ≥10 thumbnails + Custom
  tile** → open an idea → editor opens with **walls + furniture pre-placed** matching the
  thumbnail; area/cost populate; 3D view renders the furnished room.
- **Custom path:** the Custom tile still reaches the editor via RoomType→Dimensions and
  the wall/room/door tools work (regression check of the existing flow).
- **Persistence:** created project appears in Projects list and survives an app reload
  (MMKV persist), and (when a backend URL is set) mirrors to the API unchanged.
- **Regression:** existing project/template cards still render (PlanThumbnail `variant`
  fallback intact).
- Phase 2/3 get their own verification once planned in detail.
