import { performanceMonitor } from '@/services/performance/monitor';
import request from "@/utils/request";
import { accessTokenManager } from "@/services/accessToken";
import type { SessionProfile } from "@/services/authSession";

export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  displayName: string;
}

interface AuthResponse extends SessionProfile {
  accessToken: string;
  accessTokenExpiresAt: number;
  user: SessionProfile;
}

export async function userLogin(payload: LoginPayload): Promise<SessionProfile> {
  const response = await request.post<AuthResponse>("/api/auth/login", payload);
  accessTokenManager.setAccessToken(response.data.accessToken);
  return response.data.user || response.data;
}

export async function userRegister(
  payload: RegisterPayload,
): Promise<SessionProfile> {
  const response = await request.post<AuthResponse>("/api/auth/register", payload);
  accessTokenManager.setAccessToken(response.data.accessToken);
  return response.data.user || response.data;
}

export async function userLogout(): Promise<void> {
  performanceMonitor.endView();
  try {
    await request.post("/api/auth/logout");
  } finally {
    accessTokenManager.clearAccessToken();
  }
}
