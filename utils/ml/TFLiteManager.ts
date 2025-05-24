import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-react-native";
import * as FileSystem from "expo-file-system";
import { bundleResourceIO, decodeJpeg } from "@tensorflow/tfjs-react-native";

interface PredictionResponse {
  data: {
    label: string;
    confidence: number;
    message: string;
  };
}

export class TFLiteManager {
  private static instance: TFLiteManager;
  private model: tf.GraphModel | null = null;
  private modelPath: string;

  private constructor() {
    this.modelPath = `${FileSystem.documentDirectory}model/model.tflite`;
  }

  static getInstance(): TFLiteManager {
    if (!TFLiteManager.instance) {
      TFLiteManager.instance = new TFLiteManager();
    }
    return TFLiteManager.instance;
  }

  async loadModel(): Promise<void> {
    try {
      await tf.ready();
      console.log("TensorFlow.js siap");

      // Load model dari assets
      const modelJson = require("../../assets/model/model.json");
      const modelWeights = require("../../assets/model/weights.bin");

      this.model = await tf.loadGraphModel(
        bundleResourceIO(modelJson, modelWeights)
      );
      console.log("Model TFLite berhasil dimuat");
    } catch (error) {
      console.error("Gagal memuat model:", error);
      throw error;
    }
  }

  private async preprocessImage(uri: string): Promise<tf.Tensor3D> {
    try {
      // Baca file gambar
      const imgB64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Decode image
      const imgBuffer = tf.util.encodeString(imgB64, "base64").buffer;
      const raw = new Uint8Array(imgBuffer);
      const imageTensor = decodeJpeg(raw) as tf.Tensor3D;

      // Resize ke 224x224 (sesuaikan dengan input model)
      const resized = tf.image.resizeBilinear(
        imageTensor,
        [224, 224]
      ) as tf.Tensor3D;

      // Normalisasi nilai pixel
      const normalized = resized.div(255.0) as tf.Tensor3D;

      // Cleanup
      imageTensor.dispose();
      resized.dispose();

      return normalized;
    } catch (error) {
      console.error("Preprocessing gambar gagal:", error);
      throw error;
    }
  }

  private readonly labels = [
    "Powdery Mildew",
    "Blossom Blight",
    "Angular Leaf Spot",
    "Gray Mold",
    "Calcium Deficiency",
    "Leaf Spot",
  ];

  async predict(imageUri: string): Promise<PredictionResponse> {
    if (!this.model) {
      throw new Error("Model belum dimuat");
    }

    try {
      // Preprocess image
      const tensor = await this.preprocessImage(imageUri);

      // Add batch dimension
      const batched = tensor.expandDims(0);

      // Predict
      const predictions = (await this.model.predict(batched)) as tf.Tensor;
      const scores = await predictions.data();

      // Get hasil dengan confidence tertinggi
      const maxIndex = scores.indexOf(Math.max(...Array.from(scores)));
      const confidence = scores[maxIndex] * 100;
      const label = this.labels[maxIndex];

      // Cleanup
      tensor.dispose();
      batched.dispose();
      predictions.dispose();

      return {
        data: {
          label,
          confidence,
          message: `${confidence.toFixed(1)}% kemungkinan ${label}`,
        },
      };
    } catch (error) {
      console.error("Prediksi gagal:", error);
      throw error;
    }
  }
}
