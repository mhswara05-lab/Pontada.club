import {test} from 'node:test';
import assert from 'node:assert/strict';
import {allowedMutation,authDigest,managerCookie,newSessionToken,pinsMatch,readSessionToken,validPin} from '../lib/pin-session.ts';
import {initialTournament,applyCommand,publicTournament} from '../lib/core.ts';

test('PIN validation preserves leading zeros and rejects malformed input',async()=>{
  assert(validPin('0482'));assert(!validPin(4826));assert(!validPin('48a6'));assert(!validPin('48260'));
  assert(await pinsMatch('0482','0482'));assert(!await pinsMatch('0482','4826'));assert(!await pinsMatch('4826',''));
});
test('session tokens are unpredictable and malformed or duplicate cookies fail closed',()=>{
  const a=newSessionToken(),b=newSessionToken();assert.match(a,/^[a-f0-9]{64}$/);assert.notEqual(a,b);
  assert.equal(readSessionToken('other=1; pontada_manager='+a),a);
  assert.equal(readSessionToken('pontada_manager=true'),null);
  assert.equal(readSessionToken('pontada_manager='+a+'; pontada_manager='+b),null);
});
test('stored session digests bind PIN, club and purpose without exposing tokens',async()=>{
  const token=newSessionToken(),a=await authDigest('session',token,'4826','club-a');
  assert.notEqual(a,token);assert.equal(a.length,64);
  assert.notEqual(a,await authDigest('session',token,'0482','club-a'));
  assert.notEqual(a,await authDigest('session',token,'4826','club-b'));
  assert.notEqual(a,await authDigest('attempt',token,'4826','club-a'));
});
test('manager cookie is HTTP-only, host-scoped and secure on HTTPS',()=>{
  const cookie=managerCookie(newSessionToken(),'https://example.test');
  for(const option of ['HttpOnly','SameSite=Strict','Secure','Path=/','Max-Age=43200'])assert(cookie.includes(option));
  assert(!cookie.includes('Domain='));assert(!managerCookie('','http://127.0.0.1:5173',0).includes('Secure'));
  assert(managerCookie('','https://example.test',0).includes('Max-Age=0'));
});
test('mutations reject cross-origin browser calls and missing client headers',()=>{
  const request=(headers:Record<string,string>)=>new Request('https://example.test/api/auth/pin',{method:'POST',headers});
  assert(!allowedMutation(request({})));assert(!allowedMutation(request({'X-Pontada-Client':'1',Origin:'https://other.test'})));
  assert(!allowedMutation(request({'X-Pontada-Client':'1','Sec-Fetch-Site':'cross-site'})));
  assert(allowedMutation(request({'X-Pontada-Client':'1',Origin:'https://example.test'})));
});
test('public snapshots remove operator identities and undo history',()=>{
  let t=applyCommand(initialTournament(),{type:'GENERATE'},'PRIVATE_OPERATOR');
  const id=t.matches[0].id;t=applyCommand(t,{type:'START',matchId:id},'PRIVATE_OPERATOR');
  t=applyCommand(t,{type:'SCORE',matchId:id,team:'A',delta:1},'PRIVATE_OPERATOR');
  const projected=publicTournament(t);
  assert.equal(projected.audit.length,0);assert.equal(projected.matches[0].events.length,0);
  assert(!JSON.stringify(projected).includes('PRIVATE_OPERATOR'));
  assert.equal(t.matches[0].events.length,1);assert(t.audit.length>0);
});
test('setup applies settings and complete schedule atomically',()=>{
  const original=initialTournament();
  const next=applyCommand(original,{type:'SETUP',name:'Pontada Americano',courts:2,mode:'TOTAL_POINTS',target:21,winBy:1},'Penguji');
  assert.equal(next.name,'Pontada Americano');assert.equal(next.matches.length,95);assert.equal(original.matches.length,0);
  assert.throws(()=>applyCommand(original,{type:'SETUP',name:'Bad',courts:2,mode:'TOTAL_POINTS',target:20,winBy:1},'Penguji'));
  assert.equal(original.name,'Pontada Pickleball Tournament');
});
