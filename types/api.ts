export interface PredictionData {
  label: string;
  confidence: number;
  message?: string;
}

export interface PredictionResponse {
  data: PredictionData;
}