-- SaNC Lifework Log — D1 schema
-- 1日1行。date を主キーにして upsert する。

CREATE TABLE IF NOT EXISTS entries (
  date            TEXT PRIMARY KEY,
  id              TEXT,
  activityType    TEXT,
  distanceKm      TEXT,
  durationMin     TEXT,
  place           TEXT,
  rainyAlternative INTEGER DEFAULT 0,
  steps           TEXT,
  wakeTime        TEXT,
  sleepTime       TEXT,
  weightKg        TEXT,
  alcohol         TEXT,
  studyTopic      TEXT,
  studyMinutes    TEXT,
  studiedDetail   TEXT,
  blocker         TEXT,
  oneLine         TEXT,
  updatedAt       TEXT,
  deleted         INTEGER DEFAULT 0
);
