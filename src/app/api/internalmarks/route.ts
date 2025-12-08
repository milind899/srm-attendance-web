import { NextResponse } from 'next/server';
import { FshClient } from '@/lib/clients/fshClient';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const requestSchema = z.object({
    cookies: z.string().min(1),
    username: z.string().min(1)
});

export async function POST(request: Request) {
    console.error('[API] POST /api/internalmarks received');
    try {
        const body = await request.json();
        const parseResult = requestSchema.safeParse(body);

        if (!parseResult.success) {
            return NextResponse.json({ error: 'Invalid Input' }, { status: 400 });
        }

        const { cookies, username } = parseResult.data;

        try {
            const client = new FshClient();
            const result = await client.fetchInternalMarks(cookies, username);

            if (result.success) {
                return NextResponse.json(result);
            } else {
                return NextResponse.json({ error: result.error }, { status: 401 });
            }
        } catch (err: any) {
            console.error('[API] Internal Marks Error:', err.message);
            return NextResponse.json({ error: 'Failed to fetch internal marks' }, { status: 500 });
        }

    } catch (error: any) {
        console.error('[API] Error:', error.message);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
