import { Platform } from 'react-native';
import {
  ENVIRONMENT,
  API_URL_DEV,
  API_URL_STAGING,
  API_URL_PROD,
  API_URL_DEVICE,
  API_PREDICT_ENDPOINT
} from '@env';

// Default values sebagai fallback
const DEFAULT_API_URL = 'http://127.0.0.1:8000';
const DEFAULT_API_ENDPOINT = 'predict';

// Function untuk mendapatkan base URL berdasarkan environment
const getBaseUrl = (): string => {
  // Untuk physical device, gunakan IP address khusus
  if (Platform.OS !== 'web') {
    return API_URL_DEVICE || DEFAULT_API_URL;
  }

  // Untuk web atau development di emulator
  switch (ENVIRONMENT) {
    case 'production':
      return API_URL_PROD || DEFAULT_API_URL;
    case 'staging':
      return API_URL_STAGING || DEFAULT_API_URL;
    case 'development':
    default:
      return API_URL_DEV || DEFAULT_API_URL;
  }
};

// Konfigurasi API
export const apiConfig = {
  baseUrl: getBaseUrl(),
  endpoints: {
    predict: API_PREDICT_ENDPOINT || DEFAULT_API_ENDPOINT
  },
  // Helper method untuk membangun URL lengkap
  getFullUrl: (endpoint: string): string => {
    return `${getBaseUrl()}/${endpoint}`;
  }
};

// Log konfigurasi untuk debugging (hapus di produksi)
console.log('Current API URL:', apiConfig.baseUrl);