import * as tf from '@tensorflow/tfjs';
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';

class ModelLoader {
  // Hapus method static loadModel() yang tidak terpakai

  private static instance: ModelLoader | null = null;
  private model: tf.LayersModel | null = null;
  private isInitialized = false;

  private readonly labels = [
    'Powdery Mildew',
    'Blossom Blight',
    'Angular Leaf Spot',
    'Gray Mold',
    'Calcium Deficiency',
    'Leaf Spot'
  ];

  private constructor() {}

  static getInstance(): ModelLoader {
    if (!ModelLoader.instance) {
      ModelLoader.instance = new ModelLoader();
    }
    return ModelLoader.instance;
  }

  async loadModel(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      await tf.ready();
      console.log('TensorFlow.js ready');

      // Ganti path dan require sesuai multi-shard
      const modelJson = require('../../../assets/model/model.json');
      const modelWeights = [
        require('../../../assets/model/group1-shard1of3.bin'),
        require('../../../assets/model/group1-shard2of3.bin'),
        require('../../../assets/model/group1-shard3of3.bin'),
      ];

      console.log('modelJson:', modelJson);
      console.log('modelWeights:', modelWeights);

      this.model = await tf.loadLayersModel(bundleResourceIO(modelJson, modelWeights));
      this.isInitialized = true;
      console.log('Model successfully loaded through ModelLoader');
      return true;
    } catch (error) {
      console.error('Failed to load model:', error);
      this.isInitialized = false;
      return false;
    }
  }

  async predict(imageUri: string): Promise<any> {
    if (!this.model || !this.isInitialized) {
      throw new Error('Model not initialized');
    }
    // ...proses prediksi...
    const result = { label: "Powdery Mildew", confidence: 0.95, message: "Contoh hasil" }; // contoh
    console.log('Model predict result:', result);
    return { data: result };
  }
}

export default ModelLoader;