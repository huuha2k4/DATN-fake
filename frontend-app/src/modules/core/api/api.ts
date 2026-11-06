import { NativeModules, Platform } from 'react-native';

function getAutoDetectedApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL || '';
    const address = scriptURL.split('://')[1]?.split('/')[0];
    const hostname = address?.split(':')[0];
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:1116/api/v1`;
    }
  } catch {}
  return Platform.OS === 'android' ? 'http://10.0.2.2:1116/api/v1' : 'http://192.168.1.14:1116/api/v1';
}

const API_BASE_URL = getAutoDetectedApiUrl();

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
