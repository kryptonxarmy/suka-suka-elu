import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { FontAwesome5, MaterialIcons, Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

export default function HomeScreen() {
  const router = useRouter();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      router.push({
        pathname: "/camera/page",
        params: { imageUri: result.assets[0].uri },
      });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require("../assets/images/avatar.png")} // ganti dengan avatar kamu
            style={styles.avatar}
          />
          <Text style={styles.helloText}>Hello!</Text>
          <TouchableOpacity style={styles.infoButton}>
            <Feather name="info" size={20} color="#6b4f4f" />
          </TouchableOpacity>
        </View>

        {/* Fun Fact Box */}
        <View style={styles.funFactBox}>
          <Text style={styles.funFactTitle}>Do you know?</Text>
          <Text style={styles.funFactContent}>The red color of the strawberry is due to the anthocyanins found in its plant cells.</Text>
          <View style={styles.funFactButtons}>
            <TouchableOpacity
              style={styles.button}
              // onPress={() => router.push('/funfact/detail')}
            >
              <Text style={styles.buttonText}>More</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.sourceButton]} onPress={() => Linking.openURL("https://example.com")}>
              <Text style={styles.sourceButtonText}>Source</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <View style={styles.tipsImage}>
            <Image source={require("../assets/images/stroberi2.png")} style={styles.strawberryImage} resizeMode="contain" />
          </View>
          <View style={styles.tipsBox}>
            <Text style={styles.tipsTitle}>Tips</Text>
            <TouchableOpacity style={styles.tipItem} onPress={() => router.push("/camera/page")}>
              <View style={styles.tipIcon}>
                <FontAwesome5 name="camera" size={20} color="#6b4f4f" />
              </View>
              <Text style={styles.tipText}>Use camera to scan.</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tipItem} onPress={pickImage}>
              <View style={styles.tipIcon}>
                <MaterialIcons name="file-upload" size={20} color="#6b4f4f" />
              </View>
              <Text style={styles.tipText}>Upload image from your gallery.</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity>
          <Feather name="more-horizontal" size={24} color="#6b4f4f" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/camera/page")}>
          <FontAwesome5 name="camera-retro" size={24} color="#6b4f4f" />
        </TouchableOpacity>
        <TouchableOpacity onPress={pickImage}>
          <Feather name="plus-square" size={24} color="#6b4f4f" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF5E4", // warna cream
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  helloText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#6b4f4f",
    flex: 1,
  },
  infoButton: {
    padding: 5,
  },
  funFactBox: {
    backgroundColor: "#D46A6A",
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 25,
  },
  funFactTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 5,
  },
  funFactContent: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 15,
  },
  funFactButtons: {
    flexDirection: "row",
    gap: 10,
  },
  button: {
    backgroundColor: "#ffffff99",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  buttonText: {
    color: "#6b4f4f",
    fontWeight: "bold",
  },
  sourceButton: {
    backgroundColor: "#ffffff22",
  },
  sourceButtonText: {
    color: "#eee",
  },
  tipsSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 40,
    marginHorizontal: 20, 
  },
  tipsImage: {
    width: 'auto',
    position : 'relative',
  },
  strawberryImage: {
    width: 200,
    height: 380,
    position: "absolute",
    left: -50,
  },
  tipsBox: {
    backgroundColor: "#90A17D",
    borderRadius: 15,
    padding: 15,
    height: 300,
    width: "80%",
  },
  tipsTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 10,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  tipIcon: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 8,
    marginRight: 10,
  },
  tipText: {
    color: "#fff",
    fontSize: 14,
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 10,
  },
});
