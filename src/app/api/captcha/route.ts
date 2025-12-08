import { NextResponse } from 'next/server';
import { FshClient } from '@/lib/clients/fshClient';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = new FshClient();
        const session = await client.initSession();
        return NextResponse.json(session);
    } catch (error: any) {
        console.error('Captcha Fetch Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
