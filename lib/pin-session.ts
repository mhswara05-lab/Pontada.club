/** Shared primitives; this module never contains the configured manager PIN. */
export const MANAGER_COOKIE='pontada_manager';
export const SESSION_SECONDS=12*60*60;
const encoder=new TextEncoder();
const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
export const validPin=(pin:unknown):pin is string=>typeof pin==='string'&&/^\d{4}$/.test(pin);
export async function pinsMatch(input:string,configured:string):Promise<boolean>{
  if(!validPin(input)||!validPin(configured))return false;
  const [a,b]=await Promise.all([crypto.subtle.digest('SHA-256',encoder.encode(input)),crypto.subtle.digest('SHA-256',encoder.encode(configured))]);
  const x=new Uint8Array(a),y=new Uint8Array(b);let difference=0;
  for(let i=0;i<x.length;i++)difference|=x[i]^y[i];
  return difference===0;
}
export function newSessionToken():string{return hex(crypto.getRandomValues(new Uint8Array(32)));}
export function readSessionToken(cookie:string|null):string|null{
  const values=(cookie||'').split(';').map(part=>part.trim()).filter(part=>part.startsWith(MANAGER_COOKIE+'='));
  if(values.length!==1)return null;
  const token=values[0].slice(MANAGER_COOKIE.length+1);
  return /^[a-f0-9]{64}$/.test(token)?token:null;
}
export async function authDigest(purpose:'session'|'attempt',value:string,pin:string,owner:string):Promise<string>{
  const key=await crypto.subtle.importKey('raw',encoder.encode(owner+'\0'+pin),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return hex(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(purpose+'\0'+value))));
}
export function managerCookie(token:string,url:string,maxAge=SESSION_SECONDS):string{
  return `${MANAGER_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(url).protocol==='https:'?'; Secure':''}`;
}
export function allowedMutation(request:Request):boolean{
  if(request.headers.get('x-pontada-client')!=='1'||request.headers.get('sec-fetch-site')==='cross-site')return false;
  const origin=request.headers.get('origin');
  return !origin||origin===new URL(request.url).origin;
}
