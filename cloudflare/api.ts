import { env } from "cloudflare:workers";
import seed from "./db/seed.json";

type Row = Record<string, any>;
const entities = Object.keys(seed);
const publicEntities = ["courses", "teachers", "groups", "schedules"];
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: {"Cache-Control":"no-store", "X-Content-Type-Options":"nosniff"} });
function database() { if (!env.DB) throw new Error("База данных недоступна"); return env.DB; }
function isAdmin(_request: Request) { return true; }
async function initialize() {
  const db = database();
  if (await db.prepare("SELECT value FROM demo_state WHERE key='initialized'").first()) return;
  // Schema comes from migrations. Seed only the empty database, once, atomically.
  const statements = entities.flatMap(entity => (seed as Row)[entity].map((record: Row) =>
    db.prepare("INSERT INTO demo_records(entity,id,payload) SELECT ?,?,? WHERE NOT EXISTS (SELECT 1 FROM demo_state WHERE key='initialized')")
      .bind(entity, record.id, JSON.stringify(record))));
  statements.push(db.prepare("INSERT OR IGNORE INTO demo_state(key,value) VALUES('version',1)"));
  statements.push(db.prepare("INSERT OR IGNORE INTO demo_state(key,value) VALUES('initialized',1)"));
  await db.batch(statements);
}
async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,"0")).join("");
}
function receipt(request: Request) {
  const token = request.headers.get("cookie")?.split(";").map(s=>s.trim()).find(s=>s.startsWith("devsphere_receipt="))?.slice(18);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}
