import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Platform, Alert, Button, ScrollView, SafeAreaView} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import Webcam from "react-webcam";
import { PREDICT_URL } from '../config/api';
import { useRouter } from 'expo-router';

export default function CameraPage() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

  const [cameraRef, setCameraRef] = useState<any>(null);
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<keyof typeof diseaseInfo | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const [facing, setFacing] = useState<CameraType>("back");
  const [cameraHeight, setCameraHeight] = useState<number>(0);
  const [showResult, setShowResult] = useState(false);

  const diseaseInfo = {
    "Powdery Mildew": {
      title: "Powdery Mildew",
      description:
        "Disebabkan oleh jamur *Podosphaera aphanis*, muncul sebagai lapisan putih seperti bedak pada daun. Menyukai kondisi hangat dan lembap.",
      solution:
        "Gunakan fungisida sulfur atau kalium bikarbonat. Tingkatkan sirkulasi udara. Hindari penyiraman malam hari.",
    },
    "Blossom Blight": {
      title: "Blossom Blight",
      description:
        "Disebabkan oleh *Botrytis cinerea*, menyerang bunga saat cuaca lembap. Bunga berubah coklat dan layu.",
      solution:
        "Buang bunga yang terinfeksi. Gunakan fungisida seperti klorotalonil. Jaga jarak antar tanaman dan drainase.",
    },
    "Angular Leaf Spot": {
      title: "Angular Leaf Spot",
      description:
        "Disebabkan oleh *Xanthomonas fragariae*. Gejala berupa bercak bening berbentuk sudut pada daun.",
      solution:
        "Gunakan bibit sehat. Semprot dengan fungisida tembaga. Kurangi kelembapan dengan irigasi tetes.",
    },
    "Gray Mold": {
      title: "Gray Mold",
      description:
        "Disebabkan oleh *Botrytis cinerea*, menyebabkan lapisan abu-abu berbulu pada buah dan bunga.",
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
        "Disebabkan oleh *Mycosphaerella fragariae*, menimbulkan bercak ungu di daun dan menghambat fotosintesis.",
      solution:
        "Buang daun terinfeksi. Gunakan fungisida seperti mancozeb. Lakukan rotasi tanaman dan sanitasi rutin.",
    },
  } as const; 

  useEffect(() => {
    if (Platform.OS !== "web" && !mediaPermission?.granted) {
      requestMediaPermission();
    }
  }, [mediaPermission]);

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

  const uploadImage = async () => {
    if (!image) return;

    setIsLoading(true);
    setPrediction(null);

    try {
      const formData = new FormData();

      if (Platform.OS === "web") {
        if (image.startsWith("data:image")) {
          const response = await fetch(image);
          const blob = await response.blob();
          formData.append("file", blob, "image.jpg");
        }
      } else {
        formData.append("file", {
          uri: image,
          name: 'image.jpg',
          type: 'image/jpeg'
        } as any);
      }

      const response = await axios.post(PREDICT_URL, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setPrediction(response.data.prediction);
      setShowResult(true);

    } catch (error) {
      console.error("Error upload:", error);
      Alert.alert("Gagal", "Tidak dapat menghubungi server prediksi");
    } finally {
      setIsLoading(false);
    }
  };

  const resetCamera = () => {
    setImage(null);
    setPrediction(null);
    setShowResult(false);
  };

  if (showResult && image && prediction) {
    return (
      <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.resultContainer}>
        <TouchableOpacity onPress={resetCamera} style={styles.modernBackButton}>
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
            {diseaseInfo[prediction as keyof typeof diseaseInfo]?.description || 'Deskripsi tidak tersedia.'}
          </Text>
          <Text style={styles.solutionHeader}>Solusi:</Text>
          <Text style={styles.solution}>
            {diseaseInfo[prediction]?.solution || 'Solusi belum tersedia.'}
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
        {!image ? <Webcam ref={webcamRef} audio={false} screenshotFormat="image/jpeg" style={styles.camera} /> : <Image source={{ uri: image }} style={styles.preview} />}

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
              <TouchableOpacity style={styles.button} onPress={uploadImage} disabled={isLoading}>
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
        <Text style={styles.message}>Kami membutuhkan izin untuk mengakses kamera</Text>
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

      <View style={styles.captureButtonContainer}>
        {!image ? (
          <TouchableOpacity onPress={takePicture} style={styles.captureButton} />
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
    backgroundColor: "#8AA75A", // Changed to green color
    padding: 15,
    borderRadius: 5,
    width: "45%",
    alignItems: "center",
  },
  secondary: {
    backgroundColor: "#F5F5DC", // Changed to cream color
  },
  text: {
    color: "#FFFFFF", // Keep white for primary button
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryText: { // Add new style for secondary button text
    color: "#6B4F4F", // Brown color for better contrast on cream
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
  // INI UNTUK RESULT 
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
    backgroundColor: '#F5F5DC', // Light cream color
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
    color: '#8B0000', // Dark red color
    fontWeight: '600',
    marginTop: -7, // Adjust arrow position
  },
});
