import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Salonsa Pickleball Tournament',description:'Jadwal, skor pertandingan, dan klasemen Salonsa Pickleball Club. Mudah diikuti dari lapangan maupun dari rumah.',icons:{icon:'/brand/salonsa-logo-master.png'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="id"><body>{children}</body></html>;}
