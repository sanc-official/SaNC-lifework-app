/**
 * SaNC Lifework Log — Cloudflare Worker API
 *
 * 自分専用のAPI。Cloudflare D1 (SQLite) に「1日1行」でログを保存する。
 *   GET  /  : 全レコードをJSON配列で返す
 *   POST /  : { entries: [...] } を日付キーでupsert（追加 or 上書き）
 *
 * セットアップは server/README.md を参照。
 */

// アプリ側のエントリと同じカラム。date を主キーにする。
const COLUMNS = [
  "date",
  "id",
  "activityType",
  "distanceKm",
  "durationMin",
  "place",
  "rainyAlternative",
  "steps",
  "wakeTime",
  "sleepTime",
  "weightKg",
  "alcohol",
  "studyTopic",
  "studyMinutes",
  "studiedDetail",
  "blocker",
  "oneLine",
  "updatedAt",
  "deleted",
];

const BOOL_COLUMNS = new Set(["rainyAlternative", "deleted"]);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function entryToValues(entry) {
  return COLUMNS.map((col) => {
    if (BOOL_COLUMNS.has(col)) return entry[col] ? 1 : 0;
    const v = entry[col];
    return v === undefined || v === null ? "" : String(v);
  });
}

function rowToEntry(row) {
  const entry = { ...row };
  for (const col of BOOL_COLUMNS) {
    entry[col] = Boolean(row[col]);
  }
  return entry;
}

const UPSERT_SQL = `INSERT INTO entries (${COLUMNS.join(", ")})
VALUES (${COLUMNS.map(() => "?").join(", ")})
ON CONFLICT(date) DO UPDATE SET ${COLUMNS.filter((c) => c !== "date")
  .map((c) => `${c} = excluded.${c}`)
  .join(", ")}`;

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    try {
      if (request.method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT * FROM entries ORDER BY date DESC",
        ).all();
        return json(results.map(rowToEntry));
      }

      if (request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const entries = Array.isArray(body.entries) ? body.entries : [];
        if (entries.length) {
          const stmt = env.DB.prepare(UPSERT_SQL);
          const batch = entries.map((e) => stmt.bind(...entryToValues(e)));
          await env.DB.batch(batch);
        }
        return json({ ok: true, count: entries.length });
      }

      return json({ error: "method not allowed" }, 405);
    } catch (err) {
      return json({ error: String(err && err.message ? err.message : err) }, 500);
    }
  },
};
