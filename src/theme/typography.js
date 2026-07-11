// Font family names must match those registered in useAppFonts.js.
export const fonts = {
  // Sora — display & headings
  displayBold: 'Sora_800ExtraBold',
  display: 'Sora_700Bold',
  heading: 'Sora_600SemiBold',
  headingMedium: 'Sora_500Medium',
  // Manrope — UI & body
  body: 'Manrope_500Medium',
  bodyRegular: 'Manrope_400Regular',
  bodySemi: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  bodyExtra: 'Manrope_800ExtraBold',
};

// Type scale from the brand doc (Display 40 → Caption 12)
export const type = {
  display: { fontFamily: fonts.displayBold, fontSize: 30, letterSpacing: -0.6, lineHeight: 36 },
  h1: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.3, lineHeight: 32 },
  h2: { fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.2, lineHeight: 28 },
  title: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 26 },
  titleSm: { fontFamily: fonts.heading, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  bodySm: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 18 },
  caption: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
};
