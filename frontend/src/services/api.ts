import axios from 'axios';
import type { NearbyServicesResponse, LocalityContext } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  async getNearbyServices(lat: number, lon: number): Promise<NearbyServicesResponse> {
    const response = await api.get('/nearby-services', {
      params: { lat, lon },
    });
    return response.data;
  },

  async getLocalityContext(departmentId: string): Promise<LocalityContext> {
    const response = await api.get('/locality-context', {
      params: { department_id: departmentId },
    });
    return response.data;
  },
};