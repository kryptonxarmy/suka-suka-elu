export const API_CONFIG = {
  baseUrl: 'http://4.195.16.233:8000',
  endpoints: {
    predict: '/predict'
  }
};

export const PREDICT_URL = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.predict}`;

const api = {
  PREDICT_URL,
};

export default api;