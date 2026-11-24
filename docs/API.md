# 📡 HTTP API 參考

[← 回到 README](../README.md)

伺服器：`http://127.0.0.1:8765`（只接受 `Host` 為 `127.0.0.1:8765` 或 `localhost:8765`）

## 共通規則

| 項目 | 規則 |
|---|---|
| 格式 | 請求與回應都是 JSON（UTF-8） |
| 寫入類請求 | `POST` 必須同時滿足：`Origin: http://127.0.0.1:8765`（同源）、`X-Skills-Galaxy: 1` |
| 大小上限 | 請求內容 300 KB |
| 錯誤 | 非 2xx 時回 `{ "error": "訊息" }` |
| 快取 | 所有回應 `Cache-Control: no-store` |

### 狀態碼

| 碼 | 意義 |
|---|---|
| `400` | 參數格式錯誤（名稱、來源、長度不符） |
| `403` | Host 不允許，或寫入請求缺少同源 / 自訂標頭 |
| `404` | 沒有這個 API、找不到目標 |
| `409` | 名稱衝突（已存在同名技能或伺服器） |
| `413` | 請求內容過大 |
| `502` | 外部工具（`claude`、`npx`、SkillSpector）執行失敗 |
| `504` | 外部工具逾時 |

### 呼叫範例

```js
const call = (url, body) =>
  fetch(url, body && {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Skills-Galaxy': '1' },
    body: JSON.stringify(body),
  }).then((r) => r.json());

await call('/api/skills');                       // GET
await call('/api/zh', { name: 'pdf', text: '…' }); // POST
```

---

## 🪐 技能

| 方法 | 路徑 | 參數 | 回應 | 說明 |
|---|---|---|---|---|
| `GET` | `/api/skills` | — | `{ skills, links, …, trash, manage }` | 即時掃描全部技能 |
| `POST` | `/api/rescan` | — | 差異摘要 | 等同 `node scan.mjs`：重寫 `skills-data.js` 並比較上次結果 |
| `POST` | `/api/skills` | `name`, `description`, `body` | `{ path }` | 寫入 `~/.claude/skills/<name>/SKILL.md`，已存在則拒絕 |
| `POST` | `/api/remove` | `path` | `{ id }` | 搬到 `~/.claude/skills-trash`（只限自有根目錄的直接子資料夾） |
| `GET` | `/api/trash` | — | `{ items }` | 回收資料夾內容 |
| `POST` | `/api/restore` | `id` | `{ path }` | 從回收資料夾還原 |

**驗證規則**

- `name`：`^[a-z0-9][a-z0-9-]{0,62}$`
- `description`：1–1024 字、單行
- `body`：Markdown，最多 200,000 字

## 🤖 AI 輔助（呼叫本機 `claude` CLI）

| 方法 | 路徑 | 參數 | 回應 | 說明 |
|---|---|---|---|---|
| `POST` | `/api/draft` | `prompt`（1–4000 字） | `{ name, description, body }` | 代寫技能草稿，**不寫檔** |
| `POST` | `/api/translate` | — | `{ saved, left }` | 翻譯所有尚未有中文的描述 |
| `POST` | `/api/zh` | `name`, `text`（1–600 字單行） | `{ saved: 1 }` | 手動儲存一筆繁中描述 |

文字一律經 stdin 傳給 `claude`，不會出現在命令列參數中。

## 🔎 線上目錄與安裝

| 方法 | 路徑 | 參數 | 回應 | 說明 |
|---|---|---|---|---|
| `GET` | `/api/search?q=關鍵字` | `q`（1–80 字） | `{ results: [{ name, source, installs }] }` | 查 skills.sh 目錄，最多 25 筆 |
| `POST` | `/api/install` | `source`, `skill`（選填） | `{ log }` | 執行 `npx skills add <source> [--skill <skill>]` |

`source` 只接受 `owner/repo` 或 `https://github.com/...`，且不可含 `..`。

## 🛡️ 安全掃描（SkillSpector）

| 方法 | 路徑 | 參數 | 回應 |
|---|---|---|---|
| `POST` | `/api/inspect` | 三選一：`path`（已安裝技能的 `SKILL.md`）、`source`（安裝前的 GitHub 來源）、`all: true`（掃描全部個人技能） | `{ reports: [...] }` |

只跑靜態分析（`--no-llm`），報告會精簡成前台要顯示的欄位。

## 🔌 MCP

| 方法 | 路徑 | 參數 | 回應 | 說明 |
|---|---|---|---|---|
| `GET` | `/api/mcp` | — | 伺服器清單與狀態 | 讀上次結果，立即回傳 |
| `GET` | `/api/mcp/events` | — | `text/event-stream` | SSE；狀態變動即推送，每 25 秒 ping |
| `POST` | `/api/mcp/check` | `id`（選填） | 目前狀態 | 背景檢查全部或單一伺服器 |
| `POST` | `/api/mcp/add` | `name`, `config` | `{ name, … }` | `claude mcp add-json <name> - -s user` |
| `POST` | `/api/mcp/remove` | `name` | `{ name, config, … }` | 只限使用者設定；回傳原設定供復原 |
| `POST` | `/api/mcp/toggle` | `id`, `on` | 目前狀態 | 啟用／停用；外掛會整個切換 |

- `name`：`^[A-Za-z0-9][A-Za-z0-9_-]{0,62}$`
- `config`：JSON 物件，須含 `command`（本機程式）或 `url`（遠端伺服器）

```json
{ "name": "my-server", "config": { "command": "npx", "args": ["-y", "some-mcp"] } }
```

```json
{ "name": "remote", "config": { "type": "http", "url": "https://example.com/mcp" } }
```

## 🖼️ ChatGPT 產圖（chatgpt-web-image MCP）

| 方法 | 路徑 | 參數 | 說明 |
|---|---|---|---|
| `GET` | `/api/gptimg` | — | 專用 Chrome、除錯埠、ChatGPT 分頁與登入狀態（唯讀） |
| `POST` | `/api/gptimg/open` | `page`: `"login"` 或 `"home"` | 在專用 Chrome 開啟固定網址 |
| `POST` | `/api/gptimg/outputs` | — | 用檔案總管開啟圖片輸出資料夾 |
