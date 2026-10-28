import {headers} from 'next/headers';
import {managerSession} from '../lib/manager-auth';
import TournamentApp from './tournament-app';
export const dynamic='force-dynamic';
export default async function Page(){const session=await managerSession((await headers()).get('cookie'));return <TournamentApp managerMode={false} canManage={!!session} displayName="Pengelola"/>;}
