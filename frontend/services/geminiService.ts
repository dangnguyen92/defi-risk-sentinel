import { BilingualAnalysisResult } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const analyzeRisk = async (
  campaignUrls: string[],
  termUrls: string[],
  notes: string,
  modelId: string,
): Promise<BilingualAnalysisResult> => {
  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ campaignUrls, termUrls, notes, modelId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.error || `Server error (${response.status}). Please try again.`
    );
  }

  return response.json() as Promise<BilingualAnalysisResult>;
};
