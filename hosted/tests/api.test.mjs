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
const initial = await request('data');
assert.equal(initial.status,200); assert.equal(initial.data.courses.length,3);
assert.deepEqual(initial.data.students,[]); assert.deepEqual(initial.data.feedback,[]);
assert.equal((await request('reset','POST',{})).status,403);
assert.equal((await request('data','PUT',{})).status,403);
assert.equal((await request('apply','POST',{name:'<img src=x>',email:'test@example.test',phone:'000',courseId:1})).status,400);
const adminBefore = await request('data','GET',undefined,true);
const applies = await Promise.all(Array.from({length:8},(_,n) => request('apply','POST',{name:`Тест ${n}`,email:`test${n}@example.test`,phone:'0000000000',courseId:1})));
assert(applies.every(x=>x.status===201));
assert.equal(new Set(applies.map(x=>x.data.applicationId)).size,8);
const ownResponse = await api.GET(new Request('https://example.test/api/data',{headers:{cookie:applies[0].cookie.split(';')[0]}}));
const ownData = await ownResponse.json();
assert.equal(ownData.students.length,1); assert.equal(ownData.enrollments.length,1);
assert.equal(ownData.students[0].email,'test0@example.test');
const after = (await request('data','GET',undefined,true)).data;
assert.equal(after.students.length,adminBefore.data.students.length+8);
assert.equal(after.enrollments.length,adminBefore.data.enrollments.length+8);
assert.equal(new Set(after.enrollments.map(x=>x.studentId)).size,after.enrollments.length);
assert.equal((await request('data','PUT',adminBefore.data,true)).status,409);
assert.equal((await request('data','GET',undefined,true)).data.students.length,after.students.length);
assert.equal((await request('feedback','POST',{name:'Тест',email:'test@example.test',message:'Проверка обращения'})).status,201);
const latest = (await request('data','GET',undefined,true)).data;
assert.equal(latest.feedback.length,1);
latest.courses[0].price=35000;
assert.equal((await request('data','PUT',latest,true)).status,200);
assert.equal((await request('data')).data.courses[0].price,35000);
assert.equal((await request('data')).data.feedback.length,0);
const crossOrigin = await api.POST(new Request('https://example.test/api/apply',{method:'POST',headers:{origin:'https://other.test'},body:'{}'}));
assert.equal(crossOrigin.status,403);
assert.equal((await request('apply','POST',{name:'Тест',email:'test@example.test',phone:'000',courseId:999})).status,400);
assert.equal((await request('reset','POST',{},true)).status,200);
assert.equal((await request('data','GET',undefined,true)).data.students.length,3);
console.log('PASS: public access, admin authorization, validation, atomic applications, concurrent IDs, stale updates, feedback persistence, reset');
sql.close();
