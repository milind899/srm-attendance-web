import puppeteer, { Frame, Page } from 'puppeteer';
import * as fs from 'fs';
import { ScraperResult, AttendanceRecord } from '../types';

// Dynamic imports for serverless usage
// const chromium = require('@sparticuz/chromium'); 
// const puppeteerCore = require('puppeteer-core');

const LOGIN_URL = 'https://academia.srmist.edu.in/';

export async function scrapeEntAttendance(username: string, password: string): Promise<ScraperResult> {
    let browser: any = null;
    let page: any = null;
    try {
        console.log('[ENT] Starting scraper (Debug Mode)...');

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

        // Strict Verification: Ensure we are NOT on the login page
        const currentUrl = page.url();
        console.log(`[ENT-DEBUG] Post-login URL: ${currentUrl}`);

        if (currentUrl.includes('accounts.zoho.com') || (await page.$('#signinFrame'))) {
            console.log('[ENT-DEBUG] Still on login page! waiting specifically for redirect...');
            try {
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
            } catch (e) { }

            if (page.url().includes('accounts.zoho.com')) {
                fs.writeFileSync('debug_stuck_login.html', await page.content());
                throw new Error('Login stuck on Zoho page. Check credentials or manual intervention needed.');
            }
        }

        console.log('[ENT] Login verified!');

        // Wait for page to stabilize after login
        console.log('[ENT] Waiting for post-login stabilization...');
        await new Promise(r => setTimeout(r, 3000));

        // FIX: If we are stuck on the /accounts/ page (Zoho profile), the SPA is not loaded.
        if (page.url().includes('/accounts/') || page.url().includes('zoho.com')) {
            console.log('[ENT] Detected external Account/Profile page. Forcing navigation to App Root...');
            await page.goto('https://academia.srmist.edu.in/', { waitUntil: 'networkidle2', timeout: 45000 });
            console.log('[ENT] Validating application load...');
            await new Promise(r => setTimeout(r, 15000));

            if (page.url().includes('/accounts/')) {
                console.log('[ENT] Forced navigation failed, attempting re-nav...');
                await page.goto('https://academia.srmist.edu.in/', { waitUntil: 'domcontentloaded', timeout: 30000 });
                await new Promise(r => setTimeout(r, 10000));
            }
        }

        // Ensure we are on the right origin
        if (page.url().includes('academia.srmist.edu.in')) {
            console.log('[ENT] Going to attendance page via hash navigation...');
            await page.evaluate(() => {
                window.location.hash = '#Page:My_Attendance';
            });

            // Wait for SPA to initialize
            await new Promise(r => setTimeout(r, 5000));

            // Check if login iframe is still present (sign SPA hasn't loaded)
            const frames = page.frames();
            const hasLoginFrame = frames.some((f: any) => f.name() === 'zohoiam' || f.url().includes('signin') || f.url().includes('accounts'));

            if (hasLoginFrame) {
                console.log('[ENT] WARNING: Login iframe still present. SPA may not have initialized. Forcing reload...');
                await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
                await new Promise(r => setTimeout(r, 8000));

                // Try hash navigation again
                await page.evaluate(() => {
                    window.location.hash = '#Page:My_Attendance';
                }).catch(() => { });
                await new Promise(r => setTimeout(r, 8000));
            }
        } else {
            console.log('[ENT] FAIL: Application not on correct origin. URL:', page.url());
        }

        // DYNAMIC WAIT STRATEGY
        // Retry Loop (3 Attempts) - Fast Check + Aggressive Recovery
        let tableFound = false;

        for (let attempt = 1; attempt <= 3; attempt++) {
            console.log(`[ENT] Data Load Attempt ${attempt}/3...`);

            // 1. Ensure hash state
            if (page.url().includes('academia.srmist.edu.in')) {
                await page.evaluate(() => { window.location.hash = '#Page:My_Attendance'; }).catch(() => { });
            }

            // 2. Dynamic Wait: Wait for table to appear (max 12s, check every 500ms)
            // This returns IMMEDIATELY if table exists, saving time.
            // 2. Dynamic Wait: Wait for table to appear in ANY frame (max 20s, check every 800ms)
            try {
                const checkFramesForTable = async () => {
                    const frames = page.frames();
                    for (const frame of frames) {
                        const hasTable = await frame.evaluate(() => {
                            const tables = Array.from(document.querySelectorAll('table'));
                            return tables.some(t => t.innerText.length > 50);
                        }).catch(() => false);
                        if (hasTable) return true;
                    }
                    return false;
                };

                let waited = 0;
                while (waited < 20000) {
                    if (await checkFramesForTable()) {
                        tableFound = true;
                        console.log('[ENT] Table detected in a frame!');
                        break;
                    }
                    await new Promise(r => setTimeout(r, 800));
                    waited += 800;
                }
            } catch (e) {
                console.log(`[ENT] Attempt ${attempt} wait timed out.`);
            }

            // 3. Fallback: Try menu click if hash didn't work
            if (!tableFound) {
                console.log('[ENT] Trying menu click fallback...');
                try {
                    await page.evaluate(() => {
                        // Click "Attendance" link
                        const links = Array.from(document.querySelectorAll('a, div, span'));
                        for (const el of links) {
                            if ((el as HTMLElement).innerText?.trim() === 'Attendance') {
                                (el as HTMLElement).click();
                                return true;
                            }
                        }
                    });
                    // Wait briefly for click effect
                    await new Promise(r => setTimeout(r, 2000));
                } catch (e) { }
            }

            // 4. Recovery for next attempt
            if (attempt < 3 && !tableFound) {
                console.log('[ENT] Reloading page for next attempt...');
                try {
                    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
                    await new Promise(r => setTimeout(r, 2000)); // Short grace period
                } catch (e) { }
            }
        }

        if (!tableFound) {
            console.log('[ENT] WARN: Tables not found after 3 attempts. Capturing debug snapshot...');
            try {
                await page.screenshot({ path: 'ent_debug_failure.png', fullPage: true });
                const debugHtml = await page.content();
                const frames = page.frames();
                let params = `URL: ${page.url()}\n`;
                for (const f of frames) {
                    params += `Frame: ${f.name()} | URL: ${f.url()}\n`;
                }
                const fs = require('fs'); // Ensure fs is available or use import
                fs.writeFileSync('ent_debug_dump.html', debugHtml);
                fs.writeFileSync('ent_debug_frames.txt', params);
            } catch (e) { console.log('Debug capture failed:', e); }

            console.log('[ENT] Proceeding to extraction despite no table specific hit (maybe parsing works differently or marks data exists)...');
        }

        console.error('[ENT] ========= STARTING DATA EXTRACTION =========');
        console.error('[ENT] Extracting data...');
        const allFrames = page.frames();
        console.error(`[ENT] Found ${allFrames.length} frames to scan`);
        let records: any[] = [];
        let debugFrameInfo: string[] = [];

        for (const frame of allFrames) {
            try {
                const frameTitle = await frame.title().catch(() => 'Unknown');
                const frameName = frame.name() || '(unnamed)';
                const frameUrl = frame.url();
                console.error(`[ENT] Scanning frame: ${frameName} | URL: ${frameUrl.substring(0, 80)}`);
                debugFrameInfo.push(`Frame: ${frameName} (${frameTitle})`);

                // Log frame content preview
                const frameInfo = await frame.evaluate(() => {
                    const tables = document.querySelectorAll('table');
                    const bodyText = document.body?.innerText?.substring(0, 200) || '';
                    return {
                        tableCount: tables.length,
                        bodyPreview: bodyText.replace(/\s+/g, ' ').trim(),
                        hasAttendanceText: bodyText.toLowerCase().includes('attendance'),
                        hasSubjectText: bodyText.toLowerCase().includes('subject')
                    };
                }).catch(() => ({ tableCount: 0, bodyPreview: 'Error reading frame', hasAttendanceText: false, hasSubjectText: false }));

                const logMsg = `[ENT] Frame: ${frameName}\n  URL: ${frameUrl}\n  Tables: ${frameInfo.tableCount}\n  Preview: "${frameInfo.bodyPreview.substring(0, 100)}"\n  Has attendance: ${frameInfo.hasAttendanceText}, Has subject: ${frameInfo.hasSubjectText}\n\n`;
                console.error(logMsg);
                fs.appendFileSync('scraper_debug.log', logMsg);

                const frameRecords = await frame.evaluate(() => {
                    const results: any[] = [];
                    const tables = document.querySelectorAll('table');
                    if (tables.length === 0) return [];

                    for (const t of tables) {
                        const rows = Array.from((t as HTMLTableElement).rows);
                        if (rows.length < 3) continue;

                        let headerIdx = -1;
                        for (let i = 0; i < Math.min(10, rows.length); i++) {
                            const rowText = rows[i].innerText.toLowerCase();
                            if (rowText.includes('code') &&
                                (rowText.includes('attn') || rowText.includes('max') || rowText.includes('hour') || rowText.includes('present') || rowText.includes('%'))) {
                                headerIdx = i;
                                break;
                            }
                        }

                        if (headerIdx === -1) {
                            let potentialSubjectRows = 0;
                            for (let i = 0; i < rows.length; i++) {
                                const firstCell = rows[i].cells[0]?.innerText?.trim() || '';
                                if (/^[0-9]+[A-Z]+/.test(firstCell) || /^[A-Z]+[0-9]+/.test(firstCell)) {
                                    potentialSubjectRows++;
                                }
                            }
                            if (potentialSubjectRows > 2 && rows.length > 5) {
                                headerIdx = 0;
                            }
                        }

                        const startRow = headerIdx === -1 ? 1 : headerIdx + 1;

                        for (let i = startRow; i < rows.length; i++) {
                            const row = rows[i];
                            const cells = row.cells;
                            if (cells.length < 4) continue;

                            const texts = Array.from(cells).map(c => c.innerText.trim());
                            let code = texts[0].split('\n')[0].replace(/(Regular|Enrichment|Practical|Theory|Online|Lab)/gi, '').trim();

                            // Robust filtering: Skip headers, totals, "Semester" rows, or pure numeric codes (S.No)
                            if (!code || code.length < 3 ||
                                code.toLowerCase().includes('total') ||
                                code.toLowerCase().includes('code') ||
                                code.toLowerCase().includes('semester') ||
                                !/[a-zA-Z]/.test(code)
                            ) continue;

                            let title = texts[1];
                            // Skip if title is just a number (garbage row)
                            if (!title || /^\d+$/.test(title.trim())) continue;

                            let hoursStr = '';
                            let attendedStr = '';
                            let percentStr = '';

                            for (let j = 2; j < texts.length; j++) {
                                const val = texts[j];
                                if (/^\d+$/.test(val)) {
                                    if (!hoursStr) hoursStr = val;
                                    else if (!attendedStr) attendedStr = val;
                                } else if (/^\d+(\.\d+)?%?$/.test(val)) {
                                    percentStr = val;
                                }
                            }

                            const totalHours = parseInt(hoursStr) || 0;
                            const attended = parseInt(attendedStr) || 0;
                            let percentage = parseFloat(percentStr) || 0;
                            if (percentage === 0 && totalHours > 0) {
                                percentage = Math.round((attended / totalHours) * 100);
                            }

                            if (totalHours > 0 || percentage > 0) {
                                const category = texts[0].toLowerCase().includes('practical') ||
                                    texts[0].toLowerCase().includes('lab') ||
                                    title.toLowerCase().includes('practical') ||
                                    title.toLowerCase().includes('lab')
                                    ? 'Practical' : 'Theory';

                                results.push({
                                    subjectCode: code,
                                    subjectName: title,
                                    category: category,
                                    totalClasses: totalHours,
                                    attendedClasses: attended,
                                    percentage: percentage
                                });
                            }
                        }
                    }

                    return results;
                });

                console.error(`[ENT] Frame "${frameName}" returned ${frameRecords.length} records`);
                if (frameRecords.length > 0) {
                    records.push(...frameRecords);
                    console.error(`[ENT] ✓ Added ${frameRecords.length} records. Total now: ${records.length}`);
                }
            } catch (e: any) {
                console.error(`[ENT] Frame scan error: ${e.message}`);
            }
        }

        console.error(`[ENT] ========= EXTRACTION COMPLETE =========`);
        console.error(`[ENT] Total attendance records found: ${records.length}`);

        if (records.length === 0) {
            console.error('[ENT] WARN: No attendance records found! Proceeding to Marks check...');
            console.error('[ENT-DEBUG] Frames scanned:', debugFrameInfo.join(', '));
        } else {
            console.error(`[ENT] ✓ Attendance extraction successful! Found ${records.length} subjects`);
        }

        // ==========================================
        // INTERNAL MARKS EXTRACTION - "Scan-Click-Scan" Implementation
        // REUSABLE FUNCTION TO SCAN FOR MARKS
        const extractMarksFromFrames = async () => {
            const frames = page.frames();
            for (const frame of frames) {
                try {
                    const result = await frame.evaluate(() => {
                        const subjects: any[] = [];
                        const tables = document.querySelectorAll('table');

                        // FALLBACK SEARCH: Look for specific text if header-based search fails
                        const detailNode = document.evaluate("//p[contains(text(),'Internal Marks Detail')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        let specificTable = null;
                        if (detailNode) {
                            let nextSibling = detailNode.nextSibling;
                            let hops = 0;
                            // Robust Traversal: Hop over BRs/Text to find Table
                            while (nextSibling && hops < 15) {
                                if (nextSibling.nodeName === 'TABLE') {
                                    specificTable = nextSibling;
                                    break;
                                }
                                nextSibling = nextSibling.nextSibling;
                                hops++;
                            }
                        }

                        const tablesToScan = specificTable ? [specificTable as HTMLTableElement] : Array.from(tables);

                        for (const t of tablesToScan) {
                            const rows = Array.from((t as HTMLTableElement).rows);
                            if (rows.length < 2) continue;

                            // Find Header Row
                            let headerIdx = -1;
                            for (let i = 0; i < Math.min(6, rows.length); i++) {
                                const txt = rows[i].innerText.toLowerCase().replace(/\s+/g, ' ');
                                if (txt.includes('test performance') && txt.includes('code')) {
                                    headerIdx = i;
                                    break;
                                }
                            }

                            // 1. Fallback Logic (Regex based on debug dump)
                            if (headerIdx === -1) {
                                for (let i = 1; i < rows.length; i++) {
                                    const row = rows[i];
                                    if (row.cells.length < 3) continue;
                                    const code = row.cells[0].innerText.trim();
                                    if (!code.match(/^[A-Z0-9]{3,}$/)) continue;

                                    const subjectName = row.cells[1].innerText.trim();
                                    const components: any[] = [];
                                    let totalMarks = 0;
                                    let maxTotalMarks = 0;

                                    for (let c = 2; c < row.cells.length; c++) {
                                        const cellHtml = row.cells[c].innerHTML;
                                        // Pattern: <strong>TestName/MaxMark</strong><br>ScoredMark
                                        const match = cellHtml.match(/<strong>(.*?)\/([\d.]+)<\/strong>\s*<br>\s*([\d.-]+|Abs)/i);
                                        if (match) {
                                            const testName = match[1].trim();
                                            const maxVal = parseFloat(match[2]);
                                            let scoredVal = 0;
                                            const scoreStr = match[3].trim();
                                            if (scoreStr.toLowerCase().includes('abs') || scoreStr === '-') {
                                                scoredVal = 0;
                                            } else {
                                                scoredVal = parseFloat(scoreStr);
                                            }

                                            if (!isNaN(maxVal) && !isNaN(scoredVal)) {
                                                components.push({
                                                    component: testName,
                                                    marks: scoredVal,
                                                    maxMarks: maxVal,
                                                    date: new Date().toISOString()
                                                });
                                                totalMarks += scoredVal;
                                                maxTotalMarks += maxVal;
                                            }
                                        }
                                    }

                                    if (components.length > 0) {
                                        let category = 'Theory';
                                        if (subjectName.toLowerCase().includes('practical') || subjectName.toLowerCase().includes('lab')) category = 'Practical';
                                        subjects.push({
                                            subjectCode: code,
                                            subjectName,
                                            category,
                                            totalMarks,
                                            maxTotalMarks,
                                            components
                                        });
                                    }
                                }
                                if (subjects.length > 0) return subjects;
                                continue;
                            }

                            // 2. Original Logic (Header found)
                            for (let i = headerIdx + 1; i < rows.length; i++) {
                                const row = rows[i];
                                const cells = row.cells;
                                if (cells.length < 3) continue;

                                const code = cells[0].innerText.trim();
                                if (code.length < 3 || code.toLowerCase().includes('code')) continue;

                                const cleanCode = code.split('\n')[0].trim();
                                const subjectName = cells[1].innerText.trim();

                                // Nested table check
                                let nestedTable = null;
                                for (let c = 2; c < cells.length; c++) {
                                    const tbl = cells[c].querySelector('table');
                                    if (tbl && tbl.innerText.includes('/')) {
                                        nestedTable = tbl;
                                        break;
                                    }
                                }
                                if (!nestedTable && !code.match(/[A-Z0-9]{5,}/)) continue;

                                const components: any[] = [];
                                let totalMarks = 0;
                                let maxTotalMarks = 0;

                                if (nestedTable && nestedTable.rows.length >= 2) {
                                    const hRow = nestedTable.rows[0];
                                    const vRow = nestedTable.rows[1];
                                    const len = Math.min(hRow.cells.length, vRow.cells.length);

                                    for (let c = 0; c < len; c++) {
                                        const rawHeader = hRow.cells[c].innerText.trim();
                                        const rawValue = vRow.cells[c].innerText.trim();
                                        const parts = rawHeader.split('/');
                                        if (parts.length < 2) continue;

                                        const testName = parts.slice(0, -1).join('/').trim();
                                        const maxMarkVal = parseFloat(parts[parts.length - 1]);
                                        let scoredVal = 0;
                                        if (rawValue.toLowerCase().includes('abs') || rawValue.includes('-')) {
                                            scoredVal = 0;
                                        } else {
                                            scoredVal = parseFloat(rawValue);
                                        }

                                        if (!isNaN(maxMarkVal) && !isNaN(scoredVal)) {
                                            components.push({
                                                component: testName,
                                                marks: scoredVal,
                                                maxMarks: maxMarkVal,
                                                date: new Date().toISOString()
                                            });
                                            totalMarks += scoredVal;
                                            maxTotalMarks += maxMarkVal;
                                        }
                                    }
                                }

                                if (components.length > 0) {
                                    let category = 'Theory';
                                    if (subjectName.toLowerCase().includes('practical') || subjectName.toLowerCase().includes('lab')) category = 'Practical';
                                    if (cleanCode.endsWith('P')) category = 'Practical';

                                    subjects.push({
                                        subjectCode: cleanCode,
                                        subjectName: cleanCode,
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

                    if (result && result.length > 0) return result;
                } catch (e) { }
            }
            return null;
        };

        // Strategy 1: Look immediately
        console.log('[ENT] Check 1: Checking currently loaded page for marks...');
        let marksData = await extractMarksFromFrames();

        // Strategy 2: If not found, Click "Internal Marks" and wait
        if (!marksData) {
            console.log('[ENT] Check 1 empty. Trying to click "Internal Marks" tab/link...');
            let clicked = false;
            try {
                const frames = page.frames();
                for (const frame of frames) {
                    clicked = await frame.evaluate(() => {
                        const links = Array.from(document.querySelectorAll('a, div, span, li'));
                        for (const link of links) {
                            const text = (link as HTMLElement).innerText?.toLowerCase().replace(/\s+/g, ' ') || '';
                            if (text.includes('internal marks') || text.includes('test performance')) {
                                (link as HTMLElement).click();
                                return true;
                            }
                        }
                        return false;
                    });
                    if (clicked) {
                        console.log('[ENT] Clicked link in frame:', frame.name());
                        break;
                    }
                }
            } catch (e) { }

            if (clicked) {
                console.log('[ENT] Click successful. Waiting for load...');
                await new Promise(r => setTimeout(r, 8000)); // Wait for tab switch
                console.log('[ENT] Check 2: Re-scanning for marks...');
                marksData = await extractMarksFromFrames();
            }
        }

        let internalMarksData: any = null;
        if (marksData && marksData.length > 0) {
            console.log(`[ENT] SUCCESS: Found internal marks for ${marksData.length} subjects!`);
            internalMarksData = {
                studentName: username,
                registrationNumber: username,
                subjects: marksData
            };
        } else {
            console.log('[ENT] WARN: Internal marks NOT found after all attempts.');
            // Dump again for analysis
            try {
                await page.screenshot({ path: 'ent_marks_fail_final.png', fullPage: true });
                fs.writeFileSync('ent_marks_dump_final.html', await page.content());
            } catch (e) { }
        }

        // Final Check
        if (records.length === 0 && !internalMarksData) {
            console.error('[ENT] FATAL: Neither attendance nor marks found.');
            console.error('[ENT] This means the Academia portal page loaded, but shows NO attendance data.');
            console.error('[ENT] Possible reasons:');
            console.error('[ENT]   1. Your account has no attendance records yet (new semester/student)');
            console.error('[ENT]   2. The portal is temporarily down or broken for ENT');
            console.error('[ENT]   3. You need to verify the credentials are correct');

            try {
                await page.screenshot({ path: 'ent_fatal_nothing_found.png', fullPage: true });
                console.error('[ENT] Screenshot saved to: ent_fatal_nothing_found.png');
                console.error('[ENT] Check this image to verify what the portal is showing.');
            } catch (e) { }

            return {
                success: false,
                error: 'No attendance data found on portal. The portal page loaded successfully but appears empty. This may mean: (1) you have no attendance records yet, (2) the portal is temporarily unavailable for ENT department, or (3) there may be a credential issue. Check the screenshot "ent_fatal_nothing_found.png" to see what the portal is displaying.'
            };
        }

        const processedRecords: AttendanceRecord[] = records.map((r: any) => ({
            ...r,
            classesToMiss: 0,
            classesToAttend: 0
        }));

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
