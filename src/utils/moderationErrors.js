// ---------------------------------------------------------------------------
// Turning a refusal from the AI safety gate into something a person can act on.
//
// The backend keeps three failures strictly apart and so must the UI, because
// the right response differs completely:
//
//   PROMPT_VIOLATION         your words broke a rule  -> explain which, let them edit
//   MODERATION_SERVICE_ERROR our checker was down     -> apologise, offer retry
//   AI_LOCKED                too many refusals        -> say when it lifts
//
// Showing the middle one as a policy violation would accuse users of things
// they did not do every time our dependency has a bad minute. That is the whole
// reason these are separated.
// ---------------------------------------------------------------------------

// OpenAI's raw category keys are internal jargon ("harassment/threatening",
// "illicit/violent") and must never reach a user. Anything unmapped falls back
// to a neutral phrase rather than leaking the key.
const POLICY_LABELS = {
  harassment: 'Harassment',
  'harassment/threatening': 'Threatening harassment',
  hate: 'Hateful content',
  'hate/threatening': 'Hateful threats',
  illicit: 'Illegal activity',
  'illicit/violent': 'Violent wrongdoing',
  'self-harm': 'Self-harm',
  'self-harm/intent': 'Self-harm',
  'self-harm/instructions': 'Self-harm',
  sexual: 'Sexual content',
  'sexual/minors': 'Sexual content involving minors',
  violence: 'Violence',
  'violence/graphic': 'Graphic violence',
};

export const policyLabel = (key) => POLICY_LABELS[key] || 'Restricted content';

// Human-readable names of everything flagged, de-duplicated: several raw
// categories routinely collapse to one label ("self-harm" three ways), and
// listing the same phrase three times reads like a bug.
export function violatedPolicies(categories) {
  if (!categories || typeof categories !== 'object') return [];
  const labels = Object.entries(categories)
    .filter(([key, flagged]) => flagged === true && key !== 'error')
    .map(([key]) => policyLabel(key));
  return [...new Set(labels)];
}

/**
 * Map an error thrown by `aiApi.start` to how the UI should present it.
 *
 * @returns {{
 *   type: 'violation' | 'locked' | 'toast' | 'passthrough',
 *   title: string, message: string,
 *   policies?: string[], fields?: Array<{field,label,categories}>,
 *   until?: string, retryable?: boolean,
 * }}
 * `passthrough` means this is not a moderation failure at all and the caller
 * should fall back to its existing error handling.
 */
export function describeModerationError(err) {
  const code = err?.code;
  const details = err?.details || {};

  if (code === 'PROMPT_VIOLATION') {
    const policies = violatedPolicies(details.categories);

    // Defensive: a violation carrying no genuinely flagged category means the
    // check itself misfired, not that the user wrote something prohibited.
    // Never render that as a definite accusation.
    if (!policies.length) {
      return {
        type: 'toast',
        title: 'Check unavailable',
        message: "We couldn't check your brief right now. Please try again in a moment.",
        retryable: true,
      };
    }

    return {
      type: 'violation',
      title: "This brief can't be used",
      message:
        err.message || 'Your design brief contains content that violates our safety policies.',
      policies,
      fields: Array.isArray(details.fields) ? details.fields : [],
      guidance:
        details.guidance ||
        'Please edit the highlighted answers and remove any unsafe or restricted content.',
      // Present when this refusal was the one that tripped a lockout.
      until: details.lockedUntil || null,
    };
  }

  if (code === 'AI_LOCKED') {
    return {
      type: 'locked',
      title: 'AI design is paused',
      message:
        err.message ||
        'AI design is temporarily unavailable on this account after repeated blocked requests.',
      until: details.until || null,
    };
  }

  if (code === 'MODERATION_SERVICE_ERROR') {
    return {
      type: 'toast',
      title: 'Check unavailable',
      message: err.message || "We couldn't check your brief right now. Please try again in a moment.",
      retryable: true,
    };
  }

  if (code === 'MODERATION_INVALID_INPUT') {
    return {
      type: 'toast',
      title: "Couldn't check your brief",
      message:
        err.message || 'Please simplify the text in your answers and try again.',
      retryable: false,
    };
  }

  return { type: 'passthrough', title: '', message: '' };
}

// "in about 22 hours" / "shortly" — a lockout expiry the user can reason about
// without doing date arithmetic.
export function describeLockExpiry(until) {
  if (!until) return null;
  const ms = new Date(until).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;

  const hours = Math.round(ms / 3600000);
  if (hours >= 1) return `You can try again in about ${hours} ${hours === 1 ? 'hour' : 'hours'}.`;
  const minutes = Math.max(1, Math.round(ms / 60000));
  return `You can try again in about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`;
}
