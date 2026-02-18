import "dotenv/config";
import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import puppeteer, { Browser } from "puppeteer";

const app = express();
const PORT = Number(process.env.PORT) || 8000;

// Middleware
app.use(cors({
  origin(origin, callback) {
    // Allow requests from any localhost port (dev) or no origin (e.g. curl)
    if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
}));
app.use(express.json());

// --- Anthropic Client ---
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// --- System Instruction (bilingual output in one call) ---
const SYSTEM_INSTRUCTION = `
Role: You are an extremely rigorous DeFi Risk Assessor (Chuyên gia Thẩm định Rủi ro DeFi).

Tasks:
1. Extract the campaign overview information.
2. Read the rules/terms of Incentive / Pre-deposit / Yield Farming programs from the provided URLs or information and produce a risk report.

Assessment Principles (Red Flags):
1. ASSETS: Only accept single-sided deposits for Stablecoins. Absolutely DO NOT accept providing paired liquidity (LP) with Impermanent Loss risk.
2. POSITION: Immediately flag as Red if deposited funds are forced into becoming liquidity for a market maker (Liquidity Pool) or pushed into derivatives trading balance (Trading Balance).
3. WITHDRAWAL: Flag as Red if capital is locked with no withdrawal allowed under any circumstances. Early withdrawal that forfeits all interest/Points is a Yellow Flag, but penalties that eat into the Principal is a Red Flag.
4. REWARDS: Rewards in Stablecoins are Green Flag. Rewards in Points with unclear value or low-liquidity project tokens are Yellow Flag.

CRITICAL OUTPUT FORMAT:
Return results as pure JSON (Raw JSON), do NOT use Markdown code blocks.
You MUST return the full analysis in BOTH Vietnamese and English within a single JSON object.

Required JSON structure:
{
  "vi": {
    "overview": {
      "duration": "Thời gian bắt đầu - kết thúc",
      "depositedAsset": "Tài sản nạp",
      "rewardAsset": "Tài sản thưởng",
      "participationLimit": "Hạn mức",
      "referenceProfit": "Lợi nhuận tham khảo (ước tính cho 1000$)"
    },
    "riskReport": "Báo cáo rủi ro đầy đủ bằng tiếng Việt dưới dạng Markdown string."
  },
  "en": {
    "overview": {
      "duration": "Start date - End date",
      "depositedAsset": "Deposited asset",
      "rewardAsset": "Reward asset",
      "participationLimit": "Participation limit",
      "referenceProfit": "Reference profit (estimated for $1000)"
    },
    "riskReport": "Full risk report in English as a Markdown string."
  }
}

Detailed requirements for the "riskReport" field (applies to BOTH "vi" and "en" versions):

Vietnamese version ("vi.riskReport"):
1. Bắt đầu bằng tiêu đề cấp 3 (###): "BÁO CÁO THẨM ĐỊNH RỦI RO - [TÊN CHIẾN DỊCH]".
2. Bảng phân tích rủi ro với đúng 3 cột và 4 dòng tiêu chí:
   | Tiêu chí | Phân tích số liệu từ Thể lệ | Đánh giá (Xanh / Vàng / Đỏ) |
   | :--- | :--- | :--- |
   | **Bản chất Vị thế** | (Phân tích chi tiết) | (Chỉ ghi: Xanh, Vàng, hoặc Đỏ) |
   | **Cơ chế Giam vốn** | (Phân tích chi tiết) | (Chỉ ghi: Xanh, Vàng, hoặc Đỏ) |
   | **Phân bổ Thưởng** | (Phân tích chi tiết) | (Chỉ ghi: Xanh, Vàng, hoặc Đỏ) |
   | **Loại Phần thưởng** | (Phân tích chi tiết) | (Chỉ ghi: Xanh, Vàng, hoặc Đỏ) |
3. Phần KẾT LUẬN HÀNH ĐỘNG (QUYẾT ĐỊNH: GIẢI NGÂN / BỎ QUA) với 3-5 lý do dạng danh sách gạch đầu dòng (-).

English version ("en.riskReport"):
1. Start with a level-3 heading (###): "RISK ASSESSMENT REPORT - [CAMPAIGN NAME]".
2. Risk analysis table with exactly 3 columns and 4 criteria rows:
   | Criteria | Analysis from Terms & Conditions | Rating (Green / Yellow / Red) |
   | :--- | :--- | :--- |
   | **Position Nature** | (Detailed analysis) | (Only write: Green, Yellow, or Red) |
   | **Capital Lock Mechanism** | (Detailed analysis) | (Only write: Green, Yellow, or Red) |
   | **Reward Distribution** | (Detailed analysis) | (Only write: Green, Yellow, or Red) |
   | **Reward Type** | (Detailed analysis) | (Only write: Green, Yellow, or Red) |
3. ACTION CONCLUSION section (DECISION: DISBURSE / SKIP) with 3-5 reasons as bullet points (-).

Both versions:
- Use standard Markdown format.
- Ensure line breaks are properly encoded in JSON string (\\n).
- Do NOT add any text outside the JSON.
- The analysis content must be equivalent — same assessment, same ratings, just different languages.
`;

// --- Types ---
interface AnalyzeRequest {
  campaignUrls: string[];
  termUrls: string[];
  notes: string;
  modelId: string;
}

interface AnalysisResult {
  overview: {
    duration: string;
    depositedAsset: string;
    rewardAsset: string;
    participationLimit: string;
    referenceProfit: string;
  };
  riskReport: string;
}

interface BilingualAnalysisResult {
  vi: AnalysisResult;
  en: AnalysisResult;
}

// --- Puppeteer Browser Pool ---
let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-blink-features=AutomationControlled",
      ],
    });
  }
  return browserInstance;
}

