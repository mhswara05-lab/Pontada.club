import type {Tournament} from './core.ts';

/** A note is oriented to the named player's team, never implicitly to team A. */
export function parseResultNote(text:string,t:Pick<Tournament,'players'|'matches'>){
  const line=text.trim();
  if(/[\r\n]/.test(line))throw new Error('Tempel satu catatan setiap kali, lalu simpan hasilnya.');
  const parts=/^(\d+)\s+(.+?)\s+(\d+)\s*[-–—:]\s*(\d+)$/.exec(line);
  if(!parts)throw new Error('Gunakan format: 22 Bayu 13 - 8.');
  const round=Number(parts[1]),query=parts[2].trim().toLocaleLowerCase('id-ID');
  const exact=t.players.filter(p=>p.name.toLocaleLowerCase('id-ID')===query);
  const players=exact.length?exact:t.players.filter(p=>p.name.toLocaleLowerCase('id-ID').includes(query));
  if(players.length!==1)throw new Error(players.length?'Nama cocok dengan beberapa pemain. Tulis nama lebih lengkap atau pilih pemain di bawah.':'Nama pemain belum ditemukan. Pilih nama sesuai daftar pemain.');
  const playerId=players[0].id;
  const matches=t.matches.filter(m=>m.round===round&&[...m.a,...m.b].includes(playerId));
  if(matches.length!==1)throw new Error('Batch dan pemain tidak cocok dengan jadwal. Gunakan nomor Babak di aplikasi dan periksa kembali pemainnya.');
  if(matches[0].status==='COMPLETED')throw new Error('Hasil pertandingan ini sudah disahkan. Buka Lihat Hasil untuk memeriksa atau mengoreksinya.');
  return {round,playerId,scoreFor:Number(parts[3]),scoreAgainst:Number(parts[4])};
}
