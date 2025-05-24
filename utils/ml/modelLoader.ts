import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-react-native";
import { bundleResourceIO } from "@tensorflow/tfjs-react-native";

export class ModelLoader {
  private static instance: ModelLoader | null = null;
  private model: tf.LayersModel | null = null;
  private isInitialized = false;

  private readonly labels = [
    "Powdery Mildew",
    "Blossom Blight",
    "Angular Leaf Spot",
    "Gray Mold",
    "Calcium Deficiency",
    "Leaf Spot",
  ];

  private constructor() {}

  public static getInstance(): ModelLoader {
    if (!ModelLoader.instance) {
      ModelLoader.instance = new ModelLoader();
    }
    return ModelLoader.instance;
  }

  async loadModel(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await tf.ready();
      console.log("TensorFlow.js ready");

      const modelJson = require("../../assets/model/model.json");
      const modelWeights = require("../../assets/model/weights.bin");

      this.model = await tf.loadLayersModel(
        bundleResourceIO(modelJson, modelWeights)
      );
      this.isInitialized = true;
      console.log("Model loaded successfully");
    } catch (error) {
      console.error("Failed to load model:", error);
      throw error;
    }
  }

  async predict(imageUri: string): Promise<{
    data: {
      label: string;
      confidence: number;
      message: string;
    };
  }> {
    if (!this.model || !this.isInitialized) {
      throw new Error("Model not initialized");
    }

    try {
      // TODO: Implement actual prediction logic
      // For now, return a mock prediction
      const randomIndex = Math.floor(Math.random() * this.labels.length);
      const confidence = Math.random() * 100;

      return {
        data: {
          label: this.labels[randomIndex],
          confidence,
          message: `${confidence.toFixed(1)}% kemungkinan ${
            this.labels[randomIndex]
          }`,
        },
      };
    } catch (error) {
      console.error("Prediction failed:", error);
      throw error;
    }
  }
}

export default ModelLoader;
