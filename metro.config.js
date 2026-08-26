// Metro configuration for HomePlanner.
// Adds 3D / image asset extensions used by three.js and the catalog.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts = Array.from(
  new Set([...config.resolver.assetExts, 'glb', 'gltf', 'obj', 'mtl', 'hdr', 'png', 'jpg'])
);

// three ships two builds behind a conditional exports map (import -> three.module.js,
// require -> three.cjs). @react-three/fiber's native entry is CJS and require()s three,
// then patches TextureLoader/FileLoader on THAT copy so they work without a DOM. Our own
// `import ... from 'three'` would otherwise resolve to the module build — a second, unpatched
// instance, where every texture load hits `document.createElementNS` and throws. Pin every
// `three` request to the require condition so there is exactly one instance, and it is the
// patched one. Also covers three/examples/jsm/* (GLTFLoader), whose internal `from 'three'`
// passes through here too.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = defaultResolveRequest || context.resolveRequest;
  if (moduleName === 'three') {
    return resolve({ ...context, isESMImport: false }, moduleName, platform);
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
