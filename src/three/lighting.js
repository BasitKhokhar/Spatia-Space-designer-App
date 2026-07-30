// Lighting presets for the 3D room view.
//
// Each preset drives two things that must stay consistent with each other:
//   1. The analytic lights in Room3D (hemisphere fill + the shadow-casting sun).
//   2. The procedural environment scene in environment.js, which PMREM convolves
//      into the image-based lighting that supplies all indirect light.
//
// FIELD REFERENCE
//   background   scene clear color, and the sky color of the environment dome
//   ground       lower hemisphere of the environment dome (bounce light color)
//   ambient      legacy analytic ambient — kept low now that IBL supplies ambient
//   directional  the sun: color, intensity, and direction (also aims the IBL key)
//   envIntensity master gain on all indirect light (scene.environmentIntensity)
//   exposure     renderer.toneMappingExposure for this mood
//   sunPower     emissive power of the IBL key panel (0 disables it)
//   sunSize      size of that panel — larger = softer, broader highlights
//   fillColor    color of the opposite-side + overhead IBL fill panels
//   fillPower    their emissive power
//   lampColor    interior lamp panels, dark presets only
//   lampPower    their emissive power (omit/0 to disable)
//   floor, wall  2D/3D surface tints (unchanged, consumed elsewhere)
export const LIGHTING = {
  golden: {
    label: 'Golden Hour',
    dot: '#C79A45',
    background: '#EAE0D2',
    ground: '#8F7E66',
    ambient: { color: '#FFE9CF', intensity: 0.18 },
    directional: { color: '#FFCE8A', intensity: 2.0, position: [4, 6, 2] },
    envIntensity: 1.0,
    exposure: 1.0,
    sunPower: 16,
    sunSize: 22,
    fillColor: '#F2DCC0',
    fillPower: 0.85,
    floor: '#E6D8C4',
    wall: '#D9C7AE',
  },
  daylight: {
    label: 'Daylight',
    dot: '#8FB8E0',
    background: '#EDF1F5',
    ground: '#9A968E',
    ambient: { color: '#FFFFFF', intensity: 0.2 },
    directional: { color: '#FFFFFF', intensity: 2.2, position: [3, 8, 4] },
    envIntensity: 1.05,
    exposure: 1.0,
    sunPower: 18,
    sunSize: 20,
    fillColor: '#DCE7F2',
    fillPower: 1.1,
    floor: '#E9E5DD',
    wall: '#DDDAD2',
  },
  studio: {
    label: 'Studio',
    dot: '#B7B2A8',
    background: '#DEDAD3',
    ground: '#B4AFA6',
    ambient: { color: '#F3EFE8', intensity: 0.24 },
    directional: { color: '#FFFFFF', intensity: 1.5, position: [-4, 7, 3] },
    envIntensity: 1.15,
    exposure: 1.0,
    // Softbox look: a big, weak key with strong fill — minimal shadow contrast.
    sunPower: 9,
    sunSize: 40,
    fillColor: '#FFFFFF',
    fillPower: 1.5,
    floor: '#DED8CC',
    wall: '#CFC9BD',
  },
  evening: {
    label: 'Evening',
    dot: '#E08A5A',
    background: '#2A211C',
    ground: '#1A1512',
    ambient: { color: '#5A4234', intensity: 0.14 },
    directional: { color: '#FFB27A', intensity: 1.6, position: [2, 5, -3] },
    envIntensity: 1.0,
    exposure: 1.12,
    sunPower: 7,
    sunSize: 30,
    fillColor: '#4A3524',
    fillPower: 0.5,
    lampColor: '#FFD8A0',
    lampPower: 9,
    floor: '#3A2E26',
    wall: '#4A3A30',
  },
  night: {
    label: 'Night Mode',
    dot: '#7A8BB8',
    background: '#141310',
    ground: '#0C0C0E',
    ambient: { color: '#2E3550', intensity: 0.12 },
    directional: { color: '#8FA3D8', intensity: 0.9, position: [-3, 5, 3] },
    envIntensity: 1.0,
    exposure: 1.2,
    // Moonlight only — the interior lamps do nearly all the work here.
    sunPower: 2.5,
    sunSize: 34,
    fillColor: '#2A3350',
    fillPower: 0.35,
    lampColor: '#FFD8A0',
    lampPower: 12,
    floor: '#20211F',
    wall: '#2A2C33',
  },
};

export const LIGHTING_ORDER = ['golden', 'daylight', 'studio', 'evening', 'night'];
