export interface User {
  id: string;
  name: string;
  email: string;
  created_at?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
