import { ROUTES } from './routes';

// Deep-linking configuration (scheme: homeplanner://).
export const linking = {
  prefixes: ['homeplanner://', 'https://homeplanner.app'],
  config: {
    screens: {
      [ROUTES.tabs]: {
        screens: {
          [ROUTES.home]: 'home',
          [ROUTES.explore]: 'explore',
          [ROUTES.projects]: 'projects',
          [ROUTES.profile]: 'profile',
        },
      },
      [ROUTES.editor]: 'project/:id/edit',
      [ROUTES.view3d]: 'project/:id/3d',
      [ROUTES.export]: 'project/:id/export',
      [ROUTES.earnCredits]: 'credits',
      [ROUTES.settings]: 'settings',
      [ROUTES.help]: 'help',
      [ROUTES.deleteAccount]: 'settings/delete',
    },
  },
};
