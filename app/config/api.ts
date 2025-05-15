export const API_CONFIG = {
  baseUrl: 'http://192.168.53.97:8000',
  endpoints: {
    predict: '/predict'
  }
};

export const PREDICT_URL = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.predict}`;