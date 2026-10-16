import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';

const sql = new DatabaseSync(':memory:');
sql.exec('CREATE TABLE records (entity TEXT NOT NULL,id INTEGER NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(entity,id)); CREATE TABLE state (key TEXT PRIMARY KEY,value INTEGER NOT NULL); CREATE TABLE receipts(token_hash TEXT NOT NULL,student_id INTEGER NOT NULL,PRIMARY KEY(token_hash,student_id));');
function prepared(query, values = []) {
  return {query, values, bind(...v) { return prepared(query,v); },
    async first() { return sql.prepare(query).get(...values) ?? null; },
    async all() { return {results:sql.prepare(query).all(...values)}; }
  };
}
const DB = {prepare:prepared, async batch(statements) {
  sql.exec('BEGIN');
  try {
    const result = statements.map(({query,values}) => {
      const results = sql.prepare(query).all(...values);
      const changes = sql.prepare('SELECT changes() AS n').get().n;
      return {results,meta:{changes},success:true};
    });
    sql.exec('COMMIT'); return result;
  } catch(e) { sql.exec('ROLLBACK'); throw e; }
}};
globalThis.__testEnv = {DB,ADMIN_EMAIL:'admin@example.test'};
const seed = readFileSync(new URL('../db/seed.json',import.meta.url),'utf8');
const source = readFileSync(new URL('../app/api/[...path]/route.ts',import.meta.url),'utf8')
  .replace('import { env } from "cloudflare:workers";', 'const env = globalThis.__testEnv;')
  .replace('import seed from "../../../db/seed.json";', `const seed = ${seed};`);
const code = ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const api = await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
async function request(path,method='GET',payload,admin=false) {
 const headers = {'Content-Type':'application/json'};
 if(admin) headers['oai-authenticated-user-email']='admin@example.test';
 const response = await api[method](new Request('https://example.test/api/'+path,{method,headers,body:payload===undefined?undefined:JSON.stringify(payload)}));
 return {status:response.status,data:await response.json(),cookie:response.headers.get("set-cookie")};
}
sql.exec(readFileSync(new URL('../drizzle/0001_demonic_mojo.sql',import.meta.url),'utf8'));
sql.prepare("INSERT INTO records(entity,id,payload) VALUES('students',999,?)").run(JSON.stringify({name:'PRIVATE SENTINEL',email:'private@example.test'}));
const initial = await request('data');
assert.equal(initial.status,200); assert.equal(initial.data._admin,true);
assert.equal(initial.data.courses.length,3); assert.equal(initial.data.students.length,3);
assert(!JSON.stringify(initial.data).includes('PRIVATE SENTINEL'));
assert(initial.data.students.every(student=>student.email===''));
const applies = await Promise.all(Array.from({length:8},(_,n)=>request('apply','POST',{name:`Учебный студент ${n}`,email:`test${n}@example.test`,phone:'0000000000',courseId:1})));
assert(applies.every(result=>result.status===201));
assert.equal(new Set(applies.map(result=>result.data.applicationId)).size,8);
const after = (await request('data')).data;
assert.equal(after.students.length,11); assert.equal(after.enrollments.length,11);
assert.equal((await request('data','PUT',initial.data)).status,409);
assert.equal((await request('feedback','POST',{name:'Учебный тест',email:'test@example.test',message:'Проверка общей базы'})).status,201);
const common = (await request('data')).data; assert.equal(common.feedback.length,1);
common.courses[0].price=35000;
assert.equal((await request('data','PUT',common)).status,200);
assert.equal((await request('data')).data.courses[0].price,35000);
assert.equal((await request('apply','POST',{name:'<script>',email:'test@example.test',phone:'000',courseId:1})).status,400);
const crossOrigin = await api.POST(new Request('https://example.test/api/reset',{method:'POST',headers:{origin:'https://other.test'},body:'{}'}));
assert.equal(crossOrigin.status,403);
assert.equal((await request('reset','POST',{})).status,200);
assert.equal((await request('data')).data.students.length,3);
assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM records WHERE entity='students' AND id=999").get().n,1);
assert(!JSON.stringify((await request('data')).data).includes('PRIVATE SENTINEL'));
console.log('PASS: public demo administration, shared data, concurrent applications, stale updates, reset, closed-data isolation');
sql.close();