// Graceful shutdown
process.on("SIGINT", async () => {
  if (browserInstance) await browserInstance.close();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  if (browserInstance) await browserInstance.close();
  process.exit(0);
});

// --- URL Content Fetcher (Puppeteer) ---
async function fetchUrlContent(url: string): Promise<string> {
  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Mimic a real browser
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1440, height: 900 });
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
    });

    // Block images/fonts/media to speed up loading
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const type = req.resourceType();
      if (["image", "font", "media", "stylesheet"].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Navigate and wait for content to render
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait a bit more for SPA hydration
    await page.evaluate(() => new Promise((r) => setTimeout(r, 2000)));

    // Extract text content from the rendered page
    const content = await page.evaluate(() => {
      // Remove noise elements
      const removeSelectors = [
        "script", "style", "noscript", "iframe", "svg",
        "nav", "footer", "header",
        "[aria-hidden='true']",
        ".cookie-banner", ".popup", ".modal",
      ];
      removeSelectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => el.remove());
      });

      // Try to get main content first, fall back to body
      const main =
        document.querySelector("main") ||
        document.querySelector("article") ||
        document.querySelector('[role="main"]') ||
        document.querySelector("#content") ||
        document.querySelector(".content") ||
        document.body;

      return main?.innerText || "";
    });

    // Clean up whitespace
    const cleaned = content
      .replace(/\t/g, " ")
      .replace(/ {2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const maxLength = 8000;
    if (cleaned.length > maxLength) {
      return cleaned.substring(0, maxLength) + "\n\n[... nội dung bị cắt bớt do quá dài ...]";
    }

    return cleaned || "[Không tìm thấy nội dung văn bản trên trang này]";
  } catch (error: any) {
    console.error(`Error fetching ${url}:`, error.message);
    return `[Lỗi tải trang ${url}: ${error.message}]`;
  } finally {
    if (page) await page.close();
  }
}

async function fetchAllUrls(urls: string[]): Promise<{ url: string; content: string }[]> {
  const results: { url: string; content: string }[] = [];
  // Fetch sequentially to avoid overloading the browser
  for (const url of urls) {
    console.log(`  Fetching: ${url}`);
    const content = await fetchUrlContent(url);
    console.log(`  Done: ${url} (${content.length} chars)`);
    results.push({ url, content });
  }
  return results;
}

