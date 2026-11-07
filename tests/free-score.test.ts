import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyCommand,initialTournament,standings,validateImport,type Tournament} from '../lib/core.ts';
const run=(t:Tournament,c:Parameters<typeof applyCommand>[1])=>applyCommand(t,c,'Penguji Skor');
const fixture=()=>run(initialTournament(),{type:'GENERATE'});
const save=(t:Tournament,i:number,a:number,b:number)=>run(t,{type:'SAVE_SCORE',matchId:t.matches[i].id,scoreA:a,scoreB:b});

test('semua pertandingan dapat diberi skor tanpa START, termasuk babak terakhir dan lapangan yang sama',()=>{
 let t=fixture();t=save(t,0,2,1);t=save(t,2,4,3);t=save(t,t.matches.length-1,13,8);
 assert.equal(t.matches[0].scoreA,2);assert.equal(t.matches[2].scoreA,4);assert.equal(t.matches.at(-1)?.status,'COMPLETED');
 assert.equal(t.matches.filter(m=>m.status==='COMPLETED').length,1);
 assert.doesNotThrow(()=>validateImport(JSON.parse(JSON.stringify(t))));
});
test('koreksi hasil final langsung memperbarui main, menang, kalah dan poin tanpa menghitung ganda',()=>{
 let t=fixture(),m=t.matches[0];t=save(t,0,13,8);t=save(t,0,7,14);
 const rows=standings(t);for(const id of m.a){const r=rows.find(r=>r.playerId===id)!;assert.deepEqual([r.played,r.wins,r.losses,r.pointsFor],[1,0,1,7]);}
 for(const id of m.b){const r=rows.find(r=>r.playerId===id)!;assert.deepEqual([r.played,r.wins,r.losses,r.pointsFor],[1,1,0,14]);}
 t=save(t,0,7,14);assert.equal(standings(t).find(r=>r.playerId===m.a[0])?.played,1);
 assert.match(t.audit[1].text,/13–8 → 7–14/);assert.equal(t.audit[0].actor,'Penguji Skor');assert.equal(t.matches[0].events.length,3);
});
test('skor sementara tersimpan, hasil yang dikoreksi menjadi sementara dikeluarkan dari klasemen',()=>{
 let t=fixture();t=save(t,0,13,8);t=save(t,0,3,4);assert.equal(t.matches[0].status,'IN_PROGRESS');assert.equal(t.matches[0].finishedAt,undefined);
 assert(standings(t).every(r=>r.played===0&&r.pointsFor===0));t=save(t,0,0,0);assert.equal(t.matches[0].status,'SCHEDULED');assert.doesNotThrow(()=>validateImport(JSON.parse(JSON.stringify(t))));
});
test('edit skor tetap menolak angka tidak sah, target terlampaui, dan pertandingan tidak ditemukan',()=>{
 const t=fixture();for(const pair of [[-1,2],[1.5,2],[22,0],[13,9],['13',8],[NaN,8]])assert.throws(()=>run(t,{type:'SAVE_SCORE',matchId:t.matches[0].id,scoreA:pair[0],scoreB:pair[1]}));
 assert.throws(()=>run(t,{type:'SAVE_SCORE',matchId:'none',scoreA:13,scoreB:8}));assert.equal(t.matches[0].scoreA,0);
});
test('first-to-target tetap berlaku saat mengedit hasil lama',()=>{
 let t=fixture();t.rules={mode:'FIRST_TO_TARGET',target:11,winBy:2};t=save(t,0,12,10);t=save(t,0,9,11);assert.equal(t.matches[0].status,'COMPLETED');assert.equal(t.matches[0].scoreB,11);
 t=save(t,0,10,11);assert.equal(t.matches[0].status,'IN_PROGRESS');assert(standings(t).every(r=>r.played===0));assert.throws(()=>save(t,0,15,10));
});
