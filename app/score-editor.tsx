'use client';
import {useState,useRef,type FormEvent} from 'react';
import {Check,History,Info} from 'lucide-react';
import {validateScore,reached,type Match,type Tournament,type Command} from '../lib/core';

export default function ScoreEditor({match,t,disabled,onSend,onSaved}:{match:Match;t:Tournament;disabled:boolean;onSend:(command:Command)=>boolean;onSaved:()=>void}){
  const [a,setA]=useState(String(match.scoreA)),[b,setB]=useState(String(match.scoreB)),[error,setError]=useState('');
  const baseline=useRef(JSON.stringify([match.a,match.b,match.scoreA,match.scoreB,match.status]));
  const changed=baseline.current!==JSON.stringify([match.a,match.b,match.scoreA,match.scoreB,match.status]);
  const names=(ids:string[])=>ids.map(id=>t.players.find(p=>p.id===id)?.name||id).join(' & ');
  const final=reached(Number(a),Number(b),t.rules)&&Number(a)!==Number(b);
  function save(event:FormEvent){event.preventDefault();try{
    if(changed)throw new Error('Skor berubah di perangkat lain. Muat skor terbaru sebelum menyimpan.');
    if(!/^\d+$/.test(a)||!/^\d+$/.test(b))throw new Error('Isi kedua skor dengan angka nol atau lebih.');
    validateScore(Number(a),Number(b),t.rules);
    if(onSend({type:'SAVE_SCORE',matchId:match.id,scoreA:Number(a),scoreB:Number(b)}))onSaved();
  }catch(e){setError(e instanceof Error?e.message:'Skor belum dapat disimpan.');}}
  const audit=t.audit.filter(item=>item.text.startsWith(match.id+' ')||item.text.startsWith(match.id+':')).slice(0,12);
  return <div className="modal-body form-stack score-editor"><p>Masukkan atau ubah skor kapan saja. Urutan babak hanya penanda jadwal.</p>
    <form className="form-stack" onSubmit={save}>
      <div className="editable-teams">{[{label:'Tim A',ids:match.a,value:a,set:setA,id:'score-a'},{label:'Tim B',ids:match.b,value:b,set:setB,id:'score-b'}].map(side=><label className="editable-team" key={side.id} htmlFor={side.id}><span>{side.label}</span><strong>{names(side.ids)}</strong><span className="support">Skor {side.label}</span><input id={side.id} type="number" inputMode="numeric" min="0" max="199" required value={side.value} onChange={event=>{side.set(event.target.value);setError('');}}/></label>)}</div>
      <div className="notice"><Info/><p>{final?'Hasil akan dihitung ke klasemen setelah disimpan.':'Skor dapat disimpan sementara. Klasemen menghitung hasil yang sudah memenuhi aturan poin.'} {t.rules.mode==='TOTAL_POINTS'?`Total kedua tim: ${t.rules.target} poin.`:`Target ${t.rules.target} poin, selisih minimal ${t.rules.winBy}.`}</p></div>
      {changed&&<div className="notice warning" role="alert"><p>Data pertandingan berubah. Muat skor terbaru untuk melanjutkan.</p><button type="button" className="button secondary" onClick={()=>{setA(String(match.scoreA));setB(String(match.scoreB));baseline.current=JSON.stringify([match.a,match.b,match.scoreA,match.scoreB,match.status]);setError('');}}>Muat Skor Terbaru</button></div>}
      {error&&<p className="result-error" role="alert">{error}</p>}
      <button className="button primary full" disabled={disabled||changed}><Check/>Simpan Skor</button>
      {disabled&&<p className="support" role="status">Tunggu koneksi dan seluruh perubahan tersimpan.</p>}
    </form>
    <section className="match-audit"><h3><History aria-hidden="true"/> Riwayat Skor</h3>{audit.length?<div className="audit-list">{audit.map(item=><article key={item.id}><div><strong>{new Date(item.at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})} WIB</strong><p>{item.text}</p><span className="support">{item.actor}</span></div></article>)}</div>:<p className="support">Perubahan skor akan dicatat di sini.</p>}</section>
  </div>;
}
