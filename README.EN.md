English | [中文](./README.md)

# DeepPoint - User Pain Point Discoverer

![logo](./assets/logo.png)

A web application that helps indie developers automatically discover user pain points from social media, with intelligent clustering analysis and AI-powered product solution generation.

## Features

### Pain Point Analysis Module
- Automatic crawling of Douyin (TikTok China) videos and comments by keywords
- Semantic clustering algorithm based on embedding + DBSCAN
- Deep analysis using GLM-4.6 thinking model
- **In-depth Analysis Dimensions**:
  - Pain Depth: Surface pain → Root causes → User scenarios → Emotional intensity
  - Market Landscape: Existing solutions → Unmet needs → Opportunity analysis
  - MVP Plan: Core features → Validation hypotheses → First users → Cost estimation
- **Priority Scoring System**: Comprehensive evaluation of demand intensity + market size + competition
- **Data Quality Grading**: exploratory (<50) / preliminary (50-200) / reliable (≥200)
- Visual table display of analysis results
- One-click CSV export
- **Raw Data Export**: Export crawler raw data and clustered group data

### AI Product Suggestion Module
- AI product manager role auto-generates product solutions
- Includes core features, tech stack, development roadmap
- Evaluates implementation difficulty and market potential

### Multi-language Support
- Chinese/English interface switching
- AI analysis results automatically output in the current language
- Internationalized URL routing (`/zh/`, `/en/`)
- Auto-detect browser language preference

## Data Sources

| Source | Status | Description |
|--------|--------|-------------|
| Douyin - Legacy | Available | Based on DrissionPage browser automation, supports video search and comment collection |
| Douyin - New | Available | Based on Playwright + CDP, better anti-detection, requires QR code login on first use |
| Xiaohongshu | Paused | Testing found it causes account bans, not recommended |

## Preview

> For more screenshots and resources, browse the [assets folder](./assets/).

<img src="./assets/demo-preview-result.png" alt="Preview" style="zoom: 63%;" />

<img src="./assets/demo-preview-result1.png" alt="Preview" style="zoom: 63%;" />

## Quick Start

### Requirements

- Node.js >= 18
- Python >= 3.10
- npm or pnpm
- Google Chrome

### 1. Install Dependencies

```bash
# Clone the project
git clone https://github.com/your-username/deeppoint-ai.git
cd deeppoint-ai

# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt

# If using the new Douyin data source, also install the browser
playwright install chromium

# Or manually install core dependencies
pip install DrissionPage beautifulsoup4 lxml scikit-learn numpy python-dotenv
```

### 2. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Zhipu AI GLM API Configuration (Required)
# Register at: https://open.bigmodel.cn/
GLM_API_KEY=your_glm_api_key_here
GLM_MODEL_NAME=glm-4.6
GLM_EMBEDDING_MODEL=embedding-3

# Browser Configuration (set to true for server environments)
HEADLESS=false
```

### 3. Run the Project

```bash
# Development mode
npm run dev

