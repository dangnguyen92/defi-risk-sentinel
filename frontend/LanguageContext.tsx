import React, { createContext, useContext, useState } from 'react';

export type Language = 'vi' | 'en';

const translations = {
  vi: {
    headerSubtitle: 'Hệ thống thẩm định rủi ro tài chính tự động. Nhập URL chiến dịch để nhận báo cáo phân tích khắt khe.',
    inputTitle: 'Thông tin đầu vào',
    campaignLabel: 'URL Chiến dịch (Campaign)',
    termsLabel: 'URL Điều khoản (Terms)',
    notesLabel: 'Ghi chú bổ sung (Thủ công)',
    notesPlaceholder: 'Nhập các thông tin chi tiết khác nếu có (APR, thời gian lock, cơ chế thưởng...)',
    analyzeBtn: 'Thẩm định ngay',
    analyzingBtn: 'Đang xem xét...',
    clearBtn: 'Xóa hết',
    clearConfirm: 'Bạn có chắc chắn muốn xóa hết thông tin?',
    resultTitle: 'Kết quả thẩm định',
    idleMessage: 'Nhập thông tin và nhấn "Thẩm định" để bắt đầu',
    loadingMessage: 'AI đang đọc dữ liệu & phân tích. Quá trình này thường mất vài phút...',
    overviewTitle: 'Thông tin tổng quan chiến dịch',
    duration: 'Thời gian',
    depositedAsset: 'Tài sản nạp',
    rewardAsset: 'Tài sản thưởng',
    participationLimit: 'Hạn mức',
    referenceProfit: 'Lợi nhuận tham khảo',
    redFlag: 'CỜ ĐỎ',
    yellowFlag: 'CỜ VÀNG',
    greenFlag: 'AN TOÀN',
    errorDefault: 'Không thể hoàn thành thẩm định.',
    errorNoUrl: 'Vui lòng nhập ít nhất một URL chiến dịch.',
    errorUnknown: 'Đã xảy ra lỗi không xác định.',
    addUrl: 'Thêm URL',
    removeUrl: 'Xóa URL',
    emptyUrl: 'Chưa có URL nào. Nhấn "Thêm URL" để nhập.',
    serverError: (status: number) => `Server error (${status}). Vui lòng thử lại.`,
    // PDF
    pdfHeader: 'BAO CAO THAM DINH RUI RO DEFI',
    pdfInputSection: '1. THONG TIN DAU VAO:',
    pdfCampaignUrl: 'URL Chien dich:',
    pdfTermsUrl: 'URL Terms & Conditions:',
    pdfModel: (model: string) => `Model su dung: ${model}`,
    pdfNotes: 'Ghi chu thu cong:',
    pdfOverviewSection: '2. THONG TIN TONG QUAN CHIEN DICH:',
    pdfDuration: (v: string) => `Thoi gian: ${v}`,
    pdfDeposited: (v: string) => `Tai san nap: ${v}`,
    pdfReward: (v: string) => `Tai san thuong: ${v}`,
    pdfLimit: (v: string) => `Han muc tham gia: ${v}`,
    pdfProfit: (v: string) => `Loi nhuan tham khao: ${v}`,
    pdfResultSection: '3. KET QUA THAM DINH CHI TIET:',
    pdfTimestamp: (date: string) => `Thoi gian xuat bao cao: ${date}`,
  },
  en: {
    headerSubtitle: 'Automated financial risk assessment system. Enter campaign URL to receive a rigorous analysis report.',
    inputTitle: 'Input Information',
    campaignLabel: 'Campaign URLs',
    termsLabel: 'Terms & Conditions URLs',
    notesLabel: 'Additional Notes (Manual)',
    notesPlaceholder: 'Enter additional details if available (APR, lock period, reward mechanism...)',
    analyzeBtn: 'Analyze Now',
    analyzingBtn: 'Analyzing...',
    clearBtn: 'Clear All',
    clearConfirm: 'Are you sure you want to clear all information?',
    resultTitle: 'Assessment Results',
    idleMessage: 'Enter information and click "Analyze" to start',
    loadingMessage: 'AI is reading data & analyzing. This process typically takes several minutes...',
    overviewTitle: 'Campaign Overview',
    duration: 'Duration',
    depositedAsset: 'Deposited Asset',
    rewardAsset: 'Reward Asset',
    participationLimit: 'Participation Limit',
    referenceProfit: 'Reference Profit',
    redFlag: 'RED FLAG',
    yellowFlag: 'YELLOW FLAG',
    greenFlag: 'SAFE',
    errorDefault: 'Unable to complete the assessment.',
    errorNoUrl: 'Please enter at least one campaign URL.',
    errorUnknown: 'An unknown error occurred.',
    addUrl: 'Add URL',
    removeUrl: 'Remove URL',
    emptyUrl: 'No URLs added. Click "Add URL" to enter one.',
    serverError: (status: number) => `Server error (${status}). Please try again.`,
    // PDF
    pdfHeader: 'DEFI RISK ASSESSMENT REPORT',
    pdfInputSection: '1. INPUT INFORMATION:',
    pdfCampaignUrl: 'Campaign URLs:',
    pdfTermsUrl: 'Terms & Conditions URLs:',
    pdfModel: (model: string) => `Model used: ${model}`,
    pdfNotes: 'Manual notes:',
    pdfOverviewSection: '2. CAMPAIGN OVERVIEW:',
    pdfDuration: (v: string) => `Duration: ${v}`,
    pdfDeposited: (v: string) => `Deposited asset: ${v}`,
    pdfReward: (v: string) => `Reward asset: ${v}`,
    pdfLimit: (v: string) => `Participation limit: ${v}`,
    pdfProfit: (v: string) => `Reference profit: ${v}`,
    pdfResultSection: '3. DETAILED ASSESSMENT RESULTS:',
    pdfTimestamp: (date: string) => `Report exported at: ${date}`,
  },
} as const;

export type Translations = typeof translations['vi'];

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'vi',
  setLang: () => {},
  t: translations.vi,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>('vi');
  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
