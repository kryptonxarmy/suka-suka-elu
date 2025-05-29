import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import { MaterialIcons } from '@expo/vector-icons';
import { PREDICT_URL } from '../config/api';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Define disease types first
type DiseaseType = 
  | 'Powdery Mildew'
  | 'Blossom Blight'
  | 'Angular Leaf Spot'
  | 'Gray Mold'
  | 'Calcium Deficiency'
  | 'Leaf Spot';

// Then define the disease info object
const diseaseInfo: Record<DiseaseType, {
  title: string;
  description: string;
  solution: string;
}> = {
  'Powdery Mildew': {
    title: "Embun Tepung (Powdery Mildew)",
    description: 
      "Penyakit ini disebabkan oleh jamur 'Podosphaera aphanis' yang menginfeksi tanaman stroberi. " +
      "Gejala utama berupa lapisan putih seperti tepung yang menutupi permukaan daun, tangkai, dan bunga. " +
      "Serangan berat dapat menyebabkan daun mengering, pertumbuhan terhambat, dan kualitas buah menurun.",
    solution:
      "1. Aplikasikan fungisida berbahan aktif sulfur sesuai dosis\n" +
      "2. Tingkatkan sirkulasi udara dengan mengatur jarak tanam\n" +
      "3. Hindari penyiraman di malam hari\n" +
      "4. Buang bagian tanaman yang terinfeksi\n" +
      "5. Jaga kebersihan kebun secara rutin",
  },
  'Blossom Blight': {
    title: "Busuk Bunga (Blossom Blight)",
    description:
      "Penyakit busuk bunga disebabkan oleh jamur 'Botrytis cinerea'. " +
      "Infeksi dimulai dari bunga yang berubah warna menjadi cokelat dan layu. " +
      "Serangan dapat meluas ke tangkai bunga dan buah muda.",
    solution:
      "1. Segera buang bunga yang terinfeksi\n" +
      "2. Gunakan fungisida klorotalonil\n" +
      "3. Perbaiki sirkulasi udara\n" +
      "4. Perbaiki sistem drainase\n" +
      "5. Lakukan pemangkasan rutin",
  },
  'Angular Leaf Spot': {
    title: "Bercak Daun Bersudut (Angular Leaf Spot)",
    description:
      "Penyakit bakterial yang menyebabkan bercak bening berbentuk sudut pada daun. " +
      "Bercak terlihat tembus cahaya dan dapat berubah menjadi cokelat kemerahan. " +
      "Menyebar cepat saat kondisi lembab.",
    solution:
      "1. Gunakan bibit sehat dan bersertifikat\n" +
      "2. Aplikasikan fungisida tembaga\n" +
      "3. Gunakan sistem irigasi tetes\n" +
      "4. Hindari penyiraman dari atas\n" +
      "5. Jaga kebersihan alat",
  },
  'Gray Mold': {
    title: "Kapang Abu-abu (Gray Mold)",
    description:
      "Penyakit yang menyebabkan lapisan abu-abu berbulu pada buah. " +
      "Bunga dan buah dapat membusuk dan infeksi menyebar saat lembab. " +
      "Buah menjadi lunak dan berair.",
    solution:
      "1. Pangkas bagian terinfeksi\n" +
      "2. Jaga sirkulasi udara\n" +
      "3. Aplikasikan fungisida\n" +
      "4. Hindari kontak buah dengan tanah\n" +
      "5. Jaga kebersihan kebun",
  },
  'Calcium Deficiency': {
    title: "Defisiensi Kalsium",
    description:
      "Gangguan nutrisi yang menyebabkan ujung daun terbakar. " +
      "Pertumbuhan tanaman terhambat dan daun dapat menggulung. " +
      "Buah tidak berkembang dengan baik.",
    solution:
      "1. Aplikasikan pupuk kalsium\n" +
      "2. Gunakan kapur pertanian\n" +
      "3. Perbaiki drainase\n" +
      "4. Atur pH tanah\n" +
      "5. Monitor kelembaban",
  },
  'Leaf Spot': {
    title: "Bercak Daun (Leaf Spot)",
    description:
      "Penyakit yang menyebabkan bercak ungu pada daun. " +
      "Pusat bercak mengering dan daun dapat menguning. " +
      "Fotosintesis terhambat dan daun rontok.",
    solution:
      "1. Buang daun terinfeksi\n" +
      "2. Gunakan fungisida mancozeb\n" +
      "3. Lakukan rotasi tanaman\n" +
      "4. Atur jarak tanam\n" +
      "5. Hindari penyiraman berlebih",
  }
};

// Add cache mapping
const imageCache = new Map<string, string>();

