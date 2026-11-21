// В Node.js вход живёт до перезапуска сервера; в Workers — в общей D1.
export function memoryAuth() {
 const sessions=new Map();
 const attempts=new Map();
 return {
  getAttempt:key=>attempts.get(key),
  fail(key,now) {
   const previous=attempts.get(key);
   const attempt=previous?.until>now?previous:{count:0,until:now+900000};
   attempt.count++;
   attempts.set(key,attempt);
   return attempt.count;
  },
  clearAttempt:key=>attempts.delete(key),
  createSession:(key,until,passwordHash)=>sessions.set(key,{until,passwordHash}),
  hasSession:(key,now,passwordHash)=>{
   const session=sessions.get(key);
   return session?.until>now && session.passwordHash===passwordHash;
  },
  deleteSession:key=>sessions.delete(key),
  prune(now) {
   for(const [key,value] of sessions) if(value.until<=now) sessions.delete(key);
   for(const [key,value] of attempts) if(value.until<=now) attempts.delete(key);
  },
 };
}

export function d1Auth(db) {
 return {
  getAttempt:key=>db.prepare('SELECT count, expires_at AS "until" FROM login_attempts WHERE visitor_hash=?').get(key),
  async fail(key,now) {
   // Один UPSERT: одновременные запросы не теряют неудачные попытки.
   const row=await db.prepare(`INSERT INTO login_attempts(visitor_hash,count,expires_at) VALUES(?,1,?)
    ON CONFLICT(visitor_hash) DO UPDATE SET
     count=CASE WHEN expires_at>? THEN count+1 ELSE 1 END,
     expires_at=CASE WHEN expires_at>? THEN expires_at ELSE excluded.expires_at END
    RETURNING count`).get(key,now+900000,now,now);
   return row.count;
  },
  clearAttempt:key=>db.prepare('DELETE FROM login_attempts WHERE visitor_hash=?').run(key),
  createSession:(key,until,passwordHash)=>db.prepare('INSERT INTO sessions(token_hash,expires_at,password_hash) VALUES(?,?,?)').run(key,until,passwordHash),
  async hasSession(key,now,passwordHash) {
   return Boolean(await db.prepare('SELECT 1 FROM sessions WHERE token_hash=? AND expires_at>? AND password_hash=?').get(key,now,passwordHash));
  },
  deleteSession:key=>db.prepare('DELETE FROM sessions WHERE token_hash=?').run(key),
  async prune(now) {
   await db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(now);
   await db.prepare('DELETE FROM login_attempts WHERE expires_at<=?').run(now);
  },
 };
}
