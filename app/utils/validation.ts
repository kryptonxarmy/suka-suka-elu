import * as FileSystem from 'expo-file-system';

export const validateImage = async (uri: string) => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    
    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }

    return true;
  } catch (error) {
    console.error('Image validation failed:', error);
    throw error;
  }
};