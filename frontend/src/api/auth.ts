import apiClient from './client';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  full_name?: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserResponse {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  role: string;
  is_active: boolean;
}

export async function loginApi(payload: LoginPayload): Promise<TokenResponse> {
  // Backend expects form-encoded body (OAuth2PasswordRequestForm)
  const form = new URLSearchParams();
  form.append('username', payload.username);
  form.append('password', payload.password);
  const res = await apiClient.post<TokenResponse>('/api/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return res.data;
}

export async function registerApi(payload: RegisterPayload): Promise<UserResponse> {
  const res = await apiClient.post<UserResponse>('/api/auth/register', payload);
  return res.data;
}

export async function getMeApi(accessToken?: string): Promise<UserResponse> {
  const res = await apiClient.get<UserResponse>('/api/auth/me', {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  return res.data;
}
