import request from "@/utils/request";

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

export async function fetchSessionProfile(): Promise<SessionProfile> {
  const response = await request.get<SessionProfile>("/api/auth/session");
  return response.data;
}
