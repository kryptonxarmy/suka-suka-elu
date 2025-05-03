import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Platform, Alert, Button } from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import Webcam from "react-webcam";
import { apiConfig } from "@/config/environment";

export default function CameraPage() {
  // Gunakan hook useCameraPermissions untuk meminta izin
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

  const [cameraRef, setCameraRef] = useState<any>(null);
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const [facing, setFacing] = useState<CameraType>("back");

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
      // Berbeda cara menangani image URI pada web vs native
      const formData = new FormData();

      if (Platform.OS === "web") {
        // Untuk web: konversi base64 ke blob
        if (image.startsWith("data:image")) {
          const response = await fetch(image);
          const blob = await response.blob();
          formData.append("file", blob, "image.jpg");
        }
      } else {
        // Untuk native: gunakan URI file
        const uri = image;
        const uriParts = uri.split(".");
        const fileType = uriParts[uriParts.length - 1];

        formData.append("file", {
          uri,
          name: `image.${fileType}`,
          type: `image/${fileType}`,
        } as any);
      }

      // Gunakan URL dari konfigurasi environment
      const predictUrl = apiConfig.getFullUrl(apiConfig.endpoints.predict);
      console.log(`Sending request to: ${predictUrl}`);

      const response = await axios.post(predictUrl, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Prediksi berhasil:", response.data);
      setPrediction(JSON.stringify(response.data));
      Alert.alert("Berhasil", "Prediksi berhasil dilakukan!");
    } catch (error) {
      console.error("Error upload:", error);
      Alert.alert("Gagal", "Tidak dapat menghubungi server prediksi");
    } finally {
      setIsLoading(false);
    }
  };

  // Fungsi untuk membalik kamera
  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  // Render untuk platform web
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
                <Text style={styles.text}>Ambil Lagi</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.button} onPress={takePicture}>
                <Text style={styles.text}>Ambil Foto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.secondary]} onPress={pickImage}>
                <Text style={styles.text}>Pilih dari Galeri</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  // Periksa izin kamera untuk platform native
  if (!permission) {
    // Izin kamera masih dimuat
    return (
      <View style={styles.centeredContainer}>
        <Text>Memeriksa izin...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    // Izin kamera belum diberikan
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.message}>Kami membutuhkan izin untuk mengakses kamera</Text>
        <Button onPress={requestPermission} title="Berikan Izin" />
      </View>
    );
  }

  // Render untuk platform native dengan izin kamera diberikan
  return (
    <View style={styles.container}>
      {!image ? (
        <CameraView style={styles.camera} facing={facing} ref={(ref) => setCameraRef(ref)}>
          {/* Tombol untuk membalik kamera */}
          <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
            <Text style={styles.flipText}>🔄</Text>
          </TouchableOpacity>
        </CameraView>
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
            <TouchableOpacity style={styles.button} onPress={uploadImage} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.text}>Prediksi</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => setImage(null)}>
              <Text style={styles.text}>Ambil Lagi</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.button} onPress={takePicture}>
              <Text style={styles.text}>Ambil Foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.secondary]} onPress={pickImage}>
              <Text style={styles.text}>Pilih dari Galeri</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
    backgroundColor: "black",
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
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    padding: 20,
  },
  button: {
    backgroundColor: "#1E90FF",
    padding: 15,
    borderRadius: 5,
    width: "45%",
    alignItems: "center",
  },
  secondary: {
    backgroundColor: "#808080",
  },
  text: {
    color: "white",
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
  flipButton: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 30,
    padding: 10,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  flipText: {
    color: "white",
    fontSize: 20,
  },
});
