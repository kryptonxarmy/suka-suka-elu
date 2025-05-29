import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Platform, Alert, Button } from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import axios from "axios";
import api from '../config/api';
const url = api.PREDICT_URL;
import { useRouter } from 'expo-router';
import * as Network from '@react-native-community/netinfo';
import ModelLoader from '../utils/ml/ModelLoader';
import { LoadingOverlay } from '../components/LoadingOverlay';
import Webcam from "react-webcam";
import { Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// --- Types ---
interface PredictionResponse {
  label: string;
  confidence: number;
  message: string;
}
interface FileInfo {
  exists: boolean;
  uri: string;
  isDirectory: boolean;
  size?: number;
  modificationTime?: number;
}
interface CompressionOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
}
type AppMode = 'online' | 'offline';

// --- Util ---
const compressImage = async (uri: string, options: CompressionOptions): Promise<string> => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: options.maxWidth, height: options.maxHeight } }],
      { compress: options.quality, format: ImageManipulator.SaveFormat.JPEG }
    );
    const fileInfo = await FileSystem.getInfoAsync(result.uri, { size: true }) as FileInfo;
    console.log('Compressed image:', {
      originalUri: uri,
      compressedUri: result.uri,
      size: fileInfo.exists && fileInfo.size !== undefined ? fileInfo.size : 'unknown'
    });
    return result.uri;
  } catch (error) {
    console.error('Kompresi gambar gagal:', error);
    throw error;
  }
};

