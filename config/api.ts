export const API_CONFIG = {
  development: 'http://4.195.16.233:8000',  // Your development IP
  production: 'YOUR_PRODUCTION_URL',          // Production URL (when ready)
};

export const API_URL = __DEV__ ? API_CONFIG.development : API_CONFIG.production;
export const PREDICT_ENDPOINT = `${API_URL}/predict`;