# Production build
npm run build
npm run start
```

Visit http://localhost:3000

## User Guide

### Pain Point Analysis (Home Page)

1. Select data source (New Douyin recommended)
2. Enter keywords, separated by commas, e.g., `camping, beginner, gear`
3. Optionally enable video comment fetching (slower but richer data)
4. Click Start Analysis and wait for results
5. Click any row to view detailed source content, or export CSV

> **New Douyin Note**: On first use, a browser window will pop up requiring QR code login to Douyin. Login state is automatically saved for future use.

### AI Product Suggestions (/ai-product)

1. Enter keywords for your target domain
2. AI will analyze user feedback and generate a complete product solution
3. View product name, features, tech stack, development plan, etc.

### Language Switching

- Click the language switcher in the top right corner to switch between Chinese/English
- First visit will auto-detect browser language preference
- AI analysis results will automatically output in the current language
- You can also access directly via URL: `/zh/` or `/en/`

## Project Structure

```
deeppoint-ai/
├── src/
│   ├── app/
│   │   ├── [locale]/             # Internationalized dynamic routes
│   │   │   ├── page.tsx          # Home - Pain Point Analysis
│   │   │   ├── ai-product/page.tsx # AI Product Suggestions
│   │   │   └── layout.tsx        # i18n layout (NextIntlClientProvider)
│   │   ├── layout.tsx            # Root layout
│   │   └── api/
│   │       ├── analyze/          # Create analysis job
│   │       ├── jobs/[jobId]/     # Query job status
│   │       ├── analyze-ai-product/
│   │       ├── ai-product-jobs/[jobId]/
│   │       └── health/           # Health check
│   ├── components/
│   │   ├── AnalysisForm.tsx      # Analysis form
│   │   ├── JobStatus.tsx         # Job status display
│   │   ├── ResultsTable.tsx      # Results table
│   │   ├── DetailModal.tsx       # Pain point detail modal
│   │   ├── LoadingAnimation.tsx  # Loading animation
│   │   ├── DataQualityBanner.tsx # Data quality indicator
│   │   ├── AIProductCard.tsx     # AI product card
│   │   ├── AIProductDetailModal.tsx
│   │   ├── ExportButton.tsx      # CSV export
│   │   ├── RawDataExportButton.tsx # Raw data export
│   │   └── LanguageSwitcher.tsx  # Language switcher
│   ├── i18n/                     # Internationalization config
│   │   ├── config.ts             # Language config (supported locales)
│   │   ├── navigation.ts         # i18n navigation utilities
│   │   └── request.ts            # Translation message loading
│   ├── messages/                 # Translation files
│   │   ├── zh.json               # Chinese translations
│   │   └── en.json               # English translations
│   ├── middleware.ts             # i18n routing middleware
│   └── lib/
│       └── design-tokens.ts      # Design system tokens
├── lib/
│   ├── crawlers/
│   │   └── douyin_new/           # New Douyin crawler module
│   ├── services/
│   │   ├── job-manager.ts        # Job management core
│   │   ├── douyin-service.ts     # Douyin data service
│   │   ├── xhs-service.ts        # Xiaohongshu service (paused)
│   │   ├── glm-service.ts        # GLM LLM service
│   │   ├── clustering-service.ts # Clustering service (Python integration)
│   │   ├── priority-scoring.ts   # Priority scoring system
│   │   ├── ai-product-service.ts # AI product analysis
│   │   ├── ai-product-job-manager.ts
│   │   ├── data-source-factory.ts
│   │   └── data-source-interface.ts
│   ├── utils/
│   │   └── python-detector.ts    # Python command detection
│   ├── douyin_tool.py            # Douyin crawler script
│   ├── xiaohongshu_tool.py       # Xiaohongshu crawler script (paused)
│   └── semantic_clustering.py    # Semantic clustering (embedding + DBSCAN)
├── .env.example                  # Environment variable template
├── package.json
├── requirements.txt              # Python dependencies
└── tsconfig.json
```

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend Framework | Next.js 15 + React 19 |
| Styling | Tailwind CSS 4 |
| Internationalization | next-intl |
| Data Fetching | SWR (job status polling) |
| Backend | Next.js API Routes |
| Data Collection | Python + DrissionPage / Playwright |
| AI Analysis | Zhipu GLM-4.6 (thinking model) + embedding-3 |
| Clustering Algorithm | Embedding + DBSCAN semantic clustering |

## API Configuration

### Zhipu AI (Required)

1. Register at: https://open.bigmodel.cn/
2. Create an API Key
3. Configure in `GLM_API_KEY` environment variable

## FAQ

### Q: Why is Douyin data collection slow?
A: Douyin uses browser automation to simulate real users, so slower speed is normal. Deep crawling mode is even slower but provides more complete data.

### Q: How to deploy on a server?
A: Set `HEADLESS=true` environment variable to enable headless browser mode.

### Q: Too few clustering results?
A: Try more keywords, or adjust the `minClusterSize` parameter in `clustering-service.ts`.

### Q: Can I use Xiaohongshu?
A: Not recommended. Testing found it causes account bans.

## Roadmap

- [x] Douyin data source support
- [x] Pain point clustering analysis
- [x] AI product solution generation
- [x] Deep crawling (with comments)
- [x] Multi-language support (Chinese/English)
- [ ] More data sources (Zhihu, Weibo)
- [ ] History record saving

## License

This project is licensed under the MIT License.

**Note**: The crawler code under `lib/crawlers/douyin_new/` is based on the MediaCrawler project, licensed under NON-COMMERCIAL LEARNING LICENSE 1.1, for non-commercial learning and research purposes only.

## Acknowledgments

- New Douyin crawler based on [MediaCrawler](https://github.com/NanmiCoder/MediaCrawler) (NON-COMMERCIAL LEARNING LICENSE 1.1, for learning and research only)
