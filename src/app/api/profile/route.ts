import { NextResponse } from 'next/server';
import { FshClient } from '@/lib/clients/fshClient';

export async function POST(request: Request) {
    try {
        const { cookies, username } = await request.json();

        if (!cookies || !username) {
            return NextResponse.json({ success: false, error: 'Missing cookies or username' }, { status: 400 });
        }

        const client = new FshClient();
        const result = await client.fetchProfile(cookies, username);

        return NextResponse.json(result);
    } catch (e: any) {
        console.error('[API] Profile error:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
