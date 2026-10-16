import { env } from "cloudflare:workers";
import seed from "../../../db/seed.json";

type Row = Record<string, any>;
const entities = Object.keys(seed);
const publicEntities = ["courses", "teachers", "groups", "schedules"];
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: {"Cache-Control":"no-store", "X-Content-Type-Options":"nosniff"} });
function database() { if (!env.DB) throw new Error("База данных недоступна"); return env.DB; }
function isAdmin(request: Request) {
  const email = request.headers.get("oai-authenticated-user-email");
  const allowed = (env as any).ADMIN_EMAIL;
  return Boolean(email && allowed && email.toLowerCase() === allowed.toLowerCase());
}
async function initialize() {
  const db = database();
  // Schema comes from migrations. Seed only the empty database, once, atomically.
  const statements = entities.flatMap(entity => (seed as Row)[entity].map((record: Row) =>
    db.prepare("INSERT INTO records(entity,id,payload) SELECT ?,?,? WHERE NOT EXISTS (SELECT 1 FROM state WHERE key='initialized')")
      .bind(entity, record.id, JSON.stringify(record))));
  statements.push(db.prepare("INSERT OR IGNORE INTO state(key,value) VALUES('version',1)"));
  statements.push(db.prepare("INSERT OR IGNORE INTO state(key,value) VALUES('initialized',1)"));
  await db.batch(statements);
}
async function data(admin: boolean) {
  const db = database();
  const rows = await db.prepare("SELECT entity,id,payload FROM records ORDER BY id").all<Row>();
  const result: Row = Object.fromEntries(entities.map(entity => [entity, []]));
  for (const row of rows.results) {
    if (admin || publicEntities.includes(row.entity)) result[row.entity].push({...JSON.parse(row.payload), id: row.id});
  }
  result._version = (await db.prepare("SELECT value FROM state WHERE key='version'").first<Row>())?.value ?? 1;
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
    if (path === "data" && method === "GET") return json(await data(admin));
    if (path === "apply" && method === "POST") {
      const fields = contact(p), phone = text(p.phone,40), courseId = Number(p.courseId);
      if (!Number.isInteger(courseId) || !await db.prepare("SELECT id FROM records WHERE entity='courses' AND id=?").bind(courseId).first()) return json({error:"Курс не найден"},400);
      const today = new Date().toISOString().slice(0,10);
      const student = {...fields, phone, birthDate:"",regDate:today};
      const enrollment = {courseId,enrollDate:today};
      const group = await db.prepare("SELECT id FROM records WHERE entity='groups' AND json_extract(payload,'$.courseId')=? ORDER BY id LIMIT 1").bind(courseId).first<Row>();
      const results = await db.batch([
        db.prepare("INSERT INTO records(entity,id,payload) SELECT 'students',COALESCE(MAX(id),0)+1,? FROM records WHERE entity='students' RETURNING id").bind(JSON.stringify(student)),
        db.prepare("INSERT INTO records(entity,id,payload) SELECT 'enrollments',COALESCE(MAX(id),0)+1,json_set(?,'$.studentId',(SELECT MAX(id) FROM records WHERE entity='students'),'$.groupId',?) FROM records WHERE entity='enrollments' RETURNING id").bind(JSON.stringify(enrollment),group?.id ?? null),
        db.prepare("UPDATE state SET value=value+1 WHERE key='version'")
      ]);
      return json({ok:true,applicationId:(results[1].results[0] as Row).id},201);
    }
    if (path === "feedback" && method === "POST") {
      const record = {...contact(p),message:text(p.message,3000),createdAt:new Date().toISOString()};
      await db.batch([
        db.prepare("INSERT INTO records(entity,id,payload) SELECT 'feedback',COALESCE(MAX(id),0)+1,? FROM records WHERE entity='feedback'").bind(JSON.stringify(record)),
        db.prepare("UPDATE state SET value=value+1 WHERE key='version'")
      ]);
      return json({ok:true},201);
    }
    if (!admin) return json({error:"Для этого действия нужен вход администратора"},403);
    if (path === "data" && method === "PUT") {
      if (!Number.isInteger(p._version) || !entities.every(e => Array.isArray(p[e]) && p[e].every((r: Row) => validRecord(r) && Number.isInteger(r.id) && r.id > 0))) return json({error:"Некорректные данные"},400);
      const expected = p._version;
      const statements = [db.prepare("DELETE FROM records WHERE (SELECT value FROM state WHERE key='version')=?").bind(expected)];
      for (const entity of entities) for (const record of p[entity]) statements.push(db.prepare("INSERT INTO records(entity,id,payload) SELECT ?,?,? WHERE (SELECT value FROM state WHERE key='version')=?").bind(entity,record.id,JSON.stringify(record),expected));
      statements.push(db.prepare("UPDATE state SET value=value+1 WHERE key='version' AND value=?").bind(expected));
      const results = await db.batch(statements);
      if (!results.at(-1)?.meta.changes) return json({error:"Данные уже изменились. Обновите страницу и повторите действие."},409);
      return json(await data(true));
    }
    if (path === "reset" && method === "POST") {
      const statements = [db.prepare("DELETE FROM records")];
      for (const entity of entities) for (const record of (seed as Row)[entity]) statements.push(db.prepare("INSERT INTO records(entity,id,payload) VALUES(?,?,?)").bind(entity,record.id,JSON.stringify(record)));
      statements.push(db.prepare("UPDATE state SET value=value+1 WHERE key='version'"));
      await db.batch(statements); return json(await data(true));
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
