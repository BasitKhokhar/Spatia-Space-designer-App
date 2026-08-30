import 'react-native-gesture-handler';
import './src/three/rnPatch'; // must run before any three.js import (see file)
import { registerRootComponent } from 'expo';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';

import App from './App';

// Must be registered outside the React tree, before the app mounts, per
// React Native Firebase's requirements. Background/killed-state notification
// messages are shown by the OS automatically — this only needs to exist so
// data-only messages have somewhere to go and RNFirebase doesn't warn.
setBackgroundMessageHandler(getMessaging(), async () => {});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App)
registerRootComponent(App);
