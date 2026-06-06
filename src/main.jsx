import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarDays,
  Copy,
  Dumbbell,
  Moon,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";
import "./styles.css";

const STORAGE_KEY = "sanc-lifework-log-v1";
const GAS_URL_KEY = "sanc-lifework-gas-url-v1";

const today = () => new Date().toISOString().slice(0, 10);

const emptyEntry = {
  date: today(),
  activityType: "walking",
  distanceKm: "",
  durationMin: "",
  place: "",
  rainyAlternative: false,
  steps: "",
  wakeTime: "05:00",
  sleepTime: "22:30",
  weightKg: "",
  alcohol: "平日半量",
  studyTopic: "React",
  studyMinutes: "",
  studiedDetail: "",
  blocker: "",
  oneLine: "",
};

const seedEntries = [
  {
    ...emptyEntry,
    date: offsetDate(-5),
    activityType: "run",
    distanceKm: "5",
    durationMin: "36",
    place: "近所コース",
    steps: "9200",
    studyTopic: "React",
    studyMinutes: "60",
    studiedDetail: "useStateでフォーム入力を管理",
    oneLine: "朝走ると午前の集中が上がった",
  },
  {
    ...emptyEntry,
    date: offsetDate(-3),
    activityType: "walking",
    distanceKm: "3.2",
    durationMin: "42",
    place: "駅周辺",
    steps: "8400",
    studyTopic: "GAS",
    studyMinutes: "45",
    studiedDetail: "fetch連携の復習",
    oneLine: "昼の散歩が眠気対策になった",
  },
  {
    ...emptyEntry,
    date: offsetDate(-1),
    activityType: "indoor",
    distanceKm: "0",
    durationMin: "20",
    place: "自宅",
    rainyAlternative: true,
    steps: "7100",
    studyTopic: "React",
    studyMinutes: "50",
    studiedDetail: "テーブル表示の練習",
    oneLine: "雨でも室内運動で朝の流れを切らなかった",
  },
];

function offsetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : seedEntries;
  } catch {
    return seedEntries;
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function loadGasUrl() {
  try {
    return localStorage.getItem(GAS_URL_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveGasUrl(url) {
  localStorage.setItem(GAS_URL_KEY, url);
}

async function fetchRemoteEntries(url) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`GET ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : data.entries ?? [];
}

async function pushRemoteEntries(url, entries) {
  if (!entries.length) return;
  // text/plain にすると GAS が応答できない CORS プリフライトを回避できる
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ entries }),
  });
}

// 同じ日付は updatedAt が新しい方を採用してローカルとリモートを統合する
function mergeEntries(local, remote) {
  const byDate = new Map();
  for (const entry of [...remote, ...local]) {
    if (!entry || !entry.date) continue;
    const current = byDate.get(entry.date);
    if (!current || (entry.updatedAt ?? "") >= (current.updatedAt ?? "")) {
      byDate.set(entry.date, entry);
    }
  }
  return [...byDate.values()];
}

function syncLabel(gasUrl, state) {
  if (!gasUrl) return "未連携";
  if (state === "syncing") return "同期中";
  if (state === "ok") return "同期済み";
  if (state === "error") return "同期エラー";
  return "同期";
}

function numberValue(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatNumber(value, digits = 1) {
  return Number(value || 0).toLocaleString("ja-JP", {
    maximumFractionDigits: digits,
  });
}

function App() {
  const [entries, setEntries] = useState(loadEntries);
  const [form, setForm] = useState(() => {
    const loaded = loadEntries();
    return loaded.find((e) => e.date === today() && !e.deleted) ?? emptyEntry;
  });
  const [selectedDate, setSelectedDate] = useState("");
  const [toast, setToast] = useState(null);
  const [gasUrl, setGasUrl] = useState(loadGasUrl);
  const [syncState, setSyncState] = useState("idle"); // idle | syncing | ok | error
  const [showSettings, setShowSettings] = useState(false);

  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  const syncNow = useCallback(async () => {
    const url = loadGasUrl();
    if (!url) return;
    setSyncState("syncing");
    try {
      const remote = await fetchRemoteEntries(url);
      const merged = mergeEntries(entriesRef.current, remote);
      setEntries(merged);
      saveEntries(merged);
      // リモートに無い / ローカルの方が新しいものだけ送り返す
      const remoteByDate = new Map(remote.map((e) => [e.date, e.updatedAt ?? ""]));
      const toPush = merged.filter((e) => {
        if (!e.updatedAt) return false;
        const r = remoteByDate.get(e.date);
        return r === undefined || e.updatedAt > r;
      });
      await pushRemoteEntries(url, toPush);
      setSyncState("ok");
    } catch {
      setSyncState("error");
    }
  }, []);

  useEffect(() => {
    if (loadGasUrl()) syncNow();
  }, [syncNow]);

  const sortedEntries = useMemo(
    () => [...entries].filter((e) => !e.deleted).sort((a, b) => b.date.localeCompare(a.date)),
    [entries],
  );

  const recentEntries = useMemo(
    () => sortedEntries.slice(0, 7).reverse(),
    [sortedEntries],
  );

  const stats = useMemo(() => {
    const last7 = sortedEntries.slice(0, 7);
    return {
      count: last7.length,
      distance: last7.reduce((sum, e) => sum + numberValue(e.distanceKm), 0),
      minutes: last7.reduce((sum, e) => sum + numberValue(e.durationMin), 0),
      study: last7.reduce((sum, e) => sum + numberValue(e.studyMinutes), 0),
      steps: last7.reduce((sum, e) => sum + numberValue(e.steps), 0),
    };
  }, [sortedEntries]);

  const selectedEntry = sortedEntries.find((entry) => entry.date === selectedDate) ?? sortedEntries[0];
  const aiReview = selectedEntry ? buildAiReview(selectedEntry, stats) : null;
  const aiPrompt = selectedEntry ? buildAiPrompt(selectedEntry, stats) : "";

  function updateField(field, value) {
    if (field === "date") {
      const existing = entries.find((e) => e.date === value && !e.deleted);
      setForm(existing ? { ...existing } : { ...emptyEntry, date: value });
      return;
    }
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submitEntry(event) {
    event.preventDefault();
    const nextEntry = {
      ...form,
      id: form.id ?? crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
      deleted: false,
    };
    const withoutSameDate = entries.filter((entry) => entry.date !== nextEntry.date);
    const nextEntries = [...withoutSameDate, nextEntry];
    setEntries(nextEntries);
    saveEntries(nextEntries);
    setSelectedDate(nextEntry.date);
    const todayDate = today();
    const todayEntry = nextEntries.find((e) => e.date === todayDate && !e.deleted);
    setForm(todayEntry ? { ...todayEntry } : { ...emptyEntry, date: todayDate });
    setToast("保存しました ✓");
    setTimeout(() => setToast(null), 2500);

    const url = loadGasUrl();
    if (url) {
      setSyncState("syncing");
      pushRemoteEntries(url, [nextEntry])
        .then(() => setSyncState("ok"))
        .catch(() => setSyncState("error"));
    }
  }

  function editEntry(entry) {
    setForm(entry);
    setSelectedDate(entry.date);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteEntry(id) {
    const stamp = new Date().toISOString();
    let deleted = null;
    const nextEntries = entries.map((entry) => {
      if (entry.id === id) {
        deleted = { ...entry, deleted: true, updatedAt: stamp };
        return deleted;
      }
      return entry;
    });
    setEntries(nextEntries);
    saveEntries(nextEntries);

    const url = loadGasUrl();
    if (url && deleted) {
      pushRemoteEntries(url, [deleted]).catch(() => setSyncState("error"));
    }
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(aiPrompt);
  }

  return (
    <main className="app-shell">
      {toast && <div className="toast">{toast}</div>}
      <header className="topbar">
        <div>
          <p className="eyebrow">SaNC Lifework</p>
          <h1>Routine Log</h1>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className={`sync-pill sync-${gasUrl ? syncState : "off"}`}
            onClick={syncNow}
            disabled={!gasUrl || syncState === "syncing"}
            title={gasUrl ? "今すぐ同期" : "未連携（設定から連携）"}
          >
            <RefreshCw size={15} className={syncState === "syncing" ? "spin" : ""} />
            {syncLabel(gasUrl, syncState)}
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => setShowSettings((s) => !s)}
            title="同期設定"
          >
            <Settings size={16} />
          </button>
          <div className="date-chip">
            <CalendarDays size={18} />
            {today()}
          </div>
        </div>
      </header>

      {showSettings && (
        <section className="settings-panel">
          <label>
            スプレッドシート連携（GAS Web App URL）
            <input
              type="url"
              value={gasUrl}
              onChange={(e) => setGasUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/●●●/exec"
            />
          </label>
          <div className="settings-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                saveGasUrl(gasUrl.trim());
                setShowSettings(false);
                syncNow();
              }}
            >
              <Save size={16} />
              保存して同期
            </button>
            <button type="button" className="secondary-button" onClick={() => setShowSettings(false)}>
              閉じる
            </button>
          </div>
          <p className="settings-hint">
            URLを設定するとスマホ・PCでデータが共有されます。設定方法は <code>gas/README.md</code> を参照。
          </p>
        </section>
      )}

      <section className="dashboard">
        <MetricCard icon={<Activity />} label="7日間 距離" value={`${formatNumber(stats.distance)} km`} />
        <MetricCard icon={<Dumbbell />} label="7日間 運動時間" value={`${formatNumber(stats.minutes, 0)} 分`} />
        <MetricCard icon={<BookOpen />} label="7日間 学習" value={`${formatNumber(stats.study, 0)} 分`} />
        <MetricCard icon={<Moon />} label="7日間 歩数" value={`${formatNumber(stats.steps / Math.max(stats.count, 1), 0)} 歩/日`} />
      </section>

      <div className="main-grid">
        <section className="panel log-form">
          <div className="section-heading">
            <Plus size={20} />
            <h2>今日のログ</h2>
          </div>

          <form onSubmit={submitEntry}>
            <p className="form-section">運動</p>
            <div className="field-row">
              <label>
                日付
                <input type="date" value={form.date} onChange={(e) => updateField("date", e.target.value)} required />
              </label>
              <label>
                種別
                <select value={form.activityType} onChange={(e) => updateField("activityType", e.target.value)}>
                  <option value="run">run</option>
                  <option value="walking">walking</option>
                  <option value="indoor">indoor</option>
                  <option value="rest">rest</option>
                </select>
              </label>
            </div>

            <div className="field-row">
              <label>
                距離 km
                <input inputMode="decimal" value={form.distanceKm} onChange={(e) => updateField("distanceKm", e.target.value)} placeholder="5.0" />
              </label>
              <label>
                時間 分
                <input inputMode="numeric" value={form.durationMin} onChange={(e) => updateField("durationMin", e.target.value)} placeholder="35" />
              </label>
              <label>
                歩数
                <input inputMode="numeric" value={form.steps} onChange={(e) => updateField("steps", e.target.value)} placeholder="8000" />
              </label>
            </div>

            <label>
              場所
              <input value={form.place} onChange={(e) => updateField("place", e.target.value)} placeholder="近所コース / 自宅 / 公園" />
            </label>

            <label className="check-line">
              <input type="checkbox" checked={form.rainyAlternative} onChange={(e) => updateField("rainyAlternative", e.target.checked)} />
              雨の日代替メニューを実施
            </label>

            <p className="form-section">睡眠・体調</p>
            <div className="field-row">
              <label>
                起床
                <input type="time" value={form.wakeTime} onChange={(e) => updateField("wakeTime", e.target.value)} />
              </label>
              <label>
                就寝
                <input type="time" value={form.sleepTime} onChange={(e) => updateField("sleepTime", e.target.value)} />
              </label>
              <label>
                体重 kg
                <input inputMode="decimal" value={form.weightKg} onChange={(e) => updateField("weightKg", e.target.value)} />
              </label>
            </div>

            <label>
              お酒
              <select value={form.alcohol} onChange={(e) => updateField("alcohol", e.target.value)}>
                <option>飲酒なし</option>
                <option>平日半量</option>
                <option>金土自由</option>
                <option>飲み過ぎ</option>
              </select>
            </label>

            <p className="form-section">学習</p>
            <div className="field-row">
              <label>
                言語・技術
                <select value={form.studyTopic} onChange={(e) => updateField("studyTopic", e.target.value)}>
                  <option>React</option>
                  <option>JavaScript</option>
                  <option>GAS</option>
                  <option>Gemini API</option>
                  <option>Google Workspace</option>
                  <option>CSS</option>
                  <option>その他</option>
                </select>
              </label>
              <label>
                学習時間 分
                <input inputMode="numeric" value={form.studyMinutes} onChange={(e) => updateField("studyMinutes", e.target.value)} placeholder="60" />
              </label>
            </div>

            <label>
              今日やったこと
              <textarea value={form.studiedDetail} onChange={(e) => updateField("studiedDetail", e.target.value)} rows="3" />
            </label>

            <label>
              詰まったこと
              <textarea value={form.blocker} onChange={(e) => updateField("blocker", e.target.value)} rows="2" />
            </label>

            <p className="form-section">メモ</p>
            <label>
              今日の一言
              <input value={form.oneLine} onChange={(e) => updateField("oneLine", e.target.value)} placeholder="雨でも朝の流れは守れた" />
            </label>

            <button className="primary-button" type="submit">
              <Save size={18} />
              保存
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="section-heading">
            <BarChart3 size={20} />
            <h2>週次グラフ</h2>
          </div>
          <Chart title="距離 km" entries={recentEntries} valueKey="distanceKm" color="#247BA0" />
          <Chart title="学習時間 分" entries={recentEntries} valueKey="studyMinutes" color="#5B8E3E" />
          <Chart title="歩数" entries={recentEntries} valueKey="steps" color="#C45A32" />
        </section>

        <section className="panel ai-panel">
          <div className="section-heading">
            <Sparkles size={20} />
            <h2>AI振り返り</h2>
          </div>
          {aiReview ? (
            <>
              <select className="entry-select" value={selectedEntry.date} onChange={(e) => setSelectedDate(e.target.value)}>
                {sortedEntries.map((entry) => (
                  <option key={entry.id ?? entry.date} value={entry.date}>{entry.date}</option>
                ))}
              </select>
              <div className="review-box">
                <h3>今日の振り返り</h3>
                <p>{aiReview.today}</p>
                <h3>明日の取組</h3>
                <p>{aiReview.tomorrow}</p>
                <h3>一言</h3>
                <p>{aiReview.note}</p>
              </div>
              <button className="secondary-button" type="button" onClick={copyPrompt}>
                <Copy size={18} />
                ChatGPT用プロンプトをコピー
              </button>
              <textarea className="prompt-preview" value={aiPrompt} readOnly rows="8" />
            </>
          ) : (
            <p className="empty">ログを保存すると振り返りが表示されます。</p>
          )}
        </section>

        <section className="panel history-panel">
          <div className="section-heading">
            <CalendarDays size={20} />
            <h2>履歴</h2>
          </div>
          <div className="history-list">
            {sortedEntries.map((entry) => (
              <article className="history-item" key={entry.id ?? entry.date}>
                <div>
                  <strong>{entry.date}</strong>
                  <p>{entry.activityType} / {entry.distanceKm || 0}km / {entry.studyTopic} {entry.studyMinutes || 0}分</p>
                  <span>{entry.oneLine || "一言なし"}</span>
                </div>
                <div className="icon-actions">
                  <button type="button" onClick={() => editEntry(entry)}>編集</button>
                  <button type="button" className="danger" onClick={() => deleteEntry(entry.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ icon, label, value }) {
  return (
    <article className="metric-card">
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Chart({ title, entries, valueKey, color }) {
  const values = entries.map((entry) => numberValue(entry[valueKey]));
  const max = Math.max(...values, 1);
  const width = 520;
  const height = 180;
  const padding = 28;
  const barWidth = (width - padding * 2) / Math.max(entries.length, 1) - 8;

  return (
    <div className="chart-block">
      <h3>{title}</h3>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}の推移`}>
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#CDD6DD" />
        {entries.map((entry, index) => {
          const value = numberValue(entry[valueKey]);
          const barHeight = ((height - padding * 2) * value) / max;
          const x = padding + index * (barWidth + 8);
          const y = height - padding - barHeight;
          return (
            <g key={`${entry.date}-${valueKey}`}>
              <rect x={x} y={y} width={barWidth} height={barHeight} rx="4" fill={color} />
              <text x={x + barWidth / 2} y={height - 8} textAnchor="middle">{entry.date.slice(5)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function buildAiReview(entry, stats) {
  const moved = numberValue(entry.durationMin) >= 10 || numberValue(entry.distanceKm) > 0;
  const studied = numberValue(entry.studyMinutes) >= 30;
  const walkedEnough = numberValue(entry.steps) >= 8000;
  const wakeGood = entry.wakeTime <= "05:30";
  const alcoholGood = entry.alcohol !== "飲み過ぎ";

  const wins = [
    moved ? "運動ログが取れている" : "",
    studied ? `${entry.studyTopic}を${entry.studyMinutes}分進めた` : "",
    walkedEnough ? "歩数8,000歩を超えた" : "",
    wakeGood ? "朝の起床リズムを守れた" : "",
    alcoholGood ? "お酒のルールを大きく崩していない" : "",
  ].filter(Boolean);

  const focus = [
    !moved ? "朝は10分の室内運動でもよいので体を動かす" : "",
    !studied ? "ReactかGASを30分だけ触る" : "",
    !walkedEnough ? "昼か夕方に15分歩いて歩数を補う" : "",
    !wakeGood ? "22:00以降のスマホ終了を優先する" : "",
    entry.alcohol === "飲み過ぎ" ? "明日は飲酒なし、またはハイボール2杯で止める" : "",
  ].filter(Boolean);

  return {
    today: wins.length ? wins.join("。") + "。" : "今日はログを残せたこと自体が成果です。",
    tomorrow: focus.length ? focus.slice(0, 2).join("。") + "。" : "明日は同じリズムで、朝の運動と午前の集中開発を継続しましょう。",
    note: `直近7日の運動距離は${formatNumber(stats.distance)}km、学習時間は${formatNumber(stats.study, 0)}分です。完璧さより、記録を切らさないことを優先します。`,
  };
}

function buildAiPrompt(entry, stats) {
  return `あなたは生活習慣とAI開発学習のコーチです。以下の今日のログをもとに、短く実行しやすい振り返りと明日の取組を日本語で提案してください。

条件:
- 厳しすぎない
- 体重より生活リズムを重視
- 明日の行動は3つ以内
- React/GAS/AI開発の学習継続につながる内容にする

今日のログ:
- 日付: ${entry.date}
- 運動: ${entry.activityType}
- 距離: ${entry.distanceKm || 0}km
- 時間: ${entry.durationMin || 0}分
- 場所: ${entry.place || "未入力"}
- 雨の日代替: ${entry.rainyAlternative ? "実施" : "なし"}
- 歩数: ${entry.steps || 0}
- 起床: ${entry.wakeTime}
- 就寝: ${entry.sleepTime}
- 体重: ${entry.weightKg || "未入力"}
- お酒: ${entry.alcohol}
- 学習: ${entry.studyTopic}
- 学習時間: ${entry.studyMinutes || 0}分
- 今日やったこと: ${entry.studiedDetail || "未入力"}
- 詰まったこと: ${entry.blocker || "未入力"}
- 今日の一言: ${entry.oneLine || "未入力"}

直近7日:
- 運動距離: ${formatNumber(stats.distance)}km
- 運動時間: ${formatNumber(stats.minutes, 0)}分
- 学習時間: ${formatNumber(stats.study, 0)}分
- 平均歩数: ${formatNumber(stats.steps / Math.max(stats.count, 1), 0)}歩
`;
}

createRoot(document.getElementById("root")).render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // The app still works without offline caching.
    });
  });
}
