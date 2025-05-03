import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Platform, Alert } from "react-native";
import { Camera, CameraType } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import Webcam from "react-webcam";

export default function CameraPage() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraRef, setCameraRef] = useState<any>(null);
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === "granted");

        const mediaLibraryStatus = await MediaLibrary.requestPermissionsAsync();
        if (mediaLibraryStatus.status !== "granted") {
          alert("Izin media diperlukan untuk menyimpan foto");
        }
      }
    })();
  }, []);

  const takePicture = async () => {
    if (Platform.OS === "web") {
      if (webcamRef.current) {
        const imageSrc = webcamRef.current.getScreenshot();
        setImage(imageSrc);
      }
    } else if (cameraRef) {
      const photo = await cameraRef.takePictureAsync();
      setImage(photo.uri);
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

      const response = await axios.post("http://127.0.0.1:8000/predict/", formData, {
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

  if (hasPermission === null) {
    return (
      <View style={styles.centeredContainer}>
        <Text>Memeriksa izin...</Text>
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View style={styles.centeredContainer}>
        <Text>Tidak ada izin kamera</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!image ? <Camera style={styles.camera} type={CameraType.back} ref={(ref: typeof Camera | null) => setCameraRef(ref)} /> : <Image source={{ uri: image }} style={styles.preview} />}

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
});
