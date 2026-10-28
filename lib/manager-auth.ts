import {env} from 'cloudflare:workers';
import {allowedMutation,authDigest,managerCookie,newSessionToken,pinsMatch,readSessionToken,SESSION_SECONDS,validPin} from './pin-session';
export class PinLoginError extends Error{
  constructor(message:string,public status=400,public retryAfter?:number){super(message);}
}
function config(){
  if(!env.DB||!env.PONTADA_TOURNAMENT_KEY||!validPin(env.PONTADA_MANAGER_PIN))return null;
  return {db:env.DB,owner:env.PONTADA_TOURNAMENT_KEY,pin:env.PONTADA_MANAGER_PIN};
}
export async function managerSession(cookie:string|null):Promise<{id:string}|null>{
  const token=readSessionToken(cookie),c=config();if(!token||!c)return null;
  const digest=await authDigest('session',token,c.pin,c.owner);
  const session=await c.db.prepare('SELECT id_hash FROM manager_sessions WHERE id_hash=? AND owner_id=? AND expires_at>?').bind(digest,c.owner,Math.floor(Date.now()/1000)).first<{id_hash:string}>();
  return session?{id:session.id_hash}:null;
}
export async function pinLogin(request:Request):Promise<Response>{
  if(!allowedMutation(request))throw new PinLoginError('Permintaan tidak diizinkan.',403);
  const c=config();if(!c)throw new PinLoginError('Akses pengelola belum dikonfigurasi.',503);
  const body=await request.text();if(body.length>128)throw new PinLoginError('Permintaan terlalu besar.',413);
  let pin:unknown;try{pin=JSON.parse(body).pin;}catch{throw new PinLoginError('Masukkan PIN 4 angka.');}
  if(!validPin(pin))throw new PinLoginError('Masukkan PIN 4 angka.');
  const now=Math.floor(Date.now()/1000),windowSeconds=15*60;
  const ip=request.headers.get('cf-connecting-ip')||'shared';
  const bucket=await authDigest('attempt',ip,c.pin,c.owner);
  const attempt=await c.db.prepare(`INSERT INTO manager_login_attempts (bucket,attempts,reset_at) VALUES (?,1,?)
    ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN reset_at<=? THEN 1 ELSE attempts+1 END,
    reset_at=CASE WHEN reset_at<=? THEN ? ELSE reset_at END RETURNING attempts,reset_at`).bind(bucket,now+windowSeconds,now,now,now+windowSeconds).first<{attempts:number;reset_at:number}>();
  if(!attempt)throw new PinLoginError('Belum dapat masuk. Coba lagi.',503);
  if(attempt.attempts>5){const seconds=Math.max(1,attempt.reset_at-now);throw new PinLoginError(`Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(seconds/60)} menit.`,429,seconds);}
  if(!await pinsMatch(pin,c.pin))throw new PinLoginError('PIN salah. Coba lagi.',401);
  const token=newSessionToken(),digest=await authDigest('session',token,c.pin,c.owner);
  await c.db.batch([
    c.db.prepare('INSERT INTO manager_sessions (id_hash,owner_id,created_at,expires_at) VALUES (?,?,?,?)').bind(digest,c.owner,now,now+SESSION_SECONDS),
    c.db.prepare('DELETE FROM manager_login_attempts WHERE bucket=?').bind(bucket),
    c.db.prepare('DELETE FROM manager_sessions WHERE expires_at<=?').bind(now),
    c.db.prepare('DELETE FROM manager_login_attempts WHERE reset_at<?').bind(now-86400),
  ]);
  return Response.json({ok:true},{headers:{'Set-Cookie':managerCookie(token,request.url),'Cache-Control':'no-store'}});
}
export async function pinLogout(request:Request):Promise<Response>{
  if(!allowedMutation(request))throw new PinLoginError('Permintaan tidak diizinkan.',403);
  const c=config(),token=readSessionToken(request.headers.get('cookie'));
  if(c&&token){const digest=await authDigest('session',token,c.pin,c.owner);await c.db.prepare('DELETE FROM manager_sessions WHERE id_hash=? AND owner_id=?').bind(digest,c.owner).run();}
  return Response.json({ok:true},{headers:{'Set-Cookie':managerCookie('',request.url,0),'Cache-Control':'no-store'}});
}
export function pinErrorResponse(error:unknown):Response{
  if(error instanceof PinLoginError)return Response.json({error:error.message},{status:error.status,headers:{'Cache-Control':'no-store',...(error.retryAfter?{'Retry-After':String(error.retryAfter)}:{})}});
  console.error('Manager access failed');return Response.json({error:'Belum dapat tersambung. Coba lagi.'},{status:503,headers:{'Cache-Control':'no-store'}});
}
