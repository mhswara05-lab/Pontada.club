import {headers} from 'next/headers';
import {managerSession} from '../../lib/manager-auth';
import TournamentApp from '../tournament-app';
import PinLogin from '../pin-login';
export const dynamic='force-dynamic';
export default async function ManagerPage(){
  const session=await managerSession((await headers()).get('cookie'));
  return session?<TournamentApp managerMode canManage displayName="Pengelola" sessionKey="club-pin"/>:<PinLogin/>;
}
