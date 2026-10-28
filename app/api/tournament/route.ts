import { env } from 'cloudflare:workers';
import {managerSession} from '../../../lib/manager-auth';
import {allowedMutation} from '../../../lib/pin-session';
import { applyCommand, clientTournament, publicTournament, DomainError, initialTournament, type Tournament, type Command } from '../../../lib/core';
export const dynamic='force-dynamic';
type Stored={revision:number;payload:string};
const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function context(request:Request,manager=true){
  const session=manager?await managerSession(request.headers.get('cookie')):null;
  if(manager&&!session)throw new DomainError('Masukkan PIN pengelola untuk melanjutkan.',401);
  if(!env.DB)throw new DomainError('Penyimpanan belum tersedia. Hubungi pengelola.',503);
  if(!env.PONTADA_TOURNAMENT_KEY)throw new DomainError('Turnamen bersama belum dikonfigurasi. Hubungi pengelola.',503);
  return {db:env.DB,owner:env.PONTADA_TOURNAMENT_KEY,actor:session?'Pengelola':'Penonton'};
}
async function read(db:D1Database,owner:string):Promise<Stored>{
  let row=await db.prepare('SELECT revision,payload FROM tournaments WHERE owner_id=?').bind(owner).first<Stored>();
  if(!row){const initial=initialTournament();await db.prepare('INSERT OR IGNORE INTO tournaments (owner_id,revision,payload,updated_at) VALUES (?,0,?,?)').bind(owner,JSON.stringify(initial),new Date().toISOString()).run();row=await db.prepare('SELECT revision,payload FROM tournaments WHERE owner_id=?').bind(owner).first<Stored>();}
  if(!row)throw new DomainError('Data turnamen tidak dapat dibaca.',503);return row;
}
const packet=(row:Stored,manager=true)=>({revision:row.revision,tournament:(manager?clientTournament:publicTournament)(JSON.parse(row.payload) as Tournament)});
function errorResponse(e:unknown){if(e instanceof DomainError)return response({error:e.message},e.status);console.error('Tournament request failed',e instanceof Error?e.message:'unknown');return response({error:'Permintaan belum tersimpan. Muat ulang atau coba kembali.'},500);}
export async function GET(request:Request){try{const params=new URL(request.url).searchParams;const exporting=params.get('export')==='1';const manager=exporting||params.get('manage')==='1';const {db,owner}=await context(request,manager);const row=await read(db,owner);return response(exporting?{revision:row.revision,tournament:JSON.parse(row.payload)}:packet(row,manager));}catch(e){return errorResponse(e);}}
export async function POST(request:Request){
  try{
    if(!allowedMutation(request))throw new DomainError('Permintaan tidak diizinkan.',403);
    const body=await request.text();if(body.length>2_000_000)throw new DomainError('Berkas terlalu besar.',413);
    let input:{operationId:string;expectedRevision:number;command:Command};try{input=JSON.parse(body);}catch{throw new DomainError('Permintaan tidak valid.');}
    if(!input||typeof input.operationId!=='string'||!/^[a-zA-Z0-9_-]{8,80}$/.test(input.operationId)||!Number.isInteger(input.expectedRevision)||input.expectedRevision<0||!input.command||typeof input.command!=='object'||typeof input.command.type!=='string')throw new DomainError('Permintaan tidak lengkap.');
    const {db,owner,actor}=await context(request);
    const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(input.command))))).map(v=>v.toString(16).padStart(2,'0')).join('');
    const existing=await db.prepare('SELECT fingerprint FROM operations WHERE owner_id=? AND operation_id=?').bind(owner,input.operationId).first<{fingerprint:string}>();
    if(existing){if(existing.fingerprint!==fingerprint)throw new DomainError('ID tindakan sudah digunakan untuk perubahan lain.',409);return response({...packet(await read(db,owner)),deduplicated:true});}
    const row=await read(db,owner);if(row.revision!==input.expectedRevision)return response({...packet(row),error:'Data berubah di perangkat lain. Tinjau skor terbaru sebelum mencoba lagi.',conflict:true},409);
    const next=applyCommand(JSON.parse(row.payload) as Tournament,input.command,actor);const payload=JSON.stringify(next);if(new TextEncoder().encode(payload).length>1_800_000)throw new DomainError('Penyimpanan penuh. Ekspor cadangan dan kurangi arsip.');const revision=row.revision+1,now=new Date().toISOString();
    const results=await db.batch([
      db.prepare('UPDATE tournaments SET revision=?,payload=?,updated_at=? WHERE owner_id=? AND revision=? AND NOT EXISTS (SELECT 1 FROM operations WHERE owner_id=? AND operation_id=?)').bind(revision,payload,now,owner,row.revision,owner,input.operationId),
      db.prepare('INSERT INTO operations (owner_id,operation_id,fingerprint,revision,created_at) SELECT ?,?,?,?,? WHERE changes()=1').bind(owner,input.operationId,fingerprint,revision,now),
    ]);
    if(results[0].meta.changes!==1){const op=await db.prepare('SELECT fingerprint FROM operations WHERE owner_id=? AND operation_id=?').bind(owner,input.operationId).first<{fingerprint:string}>();const fresh=await read(db,owner);if(op?.fingerprint===fingerprint)return response({...packet(fresh),deduplicated:true});return response({...packet(fresh),error:'Perubahan bersamaan terdeteksi. Tinjau data terbaru.',conflict:true},409);}
    return response(packet({revision,payload}));
  }catch(e){return errorResponse(e);}
}
