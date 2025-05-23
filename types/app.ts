export type AppMode = 'online' | 'offline';

export interface CachedPrediction {
  imageUri: string;
  prediction: PredictionResponse;
  timestamp: number;
}