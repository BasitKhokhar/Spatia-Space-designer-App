// Unit conversion + area helpers. Internal model always stores meters.
const METERS_TO_FEET = 3.28084;
const METERS_TO_INCHES = 39.3701;
const M2_TO_FT2 = 10.7639;

export function metersToFeet(m) {
  return m * METERS_TO_FEET;
}

export function feetToMeters(ft) {
  return ft / METERS_TO_FEET;
}

export function metersToInches(m) {
  return m * METERS_TO_INCHES;
}

export function inchesToMeters(inch) {
  return inch / METERS_TO_INCHES;
}

// Format a meter value in the requested unit system.
export function formatLength(meters, unit = 'meters') {
  if (unit === 'feet') {
    return `${metersToFeet(meters).toFixed(1)} ft`;
  }
  return `${meters.toFixed(1)} m`;
}

// Format a small "width" value (wall thickness): inches in feet mode, cm in
// meter mode. Rounded to whole units since walls are thin.
export function formatWidth(meters, unit = 'meters') {
  if (unit === 'feet') {
    return `${Math.round(metersToInches(meters))} in`;
  }
  return `${Math.round(meters * 100)} cm`;
}

// Area of a rectangular room in m² (always metric).
export function areaM2(widthM, lengthM) {
  return Math.round(widthM * lengthM * 10) / 10;
}

// Format an m² area in the requested unit system.
export function formatArea(m2, unit = 'meters') {
  if (unit === 'feet') {
    return `${Math.round(m2 * M2_TO_FT2 * 10) / 10} ft²`;
  }
  return `${m2} m²`;
}
