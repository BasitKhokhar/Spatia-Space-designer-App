// Unit conversion + area helpers. Internal model always stores meters.
const METERS_TO_FEET = 3.28084;

export function metersToFeet(m) {
  return m * METERS_TO_FEET;
}

export function feetToMeters(ft) {
  return ft / METERS_TO_FEET;
}

// Format a meter value in the requested unit system.
export function formatLength(meters, unit = 'meters') {
  if (unit === 'feet') {
    return `${metersToFeet(meters).toFixed(1)} ft`;
  }
  return `${meters.toFixed(1)} m`;
}

// Area of a rectangular room in m² (always metric label).
export function areaM2(widthM, lengthM) {
  return Math.round(widthM * lengthM * 10) / 10;
}
