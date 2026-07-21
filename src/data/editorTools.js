// Editor build tools, surfaced in the FloorPlanEditorScreen footer (which drives
// the active tool + on-canvas behavior). `select` is the resting mode you return
// to after committing a draw. Rooms, walls, doors and windows are no longer build
// tools — they're placed from the catalog sidebar as Structure items instead.
export const EDITOR_TOOLS = [
  { id: 'select', icon: 'move', label: 'Select', hint: 'Drag to move. Tap an item to select it.' },
  { id: 'outline', icon: 'polygon', label: 'Outline', hint: 'Tap to trace the outer shape. Tap the first dot to close it.' },
  { id: 'text', icon: 'text', label: 'Text', hint: 'Tap to drop a label, then type its name.' },
  { id: 'measure', icon: 'ruler', label: 'Measure', hint: 'Tap two points to measure the distance.' },
];

export const toolById = (id) => EDITOR_TOOLS.find((t) => t.id === id) || EDITOR_TOOLS[0];
