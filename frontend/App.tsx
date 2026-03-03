import React, { useState, useRef, useEffect } from 'react';
import { UrlInputList, isValidUrl } from './components/UrlInputList';
import { analyzeRisk } from './services/geminiService';
import { AnalysisStatus, BilingualAnalysisResult } from './types';
import { useLanguage, Language } from './LanguageContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, Trash, ShieldCheck, Download, AlertTriangle, Loader2, Info, Calendar, Coins, TrendingUp, Ban, ChevronDown, Globe } from 'lucide-react';
import jsPDF from 'jspdf';

const getText = (children: React.ReactNode): string => {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(getText).join('');
  if (React.isValidElement(children)) {
    return getText((children.props as { children?: React.ReactNode }).children);
  }
  return '';
};

const LanguageDropdown: React.FC = () => {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const options: { value: Language; label: string }[] = [
    { value: 'vi', label: 'Tiếng Việt' },
    { value: 'en', label: 'English' },
  ];

  const current = options.find(o => o.value === lang)!;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-700 border border-slate-700 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 transition-all"
      >
        <Globe size={14} className="text-emerald-400" />
        <span>{current.label}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-36 bg-slate-800 border border-slate-700 rounded-lg shadow-xl shadow-black/40 overflow-hidden z-50">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setLang(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs sm:text-sm transition-colors ${
                lang === opt.value
                  ? 'bg-emerald-600/20 text-emerald-400 font-medium'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const { lang, t } = useLanguage();
  const [campaignUrls, setCampaignUrls] = useState<string[]>(['']);
  const [termUrls, setTermUrls] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [model, setModel] = useState<string>('claude-opus-4-6');
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [bilingualResult, setBilingualResult] = useState<BilingualAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const result = bilingualResult ? bilingualResult[lang] : null;

  const handleClear = () => {
    if (window.confirm(t.clearConfirm)) {
      setCampaignUrls(['']);
      setTermUrls([]);
      setNotes('');
      setBilingualResult(null);
      setStatus(AnalysisStatus.IDLE);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    const validCampaignUrls = campaignUrls.filter(u => u.trim() !== '');
    if (validCampaignUrls.length === 0) {
      setError(t.errorNoUrl);
      return;
    }

    const validTermUrls = termUrls.filter(u => u.trim() !== '');
    const allUrls = [...validCampaignUrls, ...validTermUrls];
    if (allUrls.some(u => !isValidUrl(u))) {
      setError(t.errorInvalidUrl);
      return;
    }

    setStatus(AnalysisStatus.LOADING);
    setError(null);
    setBilingualResult(null);

    try {
      const data = await analyzeRisk(validCampaignUrls, validTermUrls, notes, model);
      setBilingualResult(data);
      setStatus(AnalysisStatus.SUCCESS);
    } catch (err: any) {
      setError(err.message || t.errorUnknown);
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const fontCacheRef = useRef<{ regular?: string; bold?: string }>({});

  const loadFonts = async (): Promise<{ regular: string; bold: string }> => {
    if (fontCacheRef.current.regular && fontCacheRef.current.bold) {
      return fontCacheRef.current as { regular: string; bold: string };
    }

    const toBase64 = (buf: ArrayBuffer): string => {
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    };

    const [regularBuf, boldBuf] = await Promise.all([
      fetch('/fonts/Roboto-Regular.ttf').then(r => r.arrayBuffer()),
      fetch('/fonts/Roboto-Bold.ttf').then(r => r.arrayBuffer()),
    ]);

    fontCacheRef.current.regular = toBase64(regularBuf);
    fontCacheRef.current.bold = toBase64(boldBuf);
    return fontCacheRef.current as { regular: string; bold: string };
  };

  const handleExportPDF = async () => {
    if (!result) return;

    const fonts = await loadFonts();
    const doc = new jsPDF();

    doc.addFileToVFS('Roboto-Regular.ttf', fonts.regular);
    doc.addFileToVFS('Roboto-Bold.ttf', fonts.bold);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxLineWidth = pageWidth - margin * 2;
    let yPos = 20;

    const addText = (text: string, fontSize: number = 10, isBold: boolean = false, color: string = '#000000') => {
        doc.setFontSize(fontSize);
        doc.setFont("Roboto", isBold ? "bold" : "normal");
        doc.setTextColor(color);
        
        const splitText = doc.splitTextToSize(text, maxLineWidth);
        
        if (yPos + splitText.length * fontSize * 0.5 > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            yPos = 20;
        }

        doc.text(splitText, margin, yPos);
        yPos += splitText.length * 6 + 4;
    };

    // Header
    addText(t.pdfHeader, 16, true);
    yPos += 5;
    
    // Inputs
    addText(t.pdfInputSection, 12, true);
    addText(t.pdfCampaignUrl, 10, true);
    campaignUrls.filter(u => u).forEach(u => addText(`- ${u}`));
    
    if (termUrls.filter(u => u).length > 0) {
        addText(t.pdfTermsUrl, 10, true);
        termUrls.filter(u => u).forEach(u => addText(`- ${u}`));
    }
    
    addText(t.pdfModel(model), 10, false, '#555555');
    
    if (notes.trim()) {
        addText(t.pdfNotes, 10, true);
        addText(notes);
    }
    yPos += 5;

    // Overview
    addText(t.pdfOverviewSection, 12, true);
    addText(t.pdfDuration(result.overview.duration));
    addText(t.pdfDeposited(result.overview.depositedAsset));
    addText(t.pdfReward(result.overview.rewardAsset));
    addText(t.pdfLimit(result.overview.participationLimit));
    addText(t.pdfProfit(result.overview.referenceProfit));
    yPos += 5;

    // Result
    addText(t.pdfResultSection, 12, true);
    
    const cleanResult = result.riskReport
        .replace(/\*\*/g, "")
        .replace(/###/g, "")
        .replace(/\|/g, "  ")
        .replace(/---/g, "");

    addText(cleanResult, 10, false);

    // Footer
    const date = new Date().toLocaleString();
    doc.setTextColor('#888888');
    addText(`\n${t.pdfTimestamp(date)}`, 8, false);

    doc.save("defi-risk-report.pdf");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        
        {/* Language Dropdown - top right */}
        <div className="flex justify-end mb-2 sm:mb-0">
          <LanguageDropdown />
        </div>

        {/* Header */}
        <header className="mb-6 sm:mb-10 text-center -mt-6 sm:-mt-8">
          <div className="inline-flex items-center justify-center p-2.5 sm:p-3 bg-emerald-500/10 rounded-full mb-3 sm:mb-4 ring-1 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1.5 sm:mb-2 tracking-tight">
            DeFi Risk <span className="text-emerald-400">Sentinel</span>
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto text-xs sm:text-sm lg:text-base">
            {t.headerSubtitle}
          </p>
        </header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
          
          {/* Left Column: Inputs */}
          <div className="xl:col-span-4 space-y-4 sm:space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-xl backdrop-blur-sm">
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6 flex items-center gap-2 border-b border-slate-800 pb-3 sm:pb-4">
                <FileText className="w-5 h-5 text-emerald-400" />
                {t.inputTitle}
              </h2>
              
              <UrlInputList 
                label={t.campaignLabel}
                urls={campaignUrls} 
                setUrls={setCampaignUrls} 
                required={true}
                addUrlLabel={t.addUrl}
                removeUrlLabel={t.removeUrl}
                emptyLabel={t.emptyUrl}
                invalidUrlLabel={t.invalidUrlLabel}
              />

              <UrlInputList 
                label={t.termsLabel}
                urls={termUrls} 
                setUrls={setTermUrls}
                addUrlLabel={t.addUrl}
                removeUrlLabel={t.removeUrl}
                emptyLabel={t.emptyUrl}
                invalidUrlLabel={t.invalidUrlLabel}
              />

              <div className="mb-4 sm:mb-6">
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  {t.notesLabel}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.notesPlaceholder}
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5 sm:p-3 min-h-[100px] sm:min-h-[120px] transition-all placeholder-gray-600 resize-y"
                />
              </div>

              {error && (
                <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-red-900/20 border border-red-800 text-red-300 rounded-lg text-xs sm:text-sm flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2 sm:gap-3 pt-2">
                <button
                  onClick={handleAnalyze}
                  disabled={status === AnalysisStatus.LOADING}
                  className="flex-1 text-white bg-emerald-600 hover:bg-emerald-500 focus:ring-4 focus:outline-none focus:ring-emerald-800 font-medium rounded-lg text-sm px-3 sm:px-4 py-2.5 text-center flex justify-center items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/50"
                >
                  {status === AnalysisStatus.LOADING ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> <span className="hidden sm:inline">{t.analyzingBtn}</span>
                    </>
                  ) : (
                    t.analyzeBtn
                  )}
                </button>
                <button
                  onClick={handleClear}
                  disabled={status === AnalysisStatus.LOADING}
                  className="px-2.5 sm:px-3 py-2.5 text-slate-400 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg transition-colors border border-slate-700 disabled:opacity-50"
                  title={t.clearBtn}
                >
                  <Trash size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="xl:col-span-8">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-xl backdrop-blur-sm flex flex-col min-h-[300px] sm:min-h-[400px]">
              <div className="flex justify-between items-center mb-4 sm:mb-6 border-b border-slate-800 pb-3 sm:pb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  {t.resultTitle}
                </h2>
                {status === AnalysisStatus.SUCCESS && result && (
                  <button
                    onClick={handleExportPDF}
                    className="text-xs flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 bg-emerald-900/20 hover:bg-emerald-900/40 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all border border-emerald-900/50"
                  >
                    <Download size={14} /> <span className="hidden sm:inline">Export</span> PDF
                  </button>
                )}
              </div>

              <div className="flex-grow">
                {status === AnalysisStatus.IDLE && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60 py-12 sm:py-0">
                    <ShieldCheck className="w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4 stroke-1" />
                    <p className="text-sm sm:text-base">{t.idleMessage}</p>
                  </div>
                )}

                {status === AnalysisStatus.LOADING && (
                  <div className="h-full flex flex-col items-center justify-center text-emerald-500 py-12 sm:py-0">
                    <div className="relative w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4">
                      <div className="absolute top-0 left-0 w-full h-full border-4 border-slate-700 rounded-full"></div>
                      <div className="absolute top-0 left-0 w-full h-full border-4 border-emerald-500 rounded-full animate-spin border-t-transparent"></div>
                    </div>
                    <p className="animate-pulse text-xs sm:text-sm font-medium">{t.loadingMessage}</p>
                    <p className="text-xs text-slate-500 mt-2">Model: {model}</p>
                  </div>
                )}

                {status === AnalysisStatus.SUCCESS && result && (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Campaign Overview */}
                    <div className="bg-slate-950/50 rounded-lg border border-slate-700 p-3 sm:p-4">
                      <h3 className="text-xs sm:text-sm font-bold text-emerald-400 uppercase mb-2 sm:mb-3 flex items-center gap-2">
                        <Info size={16} /> {t.overviewTitle}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 text-sm">
                        <div className="bg-slate-900/50 p-2.5 sm:p-3 rounded border border-slate-800">
                           <div className="text-slate-400 text-xs mb-1 flex items-center gap-1"><Calendar size={12}/> {t.duration}</div>
                           <div className="font-medium text-white text-xs sm:text-sm">{result.overview.duration}</div>
                        </div>
                        <div className="bg-slate-900/50 p-2.5 sm:p-3 rounded border border-slate-800">
                           <div className="text-slate-400 text-xs mb-1 flex items-center gap-1"><Coins size={12}/> {t.depositedAsset}</div>
                           <div className="font-medium text-white text-xs sm:text-sm">{result.overview.depositedAsset}</div>
                        </div>
                        <div className="bg-slate-900/50 p-2.5 sm:p-3 rounded border border-slate-800">
                           <div className="text-slate-400 text-xs mb-1 flex items-center gap-1"><Coins size={12}/> {t.rewardAsset}</div>
                           <div className="font-medium text-white text-xs sm:text-sm">{result.overview.rewardAsset}</div> 
                        </div>
                        <div className="bg-slate-900/50 p-2.5 sm:p-3 rounded border border-slate-800">
                           <div className="text-slate-400 text-xs mb-1 flex items-center gap-1"><Ban size={12}/> {t.participationLimit}</div>
                           <div className="font-medium text-white text-xs sm:text-sm">{result.overview.participationLimit}</div>
                        </div>
                        <div className="sm:col-span-2 bg-emerald-900/10 p-2.5 sm:p-3 rounded border border-emerald-900/30">
                           <div className="text-emerald-400 text-xs mb-1 flex items-center gap-1"><TrendingUp size={12}/> {t.referenceProfit}</div>
                           <div className="font-medium text-white text-xs sm:text-sm">{result.overview.referenceProfit}</div>
                        </div>
                      </div>
                    </div>

                    {/* Markdown Result */}
                    <div className="prose prose-invert prose-sm max-w-none">
                      <div className="markdown-result bg-slate-950/50 p-3 sm:p-4 rounded-lg border border-slate-800">
                        <ReactMarkdown 
  remarkPlugins={[remarkGfm]}
  components={{
    h3: ({node, children, ...props}) => (
      <h3 className="text-xs sm:text-sm font-bold text-emerald-400 uppercase mb-2 sm:mb-3 flex items-center gap-2" {...props}>
        <ShieldCheck size={16} />
        <span>{children}</span>
      </h3>
    ),
    table: ({node, ...props}) => (
      <div className="overflow-x-auto my-4 sm:my-6 rounded-lg sm:rounded-xl border border-slate-700 shadow-2xl shadow-black/50 -mx-1 sm:mx-0">
        <table className="w-full text-left border-collapse text-xs sm:text-sm" {...props} />
      </div>
    ),
    th: ({node, ...props}) => (
      <th className="bg-slate-800/80 px-2.5 py-2 sm:p-4 font-bold text-emerald-400 border-b border-slate-600 uppercase text-[10px] sm:text-xs tracking-wider whitespace-nowrap" {...props} />
    ),
    td: ({node, children, ...props}) => {
      const text = getText(children);
      const upperText = text.toUpperCase();
      const isStatusCell = text.length < 50; 

      if (isStatusCell) {
        if (upperText.includes('ĐỎ') || upperText.includes('RED')) {
          return (
            <td className="px-2.5 py-2 sm:p-4 border-b border-slate-700/50 bg-red-950/40" {...props}>
              <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 whitespace-nowrap">
                <AlertTriangle size={12} className="sm:w-3.5 sm:h-3.5" /> {t.redFlag}
              </span>
            </td>
          );
        }
        if (upperText.includes('VÀNG') || upperText.includes('YELLOW')) {
          return (
            <td className="px-2.5 py-2 sm:p-4 border-b border-slate-700/50 bg-yellow-950/20" {...props}>
              <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 whitespace-nowrap">
                <Info size={12} className="sm:w-3.5 sm:h-3.5" /> {t.yellowFlag}
              </span>
            </td>
          );
        }
        if (upperText.includes('XANH') || upperText.includes('GREEN')) {
          return (
            <td className="px-2.5 py-2 sm:p-4 border-b border-slate-700/50" {...props}>
              <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                <ShieldCheck size={12} className="sm:w-3.5 sm:h-3.5" /> {t.greenFlag}
              </span>
            </td>
          );
        }
      }
      return <td className="px-2.5 py-2 sm:p-4 border-b border-slate-700/50 text-slate-300 leading-relaxed text-xs sm:text-sm" {...props}>{children}</td>;
    },
    p: ({node, ...props}) => <p className="mb-3 sm:mb-4 leading-relaxed text-slate-300 text-xs sm:text-sm" {...props} />,
    ul: ({node, ...props}) => <ul className="list-disc pl-4 sm:pl-5 mb-3 sm:mb-4 space-y-1.5 sm:space-y-2 text-slate-300 text-xs sm:text-sm" {...props} />,
    li: ({node, ...props}) => <li className="pl-0.5 sm:pl-1" {...props} />,
    strong: ({node, children, ...props}) => {
      return <strong className="text-white font-bold" {...props}>{children}</strong>;
    },
  }}
>
  {result.riskReport}
</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
                
                {status === AnalysisStatus.ERROR && (
                  <div className="h-full flex flex-col items-center justify-center text-red-400 py-12 sm:py-0">
                     <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 mb-2 sm:mb-3 opacity-80" />
                     <p className="text-center max-w-xs text-sm">{error || t.errorDefault}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 sm:mt-12 text-center text-slate-600 text-xs">
          <p>© {new Date().getFullYear()} DeFi Risk Sentinel. Not financial advice.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;