import { createNavigationContainerRef } from '@react-navigation/native';

// App-wide navigation ref so non-screen code (e.g. the global unlock sheet) can
// navigate without a navigation prop.
export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) navigationRef.navigate(name, params);
}
