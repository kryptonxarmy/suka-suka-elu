import AsyncStorage from '@react-native-async-storage/async-storage';
import { CachedPrediction } from '../types/app';

export const StorageKeys = {
  CACHED_PREDICTIONS: 'cached_predictions',
  APP_MODE: 'app_mode'
};

export const storePrediction = async (prediction: CachedPrediction) => {
  try {
    const existing = await AsyncStorage.getItem(StorageKeys.CACHED_PREDICTIONS);
    const predictions = existing ? JSON.parse(existing) : [];
    predictions.push(prediction);
    await AsyncStorage.setItem(StorageKeys.CACHED_PREDICTIONS, JSON.stringify(predictions));
  } catch (error) {
    console.error('Error storing prediction:', error);
  }
};

export const getCachedPredictions = async (): Promise<CachedPrediction[]> => {
  try {
    const data = await AsyncStorage.getItem(StorageKeys.CACHED_PREDICTIONS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting cached predictions:', error);
    return [];
  }
};