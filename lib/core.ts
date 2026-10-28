import { buildRotation } from './upstream/rotations.ts';
import { computeStandings } from './upstream/standings.ts';

export type Player = { id: string; name: string; active: boolean };
export type Rules = { mode: 'TOTAL_POINTS' | 'FIRST_TO_TARGET'; target: number; winBy: number };
export type ScoreEvent = { a: number; b: number; at: string; actor: string };
export type Match = { id: string; round: number; court: number; a: [string,string]; b: [string,string]; scoreA: number; scoreB: number; status: 'SCHEDULED'|'IN_PROGRESS'|'COMPLETED'; events: ScoreEvent[]; startedAt?: string; finishedAt?: string };
export type Audit = { id: string; at: string; actor: string; text: string };
export type Archive = { id: string; name: string; at: string; players: Player[]; matches: Match[]; rules: Rules };
export type Tournament = { schemaVersion: 1; name: string; courts: number; rules: Rules; players: Player[]; matches: Match[]; audit: Audit[]; archives: Archive[]; createdAt: string };
export type Command = { type: string; [key: string]: unknown };
export class DomainError extends Error { status:number; constructor(message:string,status=400){super(message);this.status=status;} }
function fail(message:string):never {throw new DomainError(message);}
const key = (a: string,b: string) => [a,b].sort().join('|');
const names = ['Ahmad','Arif','Bayu','Darwis','Dian','Eki','Erwin','Hidayat Patriquin','Hirfan','Ibas','Khairullah','Komang','Markel','Miyoe','Pundri','Rako','Tjokke','Verdi','Wanni','Yuyun'];
export function initialTournament(): Tournament {
  return {schemaVersion:1,name:'Pontada Pickleball Tournament',courts:2,rules:{mode:'TOTAL_POINTS',target:21,winBy:1},players:names.map((name,i)=>({id:`P${String(i+1).padStart(3,'0')}`,name,active:true})),matches:[],audit:[],archives:[],createdAt:new Date().toISOString()};
}
function integer(value: unknown,min: number,max: number,label: string): number { if(typeof value!=='number'||!Number.isInteger(value)||value<min||value>max) fail(`${label} harus bilangan bulat ${min}–${max}.`);return value as number; }
function cleanName(value: unknown): string {if(typeof value!=='string'||!value.trim()||value.trim().length>80) fail('Nama harus berisi 1–80 karakter.');return (value as string).trim();}
function seeded(seed: number) {let s=seed;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function shuffled<T>(arr:T[],rng:()=>number):T[]{const r=[...arr];for(let i=r.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[r[i],r[j]]=[r[j],r[i]];}return r;}
/** Retains ALL upstream partnerships; excess matches move to subsequent waves. */
export function buildMatches(players: Player[],courts:number):Match[]{
  integer(courts,1,8,'Jumlah lapangan');
  const active=players.filter(p=>p.active);const n=active.length;
  if(n<4||n>32) fail('Gunakan 4–32 pemain aktif.');
  if(n%4!==0&&n%4!==1) fail('Americano lengkap memerlukan 4, 5, 8, 9, 12, 13, 16, 17, 20, 21, 24, 25, 28, 29, atau 32 pemain agar setiap pasangan bermain tepat sekali.');
  const rotation=buildRotation(n);const pending:Match[]=[];const opponents=new Map<string,number>();
  for(const rotationRound of rotation){
    const teams=rotationRound.teams.map(t=>t.map(i=>active[i].id) as [string,string]);
    while(teams.length>=2){
      const a=teams.shift()!;let best=0;let cost=Infinity;
      teams.forEach((b,i)=>{let v=0;for(const x of a)for(const y of b)v+=opponents.get(key(x,y))||0;if(v<cost){cost=v;best=i;}});
      const b=teams.splice(best,1)[0];for(const x of a)for(const y of b)opponents.set(key(x,y),(opponents.get(key(x,y))||0)+1);
      pending.push({id:`M${String(pending.length+1).padStart(3,'0')}`,round:0,court:0,a,b,scoreA:0,scoreB:0,status:'SCHEDULED',events:[]});
    }
  }
  const result=allocateMatches(pending,courts);validateSchedule(result,active);return result;
}
function allocateMatches(input:Match[],courts:number,startRound=1):Match[]{
  const pending=[...input];const out:Match[]=[];const last=new Map<string,number>();const count=new Map<string,number>();let round=startRound;
  while(pending.length){
    const used=new Set<string>();let court=1;
    while(court<=courts){
      let best=-1;let cost=Infinity;
      pending.forEach((m,i)=>{const ids=[...m.a,...m.b];if(ids.some(id=>used.has(id)))return;const v=ids.reduce((s,id)=>s+(last.get(id)===round-1?12:0)+(count.get(id)||0)*4,0)+i/10000;if(v<cost){cost=v;best=i;}});
      if(best<0)break;const m={...pending.splice(best,1)[0],round,court};out.push(m);
      for(const id of [...m.a,...m.b]){used.add(id);last.set(id,round);count.set(id,(count.get(id)||0)+1);}court++;
    }
    round++;
  }
  return out;
}
export function validateSchedule(matches:Match[],players:Player[]):void{
  const roster=new Set(players.map(p=>p.id));const pairs=new Set<string>();const roundPlayers=new Set<string>();
  for(const m of matches){const ids=[...m.a,...m.b];if(new Set(ids).size!==4||ids.some(id=>!roster.has(id)))fail('Jadwal memiliki pemain ganda atau tidak dikenal.');
    for(const pair of [m.a,m.b]){const k=key(...pair);if(pairs.has(k))fail('Pasangan muncul lebih dari sekali.');pairs.add(k);}
    for(const id of ids){const k=`${m.round}:${id}`;if(roundPlayers.has(k))fail('Pemain bentrok dalam satu ronde.');roundPlayers.add(k);}
  }
  if(pairs.size!==players.length*(players.length-1)/2)fail('Jadwal belum mencakup seluruh pasangan.');
}
export function reached(a:number,b:number,r:Rules):boolean{return r.mode==='TOTAL_POINTS'?a+b===r.target:Math.max(a,b)>=r.target&&Math.abs(a-b)>=r.winBy;}
export function validateScore(a:unknown,b:unknown,r:Rules,final=false):[number,number]{
  const x=integer(a,0,199,'Skor A'),y=integer(b,0,199,'Skor B');
  if(r.mode==='TOTAL_POINTS'&&x+y>r.target)fail(`Total skor tidak boleh melebihi ${r.target}.`);
  if(r.mode==='FIRST_TO_TARGET'){
    if(r.winBy===1&&(x>r.target||y>r.target||(x===r.target&&y===r.target)))fail('Dengan selisih satu, pertandingan berakhir saat satu tim mencapai target.');
    const hi=Math.max(x,y),lo=Math.min(x,y);
    if(hi>r.target&&lo<r.target-r.winBy)fail('Skor melewati batas kemenangan.');
    if(hi>r.target&&hi-lo>r.winBy)fail('Skor melewati selisih kemenangan.');
  }
  if(final&&(!reached(x,y,r)||x===y))fail('Skor belum memenuhi syarat hasil akhir.');return [x,y];
}
export function standings(t: Pick<Tournament,'players'|'matches'>){
  const rows=computeStandings({pointsPerWin:0,pointsPerLoss:0,tieBreakers:[]},t.matches.filter(m=>m.status==='COMPLETED').map(m=>({teamA:m.a,teamB:m.b,scoreA:m.scoreA,scoreB:m.scoreB})),t.players.map(p=>p.id));
  const result=rows.map(r=>{const p=t.players.find(p=>p.id===r.playerId)!;const played=r.wins+r.losses;return {...r,name:p.name,active:p.active,played,average:played?r.pointsFor/played:0,remaining:t.matches.filter(m=>m.status!=='COMPLETED'&&[...m.a,...m.b].includes(p.id)).length};}).filter(r=>r.active||r.played>0);
  const compare=(a:typeof result[number],b:typeof result[number])=>b.pointsFor-a.pointsFor||b.wins-a.wins||b.pointDiff-a.pointDiff||b.average-a.average;
  result.sort((a,b)=>compare(a,b)||a.name.localeCompare(b.name));let rank=1;return result.map((r,i)=>{if(i===0||compare(result[i-1],r)!==0)rank=i+1;return {...r,rank};});
}
/** Rebuild all unstarted matches around locked and explicitly selected pairs. */
function rebalance(t:Tournament,match:Match,a:[string,string],b:[string,string]):void{
  const roster=t.players.filter(p=>p.active);const ids=new Set(roster.map(p=>p.id));
  if(new Set([...a,...b]).size!==4||[...a,...b].some(id=>!ids.has(id)))fail('Pilih empat pemain aktif yang berbeda.');
  const locked=t.matches.filter(m=>m.status!=='SCHEDULED');const taken=new Set(locked.flatMap(m=>[key(...m.a),key(...m.b)]));
  if(taken.has(key(...a))||taken.has(key(...b)))fail('Pasangan tersebut sudah bermain atau sedang bermain.');taken.add(key(...a));taken.add(key(...b));
  const edges:[string,string][]=[];for(let i=0;i<roster.length;i++)for(let j=i+1;j<roster.length;j++){const e:[string,string]=[roster[i].id,roster[j].id];if(!taken.has(key(...e)))edges.push(e);}
  if(edges.length%2)fail('Pasangan tersisa tidak dapat dibagi menjadi pertandingan.');
  let groups:{a:[string,string];b:[string,string]}[]|null=null;
  for(let attempt=1;attempt<=100&&!groups;attempt++){
    const pool=shuffled(edges,seeded(attempt*8317));const candidate:{a:[string,string];b:[string,string]}[]=[];let ok=true;
    while(pool.length){const x=pool.pop()!;const idx=pool.findIndex(y=>!y.some(id=>x.includes(id)));if(idx<0){ok=false;break;}candidate.push({a:x,b:pool.splice(idx,1)[0]});}
    if(ok)groups=candidate;
  }
  if(!groups)fail('Tidak ditemukan jadwal lengkap dengan pilihan ini. Coba pasangan lain.');
  const open=t.matches.filter(m=>m.status==='SCHEDULED'&&m.id!==match.id);
  if(open.length!==groups.length)fail('Jumlah pertandingan tidak konsisten.');
  const chosen={...match,a,b};const future=[chosen,...open.map((m,i)=>({...m,...groups![i]}))];
  // Renumber all rounds while preserving locked rosters, scores and match IDs.
  // Locked matches retain their original round and court; future uses later rounds.
  const start=locked.length?Math.max(...locked.map(m=>m.round))+1:1;
  t.matches=[...locked,...allocateMatches(future,t.courts,start)];validateSchedule(t.matches,roster);
}
function log(t:Tournament,text:string,actor:string){t.audit.unshift({id:crypto.randomUUID(),text,actor,at:new Date().toISOString()});t.audit=t.audit.slice(0,300);}
export function applyCommand(original:Tournament,c:Command,actor:string):Tournament{
  const t=structuredClone(original);const now=new Date().toISOString();
  const match=()=>t.matches.find(m=>m.id===c.matchId)||fail('Pertandingan tidak ditemukan.');
  const rosterUnlocked=()=>{if(t.matches.length)fail('Arsipkan turnamen atau hapus jadwal sebelum mengubah daftar pemain.');};
  switch(c.type){
    case 'SETUP':return applyCommand(applyCommand(t,{...c,type:'SETTINGS'},actor),{type:'GENERATE'},actor);
    case 'GENERATE':if(t.matches.length)fail('Jadwal sudah tersedia.');t.matches=buildMatches(t.players,t.courts);log(t,`Jadwal dibuat: ${t.matches.length} pertandingan.`,actor);break;
    case 'ADD_PLAYER':{rosterUnlocked();if(t.players.length>=40)fail('Maksimal 40 pemain.');const name=cleanName(c.name);if(t.players.some(p=>p.name.toLowerCase()===name.toLowerCase()))fail('Nama pemain sudah ada.');t.players.push({id:crypto.randomUUID(),name,active:true});log(t,`${name} ditambahkan.`,actor);break;}
    case 'RENAME_PLAYER':{const p=t.players.find(p=>p.id===c.playerId)||fail('Pemain tidak ditemukan.');const name=cleanName(c.name);if(t.players.some(x=>x.id!==p.id&&x.name.toLowerCase()===name.toLowerCase()))fail('Nama pemain sudah ada.');p.name=name;log(t,`Nama pemain diperbarui menjadi ${name}.`,actor);break;}
    case 'TOGGLE_PLAYER':{rosterUnlocked();const p=t.players.find(p=>p.id===c.playerId)||fail('Pemain tidak ditemukan.');p.active=!p.active;log(t,`${p.name} ${p.active?'diaktifkan':'dinonaktifkan'}.`,actor);break;}
    case 'SETTINGS':{const name=cleanName(c.name);const courts=integer(c.courts,1,8,'Lapangan');const mode=c.mode;if(mode!=='TOTAL_POINTS'&&mode!=='FIRST_TO_TARGET')fail('Mode skor tidak dikenal.');const target=integer(c.target,5,99,'Target poin');const winBy=integer(c.winBy,1,2,'Selisih kemenangan');if(mode==='TOTAL_POINTS'&&target%2===0)fail('Total poin harus ganjil agar hasil tidak seri.');if(t.matches.length&&(courts!==t.courts||mode!==t.rules.mode||target!==t.rules.target||winBy!==t.rules.winBy))fail('Aturan dan jumlah lapangan terkunci selama jadwal tersedia.');t.name=name;t.courts=courts;t.rules={mode,target,winBy};log(t,'Pengaturan turnamen diperbarui.',actor);break;}
    case 'START':{const m=match();if(m.status!=='SCHEDULED')fail('Pertandingan sudah dimulai.');const busy=t.matches.filter(x=>x.status==='IN_PROGRESS');if(busy.some(x=>x.court===m.court))fail(`Lapangan ${m.court} masih digunakan. Selesaikan pertandingan aktif terlebih dahulu.`);const ids=[...m.a,...m.b];if(busy.some(x=>[...x.a,...x.b].some(id=>ids.includes(id))))fail('Ada pemain yang masih bermain di pertandingan lain.');m.status='IN_PROGRESS';m.startedAt=now;log(t,`${m.id} dimulai di lapangan ${m.court}.`,actor);break;}
    case 'SCORE':{const m=match();if(m.status!=='IN_PROGRESS')fail('Mulai pertandingan terlebih dahulu.');if(c.team!=='A'&&c.team!=='B')fail('Tim tidak dikenal.');if(c.delta!==1&&c.delta!==-1)fail('Perubahan skor tidak valid.');if(c.delta===1&&reached(m.scoreA,m.scoreB,t.rules))fail('Target tercapai. Konfirmasi hasil atau koreksi skor.');const a=m.scoreA+(c.team==='A'?c.delta:0),b=m.scoreB+(c.team==='B'?c.delta:0);validateScore(a,b,t.rules);m.events.push({a:m.scoreA,b:m.scoreB,at:now,actor});m.events=m.events.slice(-120);m.scoreA=a;m.scoreB=b;log(t,`${m.id}: Tim ${c.team} ${Number(c.delta)>0?'+':''}${c.delta} poin (${a}–${b}).`,actor);break;}
    case 'SET_SCORE':{const m=match();if(m.status!=='IN_PROGRESS')fail('Pertandingan belum aktif.');const [a,b]=validateScore(c.scoreA,c.scoreB,t.rules);m.events.push({a:m.scoreA,b:m.scoreB,at:now,actor});m.events=m.events.slice(-120);m.scoreA=a;m.scoreB=b;log(t,`${m.id}: skor diatur ke ${a}–${b}.`,actor);break;}
    case 'UNDO':{const m=match();if(m.status!=='IN_PROGRESS')fail('Hasil final harus dibuka ulang sebelum dikoreksi.');const e=m.events.pop()||fail('Belum ada perubahan untuk dibatalkan.');m.scoreA=e.a;m.scoreB=e.b;log(t,`${m.id}: perubahan skor dibatalkan.`,actor);break;}
    case 'FINALIZE':{const m=match();if(m.status!=='IN_PROGRESS')fail('Pertandingan belum aktif.');validateScore(m.scoreA,m.scoreB,t.rules,true);m.status='COMPLETED';m.finishedAt=now;log(t,`${m.id} selesai: ${m.scoreA}–${m.scoreB}.`,actor);break;}
    case 'REOPEN':{const m=match();if(m.status!=='COMPLETED')fail('Pertandingan belum selesai.');const reason=cleanName(c.reason);if(t.matches.some(x=>x.status==='IN_PROGRESS'&&(x.court===m.court||[...x.a,...x.b].some(id=>[...m.a,...m.b].includes(id)))))fail('Pemain atau lapangan masih digunakan.');m.status='IN_PROGRESS';delete m.finishedAt;log(t,`${m.id} dibuka ulang: ${reason}`,actor);break;}
    case 'EDIT_MATCH':{const m=match();if(m.status!=='SCHEDULED')fail('Hanya pertandingan yang belum dimulai dapat diubah.');if(!Array.isArray(c.a)||!Array.isArray(c.b)||c.a.length!==2||c.b.length!==2)fail('Pasangan tidak valid.');rebalance(t,m,c.a as [string,string],c.b as [string,string]);log(t,`${m.id}: pasangan diubah dan jadwal tersisa diseimbangkan.`,actor);break;}
    case 'RESET':if(c.confirmation!=='RESET')fail('Ketik RESET untuk menghapus jadwal dan skor.');t.matches=[];log(t,'Jadwal dan skor dihapus oleh admin.',actor);break;
    case 'NEW_TOURNAMENT':{if(t.matches.some(m=>m.status==='IN_PROGRESS'))fail('Selesaikan pertandingan aktif sebelum mengarsipkan.');if(t.matches.length){t.archives.unshift({id:crypto.randomUUID(),name:t.name,at:now,players:structuredClone(t.players),matches:t.matches.map(m=>({...m,events:[]})),rules:{...t.rules}});t.archives=t.archives.slice(0,10);}t.matches=[];t.createdAt=now;log(t,'Turnamen baru dimulai; hasil sebelumnya diarsipkan.',actor);break;}
    case 'IMPORT':{const data=validateImport(c.data);data.archives=[...data.archives,...t.archives.filter(a=>!data.archives.some(b=>b.id===a.id))].slice(0,10);data.audit=t.audit;log(data,'Data dipulihkan dari cadangan JSON.',actor);return data;}
    default:fail('Tindakan tidak dikenal.');
  }
  return t;
}
export function validateImport(input:unknown):Tournament{
  if(!input||typeof input!=='object')fail('Format cadangan tidak valid.');const t=input as Tournament;
  if(t.schemaVersion!==1||!Array.isArray(t.players)||!Array.isArray(t.matches)||!t.rules)fail('Cadangan Pontada versi 1 diperlukan.');
  t.name=cleanName(t.name);integer(t.courts,1,8,'Lapangan');integer(t.rules.target,5,99,'Target');integer(t.rules.winBy,1,2,'Selisih');
  if(!['TOTAL_POINTS','FIRST_TO_TARGET'].includes(t.rules.mode))fail('Aturan skor tidak valid.');if(t.rules.mode==='TOTAL_POINTS'&&t.rules.target%2===0)fail('Target total poin harus ganjil.');
  if(t.players.length>40||t.matches.length>300)fail('Ukuran cadangan melebihi batas.');const ids=new Set<string>();
  for(const p of t.players){p.name=cleanName(p.name);if(typeof p.id!=='string'||!p.id||p.id.length>80||ids.has(p.id)||typeof p.active!=='boolean')fail('Daftar pemain tidak valid.');ids.add(p.id);}
  const matchIds=new Set<string>();for(const m of t.matches){if(typeof m.id!=='string'||!m.id||m.id.length>80||matchIds.has(m.id)||!Array.isArray(m.a)||!Array.isArray(m.b)||m.a.length!==2||m.b.length!==2)fail('Pertandingan tidak valid.');matchIds.add(m.id);integer(m.court,1,t.courts,'Lapangan pertandingan');integer(m.round,1,1000,'Ronde');if(!['SCHEDULED','IN_PROGRESS','COMPLETED'].includes(m.status))fail('Status tidak valid.');validateScore(m.scoreA,m.scoreB,t.rules,m.status==='COMPLETED');if(m.status==='SCHEDULED'&&(m.scoreA!==0||m.scoreB!==0))fail('Pertandingan belum dimulai harus berskor 0–0.');m.events=Array.isArray(m.events)?m.events.slice(-120).map(e=>{validateScore(e.a,e.b,t.rules);return {a:e.a,b:e.b,at:typeof e.at==='string'?e.at:'',actor:typeof e.actor==='string'?e.actor.slice(0,120):''};}):[];}
  if(t.matches.length)validateSchedule(t.matches,t.players.filter(p=>p.active));
  const busy=t.matches.filter(m=>m.status==='IN_PROGRESS');const courts=new Set<number>(),playing=new Set<string>();for(const m of busy){if(courts.has(m.court)||[...m.a,...m.b].some(id=>playing.has(id)))fail('Cadangan memiliki pertandingan aktif yang bentrok.');courts.add(m.court);[...m.a,...m.b].forEach(id=>playing.add(id));}
  return {schemaVersion:1,name:t.name,courts:t.courts,rules:{mode:t.rules.mode,target:t.rules.target,winBy:t.rules.winBy},players:t.players.map(p=>({id:p.id,name:p.name,active:p.active})),matches:t.matches.map(m=>({id:m.id,round:m.round,court:m.court,a:m.a,b:m.b,scoreA:m.scoreA,scoreB:m.scoreB,status:m.status,events:m.events,...(m.startedAt?{startedAt:String(m.startedAt)}:{}),...(m.finishedAt?{finishedAt:String(m.finishedAt)}:{})})),audit:[],archives:(Array.isArray(t.archives)?t.archives.slice(0,10):[]).map(a=>{if(!a||typeof a.id!=='string'||a.id.length>80||!Array.isArray(a.matches))fail('Arsip pada cadangan tidak valid.');const restored=validateImport({schemaVersion:1,name:a.name,courts:Math.max(1,...a.matches.map(m=>m.court)),rules:a.rules,players:a.players,matches:a.matches,archives:[]});return {id:a.id,name:restored.name,at:typeof a.at==='string'?a.at:new Date().toISOString(),players:restored.players,matches:restored.matches,rules:restored.rules};}),createdAt:typeof t.createdAt==='string'?t.createdAt:new Date().toISOString()};
}
export function clientTournament(t:Tournament):Tournament{return {...t,matches:t.matches.map(m=>({...m,events:m.events.slice(-1)})),archives:t.archives.map(a=>({...a,matches:a.matches.map(m=>({...m,events:[]}))}))};}
/** Public results contain no operator identities or private undo history. */
export function publicTournament(t:Tournament):Tournament{return {...clientTournament(t),audit:[],matches:t.matches.map(m=>({...m,events:[]}))};}
