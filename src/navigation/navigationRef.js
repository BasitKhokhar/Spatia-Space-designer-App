import { createNavigationContainerRef } from '@react-navigation/native';

// App-wide navigation ref so non-screen code (e.g. the global unlock sheet) can
// navigate without a navigation prop.
export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) navigationRef.navigate(name, params);
}

// Current route name, for code that needs to know where the user is without a
// navigation prop (the ad gate uses it to keep ads off sensitive screens).
export function currentRouteName() {
  if (!navigationRef.isReady()) return undefined;
  try {
    return navigationRef.getCurrentRoute()?.name;
  } catch {
    return undefined;
  }
}
