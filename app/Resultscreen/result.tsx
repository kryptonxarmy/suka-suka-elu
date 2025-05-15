import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

// Define available disease types
type DiseaseType = keyof typeof diseaseInfo;

// Update the interface to match Route constraints
export type RouteParams = {
  prediction: string;
  imageUri: string;
};

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
} as const;  // Add as const to make the object immutable

export default function ResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const prediction = params.prediction as string;
  const imageUri = decodeURIComponent(params.imageUri as string);


  // Tambahkan log untuk debugging
  console.log('Received params:', params);
  console.log('Image URI:', imageUri);

  const [imageError, setImageError] = useState(false);

  const disease = diseaseInfo[prediction as DiseaseType] || {
    title: prediction || 'Unknown',
    description: 'Deskripsi tidak tersedia.',
    solution: 'Solusi belum tersedia.',
  };

  const handleImageError = (error: any) => {
    // console.error('Error loading image:', error);
    setImageError(true);
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Hasil Deteksi</Text>

      <View style={styles.imageContainer}>
        {imageError ? (
          <Text style={styles.errorText}>Gagal memuat gambar</Text>
        ) : (
          <Image 
            source={{ 
              uri: imageUri,
              cache: 'reload'
            }}
            style={styles.image}
            resizeMode="cover"
            onError={(error) => {
              console.log('Image loading error:', error);
              setImageError(true);
            }}
          />
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.diseaseTitle}>{disease.title}</Text>
        <Text style={styles.description}>{disease.description}</Text>
        <Text style={styles.solutionHeader}>Solusi:</Text>
        <Text style={styles.solution}>{disease.solution}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF0E6',
    padding: 20,
  },
  backButton: {
    marginTop: 10,
  },
  backArrow: {
    fontSize: 24,
    color: '#301B28',
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#8B0000',
    textAlign: 'center',
    marginVertical: 10,
  },
  imageContainer: {
    padding: 2, // Creates space for the border
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#8B0000', // Dark red border
    overflow: 'hidden', // Ensures the image respects border radius
    marginVertical: 20,
    backgroundColor: 'white', // Adds a white background
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    // Add minimum height
    minHeight: 300,
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 23, // Slightly smaller than container to avoid edge issues
  },
  card: {
    backgroundColor: '#F5F5DC',
    borderRadius: 15,
    padding: 20,
    elevation: 4,
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
  errorText: {
    textAlign: 'center',
    color: '#8B0000',
    fontSize: 16,
    padding: 20,
  },
});
