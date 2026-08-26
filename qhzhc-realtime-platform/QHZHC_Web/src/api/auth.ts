import request from "@/utils/request";
import type { SessionProfile } from "@/services/authSession";

export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  displayName: string;
}

export async function userLogin(payload: LoginPayload): Promise<SessionProfile> {
  const response = await request.post<SessionProfile>("/api/auth/login", payload);
  return response.data;
}

export async function userRegister(
  payload: RegisterPayload,
): Promise<SessionProfile> {
  const response = await request.post<SessionProfile>("/api/auth/register", payload);
  return response.data;
}

export async function userLogout(): Promise<void> {
  await request.post("/api/auth/logout");
}
