import axios from "axios";
import { resolveApiBaseUrl } from "@/utils/apiBaseUrl";

export interface SessionProfile {
  id: number;
  username: string;
  first_name?: string;
  displayName?: string;
  is_superuser: boolean;
  role: "admin" | "operator";
  can_visit_realtime: boolean;
  can_visit_history: boolean;
}

const service = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
  timeout: 10_000,
});

export async function fetchSessionProfile(): Promise<SessionProfile> {
  const response = await service.get<SessionProfile>("/api/auth/session");
  return response.data;
}
