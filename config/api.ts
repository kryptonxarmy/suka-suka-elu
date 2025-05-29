export const API_CONFIG = {
  development: 'http://4.195.16.233:8000',
  production: 'YOUR_PRODUCTION_URL',
};

export const API_URL = __DEV__ ? API_CONFIG.development : API_CONFIG.production;
export const PREDICT_URL = `${API_URL}/predict`;

export default { PREDICT_URL };
