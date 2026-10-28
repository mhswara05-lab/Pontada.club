'use client';
import {useState,useEffect,useRef,useMemo,useCallback} from 'react';
import {applyCommand,type Tournament,type Command} from '../lib/core';
export type Packet={revision:number;tournament:Tournament};
type Pending={operationId:string;expectedRevision:number;command:Command};
export async function fetchPacket(url:string,init?:RequestInit):Promise<{response:Response;data:Packet & {error?:string;deduplicated?:boolean}}>{
  const response=await fetch(url,{...init,cache:'no-store',signal:AbortSignal.timeout(15000)});
  const data=await response.json() as Packet & {error?:string;deduplicated?:boolean};return {response,data};
}
export function useTournament(manager:boolean,displayName:string,sessionKey:string){
  const storage=manager?`pontada-v2-manager-${sessionKey}`:'pontada-v2-spectator';
  const [packet,setPacket]=useState<Packet|null>(null),[queue,setQueue]=useState<Pending[]>([]),[paused,setPaused]=useState(false),[busy,setBusy]=useState(false),[offline,setOffline]=useState(false),[confirmed,setConfirmed]=useState(false),[error,setError]=useState(''),[toast,setToast]=useState(''),[lastSync,setLastSync]=useState('');
  const packetRef=useRef<Packet|null>(null),queueRef=useRef<Pending[]>([]),pauseRef=useRef(false),pumping=useRef(false),mounted=useRef(true);
  const notify=useCallback((message:string)=>setToast(message),[]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),6500);return()=>clearTimeout(timer);},[toast]);
  const accept=useCallback((next:Packet)=>{
    if(!next||!next.tournament||!Number.isInteger(next.revision))throw new Error('Respons server tidak valid.');
    if(packetRef.current&&next.revision<packetRef.current.revision)return;
    packetRef.current=next;setPacket(next);setConfirmed(true);
    try{localStorage.setItem(storage+'-snapshot',JSON.stringify(next));}catch{}
    setLastSync(new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'}));
  },[storage]);
  const saveQueue=useCallback((items:Pending[])=>{
    queueRef.current=items;setQueue(items);
    try{localStorage.setItem(storage+'-queue',JSON.stringify(items));}catch{notify('Penyimpanan perangkat penuh. Tetap buka halaman sampai perubahan tersimpan di server.');}
  },[storage,notify]);
  const pause=useCallback((value:boolean)=>{pauseRef.current=value;setPaused(value);try{localStorage.setItem(storage+'-paused',String(value));}catch{}},[storage]);
  const load=useCallback(async()=>{
    try{const {response,data}=await fetchPacket(`/api/tournament${manager?'?manage=1':''}`);if(response.status===401&&manager){setConfirmed(false);window.location.replace('/kelola');return;}if(!response.ok)throw new Error(data.error||'Turnamen belum dapat dimuat.');if(!mounted.current)return;if(!queueRef.current.length||!packetRef.current)accept(data);setOffline(false);setError('');}
    catch(e){if(mounted.current){setOffline(true);setError(e instanceof Error?e.message:'Koneksi terputus.');}}
  },[manager,accept]);
  const pump=useCallback(async()=>{
    if(!manager||pumping.current||pauseRef.current||!queueRef.current.length||!packetRef.current)return;
    pumping.current=true;setBusy(true);
    try{while(queueRef.current.length&&!pauseRef.current){
      const action=queueRef.current[0];let result:Awaited<ReturnType<typeof fetchPacket>>;
      try{result=await fetchPacket('/api/tournament',{method:'POST',headers:{'Content-Type':'application/json','X-Pontada-Client':'1'},body:JSON.stringify(action)});}
      catch{setOffline(true);setError('Konfirmasi belum diterima. Perubahan tetap berada dalam antrean perangkat ini.');break;}
      if(!mounted.current)break;
      const {response,data}=result;
      if(response.ok){accept(data);saveQueue(queueRef.current.filter(item=>item.operationId!==action.operationId));setOffline(false);setError('');}
      else if(response.status===401){setConfirmed(false);pause(true);window.location.replace('/kelola');break;}
      else if(response.status===409){if(data.tournament)accept(data);pause(true);setError(data.error||'Data berubah di perangkat lain. Periksa perubahan tertunda.');break;}
      else if(response.status>=500){setOffline(true);setError(data.error||'Server belum mengonfirmasi penyimpanan.');break;}
      else{pause(true);setError(data.error||'Perubahan belum dapat disimpan.');break;}
    }}finally{pumping.current=false;if(mounted.current)setBusy(false);}
  },[manager,accept,saveQueue,pause]);
  useEffect(()=>{
    mounted.current=true;
    try{
      const snapshot=JSON.parse(localStorage.getItem(storage+'-snapshot')||'null');
      if(snapshot?.tournament&&Number.isInteger(snapshot.revision)){packetRef.current=snapshot;setPacket(snapshot);}
      if(manager){const saved=JSON.parse(localStorage.getItem(storage+'-queue')||'[]');if(Array.isArray(saved)&&saved.every(item=>typeof item.operationId==='string'&&Number.isInteger(item.expectedRevision)&&typeof item.command?.type==='string')){queueRef.current=saved;setQueue(saved);}const isPaused=localStorage.getItem(storage+'-paused')==='true';pauseRef.current=isPaused;setPaused(isPaused);}
    }catch{setError('Salinan perangkat tidak dapat dibaca. Mencoba memuat data server.');}
    void load().then(()=>pump());
    const interval=setInterval(()=>{if(queueRef.current.length)void pump();else void load();},6000);
    const online=()=>{setOffline(false);if(queueRef.current.length)void pump();else void load();},off=()=>setOffline(true);
    const unload=(event:BeforeUnloadEvent)=>{if(queueRef.current.length){event.preventDefault();event.returnValue='';}};
    window.addEventListener('online',online);window.addEventListener('offline',off);window.addEventListener('beforeunload',unload);
    return()=>{mounted.current=false;clearInterval(interval);window.removeEventListener('online',online);window.removeEventListener('offline',off);window.removeEventListener('beforeunload',unload);};
  },[storage,manager,load,pump]);
  const t=useMemo(()=>{if(!packet)return null;let next=packet.tournament;if(!paused)for(const item of queue){try{next=applyCommand(next,item.command,displayName);}catch{break;}}return next;},[packet,queue,paused,displayName]);
  function send(command:Command):boolean{
    if(!manager||!packetRef.current)return false;
    if(paused){notify('Tinjau antrean tertunda terlebih dahulu.');return false;}
    if(offline&&command.type!=='SCORE'){notify('Sambungkan internet untuk tindakan ini.');return false;}
    if(queueRef.current.length>=100){notify('Tunggu sampai antrean tersimpan.');return false;}
    try{let current=packetRef.current.tournament;for(const pending of queueRef.current)current=applyCommand(current,pending.command,displayName);applyCommand(current,command,displayName);}catch(e){notify(e instanceof Error?e.message:'Tindakan tidak valid.');return false;}
    saveQueue([...queueRef.current,{operationId:crypto.randomUUID(),expectedRevision:packetRef.current.revision+queueRef.current.length,command}]);void pump();return true;
  }
  function reviewQueue(){
    if(!packetRef.current)return;
    try{let next=packetRef.current.tournament;for(const item of queueRef.current)next=applyCommand(next,item.command,displayName);}catch(e){notify(e instanceof Error?e.message:'Ada perubahan yang tidak dapat diterapkan.');return;}
    if(!confirm(`Terapkan ${queueRef.current.length} perubahan tertunda pada data server terbaru? Periksa skor dan daftar tindakan sebelum melanjutkan.`))return;
    saveQueue(queueRef.current.map((item,i)=>({...item,expectedRevision:packetRef.current!.revision+i})));pause(false);setError('');void pump();
  }
  function discardQueue(){if(confirm('Batalkan perubahan perangkat yang belum dikonfirmasi? Data yang tersimpan di server tetap dipertahankan.')){saveQueue([]);pause(false);setError('');void load();}}
  return {t,packet,queue,paused,busy,offline,error,toast,lastSync,confirmed,send,load,pump,notify,setToast,reviewQueue,discardQueue};
}
