import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { AttendanceRecord, TimetableResult, TimetableData, EnrolledSlot, TimeTableSlot } from '../types';

export class EntClient {
    private client: AxiosInstance;
    private baseUrl = 'https://academia.srmist.edu.in';

    constructor() {
        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            withCredentials: true,
            maxRedirects: 5
        });
    }



    async getTimetable(username: string, password: string, batch: string): Promise<TimetableResult> {
        return this.runPuppeteerAction(username, password, async (page) => {

            // 1. Fetch Master Timetable using page.evaluate()
            const masterUrl = batch === '2'
                ? 'https://academia.srmist.edu.in/#Page:Unified_Time_Table_2025_batch_2'
                : 'https://academia.srmist.edu.in/#Page:Unified_Time_Table_2025_Batch_1';

            console.log(`[ENT-PUP] Navigating to Master Timetable: ${masterUrl}`);
            await page.goto(masterUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

            // Wait for table with Day rows to appear
            try {
                await page.waitForFunction(
                    () => document.body.innerText.includes('Day 1') || document.body.innerText.includes('Day1'),
                    { timeout: 8000 }
                );
            } catch (e) {
                console.log('[ENT-PUP] Warning: Day 1 not found in master timetable');
            }
            await new Promise(r => setTimeout(r, 300));

            // Extract master timetable directly from browser DOM
            // Table structure from SRM: 12 periods (columns 1-12), 5 days (Day 1-5)
            const masterSlots = await page.evaluate(() => {
                const slots: Array<{ dayOrder: string, period: string, slotType: string }> = [];
                const tables = document.querySelectorAll('table');

                console.log('[BROWSER] Found', tables.length, 'tables for master timetable');

                tables.forEach((table, tableIdx) => {
                    const rows = table.querySelectorAll('tr');
                    console.log(`[BROWSER] Table ${tableIdx}: ${rows.length} rows`);

                    rows.forEach((row, rowIdx) => {
                        // Get all cells (both td and th)
                        const cells = row.querySelectorAll('td, th');
                        if (cells.length < 2) return;

                        // First cell should contain "Day X"
                        const firstCellText = cells[0]?.textContent?.trim() || '';
                        const dayMatch = firstCellText.match(/Day\s*(\d+)/i);

                        if (dayMatch) {
                            const dayOrder = dayMatch[1];
                            console.log(`[BROWSER] Found Day ${dayOrder} row with ${cells.length} cells`);

                            // Iterate through period columns (1-12)
                            for (let c = 1; c < cells.length && c <= 12; c++) {
                                const cellContent = cells[c]?.textContent?.trim() || '';

                                // Clean the slot type - handle "A/X", "P11/X" patterns
                                let slotType = cellContent.split('/')[0].trim();

                                // Only add valid slot types (A-G for theory, P/L + numbers for labs)
                                const invalidWords = ['FROM', 'TO', 'HOUR', 'TIME', 'DAY', 'ORDER'];
                                const isValidSlot = slotType &&
                                    slotType !== '-' &&
                                    slotType.length <= 4 &&
                                    !/^\d+$/.test(slotType) &&
                                    !invalidWords.includes(slotType.toUpperCase()) &&
                                    /^[A-G]\d*$|^P\d+$|^L\d+$/.test(slotType);

                                if (isValidSlot) {
                                    slots.push({ dayOrder, period: c.toString(), slotType });
                                    console.log(`[BROWSER] Day ${dayOrder}, Period ${c}: ${slotType}`);
                                }
                            }
                        }
                    });
                });

                console.log('[BROWSER] Total master slots extracted:', slots.length);
                return slots;
            });

            console.log(`[ENT-PUP] Master slots extracted: ${masterSlots.length}`);

            // 2. Fetch Enrolled Slots 
            console.log('[ENT-PUP] Navigating to My Time Table Attendance...');
            await page.goto('https://academia.srmist.edu.in/#My_Time_Table_Attendance', { waitUntil: 'networkidle2', timeout: 45000 });

            // Wait for course codes to appear (pattern like 21CSC303J)
            try {
                await page.waitForFunction(
                    () => /\d{2}[A-Z]{2,4}\d{3}[A-Z]?/.test(document.body.innerText),
                    { timeout: 15000 }
                );
            } catch (e) {
                console.log('[ENT-PUP] Warning: Course codes not found');
            }
            await new Promise(r => setTimeout(r, 2000));

            // Extract enrolled slots directly from browser DOM
            // Table structure: S.No(0), Course Code(1), Course Title(2), Credit(3), Regn. Type(4), 
            // Category(5), Course Type(6), Faculty Name(7), Slot(8), Room No.(9), Academic Year(10)
            const enrolledSlots = await page.evaluate(() => {
                const slots: Array<{ subjectCode: string, subjectName: string, slot: string, faculty?: string, room?: string }> = [];
                const tables = document.querySelectorAll('table');

                console.log('[BROWSER] Found', tables.length, 'tables');

                tables.forEach((table, tableIdx) => {
                    const rows = table.querySelectorAll('tr');
                    console.log(`[BROWSER] Table ${tableIdx}: ${rows.length} rows`);

                    rows.forEach((row, rowIdx) => {
                        if (rowIdx === 0) return; // Skip header row

                        const cells = row.querySelectorAll('td');
                        if (cells.length < 9) return; // Need at least 9 columns

                        // Extract text from all cells
                        const cellTexts = Array.from(cells).map(c => c.textContent?.trim() || '');

                        // Based on screenshot structure:
                        // Index 1 = Course Code (like 21IPE333P, 21CSC303J)
                        // Index 2 = Course Title
                        // Index 7 = Faculty Name
                        // Index 8 = Slot (like A, B, P11-P12, L51-L52)
                        // Index 9 = Room No.

                        const courseCode = cellTexts[1] || '';
                        const courseTitle = cellTexts[2] || '';
                        const faculty = cellTexts[7] || '';
                        const slotRaw = cellTexts[8] || '';
                        const room = cellTexts[9] || '';

                        // Validate course code pattern: 2 digits + 2-4 letters + 3 digits + optional letter
                        const isValidCode = /^\d{2}[A-Z]{2,4}\d{3}[A-Z]?$/i.test(courseCode);

                        if (isValidCode && slotRaw) {
                            console.log(`[BROWSER] Found: ${courseCode} - ${courseTitle} - Slot: ${slotRaw}`);
                            slots.push({
                                subjectCode: courseCode.toUpperCase(),
                                subjectName: courseTitle,
                                slot: slotRaw,
                                faculty: faculty,
                                room: room
                            });
                        } else if (courseCode) {
                            // Fallback: try to find slot in any column with slot-like pattern
                            let foundSlot = '';
                            for (const text of cellTexts) {
                                // Match patterns like: A, B, C, D, E, F, G, P11-P12, L51-L52, TP016
                                if (/^[A-Z][0-9]{0,2}(-[A-Z]?[0-9]{1,2})?$/.test(text) && text.length <= 10) {
                                    foundSlot = text;
                                    break;
                                }
                            }
                            if (foundSlot && /^\d{2}[A-Z]/i.test(courseCode)) {
                                console.log(`[BROWSER] Fallback found: ${courseCode} - ${courseTitle} - Slot: ${foundSlot}`);
                                slots.push({
                                    subjectCode: courseCode.toUpperCase(),
                                    subjectName: courseTitle,
                                    slot: foundSlot
                                });
                            }
                        }
                    });
                });

                console.log('[BROWSER] Total slots extracted:', slots.length);
                return slots;
            });

            console.log(`[ENT-PUP] Enrolled slots extracted: ${enrolledSlots.length}`);

            if (enrolledSlots.length === 0) {
                console.log('[ENT-PUP] No enrolled slots found. Dumping page info...');
                const pageInfo = await page.evaluate(() => ({
                    url: window.location.href,
                    tableCount: document.querySelectorAll('table').length,
                    bodySnippet: document.body.innerText.substring(0, 500)
                }));
                console.log(`[ENT-PUP] Page URL: ${pageInfo.url}`);
                console.log(`[ENT-PUP] Tables: ${pageInfo.tableCount}`);
                console.log(`[ENT-PUP] Body: ${pageInfo.bodySnippet}`);
            }

            return {
                success: enrolledSlots.length > 0 || masterSlots.length > 0,
                data: {
                    enrolledSlots,
                    masterSlots,
                    batch
                },
                error: enrolledSlots.length === 0 && masterSlots.length === 0
                    ? 'Could not extract timetable data. Please check if you are logged in correctly.'
                    : undefined
            };
        });
    }

    async loginAndFetch(username: string, password: string): Promise<any> {
        return this.runPuppeteerAction(username, password, async (page) => {
            console.log('[ENT-PUP] Navigating to My Time Table page...');
            await page.goto('https://academia.srmist.edu.in/#My_Time_Table_Attendance', { waitUntil: 'networkidle2' });

            console.log('[ENT-PUP] Waiting for table to load...');
            try {
                // Wait for course codes to appear (pattern like 21CSC303J)
                await page.waitForFunction(
                    () => /\d{2}[A-Z]{2,4}\d{3}[A-Z]?/.test(document.body.innerText),
                    { timeout: 15000 }
                );
                await new Promise(r => setTimeout(r, 500));
            } catch (e) {
                console.log('[ENT-PUP] Timeout waiting for course codes.');
            }

            // Extract subject data directly from browser DOM
            // Table structure: S.No(0), Course Code(1), Course Title(2), Credit(3), Regn. Type(4), 
            // Category(5), Course Type(6), Faculty Name(7), Slot(8), Room No.(9), Academic Year(10)
            const subjectData = await page.evaluate(() => {
                const subjects: Array<{
                    subjectCode: string;
                    subjectName: string;
                    category: string;
                    credits: number;
                    faculty: string;
                    slot: string;
                    room: string;
                }> = [];

                const tables = document.querySelectorAll('table');
                console.log('[BROWSER] Found', tables.length, 'tables');

                tables.forEach((table, tableIdx) => {
                    const rows = table.querySelectorAll('tr');
                    console.log(`[BROWSER] Table ${tableIdx}: ${rows.length} rows`);

                    rows.forEach((row, rowIdx) => {
                        if (rowIdx === 0) return; // Skip header row

                        const cells = row.querySelectorAll('td');
                        if (cells.length < 9) return; // Need at least 9 columns

                        const cellTexts = Array.from(cells).map(c => c.textContent?.trim() || '');

                        // Based on actual table structure from screenshot
                        const courseCode = cellTexts[1] || '';
                        const courseTitle = cellTexts[2] || '';
                        const credits = parseInt(cellTexts[3]) || 0;
                        const categoryText = cellTexts[5] || '';
                        const courseType = cellTexts[6] || '';
                        const faculty = cellTexts[7] || '';
                        const slot = cellTexts[8] || '';
                        const room = cellTexts[9] || '';

                        // Validate course code pattern
                        const isValidCode = /^\d{2}[A-Z]{2,4}\d{3}[A-Z]?$/i.test(courseCode);

                        if (isValidCode) {
                            console.log(`[BROWSER] Found subject: ${courseCode} - ${courseTitle}`);

                            // Determine category
                            let category = 'Theory';
                            if (courseType.toLowerCase().includes('practical') ||
                                courseType.toLowerCase().includes('lab') ||
                                courseTitle.toLowerCase().includes('lab') ||
                                courseTitle.toLowerCase().includes('practical')) {
                                category = 'Practical';
                            }

                            subjects.push({
                                subjectCode: courseCode.toUpperCase(),
                                subjectName: courseTitle,
                                category,
                                credits,
                                faculty,
                                slot,
                                room
                            });
                        }
                    });
                });

                console.log('[BROWSER] Total subjects found:', subjects.length);
                return subjects;
            });

            console.log(`[ENT-PUP] Extracted ${subjectData.length} subjects`);

            if (subjectData.length === 0) {
                // Debug dump
                const pageInfo = await page.evaluate(() => ({
                    url: window.location.href,
                    tableCount: document.querySelectorAll('table').length,
                    bodySnippet: document.body.innerText.substring(0, 1000)
                }));
                console.log(`[ENT-PUP] Debug - URL: ${pageInfo.url}`);
                console.log(`[ENT-PUP] Debug - Tables: ${pageInfo.tableCount}`);
                console.log(`[ENT-PUP] Debug - Body: ${pageInfo.bodySnippet}`);

                return {
                    success: false,
                    error: 'No subjects found. Please ensure you are logged in and have enrolled courses.'
                };
            }

            // Convert to AttendanceRecord format for dashboard compatibility
            // Note: ENT My Time Table doesn't show attendance %, so we use placeholder values
            const records = subjectData.map((s: { subjectCode: string; subjectName: string; category: string; credits: number; faculty: string; slot: string; room: string }) => ({
                subjectCode: s.subjectCode,
                subjectName: s.subjectName,
                category: s.category,
                totalHours: 0,     // Not available on this page
                attendedHours: 0,  // Not available on this page
                percentage: 0,     // Not available on this page
                classesToMiss: 0,
                classesToAttend: 0,
                // Extra fields for ENT
                credits: s.credits,
                faculty: s.faculty,
                slot: s.slot,
                room: s.room
            }));

            // Extract batch info from page (look for "Combo / Batch: X/Y" pattern)
            // The batch is the SECOND number after the slash (e.g., "1/2" means Batch 2)
            const batchInfo = await page.evaluate(() => {
                const bodyText = document.body.innerText;
                // Look for "Combo / Batch: 1/2" pattern - capture the number after slash
                const slashMatch = bodyText.match(/Combo\s*\/?\s*Batch\s*:\s*\d+\/(\d+)/i);
                if (slashMatch) {
                    return slashMatch[1]; // Return the batch after slash
                }
                // Fallback: Look for single number pattern like "Combo / Batch: 2"
                const singleMatch = bodyText.match(/Combo\s*\/?\s*Batch\s*:\s*(\d+)(?!\/)/i);
                if (singleMatch) {
                    return singleMatch[1];
                }
                // Also try "B2 Section" or "Batch 2" patterns
                const sectionMatch = bodyText.match(/B(\d+)\s*Section/i);
                if (sectionMatch) {
                    return sectionMatch[1];
                }
                return '1'; // Default
            });

            console.log(`[ENT-PUP] Detected batch: ${batchInfo}`);

            // Fetch master timetable only for the detected batch
            console.log(`[ENT-PUP] Fetching master timetable for Batch ${batchInfo}...`);
            const masterSlots = await this.fetchMasterSlots(page, batchInfo);

            return {
                success: true,
                data: {
                    studentName: 'Student',
                    registrationNumber: username,
                    records,
                    // Include the detected batch and its master timetable
                    userBatch: batchInfo,
                    masterTimetable: {
                        [`batch${batchInfo}`]: masterSlots
                    }
                }
            };
        });
    }

    // Helper to fetch master slots for a specific batch
    private async fetchMasterSlots(page: any, batch: string): Promise<Array<{ dayOrder: string; period: string; slotType: string }>> {
        const masterUrl = batch === '2'
            ? 'https://academia.srmist.edu.in/#Page:Unified_Time_Table_2025_batch_2'
            : 'https://academia.srmist.edu.in/#Page:Unified_Time_Table_2025_Batch_1';

        try {
            await page.goto(masterUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

            // Wait for Day 1 to appear
            await page.waitForFunction(
                () => document.body.innerText.includes('Day 1') || document.body.innerText.includes('Day1'),
                { timeout: 6000 }
            );
            await new Promise(r => setTimeout(r, 300));

            const slots = await page.evaluate(() => {
                const result: Array<{ dayOrder: string, period: string, slotType: string }> = [];
                const tables = document.querySelectorAll('table');

                tables.forEach(table => {
                    const rows = table.querySelectorAll('tr');
                    rows.forEach(row => {
                        const cells = row.querySelectorAll('td, th');
                        if (cells.length < 2) return;

                        const firstCellText = cells[0]?.textContent?.trim() || '';
                        const dayMatch = firstCellText.match(/Day\s*(\d+)/i);

                        if (dayMatch) {
                            const dayOrder = dayMatch[1];
                            for (let c = 1; c < cells.length && c <= 12; c++) {
                                const cellContent = cells[c]?.textContent?.trim() || '';
                                let slotType = cellContent.split('/')[0].trim();

                                // Filter out non-slot words and validate slot format
                                const invalidWords = ['FROM', 'TO', 'HOUR', 'TIME', 'DAY', 'ORDER'];
                                const isValidSlot = slotType &&
                                    slotType !== '-' &&
                                    slotType.length <= 4 &&
                                    !/^\d+$/.test(slotType) &&
                                    !invalidWords.includes(slotType.toUpperCase()) &&
                                    /^[A-Z]\d*$|^P\d+$|^L\d+$/.test(slotType); // Valid: A, B, P11, L51, etc.

                                if (isValidSlot) {
                                    result.push({ dayOrder, period: c.toString(), slotType });
                                }
                            }
                        }
                    });
                });
                return result;
            });

            console.log(`[ENT-PUP] Batch ${batch} master slots: ${slots.length}`);
            return slots;
        } catch (e: any) {
            console.log(`[ENT-PUP] Error fetching batch ${batch} master timetable:`, e.message);
            return [];
        }
    }

    private async runPuppeteerAction(username: string, password: string, actionCallback: (page: any) => Promise<any>): Promise<any> {
        let browser = null;
        try {
            console.log('[ENT-PUP] Launching browser...');
            const puppeteer = await import('puppeteer');
            browser = await puppeteer.launch({
                headless: false, // Keep visible for visual debugging
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            // Set viewport to desktop
            await page.setViewport({ width: 1280, height: 800 });

            console.log('[ENT-PUP] Navigating to login page...');
            await page.goto('https://academia.srmist.edu.in/', { waitUntil: 'networkidle2', timeout: 60000 });

            console.log('[ENT-PUP] Checking for login selectors...');
            // Wait for Zoho login elements. Usually an iframe or redirect happens.
            // If redirected to accounts.zoho.com
            // We need to handle the Zoho login form.

            // Heuristic Not fully known, but assuming standard Input IDs
            // Often: #login_id or input[type="email"]
            // Wait for redirect to settle
            // Wait for redirect to settle
            try {
                await page.waitForNavigation({ timeout: 5000, waitUntil: 'networkidle2' });
            } catch (e) { }

            console.log(`[ENT-PUP] Current URL after initial nav: ${page.url()}`);
            let pageTitle = '';
            try { pageTitle = await page.title(); console.log(`[ENT-PUP] Page Title: ${pageTitle}`); } catch (e) { }

            // Check if we are on Zoho OR if there is an iframe with Zoho
            let loginFrame = page.frames().find((f: any) => f.url().includes('zoho.com') || f.url().includes('accounts.zoho'));
            let isFrame = false;

            if (!loginFrame) {
                // Try finding frame by selector content
                console.log('[ENT-PUP] Zoho URL not found in frames. Scanning frames for login inputs...');
                for (const frame of page.frames()) {
                    try {
                        const input = await frame.$('input[name="LOGIN_ID"]');
                        if (input) {
                            console.log(`[ENT-PUP] Found LOGIN_ID in frame: ${frame.url()}`);
                            loginFrame = frame;
                            isFrame = true;
                            break;
                        }
                    } catch (e) { }
                }
            } else {
                console.log('[ENT-PUP] Found Zoho login frame by URL');
                isFrame = true;
            }

            if (loginFrame || page.url().includes('zoho.com') || page.url().includes('accounts.zoho')) {
                const target = loginFrame || page;
                console.log(`[ENT-PUP] interacting with ${isFrame ? 'iframe' : 'main page'}...`);

                // Allow some time for iframe to render inputs
                await new Promise(r => setTimeout(r, 2000));

                await target.waitForSelector('input[name="LOGIN_ID"]', { timeout: 15000 });
                await target.type('input[name="LOGIN_ID"]', username);

                // Click Next or Password field
                const nextBtn = await target.$('#nextbtn');
                if (nextBtn) {
                    console.log('[ENT-PUP] Clicking Next button...');
                    await nextBtn.click();
                    await target.waitForSelector('input[name="PASSWORD"]', { visible: true, timeout: 5000 });
                }

                await target.type('input[name="PASSWORD"]', password);

                // Submit
                console.log('[ENT-PUP] Submitting credentials...');
                await page.keyboard.press('Enter');

                console.log('[ENT-PUP] Waiting for navigation after login...');
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
            } else {
                console.log('[ENT-PUP] Login input not found in any frame.');
                // Check for "Sign In" button on main page if we are still on academia
                if (pageTitle.includes('Login')) {
                    console.log('[ENT-PUP] We are likely on the landing page. Attempting to click specific Sign In buttons...');
                    // Heuristic for sign in button?
                    // Often an anchor or button. We can try to dump page content or just fail gracefully.
                }
                page.frames().forEach((f: any) => console.log(`[ENT-PUP] Frame: ${f.url()}`));
            }



            // Post-login check
            // Check if we are back on academia
            if (page.url().includes('academia.srmist.edu.in')) {
                console.log('[ENT-PUP] Login successful (URL match).');
            } else {
                console.log(`[ENT-PUP] Warning: URLs might not match. Current: ${page.url()}`);
            }

            // Run the specific action (Fetch timtable or Attendance)
            return await actionCallback(page);

        } catch (error: any) {
            console.error('[ENT-PUP] Error:', error.message);
            return {
                success: false,
                error: `Browser automation failed: ${error.message}. Please try again.`
            };
        } finally {
            if (browser) await browser.close();
        }
    }

    private parseEnrolledSlots(html: string): EnrolledSlot[] {
        const $ = cheerio.load(html);
        const slots: EnrolledSlot[] = [];

        console.log('[ENT-TT] Parsing enrolled slots...');

        // Based on screenshot: S.No(0), Course Code(1), Course Title(2), Credit(3), Regn. Type(4), 
        // Category(5), Course Type(6), Faculty Name(7), Slot(8), Room No.(9), Academic Year(10)
        $('table').each((tableIdx, table) => {
            const $table = $(table);
            const headerText = $table.find('tr').first().text().toLowerCase();
            const rowCount = $table.find('tr').length;

            console.log(`[ENT-TT] Table ${tableIdx}: ${rowCount} rows, header: ${headerText.substring(0, 60)}`);

            // Relaxed check: Look for table with "course" OR table with many rows (>5)
            const looksLikeEnrollmentTable = headerText.includes('course') ||
                (rowCount > 5 && headerText.includes('s.no'));

            if (looksLikeEnrollmentTable) {
                $table.find('tr').slice(1).each((i, row) => {
                    const cells = $(row).find('td');
                    if (cells.length >= 9) {
                        const code = $(cells[1]).text().trim(); // Course Code
                        const name = $(cells[2]).text().trim(); // Course Title
                        const slotText = $(cells[8]).text().trim(); // Slot column

                        // Skip if not a valid course code (should be like 21CSC303J)
                        if (!code || !code.match(/^\d{2}[A-Z]{2,4}\d{3}[A-Z]?$/)) {
                            return;
                        }

                        // Slot can be like "A", "B", "P11-P12", "L51-L52"
                        if (slotText) {
                            console.log(`[ENT-TT] Found: ${code} - ${name} - Slot: ${slotText}`);
                            slots.push({
                                subjectCode: code,
                                subjectName: name,
                                slot: slotText
                            });
                        }
                    }
                });
            }
        });

        console.log(`[ENT-TT] Total enrolled slots found: ${slots.length}`);
        return slots;
    }

    private parseMasterTimetable(html: string): TimeTableSlot[] {
        const $ = cheerio.load(html);
        const slots: TimeTableSlot[] = [];

        console.log('[ENT-TT] Parsing master timetable...');

        // Look for the main grid table with "Day" or "Hour" in it
        $('table').each((tableIdx, table) => {
            const $table = $(table);
            const tableText = $table.text().toLowerCase();

            // Look for the unified timetable (has "day" and hour rows)
            if (tableText.includes('day') && (tableText.includes('hour') || $table.find('tr').length >= 6)) {
                console.log('[ENT-TT] Found master timetable grid');

                $table.find('tr').each((rIndex, row) => {
                    const cells = $(row).find('td');
                    if (cells.length < 2) return;

                    const firstCell = $(cells[0]).text().trim();

                    // Check if this row is a Day row (Day 1, Day 2, etc.)
                    const dayMatch = firstCell.match(/Day\s*(\d+)/i);
                    if (dayMatch) {
                        const dayOrder = dayMatch[1];

                        // Iterate through period columns (columns 1-12)
                        for (let c = 1; c < cells.length && c <= 12; c++) {
                            const slotType = $(cells[c]).text().trim();
                            if (slotType && slotType !== '-') {
                                slots.push({
                                    dayOrder,
                                    period: c.toString(),
                                    slotType
                                });
                            }
                        }
                    }
                });
            }
        });

        console.log(`[ENT - TT] Total master slots found: ${slots.length} `);
        return slots;
    }

    private parseAttendanceData(data: any): any {
        // Parse JSON response from API
        try {
            console.log('[ENT-HTTP] parseAttendanceData received data type:', typeof data);
            if (typeof data === 'string') {
                console.log('[ENT-HTTP] Data is string snippet:', data.substring(0, 100));
            } else if (Array.isArray(data)) {
                console.log('[ENT-HTTP] Data is Array, length:', data.length);
            } else {
                console.log('[ENT-HTTP] Data is Object keys:', Object.keys(data));
                // Try to handle nested array case?
                if (data.attendance && Array.isArray(data.attendance)) {
                    console.log('[ENT-HTTP] Found nested attendance array');
                    data = data.attendance;
                } else if (data.data && Array.isArray(data.data)) {
                    console.log('[ENT-HTTP] Found nested data array');
                    data = data.data;
                }
            }

            if (Array.isArray(data)) {
                const records = data.map((item: any) => ({
                    subjectCode: item.code || item.subject_code,
                    subjectName: item.name || item.subject_name,
                    category: item.category || 'Theory',
                    totalHours: parseInt(item.total || item.total_classes) || 0,
                    attendedHours: parseInt(item.attended || item.attended_classes) || 0,
                    percentage: parseFloat(item.percentage || item.attendance_percentage) || 0,
                    classesToMiss: 0,
                    classesToAttend: 0
                }));

                console.log('[ENT-HTTP] Successfully parsed', records.length, 'records');

                if (records.length === 0) {
                    return { success: false, error: 'Login Successful, but no attendance records found.' };
                }

                return {
                    success: true,
                    data: {
                        studentName: 'Student',
                        registrationNumber: 'Unknown',
                        records
                    }
                };
            }
        } catch (e: any) {
            console.error('[ENT-HTTP] Failed to parse API data:', e.message);
        }

        return { success: false, error: 'Unable to parse attendance data. Check debug logs for response format.' };
    }

    private parseHTML(html: string): any {
        const $ = cheerio.load(html);
        const records: AttendanceRecord[] = [];

        console.log('[ENT-HTML] Number of tables found:', $('table').length);

        // Try to find attendance table
        $('table').each((i, table) => {
            const $table = $(table);
            const headerText = $table.find('tr').first().text().toLowerCase();

            console.log(`[ENT - HTML] Table ${i} header: ${headerText.substring(0, 100)} `);

            // Check if this looks like an attendance table - broadened criteria
            const isAttendanceTable =
                (headerText.includes('code') && (headerText.includes('attn') || headerText.includes('present') || headerText.includes('%'))) ||
                (headerText.includes('course') && (headerText.includes('hour') || headerText.includes('conduct') || headerText.includes('absent'))) ||
                (headerText.includes('subject') && headerText.includes('conduct'));

            if (isAttendanceTable) {
                console.log('[ENT-HTML] Found attendance table via HTML parsing');

                $table.find('tr').slice(1).each((j, row) => {
                    const $row = $(row);
                    const cells = $row.find('td').map((k, cell) => $(cell).text().trim()).get();

                    if (cells.length >= 4) {
                        const code = cells[0];
                        const name = cells[1];

                        // Skip header rows
                        if (code.toLowerCase().includes('code') || code.toLowerCase().includes('course') || !code.match(/[A-Z0-9]{3,}/)) {
                            return;
                        }

                        // Extract numbers - look for patterns like "X/Y" or standalone numbers
                        let total = 0, attended = 0, percentage = 0;
                        for (let idx = 2; idx < cells.length; idx++) {
                            const cellVal = cells[idx].trim();

                            // Check for "X/Y" format (e.g., "25/30")
                            const fractionMatch = cellVal.match(/(\d+)\s*\/\s*(\d+)/);
                            if (fractionMatch) {
                                attended = parseInt(fractionMatch[1]);
                                total = parseInt(fractionMatch[2]);
                                continue;
                            }

                            const val = cellVal.replace('%', '').trim();
                            if (/^\d+(\.\d+)?$/.test(val)) {
                                const num = parseFloat(val);
                                if (num > 0 && num <= 100 && percentage === 0 && cellVal.includes('%')) {
                                    percentage = num;
                                } else if (num > 0 && num <= 100 && percentage === 0 && total > 0) {
                                    // Likely percentage if we already have total
                                    percentage = num;
                                } else if (total === 0) {
                                    total = Math.round(num);
                                } else if (attended === 0) {
                                    attended = Math.round(num);
                                }
                            }
                        }

                        // Calculate percentage if not found
                        if (percentage === 0 && total > 0 && attended > 0) {
                            percentage = Math.round((attended / total) * 100);
                        }

                        if (percentage > 0 || total > 0) {
                            records.push({
                                subjectCode: code,
                                subjectName: name,
                                category: name.toLowerCase().includes('lab') || name.toLowerCase().includes('practical') ? 'Practical' : 'Theory',
                                totalHours: total,
                                attendedHours: attended,
                                percentage: percentage,
                                classesToMiss: 0,
                                classesToAttend: 0
                            });
                        }
                    }
                });
            }
        });

        console.log('[ENT-HTML] Total records parsed:', records.length);

        if (records.length > 0) {
            return {
                success: true,
                data: {
                    studentName: 'Student',
                    registrationNumber: 'Unknown',
                    records
                }
            };
        }

        return {
            success: false,
            error: 'No attendance data found in HTML. The table structure may have changed. Please try the Timetable feature instead.'
        };
    }
}
