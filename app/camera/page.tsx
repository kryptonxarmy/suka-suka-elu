import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  Button,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import axios from "axios";
import Webcam from "react-webcam";
import { PREDICT_URL } from "../config/api";
import { useRouter } from "expo-router";
import * as Network from "@react-native-community/netinfo";
import ModelLoader from "../../utils/ml/modelLoader";

// Define types for API response
interface PredictionResponse {
  data: {
    label: string;
    confidence: number;
    message: string;
  };
}

// Update the FileInfo interface
interface FileInfo {
  exists: boolean;
  uri: string;
  isDirectory: boolean;
  size?: number; // Make size optional since it's not always available
}

// Add compression options type
interface CompressionOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
}

interface CachedPrediction {
  imageUri: string;
  prediction: PredictionResponse;
  timestamp: number;
}

// Add AppMode type
type AppMode = "online" | "offline";

// Update the compressImage function to handle optional size
const compressImage = async (uri: string, options: CompressionOptions) => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: options.maxWidth, height: options.maxHeight } }],
      { compress: options.quality, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Get file info with size parameter
    const fileInfo = await FileSystem.getInfoAsync(result.uri, { size: true });

    console.log("Compressed image:", {
      originalUri: uri,
      compressedUri: result.uri,
      size: fileInfo.exists && "size" in fileInfo ? fileInfo.size : "unknown",
    });

    return result.uri;
  } catch (error) {
    console.error("Kompresi gambar gagal:", error);
    throw error;
  }
};

const storePrediction = async (
  predictionData: CachedPrediction
): Promise<void> => {
  try {
    const cacheDir = `${FileSystem.documentDirectory}predictions/`;
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);

    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
    }
    const filename = `prediction_${predictionData.timestamp}.json`;
    const filePath = `${cacheDir}${filename}`;

    await FileSystem.writeAsStringAsync(
      filePath,
      JSON.stringify(predictionData),
      { encoding: FileSystem.EncodingType.UTF8 }
    );

    console.log("Prediction cached successfully:", filePath);
  } catch (error) {
    console.error("Failed to cache prediction:", error);
  }
};

const getCachedPredictions = async (): Promise<CachedPrediction[]> => {
  try {
    const cacheDir = `${FileSystem.documentDirectory}predictions/`;
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);

    if (!dirInfo.exists) {
      return [];
    }

    const files = await FileSystem.readDirectoryAsync(cacheDir);
    const predictions: CachedPrediction[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        const filePath = `${cacheDir}${file}`;
        const content = await FileSystem.readAsStringAsync(filePath);
        const prediction = JSON.parse(content) as CachedPrediction;
        predictions.push(prediction);
      }
    }

    return predictions.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("Failed to get cached predictions:", error);
    return [];
  }
};

