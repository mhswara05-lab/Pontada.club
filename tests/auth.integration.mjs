import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const origin='http://127.0.0.1:5173';
const pin=process.env.PONTADA_TEST_PIN||readFileSync(new URL('../.dev.vars',import.meta.url),'utf8').match(/^PONTADA_MANAGER_PIN=["']?(\d{4})/m)?.[1];
assert(pin,'Local test PIN is required');
const headers={'Content-Type':'application/json','X-Pontada-Client':'1',Origin:origin};
const login=(value,extra={})=>fetch(origin+'/api/auth/pin',{method:'POST',headers:{...headers,...extra},body:JSON.stringify({pin:value})});
function clearLocalAttempts(){const r=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--command','DELETE FROM manager_login_attempts'],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(r.status,0,'Local rate-limit cleanup failed');}
let checks=0;
clearLocalAttempts();
try{
 assert.equal((await fetch(origin+'/api/tournament')).status,200);checks++;
 assert.equal((await fetch(origin+'/api/tournament?manage=1')).status,401);assert.equal((await fetch(origin+'/api/tournament?export=1')).status,401);checks++;
 assert.equal((await fetch(origin+'/api/tournament?manage=1',{headers:{Cookie:'pontada_manager='+'a'.repeat(64),'oai-authenticated-user-email':'seedy@sites.test','oai-authenticated-user-id':'local_seedy'}})).status,401);checks++;
 assert.equal((await login('abcd')).status,400);assert.equal((await login(Number(pin))).status,400);checks++;
 const wrong=pin==='0482'?'5826':'0482';assert.equal((await login(wrong)).status,401);checks++;
 assert.equal((await login(pin,{Origin:'https://other.example'})).status,403);checks++;
 const missingHeader=await fetch(origin+'/api/auth/pin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin})});assert.equal(missingHeader.status,403);checks++;
 const authenticated=await login(pin);assert.equal(authenticated.status,200);const setCookie=authenticated.headers.get('set-cookie');assert(setCookie.includes('HttpOnly'));assert(setCookie.includes('SameSite=Strict'));assert(setCookie.includes('Max-Age=43200'));const cookie=setCookie.split(';')[0];assert(!JSON.stringify(await authenticated.json()).includes(cookie.split('=')[1]));checks++;
 assert.equal((await fetch(origin+'/api/tournament?manage=1',{headers:{Cookie:cookie}})).status,200);assert.equal((await fetch(origin+'/api/tournament?export=1',{headers:{Cookie:cookie}})).status,200);checks++;
 assert.equal((await fetch(origin+'/api/auth/logout',{method:'POST',headers:{...headers,Cookie:cookie,Origin:'https://other.example'}})).status,403);checks++;
 const logout=await fetch(origin+'/api/auth/logout',{method:'POST',headers:{...headers,Cookie:cookie}});assert.equal(logout.status,200);assert(logout.headers.get('set-cookie').includes('Max-Age=0'));assert.equal((await fetch(origin+'/api/tournament?manage=1',{headers:{Cookie:cookie}})).status,401);checks++;
 const responses=await Promise.all(Array.from({length:8},()=>login(wrong)));assert.equal(responses.filter(r=>r.status===401).length,5);assert.equal(responses.filter(r=>r.status===429).length,3);const blocked=await login(pin);assert.equal(blocked.status,429);assert(Number(blocked.headers.get('retry-after'))>0);checks++;
 console.log(JSON.stringify({checks,passed:true,coverage:['public visibility','private history protection','forged sessions','PIN format','incorrect PIN','login CSRF','cookie flags','authorized reads and backup','logout CSRF','server-side logout revocation','concurrent PIN rate limiting']}));
}finally{clearLocalAttempts();}
