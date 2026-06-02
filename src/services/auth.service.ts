import api from "@/lib/axios";
import {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from "./auth.types";

export const authService = {
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await api.post<RegisterResponse>("auth/register", data);
    return response.data;
  },

  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>("auth/login", data);
    return response.data;
  },

  async forgotPassword(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    const response = await api.post<ForgotPasswordResponse>("forgot-password", data);
    return response.data;
  },

  async resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    const response = await api.post<ResetPasswordResponse>("reset-password", data);
    return response.data;
  },
};