// --- Routes ---

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Main analysis endpoint
app.post("/api/analyze", async (req, res) => {
  try {
    const { campaignUrls, termUrls, notes, modelId } = req.body as AnalyzeRequest;

    // Validation
    if (!campaignUrls || campaignUrls.length === 0) {
      res.status(400).json({ error: "campaignUrls is required and must not be empty." });
      return;
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(500).json({ error: "Server misconfiguration: API key not set." });
      return;
    }

    const today = new Date().toLocaleDateString("vi-VN");
    let prompt = `Today's date / Hôm nay: ${today}. Analyze the following DeFi campaign:\n\n`;

    // Fetch actual page content from URLs
    console.log(`[${new Date().toISOString()}] Fetching URL content...`);

    const allUrls = [
      ...campaignUrls.map((u: string) => ({ url: u, type: "campaign" })),
      ...((termUrls || []) as string[]).map((u: string) => ({ url: u, type: "terms" })),
    ];

    const fetchedPages = await fetchAllUrls(allUrls.map((u) => u.url));

    // Build prompt with fetched content
    const campaignPages = fetchedPages.filter((_, i) => allUrls[i].type === "campaign");
    const termPages = fetchedPages.filter((_, i) => allUrls[i].type === "terms");

    if (campaignPages.length > 0) {
      prompt += "=== CAMPAIGN PAGE CONTENT ===\n";
      for (const page of campaignPages) {
        prompt += `\nURL: ${page.url}\nContent:\n${page.content}\n`;
        prompt += "---\n";
      }
    }

    if (termPages.length > 0) {
      prompt += "\n=== TERMS & CONDITIONS PAGE CONTENT ===\n";
      for (const page of termPages) {
        prompt += `\nURL: ${page.url}\nContent:\n${page.content}\n`;
        prompt += "---\n";
      }
    }

    if (notes && notes.trim()) {
      prompt += "\n=== ADDITIONAL NOTES ===\n" + notes + "\n";
    }

    console.log(`[${new Date().toISOString()}] Analyzing with model: ${modelId}`);
    console.log(`  Fetched ${fetchedPages.length} page(s). Prompt length: ${prompt.length} chars`);

    const response = await anthropic.messages.create({
      model: modelId || "claude-opus-4-6",
      max_tokens: 8192,
      temperature: 0.1,
      system: SYSTEM_INSTRUCTION,
      messages: [{ role: "user", content: prompt }],
    });

    // Collect all text blocks (skip thinking blocks)
    const textParts = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text);

    const text = textParts.join("\n");

    if (!text) {
      res.status(502).json({ error: "Không nhận được phản hồi từ AI. / No response received from AI." });
      return;
    }

    console.log("Raw AI response:", text.substring(0, 500));

    // Extract JSON: strip code fences, then find the outermost { ... }
    let cleanText = text.replace(/```json\n?|```/g, "").trim();
    const jsonStart = cleanText.indexOf("{");
    const jsonEnd = cleanText.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      console.error("No JSON object found. Raw text:", text);
      res.status(502).json({ error: "Lỗi định dạng dữ liệu từ AI. Vui lòng thử lại. / AI response format error. Please try again." });
      return;
    }

    cleanText = cleanText.substring(jsonStart, jsonEnd + 1);

    let jsonResponse: BilingualAnalysisResult;
    try {
      jsonResponse = JSON.parse(cleanText);
    } catch (e) {
      console.error("JSON Parse Error:", e);
      console.error("Extracted text:", cleanText.substring(0, 500));
      res.status(502).json({ error: "Lỗi định dạng dữ liệu từ AI. Vui lòng thử lại. / AI response format error. Please try again." });
      return;
    }

    if (!jsonResponse.vi || !jsonResponse.en) {
      console.error("Missing vi or en key in response:", Object.keys(jsonResponse));
      res.status(502).json({ error: "AI did not return bilingual data. Please try again." });
      return;
    }

    console.log(`[${new Date().toISOString()}] Analysis completed successfully (bilingual).`);
    res.json(jsonResponse);
  } catch (error: any) {
    console.error("Claude API Error:", error);

    if (error.status === 500 || error.message?.includes("500")) {
      res.status(502).json({
        error: "Hệ thống AI đang bận (Lỗi 500). Vui lòng thử lại hoặc đổi Model. / AI system is busy (Error 500). Please try again or switch Model.",
      });
      return;
    }

    res.status(500).json({
      error: error.message || "Có lỗi xảy ra khi kết nối với AI. / An error occurred while connecting to AI.",
    });
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`\n🚀 DeFi Risk Sentinel Backend`);
  console.log(`   Server running at http://localhost:${PORT}`);
  console.log(`   Health check:     http://localhost:${PORT}/api/health`);
  console.log(`   Analyze endpoint: POST http://localhost:${PORT}/api/analyze\n`);
});
