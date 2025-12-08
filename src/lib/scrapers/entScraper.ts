import puppeteer, { Frame, Page } from 'puppeteer';
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
        let loginFrame: Frame | Page = page;

        try {
            const iframeEl = await page.waitForSelector('#signinFrame', { timeout: 10000 });
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
                await element.click();
            } catch (error) {
                console.log('[ENT] Standard click failed, trying JS click...', error instanceof Error ? error.message : '');
                await element.evaluate((el: HTMLElement) => el.click());
            }
        };

        // Enter username
        console.log('[ENT] Entering username...');
        await loginFrame.waitForSelector('#login_id', { timeout: 10000 });
        const usernameField = await loginFrame.$('#login_id');
        if (!usernameField) throw new Error('Username field not found');

        await safeClick(usernameField);
        await usernameField.click({ clickCount: 3 }); // Ensure focus
        await usernameField.type(username);

        // Click Next
        const nextBtn = await loginFrame.$('#nextbtn');
        if (nextBtn) {
            await new Promise(r => setTimeout(r, 500)); // Small stabilization wait
            await safeClick(nextBtn);
        }

        // Wait for password field (optimized)
        // Replaced 2s wait with smart polling loop below

        // Find password field
        let passwordField = null;
        for (let attempt = 0; attempt < 8; attempt++) { // Increased attempts slightly since we start sooner
            try {
                const iframes = await page.$$('#signinFrame');
                for (const iframe of iframes) {
                    const frame = await iframe.contentFrame();
                    if (frame) {
                        const pwd = await frame.$('#password');
                        if (pwd) {
                            const isVisible = await frame.evaluate((el) => {
                                const style = window.getComputedStyle(el);
                                return style && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                            }, pwd);

                            if (isVisible) {
                                loginFrame = frame;
                                passwordField = pwd;
                                break;
                            }
                        }
                    }
                }
            } catch (e) { }

            if (!passwordField) {
                try {
                    const pwd = await loginFrame.$('#password');
                    if (pwd) {
                        const isVisible = await loginFrame.evaluate((el) => {
                            const style = window.getComputedStyle(el);
                            return style && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                        }, pwd);
                        if (isVisible) passwordField = pwd;
                    }
                } catch (e) { }
            }

            if (passwordField) break;
            await new Promise(r => setTimeout(r, 250)); // Fast polling
        }

        if (!passwordField) {
            throw new Error('Password field not found. Check your username.');
        }

        console.log('[ENT] Entering password...');
        await new Promise(r => setTimeout(r, 500)); // Wait for animation
        await safeClick(passwordField);
        await passwordField.type(password);

        // Sign in
        const signinBtn = await loginFrame.$('#signin') || await loginFrame.$('button[type="submit"]');
        if (signinBtn) {
            await new Promise(r => setTimeout(r, 500));
            await safeClick(signinBtn);
        }
        else await passwordField.press('Enter');

        // Wait for login
        try {
            await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 });
        } catch (e) { }

        // Check login
        const content = await page.content();
        if (content.includes('Invalid Login') || content.includes('Incorrect Password')) {
            throw new Error('Invalid credentials');
        }
        console.log('[ENT] Login successful!');

        // Navigate to Attendance
        console.log('[ENT] Going to attendance page...');
        await page.goto(LOGIN_URL + '#Page:My_Attendance', { waitUntil: 'domcontentloaded', timeout: 20000 });

        // Helper to check for tables in any frame
        const waitForTable = async () => {
            const getMaxTables = async () => {
                let count = 0;
                for (const frame of page.frames()) {
                    const c = await frame.evaluate(() => document.querySelectorAll('table').length);
                    count += c;
                }
                return count;
            };

            const start = Date.now();
            while (Date.now() - start < 15000) {
                if (await getMaxTables() > 0) return true;
                await new Promise(r => setTimeout(r, 500));
            }
            return false;
        };

        console.log('[ENT] Waiting for data table...');
        await waitForTable();

        // Extract attendance
        console.log('[ENT] Extracting data...');
        const allFrames = page.frames();
        let records: any[] = [];

        for (const frame of allFrames) {
            try {
                const frameRecords = await frame.evaluate(() => {
                    const results: any[] = [];
                    const tables = document.querySelectorAll('table');

                    for (const t of tables) {
                        // Relaxed table detection: just look for key columns
                        const fullText = t.innerText.toLowerCase();
                        if ((!fullText.includes('code') && !fullText.includes('title')) || !fullText.includes('attn')) continue;

                        const rows = Array.from((t as HTMLTableElement).rows);
                        if (rows.length < 2) continue;

                        // Find header index - scan first 10 rows
                        let headerIdx = -1;
                        for (let i = 0; i < Math.min(10, rows.length); i++) {
                            const rowText = rows[i].innerText.toLowerCase();
                            if ((rowText.includes('course') && rowText.includes('code')) ||
                                (rowText.includes('attn') && rowText.includes('%'))) {
                                headerIdx = i;
                                break;
                            }
                        }

                        if (headerIdx === -1) continue;

                        // Parse rows
                        for (let i = headerIdx + 1; i < rows.length; i++) {
                            const row = rows[i];
                            const cells = row.cells;
                            if (cells.length < 2) continue;

                            const texts = Array.from(cells).map(c => c.innerText.trim());

                            // Strategy: Code is usually first, Percentage is usually last numeric
                            let code = texts[0].split('\n')[0].trim();

                            // Remove "Regular", "Theory" etc from code
                            code = code.replace(/Regular|Enrichment|Practical|Theory|Online|Lab/gi, '').trim();

                            if (!code || code.length < 3) continue;

                            // Title is usually second column
                            let title = texts[1];

                            // Category is usually third column (index 2) - checking for Theory/Practical
                            let category = 'Theory';
                            if (texts[2]) {
                                const catText = texts[2].toLowerCase();
                                if (catText.includes('practical') || catText.includes('lab')) category = 'Practical';
                                else if (catText.includes('theory')) category = 'Theory';
                            } else {
                                // Fallback: guess from title or code
                                if (title.toLowerCase().includes('lab') || title.toLowerCase().includes('practical')) category = 'Practical';
                            }

                            // Find percentage from the right side
                            let pct = -1;
                            for (let j = texts.length - 1; j >= 2; j--) {
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
            } catch (e) {
                // debugInfo.push(`Frame error: ${e instanceof Error ? e.message : String(e)}`);
            }
        }

        if (records.length === 0) {
            return { success: false, error: 'No attendance data found. Try again.' };
        }

        // Extract Internal Marks (Test Performance)
        console.log('[ENT] Extracting internal marks...');
        let internalMarksData: any = null;

        for (const frame of allFrames) {
            try {
                const marksData = await frame.evaluate(() => {
                    const subjects: any[] = [];
                    const tables = document.querySelectorAll('table');

                    for (const t of tables) {
                        const fullText = t.innerText.toLowerCase();
                        if (!fullText.includes('test performance') || !fullText.includes('course code')) continue;

                        const rows = Array.from((t as HTMLTableElement).rows);
                        if (rows.length < 2) continue;

                        // Start from row 1 (skip header)
                        for (let i = 1; i < rows.length; i++) {
                            const row = rows[i];
                            const cells = row.cells;
                            if (cells.length < 3) continue;

                            const code = cells[0].innerText.trim();
                            // Clean up code similar to attendance scraper
                            const cleanCode = code.split('\n')[0]
                                .replace(/(Regular|Enrichment|Practical|Theory|Online|Lab)/gi, '')
                                .trim();

                            // Get Category from 2nd cell (index 1) - "Theory" or "Practical"
                            let category = 'Theory';
                            if (cells[1]) {
                                const typeText = cells[1].innerText.toLowerCase();
                                if (typeText.includes('practical') || typeText.includes('lab')) category = 'Practical';
                            }

                            if (!cleanCode || cleanCode.length < 3) continue;

                            // The 3rd cell (index 2) usually contains the nested table with marks
                            const testCell = cells[2];
                            const nestedTable = testCell.querySelector('table');

                            const components: any[] = [];
                            let totalMarks = 0;
                            let maxTotalMarks = 0;

                            if (nestedTable && nestedTable.rows.length >= 2) {
                                const headerRow = nestedTable.rows[0]; // Test Name / Max
                                const valueRow = nestedTable.rows[1];  // Scored Mark

                                for (let j = 0; j < headerRow.cells.length; j++) {
                                    // Header format: "FT-III/15.00"
                                    const headerText = headerRow.cells[j].innerText.trim();
                                    const valueText = valueRow.cells[j]?.innerText.trim() || '0';

                                    const parts = headerText.split('/');
                                    if (parts.length === 2) {
                                        const testName = parts[0].trim();
                                        const maxMark = parseFloat(parts[1]);

                                        let scoredMark = 0;
                                        if (valueText.toLowerCase().includes('abs')) {
                                            scoredMark = 0;
                                        } else {
                                            scoredMark = parseFloat(valueText);
                                        }

                                        if (!isNaN(maxMark) && !isNaN(scoredMark)) {
                                            components.push({
                                                component: testName,
                                                marks: scoredMark,
                                                maxMarks: maxMark,
                                                date: new Date().toISOString() // Placeholder date
                                            });
                                            totalMarks += scoredMark;
                                            maxTotalMarks += maxMark;
                                        }
                                    }
                                }
                            }

                            if (components.length > 0) {
                                subjects.push({
                                    subjectCode: cleanCode,
                                    subjectName: 'Unknown', // Will merge with attendance data later
                                    category, // Add category for matching
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
            } catch (e) {
                console.log('[ENT] Error parsing internal marks frame:', e);
            }
        }

        const processedRecords: AttendanceRecord[] = records.map((r: any) => ({
            ...r,
            classesToMiss: 0,
            classesToAttend: 0
        }));

        // Merge subject names from attendance into internal marks if available
        if (internalMarksData) {
            internalMarksData.subjects = internalMarksData.subjects.map((sub: any) => {
                // Try matching by Code AND Category first
                let match = processedRecords.find(r =>
                    r.subjectCode === sub.subjectCode &&
                    r.category === sub.category
                );

                // Fallback to just Code if strict match fails (though less accurate)
                if (!match) {
                    match = processedRecords.find(r => r.subjectCode === sub.subjectCode);
                }

                // Append category to name if it's Practical to avoid confusion
                let name = match ? match.subjectName : sub.subjectName || sub.subjectCode;
                if (sub.category === 'Practical' && !name.toLowerCase().includes('practical') && !name.toLowerCase().includes('lab')) {
                    name += ' (Practical)';
                }

                return {
                    ...sub,
                    subjectName: name
                };
            });
        }

        return {
            success: true,
            data: {
                studentName: username,
                registrationNumber: username,
                records: processedRecords
            },
            internalMarks: internalMarksData || undefined
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
