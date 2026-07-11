// Metro configuration for HomePlanner.
// Adds 3D / image asset extensions used by three.js and the catalog.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts = Array.from(
  new Set([...config.resolver.assetExts, 'glb', 'gltf', 'obj', 'mtl', 'hdr', 'png', 'jpg'])
);

module.exports = config;
