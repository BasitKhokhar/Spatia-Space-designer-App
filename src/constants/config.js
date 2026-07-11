export const APP_VERSION = '1.0.0';
export const BUILD_NUMBER = '100';

export const CREDITS = {
  starting: 12, // credits a new account begins with
  perAd: 1, // credits earned per rewarded ad
  dailyAdCap: 5, // max rewarded ads per day
  costs: {
    png: 2,
    pdf: 3,
    obj: 5,
  },
};

// Empty string = use the local-first stub. Set a URL to attach a real backend.
export const API_BASE_URL = process.env.API_BASE_URL || '';
