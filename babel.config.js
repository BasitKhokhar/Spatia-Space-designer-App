module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Module resolver for the "@/..." alias -> src
      [
        'module-resolver',
        {
          root: ['./'],
          alias: { '@': './src' },
          extensions: ['.js', '.jsx', '.json'],
        },
      ],
      // react-native-worklets plugin powers Reanimated 4. MUST be last.
      'react-native-worklets/plugin',
    ],
  };
};