export default function CameraPage() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] =
    MediaLibrary.usePermissions();

  const [cameraRef, setCameraRef] = useState<any>(null);
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<keyof typeof diseaseInfo | null>(
    null
  );
  const webcamRef = useRef<Webcam>(null);
  const [facing, setFacing] = useState<CameraType>("back");
  const [cameraHeight, setCameraHeight] = useState<number>(0);
  const [showResult, setShowResult] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>("online");
  const [isOnline, setIsOnline] = useState(true);
  const [isModelReady, setIsModelReady] = useState(false);

  // Add new states
  const [modelStatus, setModelStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [predictionTime, setPredictionTime] = useState<number>(0);

  const diseaseInfo = {
    "Powdery Mildew": {
      title: "Powdery Mildew",
      description:
        "Disebabkan oleh jamur 'Podosphaera aphanis', muncul sebagai lapisan putih seperti bedak pada daun. Menyukai kondisi hangat dan lembap.",
      solution:
        "Gunakan fungisida sulfur atau kalium bikarbonat. Tingkatkan sirkulasi udara. Hindari penyiraman malam hari.",
    },
    "Blossom Blight": {
      title: "Blossom Blight",
      description:
        "Disebabkan oleh 'Botrytis cinerea', menyerang bunga saat cuaca lembap. Bunga berubah coklat dan layu.",
      solution:
        "Buang bunga yang terinfeksi. Gunakan fungisida seperti klorotalonil. Jaga jarak antar tanaman dan drainase.",
    },
    "Angular Leaf Spot": {
      title: "Angular Leaf Spot",
      description:
        "Disebabkan oleh 'Xanthomonas fragariae'. Gejala berupa bercak bening berbentuk sudut pada daun.",
      solution:
        "Gunakan bibit sehat. Semprot dengan fungisida tembaga. Kurangi kelembapan dengan irigasi tetes.",
    },
    "Gray Mold": {
      title: "Gray Mold",
      description:
        "Disebabkan oleh 'Botrytis cinerea', menyebabkan lapisan abu-abu berbulu pada buah dan bunga.",
      solution:
        "Pangkas bagian terinfeksi. Gunakan fungisida sebelum berbunga. Jaga agar buah tidak menyentuh tanah.",
    },
    "Calcium Deficiency": {
      title: "Calcium Deficiency",
      description:
        "Daun muda menunjukkan gejala 'tip burn'. Kekurangan kalsium karena transpor terganggu saat kelembapan tinggi.",
      solution:
        "Aplikasikan pupuk kalsium cair. Perbaiki drainase dan ventilasi. Hindari pupuk nitrogen berlebih.",
    },
    "Leaf Spot": {
      title: "Leaf Spot",
      description:
        "Disebabkan oleh 'Mycosphaerella fragariae', menimbulkan bercak ungu di daun dan menghambat fotosintesis.",
      solution:
        "Buang daun terinfeksi. Gunakan fungisida seperti mancozeb. Lakukan rotasi tanaman dan sanitasi rutin.",
    },
  } as const;

  useEffect(() => {
    if (Platform.OS !== "web" && !mediaPermission?.granted) {
      requestMediaPermission();
    }
  }, [mediaPermission]);

  // Update useEffect for network monitoring
  useEffect(() => {
    const unsubscribe = Network.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });

    // Initial network check
    Network.fetch().then((state) => {
      setIsOnline(state.isConnected ?? false);
    });

    // Cleanup subscription
    return () => {
      unsubscribe();
    };
  }, []);

  // Update model initialization
  useEffect(() => {
    const initModel = async () => {
      try {
        setModelStatus("loading");
        const modelLoaderInstance = ModelLoader.getInstance();
        await modelLoaderInstance.loadModel();
        setModelStatus("ready");
        setIsModelReady(true);
      } catch (error) {
        console.error("Model initialization failed:", error);
        setModelStatus("error");
        Alert.alert(
          "Error",
          "Gagal memuat model offline. Mode offline tidak tersedia."
        );
      }
    };

    initModel();
  }, []);

  const saveImageToPermanentStorage = async (uri: string): Promise<string> => {
    try {
      if (!uri) throw new Error("URI gambar tidak valid");

      const timestamp = Date.now();
      const filename = `berryware-${timestamp}.jpg`;
      const permanentUri = `${FileSystem.documentDirectory}${filename}`;

      const sourceExists = await FileSystem.getInfoAsync(uri);
      if (!sourceExists.exists) {
        throw new Error("File sumber tidak ditemukan");
      }

      await FileSystem.copyAsync({
        from: uri,
        to: permanentUri,
      });

      const saved = await FileSystem.getInfoAsync(permanentUri);
      if (!saved.exists) {
        throw new Error("Gagal menyimpan file");
      }

      return permanentUri;
    } catch (error) {
      console.error("Error saat menyimpan gambar:", error);
      throw new Error("Gagal menyimpan gambar ke penyimpanan permanen");
    }
  };

  const handlePredictionResult = async (
    result: PredictionResponse,
    imageUri: string
  ): Promise<void> => {
    try {
      const permanentUri = await saveImageToPermanentStorage(imageUri);

      const { label, confidence, message } = result.data;
      if (!label) throw new Error("Hasil prediksi tidak valid");

      router.push({
        pathname: "/Resultscreen/result",
        params: {
          prediction: encodeURIComponent(label),
          confidence: confidence.toString(),
          imageUri: encodeURIComponent(permanentUri),
          message: message || `${confidence}% kemungkinan ${label}`,
        },
      });
    } catch (error) {
      throw new Error("Gagal memproses hasil prediksi");
    }
  };

  const takePicture = async () => {
    if (Platform.OS === "web") {
      if (webcamRef.current) {
        const imageSrc = webcamRef.current.getScreenshot();
        setImage(imageSrc);
      }
    } else if (cameraRef) {
      try {
        const photo = await cameraRef.takePictureAsync();
        setImage(photo.uri);
      } catch (error) {
        console.error("Error taking picture:", error);
        Alert.alert("Error", "Gagal mengambil foto");
      }
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // Update the validateImage function
  const validateImage = async (uri: string) => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
      console.log("Validating image:", { uri, fileInfo });

      if (!fileInfo.exists) {
        throw new Error("File tidak ditemukan");
      }

      if (!("size" in fileInfo) || typeof fileInfo.size !== "number") {
        console.warn("Tidak dapat membaca ukuran file");
        return true; // Proceed with caution
      }

      const sizeMB = fileInfo.size / (1024 * 1024);
      console.log(`File size: ${sizeMB.toFixed(2)} MB`);

      if (sizeMB > 5) {
        return false; // Needs compression
      }

      return true;
    } catch (error) {
      console.error("Validasi gambar gagal:", error);
      throw error;
    }
  };

  const uploadImage = async (): Promise<void> => {
    if (!image) {
      Alert.alert("Error", "Silakan ambil foto terlebih dahulu");
      return;
    }

    setIsLoading(true);

    try {
      let processedImage = image;
      const isValid = await validateImage(image);

      if (!isValid) {
        processedImage = await compressImage(image, {
          maxWidth: 1024,
          maxHeight: 1024,
          quality: 0.7,
        });
      }

      if (appMode === "online" && isOnline) {
        // Online mode
        const formData = new FormData();
        formData.append("image", {
          uri: processedImage,
          type: "image/jpeg",
          name: "image.jpg",
        } as any);

        const response = await axios.post(PREDICT_URL, formData, {
          headers: {
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
          timeout: 15000,
        });

        if (!response.data?.data?.label) {
          throw new Error("Format response tidak valid");
        }

        // Cache prediction for offline use
        // await storePrediction({
        //   imageUri: processedImage,
        //   prediction: response.data,
        //   timestamp: Date.now()
        // });

        await handlePredictionResult(response.data, processedImage);

        await handlePredictionResult(response.data, processedImage);
      } else {
        // Offline mode - use ML model locally
        const prediction = await performLocalPrediction(processedImage);
        await handlePredictionResult(prediction, processedImage);
      }
    } catch (error) {
      console.error("Upload error:", {
        message: error instanceof Error ? error.message : "Unknown error",
        mode: appMode,
        isOnline,
      });

      let message =
        appMode === "online" && !isOnline
          ? "Tidak ada koneksi internet. Gunakan mode offline?"
          : "Tidak dapat memproses gambar";

      Alert.alert(
        "Gagal",
        message,
        appMode === "online" && !isOnline
          ? [
              {
                text: "Mode Offline",
                onPress: () => setAppMode("offline"),
              },
              {
                text: "Coba Lagi",
                style: "cancel",
              },
            ]
          : undefined
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Update performLocalPrediction
  const performLocalPrediction = async (
    imageUri: string
  ): Promise<PredictionResponse> => {
    if (!isModelReady) {
      throw new Error("Model not ready");
    }

    const startTime = Date.now();
    const modelLoaderInstance = ModelLoader.getInstance();
    const result = await modelLoaderInstance.predict(imageUri);
    setPredictionTime(Date.now() - startTime);

    return result;
  };

  const resetCamera = () => {
    setImage(null);
    setPrediction(null);
    setShowResult(false);
  };

  const renderModeToggle = () => (
    <TouchableOpacity
      style={styles.modeToggle}
      onPress={() =>
        setAppMode((current) => (current === "online" ? "offline" : "online"))
      }
    >
      <Text style={styles.modeText}>
        Mode: {appMode === "online" ? "🌐 Online" : "💾 Offline"}
      </Text>
    </TouchableOpacity>
  );

  const renderModelStatus = () => (
    <View style={styles.modelStatus}>
      <Text style={styles.modelStatusText}>
        Model:{" "}
        {modelStatus === "loading"
          ? "⏳ Loading..."
          : modelStatus === "ready"
          ? "✅ Ready"
          : "❌ Error"}
      </Text>
      {predictionTime > 0 && (
        <Text style={styles.predictionTimeText}>
          Waktu prediksi: {predictionTime.toFixed(2)}ms
        </Text>
      )}
    </View>
  );

  if (showResult && image && prediction) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.resultContainer}>
          <TouchableOpacity
            onPress={resetCamera}
            style={styles.modernBackButton}
          >
            <Text style={styles.modernBackArrow}>←</Text>
          </TouchableOpacity>

          <Text style={styles.header}>Hasil Deteksi</Text>

          <View style={styles.imageContainer}>
            <Image
              source={{ uri: image }}
              style={styles.resultImage}
              resizeMode="cover"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.diseaseTitle}>
              {diseaseInfo[prediction]?.title || prediction}
            </Text>
            <Text style={styles.description}>
              {diseaseInfo[prediction as keyof typeof diseaseInfo]
                ?.description || "Deskripsi tidak tersedia."}
            </Text>
            <Text style={styles.solutionHeader}>Solusi:</Text>
            <Text style={styles.solution}>
              {diseaseInfo[prediction]?.solution || "Solusi belum tersedia."}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.newScanButton]}
            onPress={resetCamera}
          >
            <Text style={styles.text}>Scan Ulang</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  if (Platform.OS === "web") {
    return (
      <View style={styles.container}>
        {!image ? (
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            style={styles.camera}
          />
        ) : (
          <Image source={{ uri: image }} style={styles.preview} />
        )}

        <View style={styles.predictionContainer}>
          {prediction && (
            <View style={styles.predictionBox}>
              <Text style={styles.predictionText}>Hasil Prediksi:</Text>
              <Text style={styles.predictionContent}>{prediction}</Text>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          {image ? (
            <>
              <TouchableOpacity
                style={styles.button}
                onPress={uploadImage}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.text}>Prediksi</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.secondary]}
                onPress={() => setImage(null)}
              >
                <Text style={styles.secondaryText}>Ambil Lagi</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.button} onPress={takePicture}>
                <Text style={styles.text}>Ambil Foto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.secondary]}
                onPress={pickImage}
              >
                <Text style={styles.secondaryText}>Pilih dari Galeri</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.centeredContainer}>
        <Text>Memeriksa izin...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.message}>
          Kami membutuhkan izin untuk mengakses kamera
        </Text>
        <Button onPress={requestPermission} title="Berikan Izin" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!image ? (
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.fullCamera}
            facing={facing}
            ref={(ref) => setCameraRef(ref)}
          >
            <TouchableOpacity
              style={styles.modernBackButton}
              onPress={() => router.back()}
            >
              <Text style={styles.modernBackArrow}>←</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.flipButton}
              onPress={toggleCameraFacing}
            >
              <Text style={styles.flipText}>🔄</Text>
            </TouchableOpacity>
          </CameraView>
        </View>
      ) : (
        <Image source={{ uri: image }} style={styles.fullPreview} />
      )}

      {renderModeToggle()}
      {renderModelStatus()}

      <View style={styles.captureButtonContainer}>
        {!image ? (
          <TouchableOpacity
            onPress={takePicture}
            style={styles.captureButton}
          />
        ) : (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={uploadImage}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.text}>Prediksi</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.secondary]}
              onPress={() => setImage(null)}
            >
              <Text style={styles.secondaryText}>Ambil Lagi</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  backArrow: {
    fontSize: 24,
    color: "#8B0000",
    fontWeight: "bold",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  message: {
    textAlign: "center",
    marginBottom: 20,
    fontSize: 16,
  },
  camera: {
    flex: 1,
  },
  preview: {
    flex: 1,
    resizeMode: "contain",
  },
  cameraContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  fullCamera: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  fullPreview: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    resizeMode: "cover",
  },
  flipButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 12,
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonContainer: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    alignItems: "center",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderWidth: 4,
    borderColor: "white",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: 20,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    padding: 20,
  },
  button: {
    backgroundColor: "#8AA75A",
    padding: 15,
    borderRadius: 5,
    width: "45%",
    alignItems: "center",
  },
  secondary: {
    backgroundColor: "#F5F5DC",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryText: {
    color: "#6B4F4F",
    fontSize: 16,
    fontWeight: "bold",
  },
  predictionContainer: {
    position: "absolute",
    top: 20,
    width: "100%",
    alignItems: "center",
  },
  predictionBox: {
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 10,
    padding: 15,
    width: "90%",
    maxHeight: 200,
  },
  predictionText: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  predictionContent: {
    fontSize: 14,
  },
  flipText: {
    color: "white",
    fontSize: 20,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#FAF0E6",
  },
  resultContainer: {
    flex: 1,
    backgroundColor: "#FAF0E6",
    padding: 20,
  },
  header: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#8B0000",
    textAlign: "center",
    marginVertical: 10,
  },
  imageContainer: {
    padding: 2,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#8B0000",
    overflow: "hidden",
    marginVertical: 20,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minHeight: 300,
  },
  resultImage: {
    width: "100%",
    height: 300,
    borderRadius: 23,
  },
  card: {
    backgroundColor: "#F5F5DC",
    borderRadius: 15,
    padding: 20,
    elevation: 4,
    marginBottom: 20,
  },
  diseaseTitle: {
    backgroundColor: "#A9C57D",
    padding: 10,
    borderRadius: 10,
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    marginBottom: 10,
    lineHeight: 22,
  },
  solutionHeader: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 5,
  },
  solution: {
    fontSize: 16,
    lineHeight: 22,
  },
  newScanButton: {
    backgroundColor: "#8AA75A",
    marginTop: 20,
    marginBottom: 30,
    width: "100%",
  },
  modernBackButton: {
    position: "absolute",
    width: 40,
    height: 40,
    top: 10,
    left: 20,
    zIndex: 10,
    backgroundColor: "#F5F5DC",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modernBackArrow: {
    fontSize: 24,
    color: "#8B0000",
    fontWeight: "600",
    marginTop: -7,
  },
  modeToggle: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 8,
    borderRadius: 8,
  },
  modeText: {
    color: "#fff",
    fontSize: 14,
  },
  modelStatus: {
    position: "absolute",

    top: 60,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 8,
    borderRadius: 8,
  },
  modelStatusText: {
    color: "#fff",
    fontSize: 12,
  },
  predictionTimeText: {
    color: "#fff",
    fontSize: 10,
    marginTop: 4,
  },
});

interface PredictionResult {
  confidence: number;
  label: string;
  message: string;
}
