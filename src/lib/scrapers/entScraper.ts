import puppeteer, { Frame, Page } from 'puppeteer';
import { ScraperResult, AttendanceRecord } from '../types';

// Dynamic imports for serverless usage
// const chromium = require('@sparticuz/chromium'); 
// const puppeteerCore = require('puppeteer-core');

const LOGIN_URL = 'https://academia.srmist.edu.in/';

export async function scrapeEntAttendance(username: string, password: string): Promise<ScraperResult> {
    let browser: any = null;
    let page: any = null;
    try {
        console.log('[ENT] Starting scraper...');

        // Detect Vercel/AWS environment
        if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
            console.log('[ENT] Running in Serverless mode (Vercel)...');
            const chromium = await import('@sparticuz/chromium').then(m => m.default);
            const puppeteerCore = await import('puppeteer-core').then(m => m.default);

            browser = await puppeteerCore.launch({
                args: chromium.args,
                defaultViewport: { width: 1280, height: 900 },
                executablePath: await chromium.executablePath(),
                headless: true,
            });
        } else {
            console.log('[ENT] Running in Local mode...');
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
            });
        }
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 900 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        // Navigate to Login
        console.log('[ENT] Navigating...');
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Find login iframe
        console.log('[ENT] Looking for login form...');
        let loginFrame: Frame | Page = page;

        try {
            const iframeEl = await page.waitForSelector('#signinFrame', { timeout: 15000 });
            if (iframeEl) {
                const frame = await iframeEl.contentFrame();
                if (frame) loginFrame = frame;
            }
        } catch (e) {
            console.log('[ENT] No iframe, using main page');
        }

        // Helper for robust clicking
        const safeClick = async (element: any) => {
            try {
                if (element) await element.click();
            } catch (error) {
                console.log('[ENT] Standard click failed, trying JS click...');
                try {
                    await element.evaluate((el: HTMLElement) => el.click());
                } catch (e) { }
            }
        };

        // Enter username
        console.log('[ENT] Entering username...');
        await loginFrame.waitForSelector('#login_id', { timeout: 15000 });
        const usernameField = await loginFrame.$('#login_id');
        if (!usernameField) throw new Error('Username field not found');

        await safeClick(usernameField);
        await usernameField.click({ clickCount: 3 });
        await usernameField.type(username);

        // Click Next
        const nextBtn = await loginFrame.$('#nextbtn');
        if (nextBtn) {
            console.log('[ENT] Clicking Next button...');
            await new Promise(r => setTimeout(r, 1000));
            await safeClick(nextBtn);
        }

        // Wait for password field (optimized with polling)
        let passwordField: any = null;

        for (let attempt = 0; attempt < 25; attempt++) {
            if (attempt % 5 === 0) console.log(`[ENT] Waiting for password field... (Attempt ${attempt}/25)`);

            // Retry clicking next if stuck
            if (attempt === 8 && !passwordField) {
                console.log('[ENT] Password field still missing, re-clicking Next...');
                try {
                    const frames = page.frames();
                    for (const f of frames) {
                        const btn = await f.$('#nextbtn');
                        if (btn) {
                            await safeClick(btn);
                            break;
                        }
                    }
                } catch (e) { }
            }

            // Search all frames
            const frames = page.frames();
            for (const frame of frames) {
                try {
                    const pwd = await frame.$('#password');
                    if (pwd) {
                        const isVisible = await frame.evaluate((el: Element) => {
                            const style = window.getComputedStyle(el);
                            return style && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                        }, pwd);

                        if (isVisible) {
                            console.log('[ENT] Found password field in frame:', frame.name() || frame.url());
                            loginFrame = frame;
                            passwordField = pwd;
                            break;
                        }
                    }
                } catch (e) { }
            }

            if (passwordField) break;
            await new Promise(r => setTimeout(r, 500));
        }

        if (!passwordField) {
            await page.screenshot({ path: 'ent_password_fail.png' });
            throw new Error('Password field not found. Login page might be stuck.');
        }

        console.log('[ENT] Entering password...');
        await new Promise(r => setTimeout(r, 500));
        await safeClick(passwordField);
        await passwordField.type(password);

        // Sign in
        const signinBtn = await loginFrame.$('#signin') || await loginFrame.$('button[type="submit"]');
        if (signinBtn) {
            await new Promise(r => setTimeout(r, 500));
            await safeClick(signinBtn);
        } else {
            await passwordField.press('Enter');
        }

        // Wait for login
        try {
            await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 });
        } catch (e) { }

        // Check login success
        const content = await page.content();
        if (content.includes('Invalid Login') || content.includes('Incorrect Password')) {
            throw new Error('Invalid credentials');
        }
        console.log('[ENT] Login successful!');

        // Navigate to Attendance
        console.log('[ENT] Going to attendance page...');
        await page.goto(LOGIN_URL + '#Page:My_Attendance', { waitUntil: 'domcontentloaded', timeout: 20000 });

        // Helper to check for tables
        const waitForTable = async () => {
            const start = Date.now();
            while (Date.now() - start < 15000) {
                let tableCount = 0;
                if (!page) return false;
                for (const frame of page.frames()) {
                    tableCount += await frame.evaluate(() => document.querySelectorAll('table').length);
                }
                if (tableCount > 0) return true;
                await new Promise(r => setTimeout(r, 500));
            }
            return false;
        };

        console.log('[ENT] Waiting for data table...');
        const tableFound = await waitForTable();

        if (!tableFound) {
            console.log('[ENT] Table not found via hash, trying menu click...');
            const frames = page.frames();
            let clicked = false;
            for (const frame of frames) {
                const link = await frame.$('a[href*="My_Attendance"], a:contains("Attendance")') ||
                    await frame.evaluateHandle(() => {
                        const links = Array.from(document.querySelectorAll('a'));
                        return links.find(l => l.innerText.includes('Attendance') || l.href.includes('My_Attendance'));
                    });

                if (link) {
                    const handle = link as any;
                    if (typeof handle.click === 'function') {
                        console.log('[ENT] Clicking attendance link in frame:', frame.name());
                        try {
                            await handle.click();
                            clicked = true;
                            break;
                        } catch (e) { }
                    }
                }
            }

            if (clicked) {
                await new Promise(r => setTimeout(r, 5000));
                await waitForTable();
            }
        }

        console.log('[ENT] Extracting data...');
        const allFrames = page.frames();
        let records: any[] = [];

        for (const frame of allFrames) {
            try {
                const frameRecords = await frame.evaluate(() => {
                    const results: any[] = [];
                    const tables = document.querySelectorAll('table');

                    for (const t of tables) {
                        const fullText = t.innerText.toLowerCase();
                        if (!fullText.includes('code') || (!fullText.includes('attn') && !fullText.includes('max') && !fullText.includes('hours'))) continue;

                        const rows = Array.from((t as HTMLTableElement).rows);
                        if (rows.length < 2) continue;

                        let headerIdx = -1;
                        for (let i = 0; i < Math.min(10, rows.length); i++) {
                            const rowText = rows[i].innerText.toLowerCase();
                            if (rowText.includes('code') && (rowText.includes('attn') || rowText.includes('max') || rowText.includes('hours'))) {
                                headerIdx = i;
                                break;
                            }
                        }
                        if (headerIdx === -1) continue;

                        for (let i = headerIdx + 1; i < rows.length; i++) {
                            const row = rows[i];
                            const cells = row.cells;
                            if (cells.length < 5) continue;

                            const texts = Array.from(cells).map(c => c.innerText.trim());
                            let code = texts[0].split('\n')[0].replace(/(Regular|Enrichment|Practical|Theory|Online|Lab)/gi, '').trim();

                            if (!code || code.length < 3 || code.toLowerCase().includes('total')) continue;

                            let title = texts[1];
                            let category = 'Theory';

                            if (texts[2]) {
                                const catText = texts[2].toLowerCase();
                                if (catText.includes('practical') || catText.includes('lab')) category = 'Practical';
                            } else {
                                if (title.toLowerCase().includes('lab') || title.toLowerCase().includes('practical')) category = 'Practical';
                            }

                            let pct = -1;
                            for (let j = texts.length - 1; j >= 3; j--) {
                                const valStr = texts[j].replace('%', '').trim();
                                if (/^\d+(\.\d+)?$/.test(valStr)) {
                                    const val = parseFloat(valStr);
                                    if (val >= 0 && val <= 100) {
                                        pct = val;
                                        break;
                                    }
                                }
                            }

                            if (pct !== -1) {
                                results.push({
                                    subjectCode: code,
                                    subjectName: title || 'Unknown',
                                    category,
                                    totalHours: 0,
                                    attendedHours: 0,
                                    percentage: Math.round(pct)
                                });
                            }
                        }
                    }
                    return results;
                });

                if (frameRecords.length > 0) {
                    records = frameRecords;
                    console.log(`[ENT] Found ${records.length} records in frame: ${frame.name() || frame.url()}`);
                    break;
                }
            } catch (e) { }
        }

        if (records.length === 0) {
            return { success: false, error: 'No attendance data found. Try again.' };
        }

        // ==========================================
        // INTERNAL MARKS EXTRACTION - FIX APPLIED
        // ==========================================
        console.log('[ENT] Extracting internal marks...');

        try {
            const frames = page.frames();
            for (const frame of frames) {
                const link = await frame.$('a:contains("Internal Marks")') ||
                    await frame.evaluateHandle(() => {
                        const links = Array.from(document.querySelectorAll('a'));
                        return links.find(l => l.innerText.toLowerCase().includes('internal marks'));
                    });
                if (link) {
                    const handle = link as any;
                    if (typeof handle.click === 'function') {
                        console.log('[ENT] Clicking explicit Internal Marks tab...');
                        await handle.click();
                        await new Promise(r => setTimeout(r, 3000));
                        await page.screenshot({ path: 'ent_post_tab_click.png' });
                        break;
                    }
                }
            }
        } catch (e) { }

        let internalMarksData: any = null;

        // Refresh frames list because tab click loaded new frames
        const markFrames = page.frames();

        for (const frame of markFrames) {
            try {
                const marksData = await frame.evaluate(() => {
                    const subjects: any[] = [];
                    const tables = document.querySelectorAll('table');

                    for (const t of tables) {
                        const fullText = t.innerText.toLowerCase();
                        const hasCode = fullText.includes('code');
                        const hasMarks = fullText.includes('test performance') || fullText.includes('internal marks') || (fullText.includes('test') && fullText.includes('performance'));

                        if (!hasCode && !hasMarks) continue;

                        const rows = Array.from((t as HTMLTableElement).rows);
                        if (rows.length < 2) continue;

                        for (let i = 1; i < rows.length; i++) {
                            const row = rows[i];
                            const cells = row.cells;
                            if (cells.length < 2) continue;

                            const code = cells[0].innerText.trim();
                            if (!code || code.length < 3 || code.toLowerCase().includes('code')) continue;
                            const cleanCode = code.split('\n')[0].replace(/(Regular|Enrichment|Practical|Theory|Online|Lab)/gi, '').trim();

                            let subjectName = 'Unknown Subject';
                            if (cells[1]) subjectName = cells[1].innerText.trim();

                            let nestedTable = null;
                            for (let c = 0; c < cells.length; c++) {
                                const tbl = cells[c].querySelector('table');
                                if (tbl) {
                                    nestedTable = tbl;
                                    break;
                                }
                            }

                            const components: any[] = [];
                            let totalMarks = 0;
                            let maxTotalMarks = 0;

                            if (nestedTable && nestedTable.rows.length >= 2) {
                                const headerRow = nestedTable.rows[0];
                                const valueRow = nestedTable.rows[1];

                                for (let j = 0; j < headerRow.cells.length; j++) {
                                    const headerText = headerRow.cells[j].innerText.trim();
                                    const valueText = valueRow.cells[j]?.innerText.trim() || '0';

                                    const parts = headerText.split('/');

                                    if (parts.length >= 2) {
                                        const maxMarkStr = parts[parts.length - 1].trim();
                                        const testName = parts.slice(0, parts.length - 1).join('/').trim();
                                        const maxMark = parseFloat(maxMarkStr);
                                        let scoredMark = 0;
                                        const cleanValue = valueText.toLowerCase();

                                        if (cleanValue.includes('abs') || cleanValue.includes('-')) {
                                            scoredMark = 0;
                                        } else {
                                            scoredMark = parseFloat(valueText);
                                        }

                                        if (!isNaN(maxMark) && !isNaN(scoredMark)) {
                                            components.push({
                                                component: testName,
                                                marks: scoredMark,
                                                maxMarks: maxMark,
                                                date: new Date().toISOString()
                                            });
                                            totalMarks += scoredMark;
                                            maxTotalMarks += maxMark;
                                        }
                                    }
                                }
                            }

                            let category = 'Theory';
                            if (subjectName.toLowerCase().includes('practical') || subjectName.toLowerCase().includes('lab')) {
                                category = 'Practical';
                            }
                            if (cleanCode.endsWith('P') || cleanCode.endsWith('L')) {
                                category = 'Practical';
                            }

                            if (components.length > 0) {
                                subjects.push({
                                    subjectCode: cleanCode,
                                    subjectName: subjectName.split('/')[0] || 'Unknown', // Basic cleanup
                                    category,
                                    totalMarks,
                                    maxTotalMarks,
                                    components
                                });
                            }
                        }
                    }
                    return subjects;
                });

                if (marksData.length > 0) {
                    console.log(`[ENT] Found ${marksData.length} subjects with internal marks`);
                    internalMarksData = {
                        studentName: username,
                        registrationNumber: username,
                        subjects: marksData
                    };
                    break;
                }
            } catch (e) { }
        }

        const processedRecords: AttendanceRecord[] = records.map((r: any) => ({
            ...r,
            classesToMiss: 0,
            classesToAttend: 0
        }));

        // Merge marks names
        if (internalMarksData) {
            internalMarksData.subjects = internalMarksData.subjects.map((sub: any) => {
                let match = processedRecords.find(r =>
                    r.subjectCode === sub.subjectCode &&
                    r.category === sub.category
                );
                if (!match) {
                    match = processedRecords.find(r => r.subjectCode === sub.subjectCode);
                }
                let name = match ? match.subjectName : sub.subjectName || sub.subjectCode;
                if (sub.category === 'Practical' && !name.toLowerCase().includes('practical') && !name.toLowerCase().includes('lab')) {
                    name += ' (Practical)';
                }
                return { ...sub, subjectName: name };
            });
        }

        return {
            success: true,
            data: {
                studentName: username,
                registrationNumber: username,
                records: processedRecords
            },
            internalMarks: internalMarksData,
        };

    } catch (error: any) {
        console.error('[ENT] Scraper Error:', error);
        if (browser && page) {
            try { await page.screenshot({ path: 'ent_fatal_error.png' }); } catch (e) { }
        }
        return { success: false, error: error.message || 'Scraping failed' };
    } finally {
        if (browser) await browser.close();
    }
}
