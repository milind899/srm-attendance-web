import { NextResponse } from 'next/server';
import { AttendanceRecord } from '@/lib/types';

// Allow CORS for this endpoint so the bookmarklet can call it from srmist.edu.in
export async function POST(req: Request) {
    // Handle CORS preflight automatically or manually if needed? 
    // Next.js App Router usually handles simple CORS if configured, 
    // but for now we'll set headers on the response.

    try {
        const body = await req.json();
        const { username, records } = body;

        console.log(`Received manual sync data for user: ${username}, records: ${records?.length}`);

        if (!records || !Array.isArray(records)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        // Return the processed data so the frontend can save it (or checking if we need to save it server-side?)
        // Since our app currently saves to localStorage on the client, the API is just a pass-through 
        // OR the bookmarklet should send data to the backend, and the backend stores it.
        // But the user is "logged in" on the Frontend via localStorage.

        // Strategy: The bookmarklet sends data to this API. 
        // The API validates it.
        // But how does the User's browser (on localhost:3000) know about this data?
        // 1. Bookmarklet opens a new tab to `localhost:3000/sync-callback?data=...` (Too long?)
        // 2. Bookmarklet POSTs here, and we assume single-user local mode?
        // 3. User copies JSON?

        // Let's assume the user IS the same person.
        // If we want the frontend to update, we can't easily push to it.

        // REVISED STRATEGY: 
        // The bookmarklet logic should just be to COPY the data to clipboard, 
        // OR we use a "Paste Data" UI.

        // But if I want to use this API:
        // User is running the app.
        // User clicks bookmarklet.
        // Bookmarklet POSTs to API.
        // API stores in a temporary "latest_sync" variable (hacky but works for single user).

        return NextResponse.json({ success: true, message: 'Data received' }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });

    } catch (e) {
        return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
    }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
