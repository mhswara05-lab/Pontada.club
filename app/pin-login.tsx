'use client';
import {useState} from 'react';
import {ArrowLeft,ArrowRight,Eye,EyeOff,Loader2,LockKeyhole} from 'lucide-react';
import {BrandLogo} from './ui';
export default function PinLogin(){
  const [pin,setPin]=useState(''),[visible,setVisible]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy||pin.length!==4)return;setBusy(true);setError('');
    try{
      const response=await fetch('/api/auth/pin',{method:'POST',headers:{'Content-Type':'application/json','X-Pontada-Client':'1'},body:JSON.stringify({pin}),signal:AbortSignal.timeout(15000)});
      const data=await response.json() as {error?:string};
      if(!response.ok){setError(data.error||'Belum dapat masuk. Coba lagi.');setBusy(false);return;}
      window.location.replace('/kelola');
    }catch{setError('Koneksi belum tersedia. Coba lagi.');setBusy(false);}
  }
  return <main className="pin-login-page"><header><a href="/" aria-label="Beranda Pontada"><BrandLogo/></a><a className="icon-button" href="/" aria-label="Kembali ke beranda"><ArrowLeft/></a></header><section className="pin-login-card"><span className="pin-login-icon" aria-hidden="true"><LockKeyhole/></span><h1>Masuk Pengelola</h1><p>Masukkan PIN 4 angka untuk melanjutkan.</p><form onSubmit={event=>void submit(event)}><label htmlFor="manager-pin">PIN Pengelola</label><div className="pin-input-wrap"><input id="manager-pin" name="pin" type={visible?'text':'password'} inputMode="numeric" autoComplete="current-password" pattern="[0-9]{4}" minLength={4} maxLength={4} value={pin} onChange={event=>{setPin(event.target.value.replace(/\D/g,'').slice(0,4));setError('');}} required disabled={busy} aria-describedby={error?'pin-error':undefined} aria-invalid={!!error}/><button type="button" className="icon-button" aria-label={visible?'Sembunyikan PIN':'Tampilkan PIN'} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff/>:<Eye/>}</button></div>{error&&<p className="pin-login-error" id="pin-error" role="alert">{error}</p>}<button className="button primary full" disabled={busy||pin.length!==4}>{busy?<Loader2 className="spin"/>:<LockKeyhole aria-hidden="true"/>}{busy?'Memeriksa PIN…':'Masuk'}{!busy&&<ArrowRight aria-hidden="true"/>}</button></form></section></main>;
}
