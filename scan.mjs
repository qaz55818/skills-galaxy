// 掃描本機所有 SKILL.md 並算出關聯。
// 直接執行（node scan.mjs）會輸出 skills-data.js 供靜態開啟；server.mjs 則匯入 scan() 即時掃描。
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert';
import { pathToFileURL } from 'node:url';

const home = os.homedir();
const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };

// 使用者自有、可由本工具新增與移除的技能根目錄
export const OWNED_ROOTS = {
  claude: path.join(home, '.claude', 'skills'),
  agents: path.join(home, '.agents', 'skills'),
};

const walkDirs = (dir, depth, out = []) => {
  if (depth < 0) return out;
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = path.join(dir, e.name);
    let st; try { st = fs.statSync(p); } catch { continue; } // statSync 會跟隨 symlink
    if (st.isDirectory()) { out.push(p); walkDirs(p, depth - 1, out); }
  }
  return out;
};

export const parseFrontmatter = (text) => {
  const m = text.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---/);
  const meta = {};
  if (!m) return meta;
  const lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if (/^[>|][+-]?$/.test(value) || value === '') { // 區塊純量：收集後續縮排行
      const parts = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) parts.push(lines[++i].trim());
      value = parts.join(' ');
    }
    meta[kv[1]] = value.replace(/^(['"])([\s\S]*)\1$/, '$2');
  }
  return meta;
};

// 主題：以名稱 + 描述的關鍵字歸類
const TOPICS = {
  動畫: /animation|motion|gsap|reanimated|transition|skia/i,
  影片: /video|remotion|hyperframes|caption|render/i,
  設計: /design|typography|brand|figma|icon|visual|styling|tailwind/i,
  資料: /\bdata\b|bigquery|sql|spark|pipeline|bigtable|dataform|dbt|airflow|storage/i,
  文件: /\bdocs?\b|pdf|docx|pptx|xlsx|slides|spreadsheet|presentation/i,
  程式品質: /clean.code|refactor|review|\btest|debug|type.safety|naming|comments/i,
  流程: /\bplan|workflow|brainstorm|orchestrat|agent|worktree|branch/i,
  瀏覽器與桌面: /browser|chrome|computer.use|desktop/i,
  行動裝置: /mobile|react native|navigation|expo|native/i,
  元件架構: /component|hooks?\b|react|next\.?js|monorepo|architecture/i,
};
const STOP = new Set(['skill', 'skills', 'use', 'using', 'the', 'and', 'for', 'gcp', 'google', 'cloud', 'best', 'practices', 'example']);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const ZH_FILE = new URL('./descriptions.zh-TW.json', import.meta.url);
export const DATA_FILE = new URL('./skills-data.js', import.meta.url);
// 還沒有繁體中文描述的技能（原文本身含中文的不算），同名只列一次
export const untranslated = (skills) => [...new Map(skills
  .filter((s) => !s.descriptionZh && s.description && !/[一-鿿]/.test(s.description)).map((s) => [s.name, s])).values()];

export const CMD_ZH_FILE = new URL('./commands.zh-TW.json', import.meta.url);
// 從 SKILL.md 的 shell 程式碼區塊抽出可執行的指令。說明取自同一行或上一行的 # 註解，沒有就用所在段落的標題。
// 屬於推測：區塊裡的範例輸出或 heredoc 內容偶爾會被當成指令。
export const extractCommands = (text) => {
  const out = new Map();
  let heading = '', fence = null, prev = '', pending = '';
  for (const raw of text.split(/\r?\n/)) {
    const open = raw.match(/^\s*```(\w*)/);
    if (open) { fence = fence === null ? open[1].toLowerCase() : null; prev = ''; pending = ''; continue; }
    if (fence === null) { const h = raw.match(/^#{1,6}\s+(.+)/); if (h) heading = h[1].replace(/[`*]/g, '').trim(); continue; }
    if (!/^(bash|sh|shell|zsh|console|powershell|ps1)$/.test(fence)) continue;
    if (!pending && /^\s/.test(raw)) continue; // 縮排行是區塊內文（heredoc、if 內容），不是獨立指令
    const line = pending + raw.trim().replace(/^[$>]\s+/, '');
    if (/[\\`]$/.test(line)) { pending = line.slice(0, -1); continue; } // 續行：bash 的反斜線、PowerShell 的反引號
    pending = '';
    const comment = line.match(/^\s*#\s*(.*)/);
    if (comment) { prev = comment[1]; continue; }
    const [, cmd, tail = ''] = line.match(/^([A-Za-z.~$/][^#]*?)(?:\s+#\s+(.*))?$/) ?? [];
    const c = cmd?.trim().replace(/\s+/g, ' ');
    // 略過 shell 語法本身（流程控制、變數指定、切換目錄、輸出文字）與夾在區塊裡的 Python、範例輸出，只留真正執行工具的指令
    if (c && !/^(if|then|else|elif|fi|for|while|do|done|case|esac|cd|echo|export|exit|return|source|import|from)\b|^[\w, ]+=|^\$|^[A-Z_]+:?( |$)|^[^ ]*[(\[]|^[.~/]*$/.test(c) && c.length <= 240 && !out.has(c) && out.size < 40)
      out.set(c, { cmd: c, note: (tail || prev || heading).slice(0, 200) });
    prev = '';
  }
  return [...out.values()];
};

export function scan() {
  // 來源根目錄：[來源名稱, 路徑, 是否為使用者自有]
  const roots = [
    ['個人技能', OWNED_ROOTS.claude, true],
    ['.agents 共用', OWNED_ROOTS.agents, true],
    ['anthropic-skills', path.join(appData, 'Claude', 'local-agent-mode-sessions', 'skills-plugin'), false],
  ];
  // 只取 installed_plugins.json 記錄的現用版本，避免 cache 內舊版重複
  const installed = readJson(path.join(home, '.claude', 'plugins', 'installed_plugins.json'));
  for (const [key, installs] of Object.entries(installed?.plugins ?? {}))
    for (const i of installs) roots.push([key.split('@')[0], i.installPath, false]);
  // claude.ai 遠端外掛
  const rpm = path.join(appData, 'Claude', 'rpm');
  for (const dir of walkDirs(rpm, 2).filter((d) => path.basename(d).startsWith('plugin_'))) {
    const name = readJson(path.join(dir, '.claude-plugin', 'plugin.json'))?.name
      ?? readJson(path.join(dir, 'package.json'))?.name ?? path.basename(dir);
    roots.push([name, dir, false]);
  }

  const seen = new Set();
  const skills = [];
  const texts = []; // 與 skills 同索引的 SKILL.md 全文，只用來算關聯，不輸出
  for (const [source, root, owned] of roots) {
    const files = [root, ...walkDirs(root, 8)].map((d) => path.join(d, 'SKILL.md')).filter((f) => fs.existsSync(f));
    for (const file of files) {
      const real = fs.realpathSync(file);
      const text = fs.readFileSync(file, 'utf8');
      const meta = parseFrontmatter(text);
      const name = meta.name || path.basename(path.dirname(file));
      const key = `${source}\u0000${name}`;
      if (seen.has(real) || seen.has(key)) continue;
      seen.add(real); seen.add(key);
      const rel = path.relative(root, path.dirname(file)).split(path.sep);
      texts.push(text);
      skills.push({
        name, source, owned,
        removable: owned && rel.length === 1 && rel[0] !== '', // 只有自有根目錄的直接子資料夾可移除
        description: meta.description || '',
        group: rel.length > 1 ? rel.slice(0, -1).filter((s) => s !== 'skills' && !/^[0-9a-f-]{36}$/.test(s)).join('/') : '',
        path: file,
        lines: text.split('\n').length,
        bytes: Buffer.byteLength(text),
        modified: fs.statSync(file).mtime.toISOString().slice(0, 10),
        commands: extractCommands(text),
      });
    }
  }

  // 繁體中文描述：對照檔以技能名稱為鍵，原始 SKILL.md 不動
  // shortcut: 原文更新後譯文不會自動失效，若描述常變動再改成以原文雜湊比對
  const zh = readJson(ZH_FILE) ?? {};
  skills.forEach((s) => { if (zh[s.name]) s.descriptionZh = zh[s.name]; });
  // 指令說明的譯文：{ 技能名稱: { 指令: 繁體中文說明 } }
  const cmdZh = readJson(CMD_ZH_FILE) ?? {};
  skills.forEach((s) => s.commands.forEach((c) => { const t = cmdZh[s.name]?.[c.cmd]; if (t) c.zh = t; }));

  // ── 關聯 ────────────────────────────────────────────────
  skills.forEach((s) => { s.topics = Object.keys(TOPICS).filter((t) => TOPICS[t].test(`${s.name} ${s.description}`)); });
  const tokens = skills.map((s) => new Set(s.name.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !STOP.has(t))));

  const links = []; // [來源索引, 目標索引, 類型]
  const byName = new Map();
  skills.forEach((s, i) => (byName.get(s.name) ?? byName.set(s.name, []).get(s.name)).push(i));

  for (const [name, idxs] of byName) {
    // 同名：同一技能出現在多個來源
    for (let a = 0; a < idxs.length; a++) for (let b = a + 1; b < idxs.length; b++) links.push([idxs[a], idxs[b], 'same']);
    // 引用：別的 SKILL.md 內文提到這個技能。無連字號的短名稱太像一般單字，
    // 必須寫成 `name`、`/name` 或 來源:name 才算
    const srcs = idxs.map((j) => esc(skills[j].source)).join('|');
    const re = new RegExp(name.includes('-')
      ? `(?<![\\w/.-])${esc(name)}(?![\\w/.-])`
      : `\`/?${esc(name)}\`|(?:${srcs}):${esc(name)}(?![\\w-])`);
    skills.forEach((from, i) => {
      if (from.name === name || !re.test(texts[i])) return;
      const target = idxs.find((j) => skills[j].source === from.source) ?? idxs[0];
      links.push([i, target, 'ref']);
    });
  }
  // 相近：名稱用詞與主題重疊最多的前 3 個（不同名）
  skills.forEach((s, i) => {
    skills.map((o, j) => {
      if (j === i || o.name === s.name) return [j, 0];
      const shared = [...tokens[i]].filter((t) => tokens[j].has(t)).length;
      return [j, shared * 2 + (shared ? s.topics.filter((t) => o.topics.includes(t)).length : 0)];
    }).filter(([, score]) => score >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3)
      .forEach(([j]) => { if (!links.some(([a, b, t]) => t === 'sim' && a === j && b === i)) links.push([i, j, 'sim']); });
  });

  // 尚未安裝但被引用：內文以「來源:名稱」或「`名稱` skill / skill `名稱`」提到、本機卻找不到的技能。
  // 屬於推測，外掛的 agent 或 command 也可能被算進來。
  const sourceNames = [...new Set(skills.map((s) => s.source))].filter((s) => /^[\w-]+$/.test(s));
  const patterns = [
    new RegExp(`(?<![\\w/.-])(?<hint>${sourceNames.map(esc).join('|')}):(?<name>[a-z][a-z0-9-]{2,})(?![\\w-])`, 'g'),
    /`\/?(?<name>[a-z][a-z0-9]*(?:-[a-z0-9]+)+)`\s+(?:\((?<hint>[a-z][a-z0-9-]+)\)\s+)?skill/g,
    /\bskills?\s+`\/?(?<name>[a-z][a-z0-9]*(?:-[a-z0-9]+)+)`/g,
    /\buse\s+`\/?(?<name>[a-z][a-z0-9]*(?:-[a-z0-9]+)+)`\s+\((?<hint>[a-z][a-z0-9-]+)\)/g, // use `x` (外掛名)
  ];
  const missingMap = new Map();
  texts.forEach((text, i) => {
    for (const re of patterns) for (const m of text.matchAll(re)) {
      const { name, hint } = m.groups;
      if (byName.has(name)) continue;
      const entry = missingMap.get(name) ?? missingMap.set(name, { name, hint: '', refs: [] }).get(name);
      if (hint) entry.hint = hint;
      if (!entry.refs.includes(i)) entry.refs.push(i);
    }
  });
  const missing = [...missingMap.values()];

  assert(links.every(([a, b]) => skills[a] && skills[b] && a !== b), '關聯指向不存在的技能');
  return { generatedAt: new Date().toISOString(), skills, links, missing };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const data = scan();
  assert(data.skills.length > 0, '沒有掃到任何 SKILL.md');
  fs.writeFileSync(DATA_FILE, `window.SKILLS_DATA = ${JSON.stringify(data)};\n`);
  console.log(`共 ${data.skills.length} 個技能，關聯 ${data.links.length} 條，未安裝但被引用 ${data.missing.length} 個`);
  const todo = untranslated(data.skills).map((s) => s.name);
  console.log(`尚無繁體中文描述 ${todo.length} 個${todo.length ? '：' + todo.join(', ') : ''}`);
  const cmds = [...new Map(data.skills.map((s) => [s.name, s.commands])).values()].flat();
  console.log(`技能內指令 ${cmds.length} 條，尚無中文說明 ${cmds.filter((c) => !c.zh).length} 條`);
  assert.deepStrictEqual(extractCommands(['## Run', '```bash', '# build it', 'npx foo render', 'FOO=1', 'npx foo lint # check', '```'].join(String.fromCharCode(10))),
    [{ cmd: 'npx foo render', note: 'build it' }, { cmd: 'npx foo lint', note: 'check' }], '指令抽取規則壞了');
  console.log(data.missing.map((m) => `${m.hint ? m.hint + ':' : ''}${m.name} ← ${m.refs.map((i) => data.skills[i].name).join(', ')}`).join('\n'));
}
