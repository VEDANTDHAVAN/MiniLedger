import { api } from "./api";
import * as ImagePicker from "expo-image-picker";

export interface Loan {
  id: string;
  friendName: string;
  amount: string;
  dueDate: string;
  isRepaid: boolean;
  isOverdue: boolean;
  repaidAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoanSummary {
  totalLent: string;
  totalRepaid: string;
  overdueAmount: string;
}

export interface CreateLoanInput {
  friendName: string;
  amount: number;
  dueDate: string;
}

export async function fetchLoans(): Promise<Loan[]> {
  const response = await api.get("/loans");
  const loans = response.data.data;

  if (!Array.isArray(loans)) {
    throw new Error("Invalid response from the loans API.");
  }

  return loans;
}

export async function fetchSummary(): Promise<LoanSummary> {
  const response = await api.get("/summary");
  const summary = response.data.data;

  if (
    !summary ||
    summary.totalLent === undefined ||
    summary.totalRepaid === undefined ||
    summary.overdueAmount === undefined
  ) {
    throw new Error("Invalid response from the summary API.");
  }

  return {
    totalLent: String(summary.totalLent),
    totalRepaid: String(summary.totalRepaid),
    overdueAmount: String(summary.overdueAmount),
  };
}

export async function createLoan(
  input: CreateLoanInput,
): Promise<Loan> {
  const response = await api.post("/loans", input);
  return response.data.data as Loan;
}

export async function repayLoan(id: string): Promise<Loan> {
  const response = await api.patch(`/loans/${id}/repay`);
  return response.data.data as Loan;
}


export async function uploadReceipt(
  loanId: string,
  image: ImagePicker.ImagePickerAsset
): Promise<{ loanId: string; receiptImagePath: string }> {
  const formData = new FormData();

  formData.append(
    "receipt",
    {
      uri: image.uri,
      name: image.fileName ?? `receipt-${Date.now()}.jpg`,
      type: image.mimeType ?? "image/jpeg",
    } as any
  );

  const response = await api.post(
    `/loans/${loanId}/receipt`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data.data;
}
