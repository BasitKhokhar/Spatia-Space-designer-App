// Named interstitial placements. A placement is a *moment*, not a screen: each
// one marks a point where the user just finished something and is between
// tasks, which is the only kind of moment a full-screen ad belongs in.
export const PLACEMENT = {
  projectCreated: 'project_created',
  designOpened: 'design_opened',
  estimateSaved: 'estimate_saved',
};

// Placements fire just after navigating into a screen that is otherwise
// ad-blocked, so the gate would suppress them on the destination route. This
// allowlist answers the question that actually matters — "may an ad show *over*
// this screen at the instant it opens?" — which is yes for a freshly mounted,
// idle editor, and no once the user has started drawing.
export const INTERSTITIAL_ALLOWED_OVER = {
  [PLACEMENT.projectCreated]: ['FloorPlanEditor'],
  [PLACEMENT.designOpened]: ['FloorPlanEditor'],
  [PLACEMENT.estimateSaved]: ['Tabs', 'FloorPlanEditor'],
};
