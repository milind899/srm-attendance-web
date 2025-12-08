import puppeteer, { Browser, Page, Frame } from 'puppeteer';
import { ScraperResult, AttendanceRecord } from '../types';
import { calculateClassesToMiss, calculateClassesToAttend } from '../utils';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const LOGIN_URL = 'https://sp.srmist.edu.in/srmiststudentportal/students/loginManager/youLogin.jsp';

// HEADFUL MODE for user interaction
const BROWSER_OPTS = {
    headless: false,
    defaultViewport: null, // Full width
    args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-position=0,0',
        '--disable-web-security', // Sometimes helps with frame issues
        '--disable-features=IsolateOrigins,site-per-process' // Helps with cross-origin frame access
    ]
};

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function log(msg: string, data?: any) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    if (data) console.log(`[FSH-Scraper ${timestamp}] ${msg}`, data);
    else console.log(`[FSH-Scraper ${timestamp}] ${msg}`);
}

function errorLog(msg: string, err?: any) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.error(`[FSH-Scraper ${timestamp}] ERROR: ${msg}`, err);
}

export async function loginAndScrapeFSH(
    username: string,
    password: string
): Promise<ScraperResult> {
    let browser: Browser | null = null;
    let mainPage: Page | null = null;

    try {
        log('Launching Headful Browser for FSH...');
        browser = await puppeteer.launch(BROWSER_OPTS);
        const pages = await browser.pages();
        mainPage = pages.length > 0 ? pages[0] : await browser.newPage();
        await mainPage.setUserAgent(USER_AGENT);

        // Handle Popups/Alerts automatically
        browser.on('targetcreated', async (target) => {
            const page = await target.page();
            if (page) {
                page.on('dialog', async dialog => {
                    log('Dismissing dialog on new page:', dialog.message());
                    try { await dialog.accept(); } catch (e) { }
                });
            }
        });

        mainPage.on('dialog', async dialog => {
            log('Dismissing dialog on main page:', dialog.message());
            try { await dialog.accept(); } catch (e) { }
        });

        // Navigate to Login
        log(`Navigating to ${LOGIN_URL}`);
        await mainPage.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Step 1: Pre-fill credentials (Best effort with FORCE fallback)
        try {
            log(`Attempting to pre-fill login credentials for user (len: ${username.length})...`);

            // Wait for ANY of the input fields to be available
            // Note: FSH portal sometimes loads these slowly or in weird sequence
            const userInput = await mainPage.waitForSelector('input[name="txtAN"]', { timeout: 15000 }).catch(() => null);

            if (userInput) {
                log('Login fields found. Typing credentials...');

                // Method 1: Type normally
                await mainPage.type('input[name="txtAN"]', username, { delay: 100 });
                await mainPage.type('input[name="txtSK"]', password, { delay: 100 });

                // Method 2: Verify and Force set if needed (Fix for empty fields)
                const isSet = await mainPage.evaluate((u, p) => {
                    const uInput = document.querySelector('input[name="txtAN"]') as HTMLInputElement;
                    const pInput = document.querySelector('input[name="txtSK"]') as HTMLInputElement;

                    let forced = false;
                    if (uInput && uInput.value !== u) {
                        uInput.value = u; // Force set
                        forced = true;
                    }
                    if (pInput && pInput.value !== p) {
                        pInput.value = p; // Force set
                        forced = true;
                    }
                    return {
                        uVal: uInput?.value,
                        pFilled: !!pInput?.value,
                        forced
                    };
                }, username, password);

                log('Credentials set status:', isSet);

                // Focus Captcha to prompt user
                try {
                    await mainPage.focus('input[name="ccode"]');
                } catch (e) { }

                log('Credentials pre-filled. Please solve captcha and login.');
            } else {
                errorLog('Login inputs not found by selector input[name="txtAN"] within timeout.');
            }

        } catch (e) {
            errorLog('Error pre-filling form (User might need to enter manually):', e);
        }

        // Step 2: "Scrape on Sight" - Wait for Attendance Table

        const TIMEOUT = 180000; // 3 minutes timeout
        const startTime = Date.now();
        let records: any[] = [];
        let foundData = false;

        let lastClickTime = 0;
        const CLICK_COOLDOWN = 15000; // 15 seconds cooldown between clicks

        log('Starting scan loop for "Attendance Details"...');

        while (Date.now() - startTime < TIMEOUT) {
            // Check if browser is still open
            if (!browser.isConnected()) {
                throw new Error('Browser was closed by user.');
            }

            const allPages = await browser.pages();
            let attemptsInLoop = 0;

            for (const p of allPages) {
                if (p.isClosed()) continue;

                // Attempt to get all frames
                let frames: Frame[] = [];
                try {
                    frames = p.frames();
                } catch (e) {
                    continue; // Page might have closed
                }

                for (const frame of frames) {
                    // ACTION: Try to click "Attendance Details" if we are not already seeing the table

                    const isTablePresent = await frame.evaluate(() => {
                        // Very specific check for the attendance table to avoid false positives
                        const tables = document.querySelectorAll('table');
                        for (const t of tables) {
                            if ((t.textContent || '').toLowerCase().includes('course code') &&
                                (t.textContent || '').toLowerCase().includes('%')) return true;
                        }
                        return false;
                    }).catch(() => false);

                    if (!isTablePresent) {
                        // Check cooldown (Fix for reload loop)
                        if (Date.now() - lastClickTime < CLICK_COOLDOWN) {
                            continue;
                        }

                        // Try to click the link
                        try {
                            const clicked = await frame.evaluate(() => {
                                // Specific ID often used in FSH portal
                                const linkId = document.getElementById('listId9');
                                if (linkId) {
                                    linkId.click();
                                    return true;
                                }

                                // Text content fallback
                                const allLinks = Array.from(document.querySelectorAll('a, span, div, li'));
                                const target = allLinks.find(el => {
                                    const text = (el.textContent || '').trim().toLowerCase();
                                    return text === 'attendance details' || text === 'attendance';
                                });

                                if (target && (target as HTMLElement).click) {
                                    (target as HTMLElement).click();
                                    return true;
                                }
                                return false;
                            });

                            if (clicked) {
                                log('Clicked "Attendance Details". Waiting for reload...');
                                lastClickTime = Date.now();
                                await delay(3000); // Give it a moment to start loading
                            }
                        } catch (e) { /* ignore navigation errors in frames */ }
                    }

                    // EXTRACTION: Check for table
                    try {
                        const frameRecords = await frame.evaluate(() => {
                            const data: any[] = [];
                            const tables = document.querySelectorAll('table');

                            for (const table of tables) {
                                const content = (table.textContent || '').toLowerCase();
                                // Loose check first
                                if (!content.includes('course code')) continue;

                                const rows = table.querySelectorAll('tr');
                                // Header row + at least one data row?
                                if (rows.length < 2) continue;

                                for (const row of rows) {
                                    const cols = row.querySelectorAll('td');

                                    const code = (cols[0]?.textContent || '').trim();
                                    // Skip header
                                    if (!code || code.toLowerCase().includes('code')) continue;

                                    // Robust parsing for Percentage
                                    let pct = NaN;

                                    // Search ALL columns for a percentage value
                                    for (let i = 0; i < cols.length; i++) {
                                        const txt = (cols[i].textContent || '').trim();
                                        if (txt.includes('%') || !isNaN(parseFloat(txt))) {
                                            // Check if it really looks like a percentage (0-100)
                                            let cleanVal = parseFloat(txt.replace('%', ''));
                                            if (!isNaN(cleanVal) && cleanVal <= 100) {
                                                // Often % is > column 3.
                                                if (i >= 4) {
                                                    pct = cleanVal;
                                                }
                                            }
                                        }
                                    }

                                    if (isNaN(pct)) continue; // Can't use this row without percentage

                                    // Safely grab other fields
                                    const name = (cols[1]?.textContent || '').trim();
                                    // Hours might be in col 2,3 OR 3,4 depending on layout
                                    let total = 0, attended = 0;
                                    // Heuristic: usually col 2 and 3 are hours if pct is later
                                    if (cols[2]) total = parseFloat((cols[2].textContent || '').trim()) || 0;
                                    if (cols[3]) attended = parseFloat((cols[3].textContent || '').trim()) || 0;

                                    data.push({
                                        subjectCode: code,
                                        subjectName: name,
                                        totalHours: total,
                                        attendedHours: attended,
                                        percentage: Math.round(pct)
                                    });
                                }
                                if (data.length > 0) break; // Found the right table
                            }
                            return data;
                        });

                        if (frameRecords && frameRecords.length > 0) {
                            records = frameRecords;
                            foundData = true;
                            log(`Found ${records.length} records in a frame.`);
                            break;
                        }
                    } catch (e) { /* ignore extraction errors in frames */ }
                }
                if (foundData) break;
            }

            if (foundData) break;

            // Wait a bit before next poll
            await delay(1000);
            if (Date.now() - startTime > 15000 && (Date.now() - startTime) % 5000 < 500) {
                // Keep visible heartbeat in logs
            }
        }

        if (!foundData) {
            throw new Error('Timed out. Please manually navigate to "Attendance Details" table if automated navigation failed.');
        }

        // Processing records
        const processedRecords: AttendanceRecord[] = records.map((r: any) => ({
            ...r,
            classesToMiss: calculateClassesToMiss(r.totalHours, r.attendedHours),
            classesToAttend: calculateClassesToAttend(r.totalHours, r.attendedHours)
        }));

        log('Scraping successful.');
        // Extract Internal Marks (Test Performance) - Same strategy as ENT
        log('Extracting internal marks...');
        let internalMarksData: any = null;

        const currentPages = browser ? await browser.pages() : [];
        for (const frame of currentPages.flatMap(p => p.frames())) {
            try {
                const marksData = await frame.evaluate(() => {
                    const subjects: any[] = [];
                    const tables = document.querySelectorAll('table');

                    for (const t of tables) {
                        const fullText = (t.innerText || '').toLowerCase();
                        if ((!fullText.includes('test performance') && !fullText.includes('internal marks')) || !fullText.includes('course code')) continue;

                        const rows = Array.from((t as HTMLTableElement).rows);
                        if (rows.length < 2) continue;

                        // Start from row 1 (skip header)
                        for (let i = 1; i < rows.length; i++) {
                            const row = rows[i];
                            const cells = row.cells;
                            if (cells.length < 3) continue;

                            const code = (cells[0].innerText || '').trim();
                            // Clean up code 
                            const cleanCode = code.split('\n')[0]
                                .replace(/(Regular|Enrichment|Practical|Theory|Online|Lab)/gi, '')
                                .trim();

                            // Get Category from 2nd cell if available
                            let category = 'Theory';
                            if (cells[1]) {
                                const typeText = (cells[1].innerText || '').toLowerCase();
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
                                    const headerText = (headerRow.cells[j].innerText || '').trim();
                                    const valueText = (valueRow.cells[j]?.innerText || '').trim() || '0';

                                    const parts = headerText.split('/');
                                    if (parts.length === 2) {
                                        const testName = parts[0].trim();
                                        const maxMark = parseFloat(parts[1]);

                                        let scoredMark = 0;
                                        if (valueText.toLowerCase().includes('abs') || valueText === '-') {
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

                            if (components.length > 0) {
                                subjects.push({
                                    subjectCode: cleanCode,
                                    subjectName: 'Unknown',
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

                if (marksData && marksData.length > 0) {
                    log(`Found ${marksData.length} subjects with internal marks`);
                    internalMarksData = {
                        studentName: username,
                        registrationNumber: username,
                        subjects: marksData
                    };
                    break;
                }
            } catch (e) { }
        }

        // Merge subject names from attendance into internal marks if available
        if (internalMarksData) {
            internalMarksData.subjects = internalMarksData.subjects.map((sub: any) => {
                // Try matching by Code AND Category first
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
        errorLog('Scraping failed', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown scraping error'
        };
    } finally {
        if (browser) {
            log('Closing browser...');
            await browser.close();
        }
    }
}

export async function getFshCaptcha(): Promise<ScraperResult> {
    return { success: false, error: 'Captcha not required in Headful mode' };
}