// --- Main Component ---
export default function CameraPage() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<keyof typeof diseaseInfo | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const [facing, setFacing] = useState<CameraType>("back");
  const [appMode, setAppMode] = useState<AppMode>('online');
  const [isOnline, setIsOnline] = useState(true);
  const [isModelReady, setIsModelReady] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [modelStatus, setModelStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [predictionTime, setPredictionTime] = useState<number>(0);
  const [fallbackToOnline, setFallbackToOnline] = useState(false);

  const switchTranslateX = useRef(new Animated.Value(appMode === 'online' ? 28 : 0)).current;

  const diseaseInfo = {
    "Powdery Mildew": {
      title: "Powdery Mildew",
      description: "Disebabkan oleh jamur 'Podosphaera aphanis', muncul sebagai lapisan putih seperti bedak pada daun. Menyukai kondisi hangat dan lembap.",
      solution: "Gunakan fungisida sulfur atau kalium bikarbonat. Tingkatkan sirkulasi udara. Hindari penyiraman malam hari.",
    },
    "Blossom Blight": {
      title: "Blossom Blight",
      description: "Disebabkan oleh 'Botrytis cinerea', menyerang bunga saat cuaca lembap. Bunga berubah coklat dan layu.",
      solution: "Buang bunga yang terinfeksi. Gunakan fungisida seperti klorotalonil. Jaga jarak antar tanaman dan drainase.",
    },
    "Angular Leaf Spot": {
      title: "Angular Leaf Spot",
      description: "Disebabkan oleh 'Xanthomonas fragariae'. Gejala berupa bercak bening berbentuk sudut pada daun.",
      solution: "Gunakan bibit sehat. Semprot dengan fungisida tembaga. Kurangi kelembapan dengan irigasi tetes.",
    },
    "Gray Mold": {
      title: "Gray Mold",
      description: "Disebabkan oleh 'Botrytis cinerea', menyebabkan lapisan abu-abu berbulu pada buah dan bunga.",
      solution: "Pangkas bagian terinfeksi. Gunakan fungisida sebelum berbunga. Jaga agar buah tidak menyentuh tanah.",
    },
    "Calcium Deficiency": {
      title: "Calcium Deficiency",
      description: "Daun muda menunjukkan gejala 'tip burn'. Kekurangan kalsium karena transpor terganggu saat kelembapan tinggi.",
      solution: "Aplikasikan pupuk kalsium cair. Perbaiki drainase dan ventilasi. Hindari pupuk nitrogen berlebih.",
    },
    "Leaf Spot": {
      title: "Leaf Spot",
      description: "Disebabkan oleh 'Mycosphaerella fragariae', menimbulkan bercak ungu di daun dan menghambat fotosintesis.",
      solution: "Buang daun terinfeksi. Gunakan fungisida seperti mancozeb. Lakukan rotasi tanaman dan sanitasi rutin.",
    },
  } as const;

  useEffect(() => {
    if (Platform.OS !== "web" && !mediaPermission?.granted) {
      requestMediaPermission();
    }
  }, [mediaPermission]);

  useEffect(() => {
    const unsubscribe = Network.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });
    Network.fetch().then(state => {
      setIsOnline(state.isConnected ?? false);
    });
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    const initModel = async () => {
      try {
        setModelStatus('loading');
        const loader = ModelLoader.getInstance();
        const success = await loader.loadModel();
        if (!success) throw new Error('Model initialization failed');
        setModelStatus('ready');
        setIsModelReady(true);
      } catch (error) {
        console.error('Model initialization failed:', error);
        setModelStatus('error');
        setFallbackToOnline(true);
        if (appMode === 'offline') {
          Alert.alert(
            'Mode Offline Tidak Tersedia',
            'Model offline gagal dimuat. Beralih ke mode online.',
            [{ text: 'OK', onPress: () => setAppMode('online') }]
          );
        }
      }
    };
    initModel();
  }, []);

  useEffect(() => {
    Animated.spring(switchTranslateX, {
      toValue: appMode === 'online' ? 28 : 0, // 28 = width track - width knob - 2*padding
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  }, [appMode]);

  const saveImageToPermanentStorage = async (uri: string): Promise<string> => {
    try {
      if (!uri) throw new Error('URI gambar tidak valid');
      const timestamp = Date.now();
      const filename = `berrycare-${timestamp}.jpg`;
      const permanentUri = `${FileSystem.documentDirectory}${filename}`;
      const sourceExists = await FileSystem.getInfoAsync(uri) as FileInfo;
      if (!sourceExists.exists) throw new Error(`File sumber tidak ditemukan di URI: ${uri}`);
      await FileSystem.copyAsync({ from: uri, to: permanentUri });
      const saved = await FileSystem.getInfoAsync(permanentUri) as FileInfo;
      if (!saved.exists) throw new Error('Gagal menyimpan file ke penyimpanan permanen');
      console.log('Image saved to permanent storage:', permanentUri);
      return permanentUri;
    } catch (error) {
      console.error('Error saat menyimpan gambar:', error);
      throw new Error(`Gagal menyimpan gambar ke penyimpanan permanen: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handlePredictionResult = async (
    result: PredictionResponse,
    imageUriToSave: string
  ): Promise<void> => {
    try {
      const permanentUri = await saveImageToPermanentStorage(imageUriToSave);
      const { label, confidence, message } = result;
      console.log('handlePredictionResult (flat structure processing):', { label, confidence, message, permanentUri });
      if (!label || typeof label !== 'string' || label.trim() === '') {
        Alert.alert("Error Data Navigasi", "Informasi label tidak cukup untuk menampilkan hasil.");
        setIsLoading(false);
        return;
      }
      router.push({
        pathname: "/Resultscreen/result",
        params: {
          prediction: encodeURIComponent(label),
          confidence: confidence.toString(),
          imageUri: encodeURIComponent(permanentUri),
          message: message || `${confidence}% kemungkinan ${label}`
        }
      });
    } catch (error: any) {
      console.error('Error in handlePredictionResult:', error);
      setIsLoading(false);
      Alert.alert("Error Saat Memproses Hasil", error.message || "Terjadi kesalahan saat menyiapkan data hasil untuk ditampilkan.");
    }
  };

  const takePicture = async () => {
    if (Platform.OS === "web") {
      if (webcamRef.current) {
        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) setImage(imageSrc);
        else Alert.alert("Error", "Gagal mengambil screenshot dari webcam.");
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
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  const validateImage = async (uri: string): Promise<boolean> => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri, { size: true }) as FileInfo;
      console.log('Validating image:', { uri, fileInfo });
      if (!fileInfo.exists) throw new Error('File tidak ditemukan');
      if (fileInfo.size === undefined) {
        console.warn('Tidak dapat membaca ukuran file, validasi dilanjutkan dengan hati-hati.');
        return true;
      }
      const sizeMB = fileInfo.size / (1024 * 1024);
      console.log(`File size: ${sizeMB.toFixed(2)} MB`);
      return sizeMB <= 5;
    } catch (error) {
      console.error('Validasi gambar gagal:', error);
      throw error;
    }
  };

  interface UploadOptions {
    onProgress?: (progress: number) => void;
    timeout?: number;
  }

  const uploadImage = async (imageUri: string, options: UploadOptions = {}): Promise<PredictionResponse> => {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'image.jpg'
    } as any);
    try {
      console.log('Starting upload to:', url);
      const response = await axios.post<PredictionResponse>(url, formData, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
        timeout: options.timeout || 30000,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            options.onProgress?.(progress);
          } else {
            options.onProgress?.(progressEvent.loaded > 0 ? 50 : 0);
          }
        },
      });
      console.log('Upload successful:', response.status);
      console.log('Raw Server Response Data:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Upload failed (Axios Error):', error.response?.data || error.message);
        if (error.code === 'ECONNABORTED') {
          throw new Error('Waktu unggah habis. Periksa koneksi internet Anda.');
        }
        throw new Error(JSON.stringify(error.response?.data) || error.message || 'Gagal mengunggah gambar');
      } else {
        console.error('Upload failed (Unknown Error):', error);
        throw new Error(error instanceof Error ? error.message : 'Gagal memproses gambar');
      }
    }
  };

  const performLocalPrediction = async (imageUri: string): Promise<PredictionResponse> => {
    if (!isModelReady) throw new Error('Model not ready for local prediction');
    const startTime = Date.now();
    const modelLoaderInstance = ModelLoader.getInstance();
    const result = await modelLoaderInstance.predict(imageUri);
    setPredictionTime(Date.now() - startTime);
    return result as PredictionResponse;
  };

  const resetCamera = () => {
    setImage(null);
    setPrediction(null);
  };

  const handleModeToggle = () => {
    if (modelStatus === 'error' && appMode === 'online') {
      Alert.alert(
        'Mode Offline Tidak Tersedia',
        'Model offline gagal dimuat. Silakan gunakan mode online.'
      );
      return;
    }
    setAppMode(current => (current === 'online' ? 'offline' : 'online'));
  };

  const handlePredict = async (): Promise<void> => {
    if (!image) {
      Alert.alert("Error", "Gambar belum dipilih.");
      return;
    }
    setIsLoading(true);
    setPrediction(null);
    setUploadProgress(0);
    setFallbackToOnline(false);

    let predictionResult: PredictionResponse | undefined;
    try {
      const needsCompression = !(await validateImage(image));
      let processedImageUri = image;
      if (needsCompression) {
        Alert.alert("Ukuran Gambar", "Gambar terlalu besar (>5MB). Mengkompresi gambar...");
        processedImageUri = await compressImage(image, {
          maxWidth: 800,
          maxHeight: 800,
          quality: 0.8,
        });
      }
      if (appMode === 'offline') {
        if (modelStatus === 'ready' && isModelReady) {
          try {
            console.log("Attempting local prediction...");
            predictionResult = await performLocalPrediction(processedImageUri);
            console.log("Local prediction result:", predictionResult);
          } catch (offlineError: any) {
            console.error("Local prediction failed:", offlineError);
            setFallbackToOnline(true);
            Alert.alert(
              "Prediksi Offline Gagal",
              `Model offline bermasalah: ${offlineError.message}. Mencoba prediksi online...`,
              [{ text: "OK" }]
            );
          }
        } else {
          console.log("Offline mode selected but model not ready. Falling back to online.");
          setFallbackToOnline(true);
          Alert.alert(
            "Mode Offline Tidak Siap",
            "Model offline belum dimuat atau error. Mencoba prediksi online...",
            [{ text: "OK" }]
          );
        }
      }
      if (appMode === 'online' || fallbackToOnline) {
        if (!isOnline) {
          Alert.alert("Tidak Ada Koneksi", "Tidak ada koneksi internet untuk prediksi online.");
          setIsLoading(false);
          return;
        }
        console.log("Attempting online prediction...");
        predictionResult = await uploadImage(processedImageUri, {
          onProgress: (progress) => setUploadProgress(progress),
        });
        console.log("Online prediction result:", predictionResult);
      }
      if (predictionResult && typeof predictionResult.label === 'string' && predictionResult.label.trim() !== '') {
        console.log('Using prediction result (flat structure):', predictionResult);
        setPrediction(predictionResult.label as keyof typeof diseaseInfo);
        await handlePredictionResult(predictionResult, processedImageUri);
      } else {
        let errorMessage = "Prediksi tidak memberikan label yang valid (server/local response issue).";
        if (predictionResult) {
          if (predictionResult.label === null) errorMessage = "Label dari respons adalah null.";
          else if (predictionResult.label === undefined) errorMessage = "Label dari respons tidak terdefinisi.";
          else if (predictionResult.label === '') errorMessage = "Label dari respons kosong.";
        } else if (!isOnline && (appMode === 'online' || fallbackToOnline)) {
          errorMessage = "Tidak ada koneksi internet untuk prediksi online.";
        } else {
          errorMessage = "Tidak ada hasil prediksi yang diterima atau format tidak dikenal.";
        }
        console.warn('PredictionResult.label is missing or invalid:', predictionResult, 'Error displayed:', errorMessage);
        Alert.alert("Hasil Tidak Valid", errorMessage);
      }
    } catch (error: any) {
      console.error("Error Prediksi (catch block in handlePredict):", error);
      Alert.alert("Error Prediksi", error.message || "Terjadi kesalahan saat memprediksi.");
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const renderModeToggle = () => (
    <TouchableOpacity
      style={styles.switchTrack}
      onPress={handleModeToggle}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.switchKnob,
          { transform: [{ translateX: switchTranslateX }] }
        ]}
      >
        <MaterialIcons
          name={appMode === 'online' ? 'public' : 'save-alt'}
          size={22}
          color="#8B0000"
        />
      </Animated.View>
      <Text
        style={[
          styles.switchLabel,
          appMode === 'online' ? styles.labelOnline : styles.labelOffline
        ]}
      >
        {appMode === 'online' ? 'Online' : 'Offline'}
      </Text>
    </TouchableOpacity>
  );

  const renderModelStatus = () => (
    <View style={styles.modelStatus}>
      <Text style={styles.modelStatusText}>
        {modelStatus === 'loading' && '⏳ Memuat Model...'}
        {modelStatus === 'ready' && '✅ Model Siap'}
        {modelStatus === 'error' && '❌ Error Model'}
      </Text>
      {fallbackToOnline && appMode === 'offline' && (
        <Text style={styles.fallbackText}>Beralih ke online</Text>
      )}
      {predictionTime > 0 && (
        <Text style={styles.predictionTimeText}>Waktu Prediksi: {(predictionTime / 1000).toFixed(2)}s</Text>
      )}
    </View>
  );

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  // --- UI ---
  if (Platform.OS === "web") {
    return (
      <View style={styles.container}>
        {!image ? (
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            style={styles.camera}
            videoConstraints={{ facingMode: facing === "front" ? "user" : "environment" }}
          />
        ) : (
          <Image source={{ uri: image }} style={styles.preview} />
        )}
        {!image && (
          <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
            <Text style={styles.flipText}>🔄</Text>
          </TouchableOpacity>
        )}
        {renderModeToggle()}
        {renderModelStatus()}
        <View style={styles.buttonContainer}>
          {image ? (
            <>
              <TouchableOpacity style={styles.button} onPress={handlePredict} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.text}>Prediksi</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => setImage(null)}>
                <Text style={styles.secondaryText}>Ambil Lagi</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.button} onPress={takePicture}>
                <Text style={styles.text}>Ambil Foto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.secondary]} onPress={pickImage}>
              </TouchableOpacity>
            </>
          )}
        </View>
        {isLoading && <LoadingOverlay />}
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.centeredContainer}>
        <Text>Memeriksa izin kamera...</Text>
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.message}>Kami membutuhkan izin untuk mengakses kamera Anda.</Text>
        <Button onPress={requestPermission} title="Berikan Izin Kamera" />
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
              onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
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
          <>
            <TouchableOpacity onPress={takePicture} style={styles.captureButton} />
          </>
        ) : (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={handlePredict}
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
      {isLoading && <LoadingOverlay />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  backArrow: {
    fontSize: 24,
    color: '#8B0000',
    fontWeight: 'bold',
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
    width: '100%',
    height: '100%',
  },
  fullCamera: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  fullPreview: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    resizeMode: 'cover',
  },
  flipButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonContainer: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 4,
    borderColor: 'white',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
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
    backgroundColor: '#FAF0E6',
  },
  resultContainer: {
    flex: 1,
    backgroundColor: '#FAF0E6',
    padding: 20,
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#8B0000',
    textAlign: 'center',
    marginVertical: 10,
  },
  imageContainer: {
    padding: 2,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#8B0000',
    overflow: 'hidden',
    marginVertical: 20,
    backgroundColor: 'white',
    shadowColor: '#000',
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
    width: '100%',
    height: 300,
    borderRadius: 23,
  },
  card: {
    backgroundColor: '#F5F5DC',
    borderRadius: 15,
    padding: 20,
    elevation: 4,
    marginBottom: 20,
  },
  diseaseTitle: {
    backgroundColor: '#A9C57D',
    padding: 10,
    borderRadius: 10,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    marginBottom: 10,
    lineHeight: 22,
  },
  solutionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  solution: {
    fontSize: 16,
    lineHeight: 22,
  },
  newScanButton: {
    backgroundColor: '#8AA75A',
    marginTop: 20,
    marginBottom: 30,
    width: '100%',
  },
  modernBackButton: {
    position: 'absolute',
    width: 40,
    height: 40,
    top: 10,
    left: 20,
    zIndex: 10,
    backgroundColor: '#F5F5DC',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    shadowColor: '#000',
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
    color: '#8B0000',
    fontWeight: '600',
    marginTop: -7,
  },
  switchTrack: {
    width: 70,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    position: 'absolute',
    top: 10,
    right: 70, // Atur posisi sesuai kebutuhan
    elevation: 2,
    zIndex: 20,
  },
  switchKnob: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF',
    position: 'absolute',
    left: 4,
    top: 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 38,
    position: 'absolute',
    top: 6,
  },
  labelOnline: {
    color: '#388E3C',
    left: 38,
  },
  labelOffline: {
    color: '#8B0000',
    left: 8,
  },
  modelStatus: {
    position: 'absolute',

    top: 60,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 8,
  },
  modelStatusText: {
    color: '#fff',
    fontSize: 12,
  },
  predictionTimeText: {
    color: '#fff',
    fontSize: 10,
    marginTop: 4,
  },
  fallbackText: {
    color: '#FFD700',
    fontSize: 12,
    marginTop: 4,
  },
});