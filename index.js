import 'react-native-gesture-handler';
import './src/three/rnPatch'; // must run before any three.js import (see file)
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App)
registerRootComponent(App);
