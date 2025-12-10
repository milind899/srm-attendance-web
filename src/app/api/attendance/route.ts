import { NextResponse } from 'next/server';
import { EntClient } from '@/lib/clients/entClient';
import { FshClient } from '@/lib/clients/fshClient';
import { z } from 'zod';

// Force dynamic needed to avoid static generation issues if any
export const dynamic = 'force-dynamic';

const requestSchema = z.object({
    department: z.enum(['ENT', 'FSH']),
    username: z.string().min(1),
    password: z.string().min(1),
    captcha: z.string().optional(),
    cookies: z.string().optional(),
    csrfToken: z.string().optional()
});

export async function POST(request: Request) {
    console.error('[API] POST /api/attendance received');
    try {
        const body = await request.json();
        console.error('[API] Body:', JSON.stringify(body));

        const parseResult = requestSchema.safeParse(body);

        if (!parseResult.success) {
            console.error('[API] Validation failed');
            return NextResponse.json({ error: 'Invalid Input', details: parseResult.error.format() }, { status: 400 });
        }

        const { department, username, password, captcha, cookies, csrfToken } = parseResult.data;

        let result: any;
        if (department === 'ENT') {
            console.error(`[API] Starting ENT HTTP client for user: ${username}`);
            const client = new EntClient();
            result = await client.loginAndFetch(username, password);
        } else {
            console.error(`[API] Starting FSH HTTP scrape for user: ${username}`);
            // Check for required HTTP-mode params
            if (!captcha || !csrfToken || !cookies) {
                console.error('[API] Missing FSH params');
                return NextResponse.json({
                    error: 'Missing Captcha or Session data. Please refresh and try again.'
                }, { status: 400 });
            }

            try {
                console.error('[API] Creating FshClient...');
                const client = new FshClient();
                console.error('[API] Calling loginAndFetch...');
                result = await client.loginAndFetch(username, password, captcha, csrfToken, cookies);
                console.error('[API] Result:', result.success);
            } catch (err: any) {
                console.error('[API] FSH Client Error:', err.message);
                return NextResponse.json({
                    error: 'Scraper Error',
                    message: err.message
                }, { status: 500 });
            }
        }

        if (result.success) {
            return NextResponse.json(result);
        } else {
            return NextResponse.json({ error: result.error }, { status: 401 });
        }

    } catch (error: any) {
        console.error('[API] Outer Error:', error.message);
        return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ message: 'API is active. Use POST to submit credentials.' });
}
