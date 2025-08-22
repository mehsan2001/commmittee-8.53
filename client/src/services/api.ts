import { apiRequest } from "@/lib/queryClient";

// Base URL for API requests
const API_BASE_URL = "http://localhost:8000";

// Helper function to build API URLs
export const buildApiUrl = (path: string) => {
  // Remove leading slash if present
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
};

// Generic API request functions
export const get = async <T>(path: string): Promise<T> => {
  const response = await apiRequest("GET", buildApiUrl(path));
  return response.json();
};

export const post = async <T>(path: string, data: any): Promise<T> => {
  const response = await apiRequest("POST", buildApiUrl(path), data);
  return response.json();
};

export const put = async <T>(path: string, data: any): Promise<T> => {
  const response = await apiRequest("PUT", buildApiUrl(path), data);
  return response.json();
};

export const del = async <T>(path: string): Promise<T> => {
  const response = await apiRequest("DELETE", buildApiUrl(path));
  return response.json();
};