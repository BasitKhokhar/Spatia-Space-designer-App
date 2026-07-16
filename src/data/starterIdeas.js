// Furnished starter ideas for the "Start Blank" browse flow. The user picks a
// category (see categories.js), then one of these ideas; `buildIdeaPlan` turns
// the idea into a full floor plan (perimeter + interior partitions + furniture
// + finishes), reusing the domain builders so 2D, 3D and cost all work.
//
// Idea shape (arrays kept compact):
//   { id, categoryId, name, rooms, dim:[w,l], floor, wall,
//     part: [ [x,y,w,h] ... ],           // interior partition rects (meters)
//     items:[ [catalogId, fx, fy, r?] ] } // furniture, fx/fy are 0..1 of room
import {
  createFloorPlan,
  addRoomRect,
  addFurnitureItem,
  updateFurnitureItem,
  setMaterials,
} from '@/domain/floorplan';
import { catalogById } from './catalog';

// ---------------------------------------------------------------------------
// Ideas — at least 10 per category, all furnished.
// ---------------------------------------------------------------------------
export const STARTER_IDEAS = [
  // ================= HOUSE =================
  { id: 'house-studio', categoryId: 'house', name: 'Studio', rooms: 1, dim: [4.4, 5.2], floor: 'oak', wall: '#EBE4D8',
    items: [['single-bed', 0.2, 0.22, 0], ['loft-sofa', 0.6, 0.3, 0], ['oak-coffee-table', 0.6, 0.47, 0], ['flat-tv', 0.6, 0.08, 0], ['base-cabinet', 0.2, 0.9, 0], ['kitchen-sink', 0.5, 0.9, 0], ['area-rug', 0.6, 0.4, 0]] },
  { id: 'house-1bed', categoryId: 'house', name: '1-Bed Flat', rooms: 3, dim: [7.0, 6.0], floor: 'oak', wall: '#EBE4D8', part: [[0, 3.0, 3.6, 3.0], [4.6, 3.0, 2.4, 3.0]],
    items: [['loft-sofa', 0.5, 0.2, 0], ['oak-coffee-table', 0.5, 0.34, 0], ['flat-tv', 0.5, 0.05, 0], ['king-bed', 0.22, 0.72, 0], ['wardrobe', 0.05, 0.95, 90], ['toilet', 0.8, 0.7, 0], ['shower-stall', 0.9, 0.9, 0], ['kitchen-island', 0.5, 0.55, 0]] },
  { id: 'house-2bed', categoryId: 'house', name: '2-Bedroom', rooms: 4, dim: [8.4, 7.0], floor: 'walnut', wall: '#E7DDCB', part: [[0, 3.6, 3.4, 3.4], [3.4, 3.6, 3.2, 3.4]],
    items: [['l-sectional', 0.6, 0.22, 0], ['flat-tv', 0.6, 0.05, 0], ['king-bed', 0.2, 0.78, 0], ['nightstand', 0.05, 0.62, 0], ['single-bed', 0.5, 0.8, 0], ['wardrobe', 0.62, 0.95, 0], ['kitchen-island', 0.86, 0.35, 0], ['dining-table', 0.86, 0.1, 0]] },
  { id: 'house-3bed', categoryId: 'house', name: '3-Bed Family', rooms: 5, dim: [10.0, 8.0], floor: 'oak', wall: '#EBE4D8', part: [[0, 4.0, 3.2, 4.0], [3.2, 4.0, 3.2, 4.0], [6.4, 4.0, 3.6, 4.0]],
    items: [['l-sectional', 0.5, 0.2, 0], ['oak-coffee-table', 0.5, 0.34, 0], ['flat-tv', 0.5, 0.04, 0], ['king-bed', 0.16, 0.78, 0], ['single-bed', 0.48, 0.78, 0], ['single-bed', 0.8, 0.78, 0], ['dining-table', 0.85, 0.2, 0]] },
  { id: 'house-bungalow', categoryId: 'house', name: 'Bungalow', rooms: 4, dim: [11.0, 7.5], floor: 'terracotta', wall: '#E7DDCB', part: [[5.5, 0, 5.5, 4.2], [5.5, 4.2, 5.5, 3.3]],
    items: [['loft-sofa', 0.22, 0.3, 0], ['oak-coffee-table', 0.22, 0.5, 0], ['flat-tv', 0.05, 0.4, 90], ['king-bed', 0.75, 0.28, 0], ['wardrobe', 0.95, 0.3, 90], ['dining-table', 0.75, 0.75, 0], ['kitchen-island', 0.5, 0.9, 0]] },
  { id: 'house-openplan', categoryId: 'house', name: 'Open-Plan Living', rooms: 1, dim: [8.0, 5.5], floor: 'oak', wall: '#FBF6F1',
    items: [['l-sectional', 0.3, 0.35, 0], ['oak-coffee-table', 0.3, 0.6, 0], ['flat-tv', 0.3, 0.06, 0], ['kitchen-island', 0.75, 0.5, 0], ['range-cooker', 0.9, 0.1, 0], ['refrigerator', 0.72, 0.1, 0], ['dining-table', 0.75, 0.82, 0], ['fig-tree', 0.06, 0.9, 0]] },
  { id: 'house-lshape', categoryId: 'house', name: 'L-Shaped Home', rooms: 3, dim: [9.0, 8.0], floor: 'ash', wall: '#D8D2C4', part: [[0, 4.4, 4.4, 3.6], [4.4, 5.0, 4.6, 3.0]],
    items: [['loft-sofa', 0.55, 0.22, 0], ['oak-coffee-table', 0.55, 0.36, 0], ['king-bed', 0.2, 0.75, 0], ['wardrobe', 0.05, 0.6, 90], ['kitchen-island', 0.72, 0.82, 0], ['dining-table', 0.9, 0.2, 0]] },
  { id: 'house-master', categoryId: 'house', name: 'Master Suite', rooms: 2, dim: [6.0, 6.5], floor: 'walnut', wall: '#CBB7A3', part: [[3.6, 4.2, 2.4, 2.3]],
    items: [['king-bed', 0.35, 0.28, 0], ['nightstand', 0.08, 0.16, 0], ['nightstand', 0.62, 0.16, 0], ['wardrobe', 0.9, 0.4, 90], ['accent-chair', 0.2, 0.7, 0], ['bathtub', 0.8, 0.72, 0], ['toilet', 0.68, 0.92, 0]] },
  { id: 'house-kids', categoryId: 'house', name: 'Kids Room', rooms: 1, dim: [4.2, 4.0], floor: 'carpet', wall: '#B7C4B4',
    items: [['bunk-bed', 0.25, 0.28, 0], ['wardrobe', 0.85, 0.22, 90], ['writing-desk', 0.5, 0.85, 0], ['bookshelf', 0.08, 0.85, 0], ['area-rug', 0.5, 0.55, 0]] },
  { id: 'house-compact', categoryId: 'house', name: 'Compact Flat', rooms: 2, dim: [5.5, 5.0], floor: 'ash', wall: '#EBE4D8', part: [[3.3, 0, 2.2, 2.6]],
    items: [['compact-sofa', 0.25, 0.35, 0], ['oak-coffee-table', 0.25, 0.55, 0], ['flat-tv', 0.25, 0.06, 0], ['single-bed', 0.8, 0.22, 0], ['base-cabinet', 0.25, 0.9, 0], ['refrigerator', 0.5, 0.9, 0]] },

  // ================= APARTMENT =================
  { id: 'apt-bachelor', categoryId: 'apartment', name: 'Bachelor Unit', rooms: 1, dim: [4.0, 5.0], floor: 'ash', wall: '#EBE4D8',
    items: [['single-bed', 0.22, 0.22, 0], ['compact-sofa', 0.65, 0.28, 0], ['flat-tv', 0.65, 0.07, 0], ['base-cabinet', 0.25, 0.9, 0], ['kitchen-sink', 0.55, 0.9, 0], ['refrigerator', 0.85, 0.88, 0]] },
  { id: 'apt-1bed', categoryId: 'apartment', name: '1-Bed Unit', rooms: 3, dim: [6.5, 6.0], floor: 'oak', wall: '#FBF6F1', part: [[0, 3.2, 3.4, 2.8], [4.4, 3.2, 2.1, 2.8]],
    items: [['loft-sofa', 0.55, 0.2, 0], ['oak-coffee-table', 0.55, 0.36, 0], ['flat-tv', 0.55, 0.05, 0], ['king-bed', 0.22, 0.75, 0], ['toilet', 0.82, 0.72, 0], ['shower-stall', 0.9, 0.92, 0], ['kitchen-island', 0.6, 0.55, 0]] },
  { id: 'apt-2bed-corner', categoryId: 'apartment', name: '2-Bed Corner', rooms: 4, dim: [8.0, 7.0], floor: 'walnut', wall: '#E7DDCB', part: [[0, 3.8, 3.4, 3.2], [3.4, 3.8, 3.0, 3.2]],
    items: [['l-sectional', 0.6, 0.22, 0], ['flat-tv', 0.6, 0.05, 0], ['king-bed', 0.2, 0.78, 0], ['single-bed', 0.48, 0.8, 0], ['wardrobe', 0.62, 0.95, 0], ['dining-table', 0.86, 0.35, 0]] },
  { id: 'apt-penthouse', categoryId: 'apartment', name: 'Penthouse', rooms: 3, dim: [10.0, 7.0], floor: 'marble', wall: '#FBF6F1', part: [[6.5, 0, 3.5, 3.6]],
    items: [['l-sectional', 0.28, 0.35, 0], ['oak-coffee-table', 0.28, 0.6, 0], ['flat-tv', 0.28, 0.06, 0], ['dining-table', 0.55, 0.3, 0], ['kitchen-island', 0.55, 0.75, 0], ['king-bed', 0.83, 0.25, 0], ['fig-tree', 0.95, 0.9, 0]] },
  { id: 'apt-lobby', categoryId: 'apartment', name: 'Shared Lobby', rooms: 1, dim: [7.0, 6.0], floor: 'marble', wall: '#D8D2C4',
    items: [['reception-desk', 0.5, 0.15, 0], ['compact-sofa', 0.2, 0.6, 0], ['compact-sofa', 0.8, 0.6, 180], ['oak-coffee-table', 0.5, 0.6, 0], ['fig-tree', 0.1, 0.9, 0], ['fig-tree', 0.9, 0.9, 0]] },
  { id: 'apt-studio-block', categoryId: 'apartment', name: 'Studio Block', rooms: 2, dim: [7.5, 5.0], floor: 'ash', wall: '#EBE4D8', part: [[3.75, 0, 0.15, 5.0]],
    items: [['single-bed', 0.12, 0.25, 0], ['compact-sofa', 0.12, 0.7, 0], ['base-cabinet', 0.38, 0.9, 0], ['single-bed', 0.62, 0.25, 0], ['compact-sofa', 0.62, 0.7, 0], ['base-cabinet', 0.88, 0.9, 0]] },
  { id: 'apt-family', categoryId: 'apartment', name: 'Family Unit', rooms: 4, dim: [9.0, 7.5], floor: 'oak', wall: '#E7DDCB', part: [[0, 4.0, 3.0, 3.5], [3.0, 4.0, 3.0, 3.5], [6.0, 4.0, 3.0, 3.5]],
    items: [['l-sectional', 0.5, 0.2, 0], ['flat-tv', 0.5, 0.04, 0], ['king-bed', 0.15, 0.78, 0], ['single-bed', 0.5, 0.78, 0], ['bunk-bed', 0.83, 0.78, 0]] },
  { id: 'apt-balcony', categoryId: 'apartment', name: 'Balcony Unit', rooms: 2, dim: [6.0, 6.5], floor: 'oak', wall: '#FBF6F1', part: [[0, 5.2, 6.0, 1.3]],
    items: [['loft-sofa', 0.5, 0.22, 0], ['oak-coffee-table', 0.5, 0.4, 0], ['king-bed', 0.75, 0.6, 0], ['patio-set', 0.3, 0.9, 0], ['planter-box', 0.8, 0.92, 0]] },
  { id: 'apt-compact', categoryId: 'apartment', name: 'Compact Unit', rooms: 2, dim: [5.0, 5.5], floor: 'ash', wall: '#D8D2C4', part: [[3.0, 0, 2.0, 2.4]],
    items: [['compact-sofa', 0.25, 0.4, 0], ['flat-tv', 0.25, 0.07, 0], ['single-bed', 0.78, 0.22, 0], ['base-cabinet', 0.3, 0.9, 0], ['refrigerator', 0.6, 0.9, 0]] },
  { id: 'apt-loft', categoryId: 'apartment', name: 'Loft Unit', rooms: 1, dim: [7.0, 6.0], floor: 'concrete', wall: '#8A8378',
    items: [['l-sectional', 0.3, 0.32, 0], ['oak-coffee-table', 0.3, 0.56, 0], ['flat-tv', 0.3, 0.06, 0], ['king-bed', 0.8, 0.25, 0], ['kitchen-island', 0.78, 0.75, 0], ['fig-tree', 0.08, 0.9, 0]] },

  // ================= OFFICE =================
  { id: 'office-solo', categoryId: 'office', name: 'Solo Studio', rooms: 1, dim: [4.0, 4.5], floor: 'ash', wall: '#FBF6F1',
    items: [['l-desk', 0.35, 0.3, 0], ['office-chair', 0.35, 0.5, 0], ['filing-cabinet', 0.85, 0.2, 0], ['bookshelf', 0.85, 0.7, 90], ['fig-tree', 0.1, 0.9, 0]] },
  { id: 'office-startup', categoryId: 'office', name: 'Startup Open Plan', rooms: 1, dim: [9.0, 6.5], floor: 'concrete', wall: '#D8D2C4',
    items: [['writing-desk', 0.25, 0.25, 0], ['office-chair', 0.25, 0.38, 0], ['writing-desk', 0.55, 0.25, 0], ['office-chair', 0.55, 0.38, 0], ['writing-desk', 0.25, 0.62, 0], ['office-chair', 0.25, 0.75, 0], ['writing-desk', 0.55, 0.62, 0], ['office-chair', 0.55, 0.75, 0], ['meeting-table', 0.85, 0.5, 0], ['fig-tree', 0.9, 0.05, 0]] },
  { id: 'office-team4', categoryId: 'office', name: '4-Person Team', rooms: 1, dim: [6.0, 5.0], floor: 'carpet', wall: '#AEB9C6',
    items: [['l-desk', 0.28, 0.28, 0], ['office-chair', 0.28, 0.45, 0], ['l-desk', 0.72, 0.28, 180], ['office-chair', 0.72, 0.55, 0], ['filing-cabinet', 0.5, 0.9, 0], ['bookshelf', 0.08, 0.85, 0]] },
  { id: 'office-meeting', categoryId: 'office', name: 'Meeting Suite', rooms: 2, dim: [8.0, 6.0], floor: 'ash', wall: '#FBF6F1', part: [[4.5, 0, 3.5, 6.0]],
    items: [['meeting-table', 0.25, 0.5, 0], ['office-chair', 0.12, 0.35, 0], ['office-chair', 0.12, 0.65, 0], ['office-chair', 0.38, 0.35, 0], ['office-chair', 0.38, 0.65, 0], ['meeting-table', 0.75, 0.5, 0], ['flat-tv', 0.98, 0.5, 90]] },
  { id: 'office-reception', categoryId: 'office', name: 'Reception + Lobby', rooms: 1, dim: [7.0, 5.5], floor: 'marble', wall: '#D8D2C4',
    items: [['reception-desk', 0.5, 0.15, 0], ['office-chair', 0.5, 0.28, 180], ['compact-sofa', 0.18, 0.65, 0], ['compact-sofa', 0.5, 0.85, 0], ['oak-coffee-table', 0.3, 0.75, 0], ['fig-tree', 0.9, 0.85, 0]] },
  { id: 'office-cabin', categoryId: 'office', name: 'Manager Cabin', rooms: 1, dim: [4.5, 4.0], floor: 'walnut', wall: '#CBB7A3',
    items: [['l-desk', 0.4, 0.3, 0], ['office-chair', 0.4, 0.15, 0], ['accent-chair', 0.25, 0.7, 0], ['accent-chair', 0.55, 0.7, 0], ['bookshelf', 0.9, 0.5, 90]] },
  { id: 'office-cowork', categoryId: 'office', name: 'Coworking Bay', rooms: 1, dim: [8.0, 5.0], floor: 'oak', wall: '#FBF6F1',
    items: [['meeting-table', 0.3, 0.35, 0], ['meeting-table', 0.3, 0.7, 0], ['bar-stool', 0.85, 0.2, 0], ['bar-stool', 0.85, 0.4, 0], ['bar-stool', 0.85, 0.6, 0], ['base-cabinet', 0.85, 0.9, 0], ['fig-tree', 0.08, 0.9, 0]] },
  { id: 'office-callcenter', categoryId: 'office', name: 'Call-Center Rows', rooms: 1, dim: [9.0, 6.0], floor: 'carpet', wall: '#AEB9C6',
    items: [['writing-desk', 0.2, 0.2, 0], ['writing-desk', 0.5, 0.2, 0], ['writing-desk', 0.8, 0.2, 0], ['writing-desk', 0.2, 0.5, 0], ['writing-desk', 0.5, 0.5, 0], ['writing-desk', 0.8, 0.5, 0], ['writing-desk', 0.2, 0.8, 0], ['writing-desk', 0.5, 0.8, 0], ['writing-desk', 0.8, 0.8, 0]] },
  { id: 'office-boardroom', categoryId: 'office', name: 'Boardroom', rooms: 1, dim: [6.5, 4.5], floor: 'walnut', wall: '#3E4A5C',
    items: [['meeting-table', 0.5, 0.5, 0], ['office-chair', 0.25, 0.3, 0], ['office-chair', 0.5, 0.3, 0], ['office-chair', 0.75, 0.3, 0], ['office-chair', 0.25, 0.7, 180], ['office-chair', 0.5, 0.7, 180], ['office-chair', 0.75, 0.7, 180], ['flat-tv', 0.5, 0.04, 0]] },
  { id: 'office-break', categoryId: 'office', name: 'Break Room', rooms: 1, dim: [5.0, 4.5], floor: 'tile', wall: '#B7C4B4',
    items: [['base-cabinet', 0.3, 0.1, 0], ['refrigerator', 0.85, 0.15, 0], ['kitchen-sink', 0.55, 0.1, 0], ['round-dining', 0.35, 0.65, 0], ['dining-chair', 0.2, 0.65, 0], ['dining-chair', 0.5, 0.65, 0]] },

  // ================= RETAIL =================
  { id: 'retail-boutique', categoryId: 'retail', name: 'Boutique', rooms: 1, dim: [6.0, 8.0, ], floor: 'oak', wall: '#FBF6F1',
    items: [['cash-wrap', 0.2, 0.9, 0], ['mannequin', 0.2, 0.1, 0], ['mannequin', 0.8, 0.1, 0], ['round-rack', 0.35, 0.4, 0], ['round-rack', 0.65, 0.4, 0], ['clothing-rack', 0.5, 0.62, 0], ['fitting-room', 0.82, 0.85, 0]] },
  { id: 'retail-grocery', categoryId: 'retail', name: 'Grocery', rooms: 1, dim: [10.0, 14.0], floor: 'tile', wall: '#D8D2C4',
    items: [['produce-bin', 0.15, 0.15, 0], ['produce-bin', 0.32, 0.15, 0], ['gondola-shelf', 0.35, 0.4, 0], ['gondola-shelf', 0.35, 0.55, 0], ['gondola-shelf', 0.6, 0.4, 0], ['gondola-shelf', 0.6, 0.55, 0], ['display-fridge', 0.9, 0.4, 90], ['chest-freezer', 0.85, 0.68, 0], ['checkout-counter', 0.3, 0.9, 0], ['checkout-counter', 0.55, 0.9, 0]] },
  { id: 'retail-electronics', categoryId: 'retail', name: 'Electronics', rooms: 1, dim: [9.0, 11.0], floor: 'concrete', wall: '#AEB9C6',
    items: [['display-table', 0.25, 0.25, 0], ['display-table', 0.55, 0.25, 0], ['glass-display', 0.25, 0.55, 0], ['glass-display', 0.55, 0.55, 0], ['wall-shelving', 0.9, 0.3, 90], ['wall-shelving', 0.9, 0.6, 90], ['checkout-counter', 0.3, 0.9, 0]] },
  { id: 'retail-pharmacy', categoryId: 'retail', name: 'Pharmacy', rooms: 1, dim: [7.0, 9.0], floor: 'tile', wall: '#FBF6F1',
    items: [['gondola-shelf', 0.3, 0.3, 0], ['gondola-shelf', 0.6, 0.3, 0], ['wall-shelving', 0.9, 0.4, 90], ['glass-display', 0.4, 0.85, 0], ['checkout-counter', 0.7, 0.85, 0], ['medicine-cabinet', 0.1, 0.85, 90]] },
  { id: 'retail-bakery', categoryId: 'retail', name: 'Bakery', rooms: 1, dim: [6.0, 8.0], floor: 'terracotta', wall: '#E7DDCB',
    items: [['glass-display', 0.5, 0.85, 0], ['shelf-endcap-cafe', 0.5, 0.15, 0], ['wall-shelving', 0.9, 0.4, 90], ['round-dining', 0.2, 0.5, 0], ['round-dining', 0.2, 0.72, 0], ['signage-stand', 0.85, 0.85, 0]] },
  { id: 'retail-bookstore', categoryId: 'retail', name: 'Bookstore', rooms: 1, dim: [8.0, 10.0], floor: 'walnut', wall: '#E7DDCB',
    items: [['library-shelf', 0.2, 0.3, 90], ['library-shelf', 0.2, 0.6, 90], ['library-shelf', 0.5, 0.3, 90], ['library-shelf', 0.5, 0.6, 90], ['display-table', 0.8, 0.35, 0], ['reading-bench', 0.8, 0.65, 0], ['checkout-counter', 0.3, 0.92, 0]] },
  { id: 'retail-corner', categoryId: 'retail', name: 'Corner Store', rooms: 1, dim: [6.0, 7.0], floor: 'tile', wall: '#D8D2C4',
    items: [['gondola-shelf', 0.3, 0.35, 0], ['gondola-shelf', 0.55, 0.35, 0], ['display-fridge', 0.9, 0.3, 90], ['basket-stack', 0.1, 0.85, 0], ['checkout-counter', 0.4, 0.9, 0]] },
  { id: 'retail-showroom', categoryId: 'retail', name: 'Showroom', rooms: 1, dim: [10.0, 9.0], floor: 'marble', wall: '#FBF6F1',
    items: [['l-sectional', 0.25, 0.3, 0], ['oak-coffee-table', 0.25, 0.5, 0], ['dining-table', 0.6, 0.3, 0], ['king-bed', 0.82, 0.35, 0], ['wardrobe', 0.6, 0.85, 0], ['fig-tree', 0.1, 0.9, 0]] },
  { id: 'retail-kiosk', categoryId: 'retail', name: 'Kiosk', rooms: 1, dim: [3.5, 3.5], floor: 'concrete', wall: '#CBB7A3',
    items: [['cash-wrap', 0.5, 0.85, 0], ['wall-shelving', 0.15, 0.3, 90], ['wall-shelving', 0.85, 0.3, 90], ['signage-stand', 0.5, 0.15, 0]] },
  { id: 'retail-department', categoryId: 'retail', name: 'Department Aisle', rooms: 1, dim: [12.0, 10.0], floor: 'tile', wall: '#D8D2C4',
    items: [['clothing-rack', 0.2, 0.25, 0], ['clothing-rack', 0.4, 0.25, 0], ['round-rack', 0.65, 0.25, 0], ['gondola-shelf', 0.2, 0.55, 0], ['gondola-shelf', 0.45, 0.55, 0], ['mannequin', 0.85, 0.2, 0], ['fitting-room', 0.88, 0.75, 0], ['cash-wrap', 0.25, 0.92, 0]] },

  // ================= CAFE & DINING =================
  { id: 'cafe-espresso', categoryId: 'cafe', name: 'Espresso Bar', rooms: 1, dim: [7.0, 9.0], floor: 'walnut', wall: '#E7DDCB',
    items: [['shelf-endcap-cafe', 0.5, 0.12, 0], ['round-dining', 0.28, 0.4, 0], ['round-dining', 0.62, 0.4, 0], ['round-dining', 0.28, 0.65, 0], ['round-dining', 0.62, 0.65, 0], ['bar-stool', 0.15, 0.2, 0], ['signage-stand', 0.85, 0.88, 0]] },
  { id: 'cafe-diner', categoryId: 'cafe', name: 'Diner', rooms: 1, dim: [8.0, 10.0], floor: 'tile', wall: '#FBF6F1',
    items: [['shelf-endcap-cafe', 0.5, 0.1, 0], ['dining-table', 0.25, 0.35, 0], ['dining-table', 0.25, 0.6, 0], ['dining-table', 0.6, 0.35, 0], ['dining-table', 0.6, 0.6, 0], ['bar-stool', 0.9, 0.3, 0], ['bar-stool', 0.9, 0.45, 0], ['checkout-counter', 0.2, 0.9, 0]] },
  { id: 'cafe-finedining', categoryId: 'cafe', name: 'Fine Dining', rooms: 1, dim: [10.0, 11.0], floor: 'marble', wall: '#3E4A5C',
    items: [['round-dining', 0.25, 0.3, 0], ['round-dining', 0.55, 0.3, 0], ['round-dining', 0.25, 0.6, 0], ['round-dining', 0.55, 0.6, 0], ['round-dining', 0.82, 0.45, 0], ['shelf-endcap-cafe', 0.5, 0.9, 0], ['fig-tree', 0.1, 0.9, 0]] },
  { id: 'cafe-fastfood', categoryId: 'cafe', name: 'Fast-Food', rooms: 1, dim: [8.0, 9.0], floor: 'tile', wall: '#B7C4B4',
    items: [['checkout-counter', 0.3, 0.12, 0], ['checkout-counter', 0.6, 0.12, 0], ['dining-table', 0.25, 0.5, 0], ['dining-table', 0.55, 0.5, 0], ['dining-table', 0.25, 0.75, 0], ['dining-table', 0.55, 0.75, 0], ['signage-stand', 0.9, 0.15, 0]] },
  { id: 'cafe-bakery', categoryId: 'cafe', name: 'Bakery Café', rooms: 1, dim: [7.0, 8.0], floor: 'terracotta', wall: '#E7DDCB',
    items: [['glass-display', 0.4, 0.85, 0], ['shelf-endcap-cafe', 0.5, 0.12, 0], ['round-dining', 0.25, 0.45, 0], ['round-dining', 0.55, 0.45, 0], ['round-dining', 0.25, 0.68, 0], ['wall-shelving', 0.9, 0.4, 90]] },
  { id: 'cafe-rooftop', categoryId: 'cafe', name: 'Rooftop Seating', rooms: 1, dim: [9.0, 7.0], floor: 'concrete', wall: '#CBB7A3',
    items: [['patio-set', 0.25, 0.3, 0], ['patio-set', 0.6, 0.3, 0], ['patio-set', 0.25, 0.65, 0], ['patio-set', 0.6, 0.65, 0], ['planter-box', 0.9, 0.2, 0], ['planter-box', 0.9, 0.7, 0], ['shelf-endcap-cafe', 0.1, 0.5, 90]] },
  { id: 'cafe-bistro', categoryId: 'cafe', name: 'Bistro', rooms: 1, dim: [6.0, 8.0], floor: 'walnut', wall: '#E7DDCB',
    items: [['round-dining', 0.3, 0.3, 0], ['round-dining', 0.65, 0.3, 0], ['round-dining', 0.3, 0.55, 0], ['round-dining', 0.65, 0.55, 0], ['shelf-endcap-cafe', 0.5, 0.9, 0]] },
  { id: 'cafe-foodstall', categoryId: 'cafe', name: 'Food Court Stall', rooms: 1, dim: [4.0, 4.0], floor: 'tile', wall: '#FBF6F1',
    items: [['shelf-endcap-cafe', 0.5, 0.8, 0], ['range-cooker', 0.25, 0.25, 0], ['refrigerator', 0.8, 0.25, 0], ['signage-stand', 0.5, 0.08, 0]] },
  { id: 'cafe-barlounge', categoryId: 'cafe', name: 'Bar + Lounge', rooms: 1, dim: [9.0, 8.0], floor: 'concrete', wall: '#3E4A5C',
    items: [['shelf-endcap-cafe', 0.5, 0.1, 0], ['bar-stool', 0.3, 0.28, 0], ['bar-stool', 0.45, 0.28, 0], ['bar-stool', 0.6, 0.28, 0], ['l-sectional', 0.25, 0.7, 0], ['oak-coffee-table', 0.25, 0.85, 0], ['round-dining', 0.75, 0.6, 0]] },
  { id: 'cafe-takeaway', categoryId: 'cafe', name: 'Takeaway Counter', rooms: 1, dim: [5.0, 6.0], floor: 'tile', wall: '#B7C4B4',
    items: [['checkout-counter', 0.5, 0.85, 0], ['shelf-endcap-cafe', 0.5, 0.15, 0], ['refrigerator', 0.85, 0.2, 0], ['bar-stool', 0.15, 0.5, 0], ['bar-stool', 0.15, 0.65, 0]] },

  // ================= SALON & SPA =================
  { id: 'salon-hair', categoryId: 'salon', name: 'Hair Salon', rooms: 1, dim: [7.0, 8.0], floor: 'tile', wall: '#FBF6F1',
    items: [['salon-station', 0.2, 0.25, 90], ['salon-station', 0.2, 0.5, 90], ['salon-station', 0.8, 0.25, 90], ['salon-station', 0.8, 0.5, 90], ['cash-wrap', 0.2, 0.88, 0], ['compact-sofa', 0.7, 0.85, 0]] },
  { id: 'salon-barber', categoryId: 'salon', name: 'Barber', rooms: 1, dim: [5.0, 7.0], floor: 'walnut', wall: '#CBB7A3',
    items: [['salon-station', 0.25, 0.25, 90], ['salon-station', 0.25, 0.5, 90], ['salon-station', 0.25, 0.75, 90], ['compact-sofa', 0.8, 0.35, 0], ['cash-wrap', 0.8, 0.85, 0]] },
  { id: 'salon-nail', categoryId: 'salon', name: 'Nail Bar', rooms: 1, dim: [6.0, 6.0], floor: 'marble', wall: '#C9B0A6',
    items: [['writing-desk', 0.25, 0.25, 0], ['office-chair', 0.25, 0.42, 0], ['writing-desk', 0.25, 0.6, 0], ['office-chair', 0.25, 0.77, 0], ['accent-chair', 0.7, 0.3, 0], ['accent-chair', 0.7, 0.55, 0], ['cash-wrap', 0.75, 0.9, 0]] },
  { id: 'salon-spa', categoryId: 'salon', name: 'Spa Suite', rooms: 3, dim: [8.0, 7.0], floor: 'terracotta', wall: '#B7C4B4', part: [[0, 3.5, 4.0, 3.5], [4.0, 3.5, 4.0, 3.5]],
    items: [['reception-desk', 0.5, 0.15, 0], ['exam-table', 0.2, 0.75, 0], ['exam-table', 0.7, 0.75, 0], ['fig-tree', 0.9, 0.1, 0]] },
  { id: 'salon-beauty', categoryId: 'salon', name: 'Beauty Parlor', rooms: 1, dim: [7.0, 7.0], floor: 'marble', wall: '#FBF6F1',
    items: [['salon-station', 0.2, 0.3, 90], ['salon-station', 0.2, 0.6, 90], ['exam-table', 0.75, 0.4, 0], ['cash-wrap', 0.75, 0.88, 0], ['compact-sofa', 0.4, 0.9, 0]] },
  { id: 'salon-massage', categoryId: 'salon', name: 'Massage Rooms', rooms: 3, dim: [8.0, 6.0], floor: 'walnut', wall: '#B7C4B4', part: [[2.6, 0, 0.15, 6.0], [5.3, 0, 0.15, 6.0]],
    items: [['exam-table', 0.14, 0.45, 0], ['exam-table', 0.5, 0.45, 0], ['exam-table', 0.86, 0.45, 0]] },
  { id: 'salon-makeup', categoryId: 'salon', name: 'Makeup Studio', rooms: 1, dim: [5.0, 5.0], floor: 'marble', wall: '#C9B0A6',
    items: [['salon-station', 0.3, 0.25, 90], ['salon-station', 0.3, 0.55, 90], ['wall-mirror', 0.05, 0.4, 90], ['accent-chair', 0.75, 0.4, 0], ['cash-wrap', 0.75, 0.88, 0]] },
  { id: 'salon-unisex', categoryId: 'salon', name: 'Unisex Salon', rooms: 2, dim: [9.0, 7.0], floor: 'tile', wall: '#FBF6F1', part: [[4.5, 0, 0.15, 7.0]],
    items: [['salon-station', 0.12, 0.3, 90], ['salon-station', 0.12, 0.6, 90], ['salon-station', 0.62, 0.3, 90], ['salon-station', 0.62, 0.6, 90], ['cash-wrap', 0.5, 0.92, 0]] },
  { id: 'salon-waxing', categoryId: 'salon', name: 'Waxing Rooms', rooms: 2, dim: [6.0, 6.0], floor: 'tile', wall: '#B7C4B4', part: [[3.0, 0, 0.15, 6.0]],
    items: [['exam-table', 0.22, 0.4, 0], ['exam-table', 0.72, 0.4, 0], ['medicine-cabinet', 0.05, 0.85, 90], ['medicine-cabinet', 0.95, 0.85, 90]] },
  { id: 'salon-reception', categoryId: 'salon', name: 'Reception + Wait', rooms: 1, dim: [6.0, 5.0], floor: 'marble', wall: '#C9B0A6',
    items: [['reception-desk', 0.5, 0.15, 0], ['compact-sofa', 0.25, 0.7, 0], ['compact-sofa', 0.7, 0.7, 0], ['oak-coffee-table', 0.5, 0.75, 0], ['fig-tree', 0.9, 0.9, 0]] },

  // ================= WAREHOUSE =================
  { id: 'wh-small', categoryId: 'warehouse', name: 'Small Storage', rooms: 1, dim: [10.0, 12.0], floor: 'concrete', wall: '#8A8378',
    items: [['wall-shelving', 0.2, 0.25, 90], ['wall-shelving', 0.2, 0.5, 90], ['wall-shelving', 0.5, 0.25, 90], ['wall-shelving', 0.5, 0.5, 90], ['wall-shelving', 0.8, 0.25, 90], ['wall-shelving', 0.8, 0.5, 90], ['checkout-counter', 0.2, 0.9, 0]] },
  { id: 'wh-racked', categoryId: 'warehouse', name: 'Racked Aisles', rooms: 1, dim: [14.0, 20.0], floor: 'concrete', wall: '#8A8378',
    items: [['wall-shelving', 0.2, 0.2, 90], ['wall-shelving', 0.2, 0.4, 90], ['wall-shelving', 0.2, 0.6, 90], ['wall-shelving', 0.5, 0.2, 90], ['wall-shelving', 0.5, 0.4, 90], ['wall-shelving', 0.5, 0.6, 90], ['wall-shelving', 0.8, 0.2, 90], ['wall-shelving', 0.8, 0.4, 90], ['wall-shelving', 0.8, 0.6, 90], ['checkout-counter', 0.2, 0.92, 0]] },
  { id: 'wh-cold', categoryId: 'warehouse', name: 'Cold Storage', rooms: 1, dim: [10.0, 14.0], floor: 'tile', wall: '#AEB9C6',
    items: [['chest-freezer', 0.2, 0.25, 0], ['chest-freezer', 0.2, 0.45, 0], ['chest-freezer', 0.5, 0.25, 0], ['chest-freezer', 0.5, 0.45, 0], ['display-fridge', 0.85, 0.3, 90], ['display-fridge', 0.85, 0.6, 90]] },
  { id: 'wh-loading', categoryId: 'warehouse', name: 'Loading Bay', rooms: 1, dim: [12.0, 10.0], floor: 'concrete', wall: '#8A8378',
    items: [['wall-shelving', 0.15, 0.3, 90], ['wall-shelving', 0.15, 0.6, 90], ['pallet', 0.5, 0.4, 0], ['pallet', 0.65, 0.4, 0], ['checkout-counter', 0.85, 0.5, 0], ['barrier-gate', 0.5, 0.92, 0]] },
  { id: 'wh-distribution', categoryId: 'warehouse', name: 'Distribution', rooms: 2, dim: [16.0, 12.0], floor: 'concrete', wall: '#8A8378', part: [[12.0, 0, 4.0, 6.0]],
    items: [['wall-shelving', 0.15, 0.25, 90], ['wall-shelving', 0.15, 0.5, 90], ['wall-shelving', 0.4, 0.25, 90], ['wall-shelving', 0.4, 0.5, 90], ['reception-desk', 0.85, 0.2, 0], ['filing-cabinet', 0.9, 0.4, 0]] },
  { id: 'wh-mezzanine', categoryId: 'warehouse', name: 'Mezzanine', rooms: 2, dim: [12.0, 12.0], floor: 'concrete', wall: '#8A8378', part: [[0, 8.0, 12.0, 4.0]],
    items: [['wall-shelving', 0.2, 0.3, 90], ['wall-shelving', 0.5, 0.3, 90], ['wall-shelving', 0.8, 0.3, 90], ['writing-desk', 0.3, 0.85, 0], ['filing-cabinet', 0.7, 0.85, 0]] },
  { id: 'wh-bulk', categoryId: 'warehouse', name: 'Bulk Pallets', rooms: 1, dim: [14.0, 14.0], floor: 'concrete', wall: '#8A8378',
    items: [['pallet', 0.25, 0.25, 0], ['pallet', 0.45, 0.25, 0], ['pallet', 0.65, 0.25, 0], ['pallet', 0.25, 0.55, 0], ['pallet', 0.45, 0.55, 0], ['pallet', 0.65, 0.55, 0], ['checkout-counter', 0.85, 0.9, 0]] },
  { id: 'wh-workshop', categoryId: 'warehouse', name: 'Workshop', rooms: 1, dim: [9.0, 8.0], floor: 'concrete', wall: '#CBB7A3',
    items: [['lab-bench', 0.3, 0.2, 0], ['lab-bench', 0.3, 0.8, 0], ['wall-shelving', 0.9, 0.3, 90], ['wall-shelving', 0.9, 0.6, 90], ['filing-cabinet', 0.1, 0.85, 0]] },
  { id: 'wh-fulfilment', categoryId: 'warehouse', name: 'Fulfilment', rooms: 1, dim: [12.0, 11.0], floor: 'concrete', wall: '#8A8378',
    items: [['wall-shelving', 0.15, 0.25, 90], ['wall-shelving', 0.15, 0.55, 90], ['wall-shelving', 0.45, 0.25, 90], ['wall-shelving', 0.45, 0.55, 90], ['checkout-counter', 0.8, 0.3, 0], ['checkout-counter', 0.8, 0.6, 0], ['reception-desk', 0.8, 0.9, 0]] },
  { id: 'wh-archive', categoryId: 'warehouse', name: 'Archive', rooms: 1, dim: [8.0, 10.0], floor: 'ash', wall: '#D8D2C4',
    items: [['library-shelf', 0.2, 0.25, 90], ['library-shelf', 0.2, 0.5, 90], ['library-shelf', 0.5, 0.25, 90], ['library-shelf', 0.5, 0.5, 90], ['library-shelf', 0.8, 0.25, 90], ['library-shelf', 0.8, 0.5, 90], ['writing-desk', 0.5, 0.9, 0]] },

  // ================= CLINIC =================
  { id: 'clinic-gp', categoryId: 'clinic', name: 'GP Room', rooms: 1, dim: [4.5, 5.0], floor: 'tile', wall: '#FBF6F1',
    items: [['reception-desk', 0.35, 0.25, 0], ['office-chair', 0.35, 0.12, 0], ['waiting-chair', 0.7, 0.25, 0], ['exam-table', 0.75, 0.7, 0], ['medicine-cabinet', 0.1, 0.85, 90]] },
  { id: 'clinic-dental', categoryId: 'clinic', name: 'Dental', rooms: 1, dim: [5.0, 5.5], floor: 'tile', wall: '#AEB9C6',
    items: [['dental-chair', 0.4, 0.4, 0], ['medicine-cabinet', 0.9, 0.3, 90], ['reception-desk', 0.3, 0.9, 0], ['waiting-chair', 0.75, 0.85, 0]] },
  { id: 'clinic-waiting', categoryId: 'clinic', name: 'Waiting + Reception', rooms: 1, dim: [7.0, 6.0], floor: 'tile', wall: '#B7C4B4',
    items: [['reception-desk', 0.5, 0.15, 0], ['waiting-chair', 0.15, 0.5, 0], ['waiting-chair', 0.15, 0.65, 0], ['waiting-chair', 0.15, 0.8, 0], ['waiting-chair', 0.85, 0.5, 180], ['waiting-chair', 0.85, 0.65, 180], ['fig-tree', 0.5, 0.9, 0]] },
  { id: 'clinic-exam', categoryId: 'clinic', name: 'Exam Suite', rooms: 3, dim: [8.0, 6.0], floor: 'tile', wall: '#FBF6F1', part: [[2.6, 0, 0.15, 6.0], [5.3, 0, 0.15, 6.0]],
    items: [['exam-table', 0.14, 0.4, 0], ['exam-table', 0.5, 0.4, 0], ['exam-table', 0.86, 0.4, 0], ['medicine-cabinet', 0.14, 0.85, 0], ['medicine-cabinet', 0.86, 0.85, 0]] },
  { id: 'clinic-pharmacy', categoryId: 'clinic', name: 'Pharmacy Counter', rooms: 1, dim: [6.0, 7.0], floor: 'tile', wall: '#FBF6F1',
    items: [['reception-desk', 0.5, 0.85, 0], ['medicine-cabinet', 0.2, 0.25, 0], ['medicine-cabinet', 0.5, 0.25, 0], ['medicine-cabinet', 0.8, 0.25, 0], ['wall-shelving', 0.9, 0.6, 90]] },
  { id: 'clinic-lab', categoryId: 'clinic', name: 'Lab', rooms: 1, dim: [7.0, 6.0], floor: 'tile', wall: '#AEB9C6',
    items: [['lab-bench', 0.3, 0.2, 0], ['lab-bench', 0.3, 0.8, 0], ['medicine-cabinet', 0.9, 0.3, 90], ['medicine-cabinet', 0.9, 0.6, 90], ['office-chair', 0.3, 0.4, 0]] },
  { id: 'clinic-physio', categoryId: 'clinic', name: 'Physio', rooms: 1, dim: [7.0, 7.0], floor: 'walnut', wall: '#B7C4B4',
    items: [['exam-table', 0.25, 0.35, 0], ['exam-table', 0.7, 0.35, 0], ['area-rug', 0.5, 0.75, 0], ['medicine-cabinet', 0.1, 0.85, 90], ['wall-mirror', 0.95, 0.5, 90]] },
  { id: 'clinic-ward', categoryId: 'clinic', name: 'Consult + Ward', rooms: 2, dim: [9.0, 6.5], floor: 'tile', wall: '#FBF6F1', part: [[4.5, 0, 4.5, 6.5]],
    items: [['reception-desk', 0.22, 0.2, 0], ['exam-table', 0.22, 0.7, 0], ['hospital-bed', 0.72, 0.3, 0], ['hospital-bed', 0.72, 0.7, 0]] },
  { id: 'clinic-hospital', categoryId: 'clinic', name: 'Hospital Wing', rooms: 4, dim: [12.0, 7.0], floor: 'tile', wall: '#AEB9C6', part: [[3.0, 0, 0.15, 7.0], [6.0, 0, 0.15, 7.0], [9.0, 0, 0.15, 7.0]],
    items: [['hospital-bed', 0.13, 0.4, 0], ['hospital-bed', 0.38, 0.4, 0], ['hospital-bed', 0.63, 0.4, 0], ['hospital-bed', 0.88, 0.4, 0], ['medicine-cabinet', 0.13, 0.9, 0], ['medicine-cabinet', 0.63, 0.9, 0]] },
  { id: 'clinic-vet', categoryId: 'clinic', name: 'Vet Clinic', rooms: 2, dim: [7.0, 6.0], floor: 'tile', wall: '#B7C4B4', part: [[4.0, 0, 3.0, 3.5]],
    items: [['reception-desk', 0.25, 0.2, 0], ['waiting-chair', 0.15, 0.7, 0], ['waiting-chair', 0.15, 0.85, 0], ['exam-table', 0.78, 0.25, 0], ['medicine-cabinet', 0.9, 0.8, 90]] },

  // ================= SCHOOL =================
  { id: 'school-classroom', categoryId: 'school', name: 'Classroom', rooms: 1, dim: [8.0, 7.0], floor: 'oak', wall: '#FBF6F1',
    items: [['teacher-desk', 0.5, 0.12, 0], ['whiteboard', 0.5, 0.03, 0], ['classroom-desk', 0.25, 0.4, 0], ['classroom-desk', 0.5, 0.4, 0], ['classroom-desk', 0.75, 0.4, 0], ['classroom-desk', 0.25, 0.62, 0], ['classroom-desk', 0.5, 0.62, 0], ['classroom-desk', 0.75, 0.62, 0], ['classroom-desk', 0.25, 0.84, 0], ['classroom-desk', 0.5, 0.84, 0], ['classroom-desk', 0.75, 0.84, 0]] },
  { id: 'school-computer', categoryId: 'school', name: 'Computer Lab', rooms: 1, dim: [8.0, 6.5], floor: 'carpet', wall: '#AEB9C6',
    items: [['writing-desk', 0.2, 0.25, 0], ['writing-desk', 0.5, 0.25, 0], ['writing-desk', 0.8, 0.25, 0], ['writing-desk', 0.2, 0.55, 0], ['writing-desk', 0.5, 0.55, 0], ['writing-desk', 0.8, 0.55, 0], ['teacher-desk', 0.5, 0.9, 0], ['whiteboard', 0.5, 0.03, 0]] },
  { id: 'school-library', categoryId: 'school', name: 'Library', rooms: 1, dim: [10.0, 9.0], floor: 'walnut', wall: '#E7DDCB',
    items: [['library-shelf', 0.15, 0.25, 90], ['library-shelf', 0.15, 0.5, 90], ['library-shelf', 0.4, 0.25, 90], ['library-shelf', 0.4, 0.5, 90], ['meeting-table', 0.78, 0.35, 0], ['meeting-table', 0.78, 0.7, 0], ['reception-desk', 0.3, 0.92, 0]] },
  { id: 'school-lecture', categoryId: 'school', name: 'Lecture Hall', rooms: 1, dim: [10.0, 8.0], floor: 'carpet', wall: '#3E4A5C',
    items: [['whiteboard', 0.5, 0.04, 0], ['teacher-desk', 0.5, 0.14, 0], ['classroom-desk', 0.25, 0.4, 0], ['classroom-desk', 0.5, 0.4, 0], ['classroom-desk', 0.75, 0.4, 0], ['classroom-desk', 0.25, 0.6, 0], ['classroom-desk', 0.5, 0.6, 0], ['classroom-desk', 0.75, 0.6, 0], ['classroom-desk', 0.25, 0.8, 0], ['classroom-desk', 0.5, 0.8, 0], ['classroom-desk', 0.75, 0.8, 0]] },
  { id: 'school-staff', categoryId: 'school', name: 'Staff Room', rooms: 1, dim: [7.0, 5.5], floor: 'ash', wall: '#B7C4B4',
    items: [['writing-desk', 0.25, 0.25, 0], ['writing-desk', 0.6, 0.25, 0], ['compact-sofa', 0.25, 0.75, 0], ['round-dining', 0.7, 0.7, 0], ['base-cabinet', 0.9, 0.15, 0]] },
  { id: 'school-cafeteria', categoryId: 'school', name: 'Cafeteria', rooms: 1, dim: [12.0, 9.0], floor: 'tile', wall: '#FBF6F1',
    items: [['dining-table', 0.25, 0.3, 0], ['dining-table', 0.55, 0.3, 0], ['dining-table', 0.25, 0.6, 0], ['dining-table', 0.55, 0.6, 0], ['dining-table', 0.85, 0.45, 0], ['checkout-counter', 0.3, 0.92, 0], ['shelf-endcap-cafe', 0.7, 0.92, 0]] },
  { id: 'school-science', categoryId: 'school', name: 'Science Lab', rooms: 1, dim: [9.0, 7.0], floor: 'tile', wall: '#AEB9C6',
    items: [['lab-bench', 0.3, 0.25, 0], ['lab-bench', 0.7, 0.25, 0], ['lab-bench', 0.3, 0.6, 0], ['lab-bench', 0.7, 0.6, 0], ['teacher-desk', 0.5, 0.9, 0], ['whiteboard', 0.5, 0.03, 0]] },
  { id: 'school-art', categoryId: 'school', name: 'Art Room', rooms: 1, dim: [8.0, 7.0], floor: 'concrete', wall: '#C9B0A6',
    items: [['lab-bench', 0.3, 0.3, 0], ['lab-bench', 0.7, 0.3, 0], ['lab-bench', 0.5, 0.65, 0], ['school-locker', 0.9, 0.3, 90], ['whiteboard', 0.5, 0.03, 0]] },
  { id: 'school-nursery', categoryId: 'school', name: 'Nursery', rooms: 1, dim: [7.0, 6.0], floor: 'carpet', wall: '#B7C4B4',
    items: [['area-rug', 0.5, 0.5, 0], ['bookshelf', 0.1, 0.2, 0], ['library-shelf', 0.9, 0.4, 90], ['single-bed', 0.25, 0.85, 0], ['single-bed', 0.6, 0.85, 0], ['teacher-desk', 0.85, 0.85, 0]] },
  { id: 'school-admin', categoryId: 'school', name: 'Admin Office', rooms: 1, dim: [6.0, 5.0], floor: 'ash', wall: '#FBF6F1',
    items: [['reception-desk', 0.5, 0.15, 0], ['writing-desk', 0.25, 0.6, 0], ['office-chair', 0.25, 0.75, 0], ['filing-cabinet', 0.85, 0.3, 0], ['filing-cabinet', 0.85, 0.6, 0]] },

  // ================= PARKING =================
  { id: 'park-small', categoryId: 'parking', name: 'Small Lot', rooms: 1, dim: [10.0, 12.0], floor: 'concrete', wall: '#8A8378',
    items: [['car', 0.2, 0.25, 0], ['car', 0.4, 0.25, 0], ['car', 0.6, 0.25, 0], ['car', 0.8, 0.25, 0], ['car', 0.2, 0.7, 0], ['car', 0.4, 0.7, 0], ['car', 0.6, 0.7, 0], ['car', 0.8, 0.7, 0]] },
  { id: 'park-multirow', categoryId: 'parking', name: 'Multi-Row', rooms: 1, dim: [14.0, 16.0], floor: 'concrete', wall: '#8A8378',
    items: [['car', 0.15, 0.2, 0], ['car', 0.35, 0.2, 0], ['car', 0.55, 0.2, 0], ['car', 0.75, 0.2, 0], ['car', 0.15, 0.5, 0], ['car', 0.35, 0.5, 0], ['car', 0.55, 0.5, 0], ['car', 0.75, 0.5, 0], ['car', 0.15, 0.8, 0], ['car', 0.35, 0.8, 0], ['car', 0.55, 0.8, 0], ['car', 0.75, 0.8, 0]] },
  { id: 'park-underground', categoryId: 'parking', name: 'Underground Bay', rooms: 1, dim: [12.0, 14.0], floor: 'concrete', wall: '#3E4A5C',
    items: [['car', 0.2, 0.2, 0], ['car', 0.5, 0.2, 0], ['car', 0.8, 0.2, 0], ['suv', 0.2, 0.6, 0], ['car', 0.5, 0.6, 0], ['suv', 0.8, 0.6, 0], ['parking-post', 0.05, 0.5, 0], ['parking-post', 0.95, 0.5, 0], ['barrier-gate', 0.5, 0.95, 90]] },
  { id: 'park-angled', categoryId: 'parking', name: 'Angled Parking', rooms: 1, dim: [12.0, 10.0], floor: 'concrete', wall: '#8A8378',
    items: [['car', 0.18, 0.25, 30], ['car', 0.38, 0.25, 30], ['car', 0.58, 0.25, 30], ['car', 0.78, 0.25, 30], ['car', 0.18, 0.7, 30], ['car', 0.38, 0.7, 30], ['car', 0.58, 0.7, 30], ['car', 0.78, 0.7, 30]] },
  { id: 'park-garage', categoryId: 'parking', name: 'Home Garage', rooms: 1, dim: [6.0, 6.5], floor: 'concrete', wall: '#CBB7A3',
    items: [['car', 0.35, 0.4, 0], ['wall-shelving', 0.9, 0.3, 90], ['wall-shelving', 0.9, 0.6, 90], ['filing-cabinet', 0.1, 0.85, 0]] },
  { id: 'park-bikecar', categoryId: 'parking', name: 'Bike + Car', rooms: 1, dim: [9.0, 8.0], floor: 'concrete', wall: '#8A8378',
    items: [['car', 0.3, 0.3, 0], ['car', 0.7, 0.3, 0], ['parking-post', 0.15, 0.75, 0], ['parking-post', 0.3, 0.75, 0], ['parking-post', 0.45, 0.75, 0], ['parking-post', 0.6, 0.75, 0]] },
  { id: 'park-valet', categoryId: 'parking', name: 'Valet Drop', rooms: 1, dim: [11.0, 8.0], floor: 'concrete', wall: '#CBB7A3',
    items: [['reception-desk', 0.5, 0.15, 0], ['car', 0.25, 0.6, 0], ['car', 0.5, 0.6, 0], ['car', 0.75, 0.6, 0], ['barrier-gate', 0.5, 0.95, 90]] },
  { id: 'park-ev', categoryId: 'parking', name: 'EV Charging Row', rooms: 1, dim: [12.0, 9.0], floor: 'concrete', wall: '#B7C4B4',
    items: [['car', 0.2, 0.35, 0], ['car', 0.4, 0.35, 0], ['car', 0.6, 0.35, 0], ['car', 0.8, 0.35, 0], ['ev-charger', 0.2, 0.1, 0], ['ev-charger', 0.4, 0.1, 0], ['ev-charger', 0.6, 0.1, 0], ['ev-charger', 0.8, 0.1, 0]] },
  { id: 'park-accessible', categoryId: 'parking', name: 'Accessible Bays', rooms: 1, dim: [10.0, 8.0], floor: 'concrete', wall: '#AEB9C6',
    items: [['car', 0.25, 0.35, 0], ['car', 0.55, 0.35, 0], ['suv', 0.82, 0.35, 0], ['parking-post', 0.1, 0.7, 0], ['parking-post', 0.9, 0.7, 0]] },
  { id: 'park-ramp', categoryId: 'parking', name: 'Ramp + Entry', rooms: 1, dim: [11.0, 12.0], floor: 'concrete', wall: '#8A8378',
    items: [['barrier-gate', 0.5, 0.1, 90], ['car', 0.2, 0.4, 0], ['car', 0.4, 0.4, 0], ['car', 0.6, 0.4, 0], ['car', 0.8, 0.4, 0], ['car', 0.3, 0.8, 0], ['car', 0.6, 0.8, 0]] },

  // ================= GARDEN =================
  { id: 'garden-backyard', categoryId: 'garden', name: 'Backyard', rooms: 1, dim: [9.0, 8.0], floor: 'terracotta', wall: '#B7C4B4',
    items: [['lawn-patch', 0.4, 0.45, 0], ['garden-tree', 0.85, 0.2, 0], ['garden-bench', 0.2, 0.85, 0], ['flower-bed', 0.85, 0.7, 0], ['garden-path', 0.5, 0.9, 0]] },
  { id: 'garden-front', categoryId: 'garden', name: 'Front Lawn', rooms: 1, dim: [8.0, 6.0], floor: 'terracotta', wall: '#B7C4B4',
    items: [['lawn-patch', 0.5, 0.5, 0], ['garden-tree', 0.15, 0.2, 0], ['garden-tree', 0.85, 0.2, 0], ['garden-path', 0.5, 0.85, 90], ['flower-bed', 0.5, 0.15, 0]] },
  { id: 'garden-patio', categoryId: 'garden', name: 'Patio', rooms: 1, dim: [7.0, 6.0], floor: 'concrete', wall: '#CBB7A3',
    items: [['patio-set', 0.35, 0.4, 0], ['pergola', 0.35, 0.4, 0], ['planter-box', 0.85, 0.25, 0], ['planter-box', 0.85, 0.6, 0], ['garden-bench', 0.2, 0.85, 0]] },
  { id: 'garden-veg', categoryId: 'garden', name: 'Vegetable Garden', rooms: 1, dim: [8.0, 7.0], floor: 'terracotta', wall: '#B7C4B4',
    items: [['flower-bed', 0.25, 0.25, 0], ['flower-bed', 0.55, 0.25, 0], ['flower-bed', 0.25, 0.5, 0], ['flower-bed', 0.55, 0.5, 0], ['garden-path', 0.85, 0.5, 0], ['hedge', 0.5, 0.9, 0]] },
  { id: 'garden-courtyard', categoryId: 'garden', name: 'Courtyard', rooms: 1, dim: [8.0, 8.0], floor: 'marble', wall: '#D8D2C4',
    items: [['fountain', 0.5, 0.5, 0], ['garden-bench', 0.15, 0.5, 90], ['garden-bench', 0.85, 0.5, 90], ['garden-tree', 0.2, 0.15, 0], ['garden-tree', 0.8, 0.15, 0], ['garden-tree', 0.2, 0.85, 0], ['garden-tree', 0.8, 0.85, 0]] },
  { id: 'garden-pool', categoryId: 'garden', name: 'Pool Deck', rooms: 1, dim: [11.0, 8.0], floor: 'tile', wall: '#AEB9C6',
    items: [['lawn-patch', 0.4, 0.45, 0], ['patio-set', 0.8, 0.25, 0], ['garden-bench', 0.8, 0.7, 0], ['parasol', 0.8, 0.25, 0], ['garden-tree', 0.1, 0.2, 0]] },
  { id: 'garden-rooftop', categoryId: 'garden', name: 'Rooftop Garden', rooms: 1, dim: [9.0, 6.0], floor: 'concrete', wall: '#CBB7A3',
    items: [['planter-box', 0.2, 0.15, 0], ['planter-box', 0.5, 0.15, 0], ['planter-box', 0.8, 0.15, 0], ['patio-set', 0.35, 0.6, 0], ['patio-set', 0.7, 0.6, 0], ['hedge', 0.5, 0.9, 0]] },
  { id: 'garden-zen', categoryId: 'garden', name: 'Zen Garden', rooms: 1, dim: [7.0, 7.0], floor: 'ash', wall: '#B7C4B4',
    items: [['garden-tree', 0.3, 0.3, 0], ['fountain', 0.7, 0.7, 0], ['garden-bench', 0.2, 0.8, 0], ['flower-bed', 0.8, 0.25, 0], ['garden-path', 0.5, 0.5, 45]] },
  { id: 'garden-play', categoryId: 'garden', name: 'Play Area', rooms: 1, dim: [9.0, 7.0], floor: 'carpet', wall: '#B7C4B4',
    items: [['lawn-patch', 0.4, 0.5, 0], ['garden-bench', 0.15, 0.85, 0], ['garden-bench', 0.85, 0.85, 0], ['garden-tree', 0.85, 0.2, 0], ['flower-bed', 0.15, 0.2, 0]] },
  { id: 'garden-terrace', categoryId: 'garden', name: 'Terrace', rooms: 1, dim: [8.0, 5.5], floor: 'terracotta', wall: '#CBB7A3',
    items: [['patio-set', 0.3, 0.45, 0], ['pergola', 0.3, 0.45, 0], ['planter-box', 0.75, 0.2, 0], ['planter-box', 0.75, 0.7, 0], ['garden-bench', 0.9, 0.45, 90]] },

  // ================= PLAZA & MALL =================
  { id: 'plaza-foodcourt', categoryId: 'plaza', name: 'Food Court', rooms: 5, dim: [14.0, 12.0], floor: 'tile', wall: '#FBF6F1', part: [[0, 0, 3.0, 3.0], [11.0, 0, 3.0, 3.0], [0, 9.0, 3.0, 3.0], [11.0, 9.0, 3.0, 3.0]],
    items: [['shelf-endcap-cafe', 0.1, 0.1, 0], ['shelf-endcap-cafe', 0.9, 0.1, 0], ['shelf-endcap-cafe', 0.1, 0.9, 0], ['shelf-endcap-cafe', 0.9, 0.9, 0], ['round-dining', 0.4, 0.4, 0], ['round-dining', 0.6, 0.4, 0], ['round-dining', 0.4, 0.6, 0], ['round-dining', 0.6, 0.6, 0]] },
  { id: 'plaza-anchor', categoryId: 'plaza', name: 'Anchor Store', rooms: 1, dim: [16.0, 12.0], floor: 'marble', wall: '#D8D2C4',
    items: [['clothing-rack', 0.2, 0.25, 0], ['clothing-rack', 0.4, 0.25, 0], ['round-rack', 0.6, 0.25, 0], ['gondola-shelf', 0.2, 0.55, 0], ['gondola-shelf', 0.45, 0.55, 0], ['mannequin', 0.85, 0.2, 0], ['fitting-room', 0.88, 0.7, 0], ['cash-wrap', 0.3, 0.92, 0]] },
  { id: 'plaza-atrium', categoryId: 'plaza', name: 'Atrium', rooms: 1, dim: [14.0, 14.0], floor: 'marble', wall: '#FBF6F1',
    items: [['fountain', 0.5, 0.5, 0], ['garden-tree', 0.2, 0.2, 0], ['garden-tree', 0.8, 0.2, 0], ['garden-tree', 0.2, 0.8, 0], ['garden-tree', 0.8, 0.8, 0], ['garden-bench', 0.5, 0.25, 0], ['garden-bench', 0.5, 0.75, 0]] },
  { id: 'plaza-kiosk', categoryId: 'plaza', name: 'Kiosk Row', rooms: 1, dim: [14.0, 6.0], floor: 'tile', wall: '#D8D2C4',
    items: [['glass-display', 0.15, 0.35, 0], ['glass-display', 0.4, 0.35, 0], ['glass-display', 0.65, 0.35, 0], ['glass-display', 0.9, 0.35, 0], ['signage-stand', 0.15, 0.8, 0], ['signage-stand', 0.65, 0.8, 0]] },
  { id: 'plaza-cinema', categoryId: 'plaza', name: 'Cinema Lobby', rooms: 1, dim: [12.0, 9.0], floor: 'carpet', wall: '#3E4A5C',
    items: [['checkout-counter', 0.3, 0.15, 0], ['checkout-counter', 0.6, 0.15, 0], ['glass-display', 0.85, 0.4, 90], ['compact-sofa', 0.2, 0.8, 0], ['compact-sofa', 0.6, 0.8, 0], ['signage-stand', 0.9, 0.85, 0]] },
  { id: 'plaza-boutique', categoryId: 'plaza', name: 'Boutique Strip', rooms: 3, dim: [15.0, 7.0], floor: 'oak', wall: '#FBF6F1', part: [[5.0, 0, 0.15, 7.0], [10.0, 0, 0.15, 7.0]],
    items: [['round-rack', 0.15, 0.35, 0], ['cash-wrap', 0.15, 0.85, 0], ['round-rack', 0.5, 0.35, 0], ['cash-wrap', 0.5, 0.85, 0], ['round-rack', 0.85, 0.35, 0], ['cash-wrap', 0.85, 0.85, 0]] },
  { id: 'plaza-fountain', categoryId: 'plaza', name: 'Central Fountain', rooms: 1, dim: [12.0, 12.0], floor: 'marble', wall: '#D8D2C4',
    items: [['fountain', 0.5, 0.5, 0], ['garden-bench', 0.25, 0.5, 90], ['garden-bench', 0.75, 0.5, 90], ['garden-bench', 0.5, 0.25, 0], ['garden-bench', 0.5, 0.75, 0], ['planter-box', 0.2, 0.2, 0], ['planter-box', 0.8, 0.8, 0]] },
  { id: 'plaza-escalator', categoryId: 'plaza', name: 'Escalator Core', rooms: 1, dim: [10.0, 10.0], floor: 'marble', wall: '#AEB9C6',
    items: [['lab-bench', 0.4, 0.5, 0], ['lab-bench', 0.6, 0.5, 0], ['garden-tree', 0.15, 0.15, 0], ['garden-tree', 0.85, 0.85, 0], ['signage-stand', 0.15, 0.85, 0]] },
  { id: 'plaza-event', categoryId: 'plaza', name: 'Event Space', rooms: 1, dim: [14.0, 10.0], floor: 'concrete', wall: '#3E4A5C',
    items: [['meeting-table', 0.25, 0.35, 0], ['meeting-table', 0.55, 0.35, 0], ['meeting-table', 0.25, 0.65, 0], ['meeting-table', 0.55, 0.65, 0], ['signage-stand', 0.9, 0.15, 0], ['fig-tree', 0.9, 0.85, 0]] },
  { id: 'plaza-concourse', categoryId: 'plaza', name: 'Parking Concourse', rooms: 1, dim: [16.0, 10.0], floor: 'concrete', wall: '#8A8378',
    items: [['car', 0.15, 0.3, 0], ['car', 0.35, 0.3, 0], ['car', 0.55, 0.3, 0], ['car', 0.75, 0.3, 0], ['car', 0.15, 0.7, 0], ['car', 0.35, 0.7, 0], ['car', 0.55, 0.7, 0], ['car', 0.75, 0.7, 0], ['barrier-gate', 0.9, 0.5, 0]] },
];

