'use client';
import {useState,type FormEvent} from 'react';
import {ArrowLeft,ArrowRight,Check,ClipboardList,Info} from 'lucide-react';
import {validateScore,type Tournament,type Command} from '../lib/core';
import {parseResultNote} from '../lib/result-entry';

export default function ResultEntry({t,disabled,onSend,onSaved}:{t:Tournament;disabled:boolean;onSend:(command:Command)=>boolean;onSaved:()=>void}){
  const [note,setNote]=useState(''),[round,setRound]=useState(''),[playerId,setPlayerId]=useState(''),[scoreFor,setScoreFor]=useState(''),[scoreAgainst,setScoreAgainst]=useState(''),[review,setReview]=useState(false),[reviewKey,setReviewKey]=useState(''),[error,setError]=useState('');
  const rounds=[...new Set(t.matches.map(m=>m.round))].sort((a,b)=>a-b);
  const matches=t.matches.filter(m=>m.round===Number(round)&&[...m.a,...m.b].includes(playerId));
  const match=matches.length===1?matches[0]:undefined;
  const player=t.players.find(p=>p.id===playerId);
  const players=t.players.filter(p=>!round||t.matches.some(m=>m.round===Number(round)&&[...m.a,...m.b].includes(p.id))).sort((a,b)=>a.name.localeCompare(b.name));
  const names=(ids:string[])=>ids.map(id=>t.players.find(p=>p.id===id)?.name||id).join(' & ');
  const teamA=!!match?.a.includes(playerId),a=Number(teamA?scoreFor:scoreAgainst),b=Number(teamA?scoreAgainst:scoreFor);
  const matchKey=match?JSON.stringify([match.id,match.round,match.a,match.b,match.status,match.scoreA,match.scoreB]):'';
  const reset=()=>{setReview(false);setError('');};
  function check(){
    if(!match)throw new Error('Pilih batch dan pemain yang cocok dengan jadwal.');
    if(review&&reviewKey!==matchKey)throw new Error('Pertandingan berubah sejak diperiksa. Tekan Ubah Isian, lalu periksa hasil terbaru.');
    if(!/^\d+$/.test(scoreFor)||!/^\d+$/.test(scoreAgainst))throw new Error('Isi skor tim pemain dan skor lawannya dengan angka.');
    validateScore(a,b,t.rules,true);
    return {type:'SAVE_SCORE',matchId:match.id,scoreA:a,scoreB:b};
  }
  function submit(event:FormEvent){event.preventDefault();try{check();setError('');setReviewKey(matchKey);setReview(true);}catch(e){setError(e instanceof Error?e.message:'Periksa kembali hasilnya.');}}
  function readNote(){try{const next=parseResultNote(note,t);setRound(String(next.round));setPlayerId(next.playerId);setScoreFor(String(next.scoreFor));setScoreAgainst(String(next.scoreAgainst));reset();}catch(e){setError(e instanceof Error?e.message:'Catatan belum dapat dibaca.');setReview(false);}}
  if(!t.matches.length)return <div className="modal-body"><p>Siapkan jadwal turnamen terlebih dahulu sebelum memasukkan hasil.</p></div>;
  return <div className="modal-body form-stack result-entry">
    <p className="support">{review?'Periksa kedua pasangan dan skor, lalu simpan hasilnya.':'Masukkan hasil pertandingan yang sudah dicatat di kertas atau WhatsApp.'}</p>
    {!review?<>
      <section className="result-note"><label htmlFor="result-note">Punya catatan? Tempel di sini <span className="support">(opsional, satu baris)</span></label><input id="result-note" value={note} placeholder="22 Bayu 13 - 8" maxLength={160} onChange={event=>{setNote(event.target.value);reset();}}/><button type="button" className="button secondary full" disabled={!note.trim()||disabled} onClick={readNote}><ClipboardList/>Baca Catatan</button></section>
      <form className="form-stack" onSubmit={submit}>
        <label htmlFor="result-round">1. Batch / Babak<input id="result-round" type="number" inputMode="numeric" min="1" max={rounds.at(-1)} list="result-rounds" placeholder="Contoh: 22" required value={round} onChange={event=>{setRound(event.target.value);setPlayerId('');reset();}}/></label><datalist id="result-rounds">{rounds.map(n=><option key={n} value={n}/>)}</datalist><p className="support result-hint">Gunakan nomor Babak yang tercantum di jadwal aplikasi.</p>
        <label htmlFor="result-player">2. Nama pemain<select id="result-player" value={playerId} required onChange={event=>{setPlayerId(event.target.value);reset();}}><option value="">Pilih pemain yang disebut di catatan</option>{players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        {round&&playerId&&!match&&<p role="status">Pemain tidak memiliki pertandingan di batch ini. Periksa kembali nomor batch.</p>}
        {match&&<section className="result-match"><strong>Babak {match.round} · Lapangan {match.court} · {match.id}</strong><p>{names(match.a)}<span className="support">melawan</span>{names(match.b)}</p>{(match.scoreA>0||match.scoreB>0)&&<p className="support">Skor sebelumnya {match.scoreA}–{match.scoreB} akan diperbarui setelah disimpan. Perubahan tercatat di riwayat.</p>}</section>}
        <div className="result-score-fields"><label htmlFor="result-for">3. Skor tim {player?.name||'pemain'}<input id="result-for" type="number" inputMode="numeric" min="0" max="199" value={scoreFor} required placeholder="13" onChange={event=>{setScoreFor(event.target.value);reset();}}/></label><label htmlFor="result-against">Skor lawan<input id="result-against" type="number" inputMode="numeric" min="0" max="199" value={scoreAgainst} required placeholder="8" onChange={event=>{setScoreAgainst(event.target.value);reset();}}/></label></div>
        <p className="support">Skor pertama milik tim pemain yang dipilih. Posisi Tim A/B diatur otomatis.</p>
        <button className="button primary full" disabled={disabled||!match}>Periksa Hasil<ArrowRight/></button>
      </form>
    </>:match&&<>
      <div className="result-match"><strong>Babak {match.round} · Lapangan {match.court} · {match.id}</strong><p>Catatan {player?.name}: {scoreFor}–{scoreAgainst}</p></div>
      <div className="result-review-teams">{[{label:'Tim A',ids:match.a,score:a},{label:'Tim B',ids:match.b,score:b}].map(side=><section key={side.label}><span>{side.label}{side.ids.includes(playerId)?` · Tim ${player?.name}`:''}</span><h3>{names(side.ids)}</h3><strong>{side.score}</strong></section>)}</div>
      <div className="notice"><Info/><p>Setelah disimpan, hasil pertandingan langsung dihitung ke klasemen kedua pasangan.</p></div>
      <button className="button primary full" disabled={disabled} onClick={()=>{try{const command=check();if(onSend(command))onSaved();}catch(e){setError(e instanceof Error?e.message:'Hasil belum dapat disimpan.');}}}><Check/>Simpan Hasil</button>
      <button className="button secondary full" disabled={disabled} onClick={()=>{setReview(false);setError('');}}><ArrowLeft/>Ubah Isian</button>
    </>}
    {error&&<p className="result-error" role="alert">{error}</p>}
    {disabled&&<p className="support" role="status">Tunggu koneksi dan seluruh perubahan tersimpan sebelum memasukkan hasil.</p>}
  </div>;
}
