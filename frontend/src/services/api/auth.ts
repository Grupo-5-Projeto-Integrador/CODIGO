export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: Record<string, unknown>;
  message?: string;
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "E-mail ou senha inválidos");
  }
  return data as LoginResponse;
}
