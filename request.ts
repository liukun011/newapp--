import { AxiosRequestConfig } from 'axios';
import { handleMockRequest } from './mock/mockHandlers';
import { installMockRuntime } from './mock/mockRuntime';

installMockRuntime();

/**
 * Prototype build request boundary.
 *
 * This branch is intentionally fully offline: every service call is resolved by
 * mock handlers so the mobile app can be used as a stable clickable prototype.
 */
export async function request<T>(url: string, options: AxiosRequestConfig = {}): Promise<T> {
  return handleMockRequest<T>(url, options, 'business') as Promise<T>;
}

export async function authRequest<T>(url: string, options: AxiosRequestConfig = {}): Promise<T> {
  return handleMockRequest<T>(url, options, 'auth') as Promise<T>;
}

export default {
  request,
};
