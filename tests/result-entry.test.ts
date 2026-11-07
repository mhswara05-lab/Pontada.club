import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyCommand,initialTournament,standings,type Tournament} from '../lib/core.ts';
import {parseResultNote} from '../lib/result-entry.ts';
const run=(t:Tournament,c:Parameters<typeof applyCommand>[1])=>applyCommand(t,c,'Penguji');
const fixture=()=>run(initialTournament(),{type:'GENERATE'});
const command=(t:Tournament,index=0)=>{const m=t.matches[index];return {type:'RECORD_RESULT',matchId:m.id,round:m.round,playerId:m.b[0],scoreFor:13,scoreAgainst:8};};

test('hasil catatan Tim B dibalik dengan benar, langsung final dan poin kedua pasangan dihitung sekali',()=>{
 const t=fixture(),m=t.matches[0],next=run(t,command(t)),recorded=next.matches[0];
 assert.equal(recorded.status,'COMPLETED');assert.equal(recorded.scoreA,8);assert.equal(recorded.scoreB,13);
 for(const id of m.b)assert.equal(standings(next).find(p=>p.playerId===id)?.pointsFor,13);
 for(const id of m.a)assert.equal(standings(next).find(p=>p.playerId===id)?.pointsFor,8);
 assert.throws(()=>run(next,command(t)),/sudah disahkan/);
 assert.equal(t.matches[0].status,'SCHEDULED');assert.equal(t.matches[0].scoreA,0);
 assert(recorded.finishedAt);assert.equal(recorded.events.length,1);assert.match(next.audit[0].text,/hasil catatan/);
});
test('hasil retrospektif tidak memulai pertandingan atau mengubah pertandingan lain yang sedang aktif',()=>{
 let t=fixture();t=run(t,{type:'START',matchId:t.matches[0].id});
 const sameCourt=t.matches.findIndex((m,i)=>i>0&&m.court===t.matches[0].court);
 const active=structuredClone(t.matches[0]),next=run(t,command(t,sameCourt));
 assert.deepEqual(next.matches[0],active);assert.equal(next.matches[sameCourt].status,'COMPLETED');
});
test('catatan menolak batch, pemain, dan skor akhir yang tidak sesuai tanpa mengubah data',()=>{
 const t=fixture(),c=command(t);
 for(const edit of [{round:999},{playerId:'unknown'},{scoreFor:12,scoreAgainst:8},{scoreFor:-1},{scoreFor:1.5},{scoreFor:'13'},{scoreFor:21,scoreAgainst:21}])assert.throws(()=>run(t,{...c,...edit}));
 assert(t.matches.every(m=>m.status==='SCHEDULED'));
});
test('hasil aktif menyimpan skor sebelumnya; koreksi hasil tetap harus melalui buka kembali',()=>{
 let t=fixture();const m=t.matches[0];t=run(t,{type:'START',matchId:m.id});t=run(t,{type:'SET_SCORE',matchId:m.id,scoreA:2,scoreB:3});
 t=run(t,command(t));assert.deepEqual({a:t.matches[0].events.at(-1)?.a,b:t.matches[0].events.at(-1)?.b},{a:2,b:3});
 assert.throws(()=>run(t,{type:'SET_SCORE',matchId:m.id,scoreA:10,scoreB:11}));
 t=run(t,{type:'REOPEN',matchId:m.id,reason:'Salah catat'});t=run(t,{type:'SET_SCORE',matchId:m.id,scoreA:10,scoreB:11});t=run(t,{type:'FINALIZE',matchId:m.id});assert.equal(t.matches[0].scoreA,10);
});
test('aturan first-to-target juga memvalidasi hasil catatan',()=>{
 const t=fixture();t.rules={mode:'FIRST_TO_TARGET',target:11,winBy:2};
 assert.throws(()=>run(t,{...command(t),scoreFor:11,scoreAgainst:10}));
 assert.equal(run(t,{...command(t),scoreFor:12,scoreAgainst:10}).matches[0].scoreB,12);
});
test('pembaca catatan mencocokkan nama dan batch, mendukung tanda pisah WA, menolak ambigu dan baris ganda',()=>{
 const t=fixture(),m=t.matches[0],p=t.players.find(p=>p.id===m.b[0])!;
 const note=`${m.round} ${p.name.toLowerCase()} 13 – 8`;
 assert.deepEqual(parseResultNote(note,t),{round:m.round,playerId:p.id,scoreFor:13,scoreAgainst:8});
 assert.throws(()=>parseResultNote(note+'\n'+note,t),/satu catatan/);
 assert.throws(()=>parseResultNote(`999 ${p.name} 13 - 8`,t),/tidak cocok/);
 assert.throws(()=>parseResultNote('22 TidakAda 13 - 8',t),/belum ditemukan/);
 assert.throws(()=>parseResultNote('catatan tidak lengkap',t),/format/);
 const ambiguous=structuredClone(t);ambiguous.players[0].name='Pemain Mirip A';ambiguous.players[1].name='Pemain Mirip B';
 assert.throws(()=>parseResultNote('1 Pemain Mirip 13 - 8',ambiguous),/beberapa pemain/);
 assert.deepEqual(parseResultNote(note,run(t,command(t))),parseResultNote(note,t));
});
