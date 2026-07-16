// Lighting presets for the 3D room view.
export const LIGHTING = {
  golden: {
    label: 'Golden Hour',
    dot: '#C79A45',
    background: '#EAE0D2',
    ambient: { color: '#FFE9CF', intensity: 0.7 },
    directional: { color: '#FFCE8A', intensity: 1.4, position: [4, 6, 2] },
    floor: '#E6D8C4',
    wall: '#D9C7AE',
  },
  daylight: {
    label: 'Daylight',
    dot: '#8FB8E0',
    background: '#EDF1F5',
    ambient: { color: '#FFFFFF', intensity: 0.85 },
    directional: { color: '#FFFFFF', intensity: 1.5, position: [3, 8, 4] },
    floor: '#E9E5DD',
    wall: '#DDDAD2',
  },
  studio: {
    label: 'Studio',
    dot: '#B7B2A8',
    background: '#DEDAD3',
    ambient: { color: '#F3EFE8', intensity: 1.1 },
    directional: { color: '#FFFFFF', intensity: 1.0, position: [-4, 7, 3] },
    floor: '#DED8CC',
    wall: '#CFC9BD',
  },
  evening: {
    label: 'Evening',
    dot: '#E08A5A',
    background: '#2A211C',
    ambient: { color: '#5A4234', intensity: 0.55 },
    directional: { color: '#FFB27A', intensity: 1.1, position: [2, 5, -3] },
    floor: '#3A2E26',
    wall: '#4A3A30',
  },
  night: {
    label: 'Night Mode',
    dot: '#7A8BB8',
    background: '#141310',
    ambient: { color: '#2E3550', intensity: 0.5 },
    directional: { color: '#8FA3D8', intensity: 0.7, position: [-3, 5, 3] },
    floor: '#20211F',
    wall: '#2A2C33',
  },
};

export const LIGHTING_ORDER = ['golden', 'daylight', 'studio', 'evening', 'night'];