const isValidImageUri = (uri: string): boolean => {
  if (!uri) return false;
  try {
    return uri.startsWith('file://') || 
           uri.startsWith('content://') || 
           uri.startsWith('http');
  } catch {
    return false;
  }
};

const checkFileAccess = async (uri: string) => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    console.log('File info:', fileInfo);
    return fileInfo.exists;
  } catch (error) {
    console.error('File access check failed:', error);
    return false;
  }
};

const ImageWithFallback = ({
  uri,
  onReload,
}: {
  uri: string;
  onReload: () => void;
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Untuk optimasi, gunakan useCallback agar tidak membuat ulang fungsi tanpa perlu
  const attemptLoadImage = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    if (!uri) {
      setHasError(true);
      setIsLoading(false);
      return;
    }
    if (uri.startsWith('file://') || uri.startsWith('content://')) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
          setHasError(true);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        setHasError(true);
        setIsLoading(false);
        return;
      }
    }
  }, [uri]);

  useEffect(() => {
    attemptLoadImage();
  }, [attemptLoadImage]);

  // Handler reload dari ikon
  const handleReloadPress = () => {
    setHasError(false);
    setIsLoading(true);
    onReload();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B0000" />
        <Text style={styles.loadingText}>Memuat gambar...</Text>
      </View>
    );
  }

  if (hasError || !uri) {
    return (
      <View style={styles.errorContainerImage}>
        <MaterialIcons name="broken-image" size={48} color="#8B0000" />
        <Text style={styles.errorText}>Gagal memuat gambar</Text>
        <TouchableOpacity style={styles.reloadIconContainer} onPress={handleReloadPress}>
          <MaterialIcons name="refresh" size={28} color="#8B0000" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.imageWrapper}>
      <Image
        key={uri}
        source={{ uri }}
        style={styles.image}
        resizeMode="cover"
        onLoadStart={() => {
          setIsLoading(true);
          setHasError(false);
        }}
        onLoadEnd={() => setIsLoading(false)}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
      />
      {/* Tombol reload hanya muncul jika tidak loading */}
      {!isLoading && (
        <TouchableOpacity style={styles.reloadIconContainer} onPress={handleReloadPress}>
          <MaterialIcons name="refresh" size={28} color="#8B0000" />
        </TouchableOpacity>
      )}
    </View>
  );
};

// Tambahkan utility function untuk decode yang aman
const safeDecode = (value?: string) => {
  try {
    return decodeURIComponent(value || '');
  } catch {
    return '';
  }
};

