-- Отдельная база Cloudflare. Существующий локальный файл SQLite не изменяется.
CREATE TABLE mission (
 id INTEGER PRIMARY KEY CHECK(id=1),
 stage INTEGER NOT NULL DEFAULT 0,
 version INTEGER NOT NULL DEFAULT 0,
 badges INTEGER NOT NULL DEFAULT 0,
 defenseAuthorized INTEGER NOT NULL DEFAULT 0,
 takeoverEndsAt INTEGER,
 edithUnlocked INTEGER NOT NULL DEFAULT 0,
 elementDiscovered INTEGER NOT NULL DEFAULT 0,
 timelineFound INTEGER NOT NULL DEFAULT 0,
 victory INTEGER NOT NULL DEFAULT 0,
 codeforces INTEGER NOT NULL DEFAULT 0,
 missionRun INTEGER NOT NULL DEFAULT 0,
 recoveryRequested INTEGER NOT NULL DEFAULT 0,
 recoveryHints TEXT NOT NULL DEFAULT '[]',
 ultronBattle TEXT NOT NULL DEFAULT 'inactive'
);
INSERT INTO mission(id) VALUES(1);

CREATE TABLE sessions (
 token_hash TEXT PRIMARY KEY,
 expires_at INTEGER NOT NULL,
 password_hash TEXT NOT NULL
);
CREATE INDEX sessions_expiry ON sessions(expires_at);

CREATE TABLE login_attempts (
 visitor_hash TEXT PRIMARY KEY,
 count INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX attempts_expiry ON login_attempts(expires_at);