// ---------------------------------------------------------------------------
// Lookups & plan builder
// ---------------------------------------------------------------------------
export function ideaById(id) {
  return STARTER_IDEAS.find((i) => i.id === id) || null;
}

export function ideasByCategory(categoryId) {
  return STARTER_IDEAS.filter((i) => i.categoryId === categoryId);
}

// Turn a starter idea into a full floor plan: perimeter (from createFloorPlan)
// + interior partitions + furniture + finishes. Reuses the domain builders so
// the result is identical in shape to a hand-drawn plan.
export function buildIdeaPlan(idea) {
  const [width, length] = idea.dim;
  let plan = createFloorPlan({ width, length });
  if (idea.floor || idea.wall) {
    plan = setMaterials(plan, {
      ...(idea.floor ? { floor: idea.floor } : {}),
      ...(idea.wall ? { wall: idea.wall } : {}),
    });
  }
  for (const [x, y, w, h] of idea.part || []) {
    plan = addRoomRect(plan, x, y, w, h);
  }
  for (const [catalogId, fx, fy, r] of idea.items || []) {
    const item = catalogById(catalogId);
    if (!item) continue;
    plan = addFurnitureItem(plan, item, { x: fx * plan.width, y: fy * plan.length });
    const added = plan.furniture[plan.furniture.length - 1];
    if (r) plan = updateFurnitureItem(plan, added.id, { rotation: r });
  }
  return plan;
}