export default function ResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);

  // Tambahkan state untuk reload key
  const [imageReloadKey, setImageReloadKey] = useState(0);

  // State untuk data
  const [prediction, setPrediction] = useState<DiseaseType | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [diseaseData, setDiseaseData] = useState<{
    title: string;
    description: string;
    solution: string;
  } | null>(null);

  // Expand/collapse state
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(true);
  const [isSolutionExpanded, setIsSolutionExpanded] = useState(true);

  // Fungsi reload image
  const handleImageReload = () => {
    setImageReloadKey((prev) => prev + 1);
  };

  // Ambil dan proses data saat komponen mount
  useEffect(() => {
    const processImage = async () => {
      try {
        if (!params.imageUri) {
          throw new Error('URI gambar tidak ditemukan');
        }
        const decodedUri = safeDecode(params.imageUri as string);
        setImageUri(decodedUri);

        if (!params.prediction || !params.confidence) {
          Alert.alert('Data Tidak Lengkap', 'Hasil deteksi tidak dapat ditampilkan.');
          router.back();
          return;
        }

        const decodedPrediction = safeDecode(params.prediction as string);
        const diseaseKeys = Object.keys(diseaseInfo);
        const predictedKey = diseaseKeys.find(
          key => key.toLowerCase().trim() === decodedPrediction.toLowerCase().trim()
        );

        if (predictedKey) {
          setPrediction(predictedKey as DiseaseType);
          setDiseaseData(diseaseInfo[predictedKey as DiseaseType]);
        } else {
          setDiseaseData({
            title: `Penyakit Tidak Dikenal (${decodedPrediction})`,
            description: 'Tidak dapat mengenali jenis penyakit pada gambar.',
            solution: 'Silakan coba ambil gambar ulang dengan pencahayaan yang lebih baik.'
          });
        }

        const confidenceValue = Number(params.confidence);
        setConfidence(isNaN(confidenceValue) ? 0 : confidenceValue);

      } catch (error) {
        Alert.alert(
          'Gagal',
          'Tidak dapat memproses gambar. Silakan coba lagi.'
        );
        router.back();
      } finally {
        setLoading(false);
      }
    };

    processImage();
  }, [params]);

  // Temporary simple image display for testing
  const renderSimpleImage = () => {
    if (!imageUri) return null;
    
    return (
      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>Debug View:</Text>
        <Image 
          source={{ uri: imageUri }} 
          style={{ width: 300, height: 300 }} 
          onError={(error) => console.log('Simple image error:', error.nativeEvent)}
        />
      </View>
    );
  };

  // Update tampilan confidence
  const renderConfidence = () => {
    if (confidence <= 0) {
      return (
        <Text style={styles.confidence}>
          Tingkat akurasi tidak tersedia
        </Text>
      );
    }

    return (
      <Text style={styles.confidence}>
        Tingkat Akurasi Deteksi: {confidence.toFixed(1)}%
      </Text>
    );
  };

  // Toggle handlers with animation
  const toggleDescription = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsDescriptionExpanded(expanded => !expanded);
  };
  const toggleSolution = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSolutionExpanded(expanded => !expanded);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B0000" />
        <Text style={styles.loadingText}>Memuat hasil deteksi...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Hasil Deteksi Penyakit</Text>

      <View style={styles.imageContainer}>
        {imageUri ? (
          <ImageWithFallback
            key={`image-${imageReloadKey}`}
            uri={imageUri}
            onReload={handleImageReload}
          />
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Gambar tidak tersedia</Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.resultHeader}>
          <Text style={styles.diseaseTitle}>
            {diseaseData?.title || 'Penyakit Tidak Dikenal'}
          </Text>
        </View>

        <View style={styles.confidenceContainer}>
          {renderConfidence()}
        </View>

        <View style={styles.detailContainer}>
          {/* Keterangan Penyakit */}
          <TouchableOpacity style={styles.collapsibleHeader} onPress={toggleDescription} activeOpacity={0.7}>
            <Text style={styles.detailLabel} numberOfLines={1}>
              Keterangan Penyakit:
            </Text>
            <MaterialIcons
              name={isDescriptionExpanded ? 'expand-less' : 'expand-more'}
              size={24}
              color="#8B0000"
            />
          </TouchableOpacity>
          {isDescriptionExpanded && (
            <Text style={styles.description}>
              {diseaseData?.description || 'Informasi tidak tersedia'}
            </Text>
          )}

          {/* Solusi Penanganan */}
          <TouchableOpacity style={[styles.collapsibleHeader, styles.solutionHeaderContainer]} onPress={toggleSolution} activeOpacity={0.7}>
            <Text style={styles.solutionHeaderLabel} numberOfLines={1}>
              Solusi Penanganan:
            </Text>
            <MaterialIcons
              name={isSolutionExpanded ? 'expand-less' : 'expand-more'}
              size={24}
              color="#8B0000"
            />
          </TouchableOpacity>
          {isSolutionExpanded && (
            <Text style={styles.solution}>
              {diseaseData?.solution || 'Solusi tidak tersedia'}
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

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
    minHeight: 300, // Add minimum height
  },
  imageWrapper: {
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 23, // Slightly smaller than container to avoid edge issues
  },
  saveButton: {
    marginTop: 10,
    backgroundColor: '#8B0000',
    padding: 10,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  imageActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 15,
  },
  actionButton: {
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B0000',
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#F5F5DC',
    borderRadius: 15,
    padding: 20,
    elevation: 4,
  },
  resultHeader: {
    marginBottom: 15,
  },
  resultLabel: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 5,
    textAlign: 'center',
  },
  diseaseTitle: {
    backgroundColor: '#A9C57D',
    padding: 12,
    borderRadius: 10,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2E4514',
    elevation: 2,
  },
  confidenceContainer: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
  },
  confidence: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#1B5E20',
    textAlign: 'center',
    marginTop: 5,
  },
  detailContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginTop: 15,
    elevation: 1,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A4A4A',
    flex: 1,
  },
  solutionHeaderContainer: {
    marginTop: 12,
  },
  solutionHeaderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B0000',
    flex: 1,
  },
  description: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
    marginBottom: 15,
    textAlign: 'justify',
  },
  solutionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B0000',
    marginTop: 10,
    marginBottom: 8,
  },
  solution: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
    textAlign: 'justify',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  errorText: {
    textAlign: 'center',
    color: '#8B0000',
    fontSize: 16,
    marginBottom: 8,
  },
  errorDetail: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  backText: {
    fontSize: 16,
    color: '#8B0000',
    textAlign: 'center',
    marginTop: 10,
  },
  reloadIconContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 18,
    padding: 4,
    zIndex: 10,
  },
});