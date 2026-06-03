export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  mobile: string;
  location: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserData {
  accessToken: string;
  refreshToken: string;
  email: string;
  name: string;
  mobile: string;
  location: string;
  expiration: string; // ISO date string
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: UserData;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenData {
  accessToken: string;
  refreshToken: string;
  expiration: string; // ISO date string
}

export interface RefreshTokenResponse {
  success: boolean;
  message: string;
  data: RefreshTokenData;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export interface ProfileData {
  email: string;
  name: string;
  mobile: string;
  location: string;
}

export interface ProfileResponse {
  success: boolean;
  message?: string;
  data?: ProfileData;
}
