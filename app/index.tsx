import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { FontAwesome5, MaterialIcons, Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

// Data Fun Fact tanpa background image
const funFactData = {
  category: "STRAWBERRY FACTS",
  title: "Do you know?",
  content: "The red color of the strawberry is due to the anthocyanins found in its plant cells.",
  sourceUrl: "https://www.sciencefocus.com/nature/",
  moreUrl: undefined, // Atur ke url jika ingin tombol "More" aktif
};

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

  // Fungsi pembuka URL dengan pengecekan
  const handleOpenUrl = async (url?: string) => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Tidak dapat membuka link", url);
      }
    } catch (err) {
      Alert.alert("Terjadi kesalahan saat membuka link.");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require("../assets/images/avatar.png")}
            style={styles.avatar}
          />
          <Text style={styles.helloText}>Hello!</Text>
          <TouchableOpacity style={styles.infoButton}>
            <Feather name="info" size={20} color="#6b4f4f" />
          </TouchableOpacity>
        </View>

        {/* Fun Fact Card with Solid Color */}
        <View style={styles.funFactCardSolid}>
          {/* <Text style={styles.funFactCardCategory}>{funFactData.category}</Text> */}
          <Text style={styles.funFactCardTitle}>{funFactData.title}</Text>
          <Text style={styles.funFactCardContent}>{funFactData.content}</Text>
          <View style={styles.funFactCardButtons}>
            {funFactData.moreUrl && (
              <TouchableOpacity
                style={styles.cardButton}
                onPress={() => handleOpenUrl(funFactData.moreUrl)}
              >
                <Text style={styles.cardButtonText}>More</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.cardButton, styles.cardSourceButton]}
              onPress={() => handleOpenUrl(funFactData.sourceUrl)}
            >
              <Text style={styles.cardSourceButtonText}>Source</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <View style={styles.tipsImage}>
            <Image
              source={require("../assets/images/stroberi2.png")}
              style={styles.strawberryImage}
              resizeMode="contain"
            />
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
          <Feather name="info" size={24} color="#6b4f4f" />
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
    backgroundColor: "#FFF5E4",
  },
  scrollContent: {
    paddingBottom: 90,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
    paddingHorizontal: 20,
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
  // Fun Fact Card Styles (Solid Color)
  funFactCardSolid: {
    backgroundColor: "#90A17D",
    borderRadius: 15,
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 25,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.13,
    shadowRadius: 6,
  },
  funFactCardTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 4,
  },
  funFactCardContent: {
    color: "#F5F5F5",
    fontSize: 14,
    marginBottom: 12,
  },
  funFactCardButtons: {
    flexDirection: "row",
    gap: 10,
  },
  cardButton: {
    backgroundColor: "#fff",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginRight: 8,
  },
  cardButtonText: {
    color: "#6b4f4f",
    fontWeight: "bold",
  },
  cardSourceButton: {
    backgroundColor: "#fff",
  },
  cardSourceButtonText: {
   fontSize: 13,
    fontWeight: "bold",
    color: "#6b4f4f",
  },
  // Tips Section
  tipsSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 40,
    marginHorizontal: 20,
    marginBottom: 30,
  },
  tipsImage: {
    width: "auto",
    position: "relative",
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
    justifyContent: "center",
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
    paddingHorizontal: 20,
  },
});
