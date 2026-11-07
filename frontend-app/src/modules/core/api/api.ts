import { NativeModules, Platform } from 'react-native';

function getAutoDetectedApiUrl(): string {
  // Bắt buộc lấy 100% từ file .env
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  return 'http://192.168.1.9:1116/api/v1';
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
