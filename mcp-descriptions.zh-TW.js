// MCP 伺服器的繁體中文功能說明，鍵是頁面上顯示的名稱（不分大小寫）。
// 新增伺服器後想要說明，在這裡加一行即可；沒有說明的伺服器不顯示。
export default {
  // claude.ai 連接器
  'Claude Docs': '在 claude.ai 建立與編輯可分享、可留言的線上文件，並能匯出成 Word、PDF 或 Markdown。',
  'Supabase': '管理 Supabase 專案：查詢與修改 Postgres 資料庫、資料表結構與遷移，以及 Edge Functions 和專案設定。',
  'Canva': '搜尋、建立、編輯與匯出 Canva 設計，可套用品牌範本、調整尺寸、回覆設計上的評論。',
  'Gmail': '搜尋與閱讀 Gmail 郵件和對話串，建立草稿、回覆與轉寄，並管理標籤、垃圾郵件與垃圾桶。',
  'Sentry': '查詢 Sentry 上正式環境的錯誤、議題、堆疊追蹤、效能追蹤、日誌與操作重播，也能管理監控與警示規則。',
  'Context7': '即時取得各種程式庫、框架與 SDK 的最新官方文件與範例，避免寫出過時的 API 用法。',

  // 外掛
  'figma': '讀取 Figma 設計並轉成程式碼，或依程式碼、文字描述生成設計；也能管理元件、Code Connect 與 FigJam 白板。',
  'playwright': '用 Playwright 控制瀏覽器：開網頁、點擊、輸入、截圖，讀取主控台與網路請求，適合自動化測試與網頁操作。',
  'dak-notebook': 'Data Agent Kit 的筆記本工具：建立 Jupyter 筆記本、新增與修改儲存格，並讀取執行結果。',
  'dak-viz': 'Data Agent Kit 的視覺化工具：把查詢結果繪製成圖表。',
  'dak-alloydb': '連到 Google Cloud AlloyDB（相容 PostgreSQL 的託管資料庫），查詢資料並管理叢集與執行個體。',
  'dak-spark': '連到 Google Cloud Dataproc / Serverless Spark，提交、監看與管理 Spark 工作。',
  'dak-bigquery': '連到 Google BigQuery 資料倉儲：列出資料集與資料表、查看欄位結構、執行 SQL 查詢。',
  'dak-bigtable-data': '讀寫 Google Cloud Bigtable 資料表裡的資料列（資料面）。',
  'dak-bigtable': '管理 Google Cloud Bigtable 的執行個體、叢集與資料表（管理面）。',
  'dak-cloudsql': '管理 Google Cloud SQL（MySQL、PostgreSQL、SQL Server）的執行個體、資料庫與使用者。',
  'dak-gcs': '操作 Google Cloud Storage：列出儲存桶與物件，讀取、上傳與管理檔案。',
  'dak-kc': '連到 Google Dataplex 知識目錄，搜尋資料資產並查看其中繼資料與關聯。',
  'dak-spanner': '連到 Google Cloud Spanner 全球分散式資料庫，執行查詢並管理執行個體與資料庫。',

  // 使用者設定與桌面版
  'servbay': '管理本機 ServBay 開發環境：網站與網域、HTTPS 憑證、PHP / Node / 資料庫等服務、連接埠、日誌、套件與備份。',
  'codebase-memory-mcp': '把程式碼庫建成知識圖譜，可查函式定義、呼叫者與被呼叫者、追蹤呼叫鏈，做影響範圍分析。',
  'chatgpt-web-image': '本機自製伺服器：透過瀏覽器操作 ChatGPT 網頁版來生成圖片。',

  // 常見的伺服器（之後新增時自動帶出說明）
  'github': '操作 GitHub：查詢與建立 Issue、Pull Request，讀取儲存庫檔案、分支與提交紀錄。',
  'filesystem': '讀寫本機指定資料夾內的檔案：列目錄、讀檔、寫檔、搬移與搜尋。',
  'fetch': '抓取網址內容並轉成 Markdown，讓 Claude 讀網頁。',
  'memory': '用知識圖譜保存長期記憶：記住人物、專案與事實，跨對話使用。',
  'sequential-thinking': '提供逐步思考的工具，讓 Claude 把複雜問題拆成步驟並可回頭修正。',
  'slack': '讀取 Slack 頻道與訊息、搜尋對話、發送訊息。',
  'notion': '搜尋、讀取與編輯 Notion 頁面和資料庫。',
  'linear': '查詢與管理 Linear 的議題、專案與週期。',
  'postgres': '連到 PostgreSQL 資料庫，查看資料表結構並執行唯讀查詢。',
  'sqlite': '操作本機 SQLite 資料庫：建立資料表、查詢與寫入資料。',
  'brave-search': '用 Brave Search 進行網頁與在地搜尋。',
  'puppeteer': '用 Puppeteer 控制 Chrome：開網頁、點擊、填表、截圖。',
};
