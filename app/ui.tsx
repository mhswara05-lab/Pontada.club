'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import type { Match } from '../lib/core';

export function BrandLogo() {
  return <img className="brand-logo" src="/brand/pontada-logo-master.png" alt="pontada. Pickleball Club" width="2048" height="683" />;
}
export function StatusBadge({status}:{status:Match['status']}) {
  return <span className={`badge ${status.toLowerCase()}`}><i aria-hidden="true"/>{status==='IN_PROGRESS'?'Sedang bermain':status==='COMPLETED'?'Disahkan':'Menunggu giliran'}</span>;
}
export function EmptyState({title,text,children}:{title:string;text:string;children?:ReactNode}) {
  return <div className="empty-state"><span className="empty-icon"><ClipboardList aria-hidden="true"/></span><h3>{title}</h3><p>{text}</p>{children}</div>;
}
export function Modal({title,subtitle,children,onClose,wide=false}:{title:string;subtitle?:string;children:ReactNode;onClose:()=>void;wide?:boolean}) {
  const box=useRef<HTMLDivElement>(null),titleId=useId();
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null,old=document.body.style.overflow;
    document.body.style.overflow='hidden';box.current?.focus();
    const handler=(event:KeyboardEvent)=>{
      if(event.key==='Escape')onClose();
      if(event.key==='Tab'&&box.current){
        const items=[...box.current.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled):not([type="hidden"]),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')].filter(element=>element.getClientRects().length>0);
        const first=items[0],last=items[items.length-1];
        if(!first){event.preventDefault();return;}
        if(event.shiftKey&&(document.activeElement===first||document.activeElement===box.current)){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    };
    document.addEventListener('keydown',handler);
    return()=>{document.body.style.overflow=old;document.removeEventListener('keydown',handler);previous?.focus();};
  },[onClose]);
  return <div className="modal-backdrop" onClick={event=>{if(event.target===event.currentTarget)onClose();}}><section className={`modal ${wide?'wide':''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={box}><header className="modal-head"><div className="modal-brand-row"><BrandLogo/><button className="button secondary" aria-label="Tutup dialog" onClick={onClose}><ArrowLeft/>Kembali</button></div><div><h2 id={titleId}>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div></header>{children}</section></div>;
}
