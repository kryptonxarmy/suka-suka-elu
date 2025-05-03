import { View, Text, Button } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
  
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Text>Selamat Datang!</Text>
      <Button title="Buka Kamera" onPress={() => router.push('/camera/page')} />
    </View>
  );
}