async function data(admin: boolean, request: Request) {
  const db = database();
  const token = receipt(request);
  const tokenHash = token ? await digest(token) : "";
  const snapshots = await db.batch([
    db.prepare("SELECT entity,id,payload FROM demo_records ORDER BY id"),
    db.prepare("SELECT value FROM demo_state WHERE key='version'"),
    db.prepare("SELECT student_id FROM demo_receipts WHERE token_hash=?").bind(tokenHash)
  ]);
  const rows = snapshots[0] as {results: Row[]};
  const result: Row = Object.fromEntries(entities.map(entity => [entity, []]));
  const own = (snapshots[2].results as Row[]).map(row=>row.student_id);
  for (const row of rows.results) {
    const value = {...JSON.parse(row.payload), id: row.id};
    if (admin || publicEntities.includes(row.entity) || row.entity === "students" && own.includes(row.id) || row.entity === "enrollments" && own.includes(value.studentId)) result[row.entity].push(value);
  }
  result._version = (snapshots[1].results[0] as Row)?.value ?? 1;
  result._admin = admin;
  return result;
}
function text(value: unknown, max = 200) {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[<>]/.test(value)) throw new Error("Проверьте заполнение полей формы");
  return value.trim();
}
function contact(payload: Row) {
  const name = text(payload.name), email = text(payload.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Укажите корректный email");
  return {name, email};
}
function validRecord(value: unknown): value is Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every(v => v === null || typeof v === "number" && Number.isFinite(v) || typeof v === "string" && v.length <= 5000 && !/[<>]/.test(v));
}
async function handle(request: Request) {
  try {
    const url = new URL(request.url), path = url.pathname.slice(5), method = request.method;
    if (path === "health") return json({status:"ok",service:"DevSphere API",storage:"Cloudflare D1"});
    if (method !== "GET") {
      const origin = request.headers.get("origin");
      if (origin && origin !== url.origin) return json({error:"Недопустимый источник запроса"},403);
      const raw = await request.text();
      if (raw.length > 300000) return json({error:"Слишком большой запрос"},413);
      (request as any).payload = raw ? JSON.parse(raw) : {};
    }
    await initialize();
    const admin = isAdmin(request), db = database(), p = (request as any).payload || {};
    if (path === "data" && method === "GET") return json(await data(admin,request));
    if (path === "apply" && method === "POST") {
      const fields = contact(p), phone = text(p.phone,40), courseId = Number(p.courseId);
      if (!Number.isInteger(courseId) || !await db.prepare("SELECT id FROM demo_records WHERE entity='courses' AND id=?").bind(courseId).first()) return json({error:"Курс не найден"},400);
      const today = new Date().toISOString().slice(0,10);
      const student = {...fields, phone, birthDate:"",regDate:today};
      const enrollment = {courseId,enrollDate:today};
      const group = await db.prepare("SELECT id FROM demo_records WHERE entity='groups' AND json_extract(payload,'$.courseId')=? ORDER BY id LIMIT 1").bind(courseId).first<Row>();
      const token = receipt(request) || Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,"0")).join("");
      const tokenHash = await digest(token);
      const results = await db.batch([
        db.prepare("INSERT INTO demo_records(entity,id,payload) SELECT 'students',COALESCE(MAX(id),0)+1,? FROM demo_records WHERE entity='students' RETURNING id").bind(JSON.stringify(student)),
        db.prepare("INSERT INTO demo_records(entity,id,payload) SELECT 'enrollments',COALESCE(MAX(id),0)+1,json_set(?,'$.studentId',(SELECT MAX(id) FROM demo_records WHERE entity='students'),'$.groupId',?) FROM demo_records WHERE entity='enrollments' RETURNING id").bind(JSON.stringify(enrollment),group?.id ?? null),
        db.prepare("INSERT INTO demo_receipts(token_hash,student_id) SELECT ?,MAX(id) FROM demo_records WHERE entity='students'").bind(tokenHash),
        db.prepare("UPDATE demo_state SET value=value+1 WHERE key='version'")
      ]);
      const response = json({ok:true,applicationId:(results[1].results[0] as Row).id},201);
      response.headers.set("Set-Cookie", `devsphere_receipt=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${url.protocol === "https:" ? "; Secure" : ""}`);
      return response;
    }
    if (path === "feedback" && method === "POST") {
      const record = {...contact(p),message:text(p.message,3000),createdAt:new Date().toISOString()};
      await db.batch([
        db.prepare("INSERT INTO demo_records(entity,id,payload) SELECT 'feedback',COALESCE(MAX(id),0)+1,? FROM demo_records WHERE entity='feedback'").bind(JSON.stringify(record)),
        db.prepare("UPDATE demo_state SET value=value+1 WHERE key='version'")
      ]);
      return json({ok:true},201);
    }
    if (!admin) return json({error:"Для этого действия нужен вход администратора"},403);
    if (path === "data" && method === "PUT") {
      if (!Number.isInteger(p._version) || !entities.every(e => Array.isArray(p[e]) && p[e].every((r: Row) => validRecord(r) && Number.isInteger(r.id) && r.id > 0))) return json({error:"Некорректные данные"},400);
      const expected = p._version;
      const statements = [db.prepare("DELETE FROM demo_records WHERE (SELECT value FROM demo_state WHERE key='version')=?").bind(expected)];
      for (const entity of entities) for (const record of p[entity]) statements.push(db.prepare("INSERT INTO demo_records(entity,id,payload) SELECT ?,?,? WHERE (SELECT value FROM demo_state WHERE key='version')=?").bind(entity,record.id,JSON.stringify(record),expected));
      statements.push(db.prepare("DELETE FROM demo_receipts WHERE NOT EXISTS (SELECT 1 FROM demo_records WHERE entity='students' AND id=student_id) AND (SELECT value FROM demo_state WHERE key='version')=?").bind(expected));
      statements.push(db.prepare("UPDATE demo_state SET value=value+1 WHERE key='version' AND value=?").bind(expected));
      const results = await db.batch(statements);
      if (!results.at(-1)?.meta.changes) return json({error:"Данные уже изменились. Обновите страницу и повторите действие."},409);
      return json(await data(true,request));
    }
    if (path === "reset" && method === "POST") {
      const statements = [db.prepare("DELETE FROM demo_receipts"), db.prepare("DELETE FROM demo_records")];
      for (const entity of entities) for (const record of (seed as Row)[entity]) statements.push(db.prepare("INSERT INTO demo_records(entity,id,payload) VALUES(?,?,?)").bind(entity,record.id,JSON.stringify(record)));
      statements.push(db.prepare("UPDATE demo_state SET value=value+1 WHERE key='version'"));
      await db.batch(statements); return json(await data(true,request));
    }
    return json({error:"Ресурс не найден"},404);
  } catch (error) {
    console.error("DevSphere API", error instanceof Error ? error.message : "error");
    return json({error: error instanceof SyntaxError ? "Некорректный JSON" : error instanceof Error && /Проверьте|email/.test(error.message) ? error.message : "Не удалось выполнить запрос"},400);
  }
}
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
