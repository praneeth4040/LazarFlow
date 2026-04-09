import apiClient from '../../../lib/apiClient';
import { AxiosResponse } from 'axios';

export abstract class BaseRepository {
  protected async get<T>(url: string, params?: any): Promise<T> {
    const response: AxiosResponse<T> = await apiClient.get(url, { params });
    return response.data;
  }

  protected async post<T>(url: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await apiClient.post(url, data);
    return response.data;
  }

  protected async put<T>(url: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await apiClient.put(url, data);
    return response.data;
  }

  protected async patch<T>(url: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await apiClient.patch(url, data);
    return response.data;
  }

  protected async delete<T>(url: string): Promise<T> {
    const response: AxiosResponse<T> = await apiClient.delete(url);
    return response.data;
  }
}
