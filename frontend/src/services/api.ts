import axios from 'axios';

const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (!envUrl || !envUrl.trim()) {
    return 'http://127.0.0.1:5000/api';
  }
  const cleanUrl = envUrl.trim().replace(/\/+$/, '');
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;