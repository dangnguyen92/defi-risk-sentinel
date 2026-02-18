export interface CampaignOverview {
  duration: string;
  depositedAsset: string;
  rewardAsset: string;
  participationLimit: string;
  referenceProfit: string;
}

export interface AnalysisResult {
  overview: CampaignOverview;
  riskReport: string;
}

export interface BilingualAnalysisResult {
  vi: AnalysisResult;
  en: AnalysisResult;
}

export interface RiskReport {
  campaignUrls: string[];
  termUrls: string[];
  notes: string;
  analysis: AnalysisResult;
  timestamp: string;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}