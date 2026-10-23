
import { api } from "./api";

export interface RequestOtpResponse {
  success: boolean;
  message: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  token: string;
}

export async function requestOtp(phone: string) {
  const response = await api.post<RequestOtpResponse>(
    "/auth/request-otp",
    { phone },
  );

  return response.data;
}

export async function verifyOtp(
  phone: string,
  otp: string,
): Promise<VerifyOtpResponse> {
  const response = await api.post<VerifyOtpResponse>(
    "/auth/verify-otp",
    { phone, otp },
  );

  return response.data;
}
