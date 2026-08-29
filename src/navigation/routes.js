// Central route-name constants to avoid magic strings across the app.
export const ROUTES = {
  // Onboarding
  splash: 'Splash',
  onboarding: 'Onboarding',
  // Auth
  login: 'Login',
  signup: 'Signup',
  forgot: 'ForgotPassword',
  otp: 'Otp',
  // Tabs
  tabs: 'Tabs',
  home: 'Home',
  explore: 'Explore',
  projects: 'Projects',
  // The last tab hosts SettingsScreen. It gets its own name so the pushed
  // stack copy (reached from Profile / the editor) stays separately routable.
  settingsTab: 'SettingsTab',
  // Profile now lives in the stack, reached from Settings → Profile.
  profile: 'Profile',
  // Project creation
  newProject: 'NewProjectStart',
  category: 'CategoryPick',
  starterIdeas: 'StarterIdeas',
  roomType: 'RoomType',
  dimensions: 'Dimensions',
  // AI design — a multi-step brief, then a generating screen that hands the
  // finished plan straight to the editor (there is no result screen).
  aiWizard: 'AiWizard',
  aiGenerating: 'AiGenerating',
  // Design
  editor: 'FloorPlanEditor',
  view3d: 'ThreeDView',
  catalog: 'Catalog',
  export: 'Export',
  estimate: 'Estimate',
  // Credits
  earnCredits: 'EarnCredits',
  paywall: 'Paywall',
  itemSheet: 'ItemPlacement',
  // Settings
  settings: 'Settings',
  help: 'HelpSupport',
  deleteAccount: 'DeleteAccount',
  offlineResources: 'OfflineResources',
};
