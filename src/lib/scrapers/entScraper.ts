import puppeteer from 'puppeteer';
import { ScraperResult, AttendanceRecord } from '../types';

const LOGIN_URL = 'https://academia.srmist.edu.in/';

export async function scrapeEntAttendance(username: string, password: string): Promise<ScraperResult> {
    let browser = null;
    try {
        console.log('[ENT] Starting scraper...');
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 900 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        // Navigate to Login
        console.log('[ENT] Navigating...');
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });

        // Find login iframe
        console.log('[ENT] Looking for login form...');
        let loginFrame: puppeteer.Frame | puppeteer.Page = page;

        try {
            const iframeEl = await page.waitForSelector('#signinFrame', { timeout: 10000 });
            if (iframeEl) {
                const frame = await iframeEl.contentFrame();
                if (frame) loginFrame = frame;
            }
        } catch (e) {
            console.log('[ENT] No iframe, using main page');
        }

        // Enter username
        console.log('[ENT] Entering username...');
        await loginFrame.waitForSelector('#login_id', { timeout: 10000 });
        const usernameField = await loginFrame.$('#login_id');
        if (!usernameField) throw new Error('Username field not found');

        await usernameField.click({ clickCount: 3 });
        await usernameField.type(username, { delay: 30 });

        // Click Next
        const nextBtn = await loginFrame.$('#nextbtn');
        if (nextBtn) await nextBtn.click();

        // Wait for password field (reduced from 4s to 2s)
        await new Promise(r => setTimeout(r, 2000));

        // Find password field
        let passwordField = null;
        for (let attempt = 0; attempt < 5; attempt++) {
            try {
                const iframes = await page.$$('#signinFrame');
                for (const iframe of iframes) {
                    const frame = await iframe.contentFrame();
                    if (frame) {
                        const pwd = await frame.$('#password');
                        if (pwd) {
                            loginFrame = frame;
                            passwordField = pwd;
                            break;
                        }
                    }
                }
            } catch (e) { }

            if (!passwordField) {
                passwordField = await loginFrame.$('#password');
            }

            if (passwordField) break;
            await new Promise(r => setTimeout(r, 500));
        }

        if (!passwordField) {
            throw new Error('Password field not found. Check your username.');
        }

        console.log('[ENT] Entering password...');
        await passwordField.click();
        await passwordField.type(password, { delay: 30 });

        // Sign in
        const signinBtn = await loginFrame.$('#signin') || await loginFrame.$('button[type="submit"]');
        if (signinBtn) await signinBtn.click();
        else await passwordField.press('Enter');

        // Wait for login (reduced timeout)
        try {
            await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 });
        } catch (e) { }

        await new Promise(r => setTimeout(r, 2000));

        // Check login
        const content = await page.content();
        if (content.includes('Invalid Login') || content.includes('Incorrect Password')) {
            throw new Error('Invalid credentials');
        }
        console.log('[ENT] Login successful!');

        // Navigate to Attendance
        console.log('[ENT] Going to attendance page...');
        await page.goto(LOGIN_URL + '#Page:My_Attendance', { waitUntil: 'domcontentloaded', timeout: 20000 });
        await new Promise(r => setTimeout(r, 6000)); // Reduced from 10s

        // Extract attendance
        console.log('[ENT] Extracting data...');
        const allFrames = page.frames();
        let records: any[] = [];

        for (const frame of allFrames) {
            try {
                const frameRecords = await frame.evaluate(() => {
                    const results: any[] = [];
                    const tables = document.querySelectorAll('table');

                    let table: HTMLTableElement | null = null;
                    for (const t of tables) {
                        const text = (t.innerText || '').toLowerCase();
                        if ((text.includes('course') && (text.includes('attn') || text.includes('%'))) ||
                            text.includes('21csc') || text.includes('21mab') ||
                            /\b\d{2,3}\s*%?\s*$/.test(t.innerText)) {
                            if ((t as HTMLTableElement).rows.length > 2) {
                                table = t as HTMLTableElement;
                                break;
                            }
                        }
                    }

                    if (!table) return [];

                    let headerIdx = 0;
                    for (let i = 0; i < Math.min(5, table.rows.length); i++) {
                        const rowText = table.rows[i].innerText.toLowerCase();
                        if ((rowText.includes('course') && rowText.includes('code')) || rowText.includes('attn')) {
                            headerIdx = i;
                            break;
                        }
                    }

                    for (let i = headerIdx + 1; i < table.rows.length; i++) {
                        const row = table.rows[i];
                        const cells = row.cells;
                        if (cells.length < 2) continue;

                        const texts: string[] = [];
                        for (let j = 0; j < cells.length; j++) {
                            texts.push((cells[j].innerText || cells[j].textContent || '').trim());
                        }

                        let code = (texts[0] || '').split('\n')[0]
                            .replace(/(Regular|Enrichment|Practical|Theory|Online)/gi, '')
                            .trim();

                        if (!code || !/\d/.test(code) || code.length < 4) continue;
                        if (code.toLowerCase().includes('course') || code.toLowerCase().includes('code')) continue;

                        const title = texts[1] || '';
                        if (title.toLowerCase().includes('title') || title.toLowerCase().includes('course')) continue;

                        let pct = -1;
                        for (let j = texts.length - 1; j >= 2; j--) {
                            const val = parseFloat(texts[j].replace('%', ''));
                            if (!isNaN(val) && val >= 0 && val <= 100) {
                                pct = val;
                                break;
                            }
                        }

                        if (pct < 0) continue;

                        results.push({
                            subjectCode: code,
                            subjectName: title || 'Unknown',
                            totalHours: 0,
                            attendedHours: 0,
                            percentage: Math.round(pct)
                        });
                    }

                    return results;
                });

                if (frameRecords.length > 0) {
                    records = frameRecords;
                    console.log(`[ENT] Found ${records.length} records`);
                    break;
                }
            } catch (e) { }
        }

        if (records.length === 0) {
            return { success: false, error: 'No attendance data found. Try again.' };
        }

        const processedRecords: AttendanceRecord[] = records.map((r: any) => ({
            ...r,
            classesToMiss: 0,
            classesToAttend: 0
        }));

        return {
            success: true,
            data: {
                studentName: username,
                registrationNumber: username,
                records: processedRecords
            }
        };

    } catch (error) {
        console.error('[ENT] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Scraping failed'
        };
    } finally {
        if (browser) await browser.close();
    }
}
