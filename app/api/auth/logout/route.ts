import {pinLogout,pinErrorResponse} from '../../../../lib/manager-auth';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{return await pinLogout(request);}catch(error){return pinErrorResponse(error);}}
