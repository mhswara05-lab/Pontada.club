import {pinLogin,pinErrorResponse} from '../../../../lib/manager-auth';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{return await pinLogin(request);}catch(error){return pinErrorResponse(error);}}
