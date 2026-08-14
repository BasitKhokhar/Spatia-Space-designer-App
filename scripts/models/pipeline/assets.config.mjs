// The catalog: one entry per realistic-render item the pipeline should
// produce. Edit this file to add models — re-run `node run.mjs` and the new
// slugs flow through fetch -> optimize -> thumbs -> manifest -> publish.
//
// Fields
//   slug        kebab-case, globally unique, becomes the DB slug / API id
//   source      'polyhaven' | 'quaternius'
//   sourceId    Poly Haven asset id (e.g. "ArmChair_01") — polyhaven only
//   file        path relative to LOCAL_ASSETS_DIR/quaternius/ — quaternius only
//   name        display name shown in the catalog
//   kind        must match a kind the app already knows (see
//               Frontend/src/three/modelRegistry.js MODELS keys / Backend
//               prisma/catalogData.js for the full taxonomy)
//   category    must match a Backend prisma/catalogData.js CATEGORIES `name`
//   price       approximate MSRP (budget estimate, integer)
//   cost        credit price to unlock (0 = free)
//   premium     true = gated behind credits/subscription
//   tags        search widening, 'cc0' + 'src:...' are added automatically
//   dimsOverride  { w, d, h } in cm — only if the source model's bounding box
//                 includes props/floor that would otherwise skew dimensions
//   rotY          radians — only if the model's forward-facing axis needs
//                 correcting to match the app's placement convention

export const ASSETS = [
  {
    slug: 'ph-arm-chair-01',
    source: 'polyhaven',
    sourceId: 'ArmChair_01',
    name: 'Victorian Arm Chair',
    kind: 'chair',
    category: 'Furniture',
    price: 320,
    cost: 40,
    premium: true,
    tags: ['chair', 'seat', 'vintage', 'wood'],
  },
  {
    slug: 'ph-sofa-01',
    source: 'polyhaven',
    sourceId: 'Sofa_01',
    name: 'Sofa 01',
    kind: 'sofa',
    category: 'Furniture',
    price: 890,
    cost: 60,
    premium: true,
    tags: ['sofa', 'couch', 'seat'],
  },
  {
    slug: 'ph-coffee-table-01',
    source: 'polyhaven',
    sourceId: 'CoffeeTable_01',
    name: 'Coffee Table 01',
    kind: 'table',
    category: 'Furniture',
    price: 210,
    cost: 30,
    premium: true,
    tags: ['table', 'coffee table', 'wood'],
  },
];
