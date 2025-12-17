import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import * as cheerio from 'cheerio';
import { AttendanceRecord, ScraperResult, InternalMarksResult, SubjectMarks, MarkComponent } from '../types';
import { calculateClassesToMiss, calculateClassesToAttend } from '../utils';

export class FshClient {
    private client;
    private jar: CookieJar;
    private baseUrl = 'https://sp.srmist.edu.in/srmiststudentportal';

    constructor() {
        this.jar = new CookieJar();
        this.client = wrapper(axios.create({
            baseURL: this.baseUrl,
            jar: this.jar,
            withCredentials: true,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            }
        }));
    }

    public async initSession() {
        const loginUrl = '/students/loginManager/youLogin.jsp';
        const resp = await this.client.get(loginUrl);
        const html = resp.data;

        const $ = cheerio.load(html);
        const csrfToken = $('#hdnCSRF').val() as string;

        if (!csrfToken) {
            throw new Error('Could not find CSRF token on login page');
        }

        const captchaUrl = '/captchas';
        const captchaResp = await this.client.get(captchaUrl, { responseType: 'arraybuffer' });
        const captchaBase64 = Buffer.from(captchaResp.data, 'binary').toString('base64');
        const image = `data:image/jpeg;base64,${captchaBase64}`;

        const cookies = await this.jar.getCookies(this.baseUrl);
        const cookieStr = cookies.map(c => `${c.key}=${c.value}`).join('; ');

        return {
            img: image,
            csrf: csrfToken,
            cookie: cookieStr
        };
    }

    public async loginAndFetch(username: string, pass: string, captcha: string, csrf: string, cookieStr: string): Promise<ScraperResult> {
        console.error('[FshClient] loginAndFetch called');

        // Validate inputs
        if (!username || username.trim().length === 0) {
            return { success: false, error: 'Username is required' };
        }
        if (!pass || pass.trim().length === 0) {
            return { success: false, error: 'Password is required' };
        }
        if (!captcha || captcha.trim().length === 0) {
            return { success: false, error: 'Captcha is required. Please enter the captcha shown in the image.' };
        }
        if (!csrf || !cookieStr) {
            return { success: false, error: 'Session expired. Please refresh the page and try again.' };
        }

        await this.restoreCookies(cookieStr);

        const params = this.buildLoginParams(username, pass, captcha, csrf);
        const loginUrl = '/students/loginManager/youLogin.jsp';

        // Retry logic for intermittent portal errors
        const maxRetries = 2;
        let lastError = '';

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    console.error(`[FshClient] Retry attempt ${attempt}/${maxRetries}...`);
                    await new Promise(r => setTimeout(r, 1000)); // Wait 1s between retries
                }

                console.error('[FshClient] Posting to login...');
                const loginResp = await this.client.post(loginUrl, params.toString(), {
                    maxRedirects: 5,
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    timeout: 15000
                });

                if (loginResp.data.includes('Invalid credentials') || loginResp.data.includes('Invalid Captcha')) {
                    const $ = cheerio.load(loginResp.data);
                    const errorMsg = $('.alert-danger').text().trim() || 'Login failed (Invalid Credentials/Captcha)';
                    return { success: false, error: errorMsg };
                }

                const attendanceUrl = '/students/report/studentAttendanceDetails.jsp';
                console.error('[FshClient] Fetching attendance page...');
                const attResp = await this.client.get(attendanceUrl, { timeout: 15000 });

                const attResult = this.parseAttendance(attResp.data, username);

                // Auto-fetch Internal Marks if attendance fetch was successful
                if (attResult.success) {
                    try {
                        console.error('[FshClient] Fetching internal marks...');
                        const marksUrl = '/students/report/studentInternalMarkDetails.jsp';
                        const marksResp = await this.client.get(marksUrl, { timeout: 10000 });
                        const marksResult = this.parseInternalMarks(marksResp.data, username);

                        if (marksResult.success) {
                            attResult.internalMarks = marksResult.data;
                            console.error('[FshClient] Internal marks fetched and merged.');
                        }
                    } catch (e: any) {
                        console.error('[FshClient] Failed to auto-fetch marks:', e.message);
                    }
                }

                return attResult;

            } catch (e: any) {
                lastError = e.message;
                console.error(`[FshClient] Error (attempt ${attempt + 1}):`, e.message);

                // If it's a 500 error from the portal, retry
                if (e.response?.status === 500 && attempt < maxRetries) {
                    continue;
                }

                // If it's a network or timeout error, retry
                if ((e.code === 'ECONNRESET' || e.code === 'ETIMEDOUT' || e.message?.includes('timeout')) && attempt < maxRetries) {
                    continue;
                }

                // Don't retry for other errors
                break;
            }
        }

        // Return a user-friendly error for portal issues
        if (lastError.includes('500') || lastError.includes('Request failed')) {
            return { success: false, error: 'SRM Portal is temporarily unavailable. Please try again in a few moments.' };
        }

        return { success: false, error: lastError || 'Login failed' };
    }

    public async fetchInternalMarks(cookieStr: string, username: string): Promise<InternalMarksResult> {
        console.error('[FshClient] fetchInternalMarks called');

        try {
            await this.restoreCookies(cookieStr);

            const marksUrl = '/students/report/studentInternalMarkDetails.jsp';
            console.error('[FshClient] Fetching internal marks page...');
            const marksResp = await this.client.get(marksUrl);

            return this.parseInternalMarks(marksResp.data, username);
        } catch (e: any) {
            console.error('[FshClient] Internal Marks Error:', e.message);
            return { success: false, error: e.message };
        }
    }

    private async restoreCookies(cookieStr: string) {
        if (cookieStr) {
            const cookieParts = cookieStr.split(';').map(s => s.trim());
            for (const part of cookieParts) {
                if (part && part.includes('=')) {
                    try {
                        await this.jar.setCookie(part, this.baseUrl);
                    } catch (e: any) {
                        console.error('[FshClient] Cookie set warning:', e.message);
                    }
                }
            }
        }
    }

    private buildLoginParams(username: string, pass: string, captcha: string, csrf: string): URLSearchParams {
        const params = new URLSearchParams();
        params.append('txtAN', username);
        params.append('txtSK', pass);
        params.append('login', username);
        params.append('passwd', pass);
        params.append('ccode', captcha);
        params.append('hdnCaptcha', captcha);
        params.append('csrfPreventionSalt', csrf);
        params.append('hdnCSRF', csrf);
        params.append('txtPageAction', '1');
        params.append('_tries', '1');
        return params;
    }

    private parseAttendance(html: string, username: string): ScraperResult {
        const $ = cheerio.load(html);
        const data: any[] = [];

        $('table').each((_, table) => {
            const $t = $(table);
            const txt = $t.text().toLowerCase();

            if (true) { // Always check the table content by parsing rows
                const currentTableData: any[] = [];
                $t.find('tr').each((i, row) => {
                    const cols = $(row).find('td');
                    if (cols.length < 6) return;

                    const code = $(cols[0]).text().trim();
                    if (!code || code.toLowerCase().includes('code') || code.toLowerCase() === 'total') return;

                    const name = $(cols[1]).text().trim();
                    const maxHours = parseFloat($(cols[2]).text().trim()) || 0;
                    const attHours = parseFloat($(cols[3]).text().trim()) || 0;

                    let pct = 0;
                    if (maxHours > 0) {
                        pct = (attHours / maxHours) * 100;
                    } else {
                        // Fallback: search columns starting from index 5 to avoid Absent Hours (index 4)
                        const possibleIndices = [5, 6, 7, 8];
                        for (const idx of possibleIndices) {
                            if (cols.length > idx) {
                                const valText = $(cols[idx]).text().trim().replace('%', '');
                                const val = parseFloat(valText);
                                if (!isNaN(val) && val >= 0 && val <= 100) {
                                    pct = val;
                                    break;
                                }
                            }
                        }
                    }

                    // Sanity check
                    if (pct === 0 && attHours > 0) {
                        pct = (attHours / maxHours) * 100;
                    }

                    currentTableData.push({
                        subjectCode: code,
                        subjectName: name,
                        totalHours: maxHours,
                        attendedHours: attHours,
                        percentage: Math.round(pct * 100) / 100
                    });
                });

                if (currentTableData.length > 0) {
                    data.push(...currentTableData);
                    return false; // Break cheerio loop
                }
            }
        });

        if (data.length === 0) {
            // Check if we're on the login page (session expired)
            if (html.includes('youLogin.jsp') || html.includes('txtAN') || html.includes('ccode')) {
                return { success: false, error: 'Session expired. Please login again.' };
            }

            // Check if portal returned an error page
            if (html.includes('500') || html.includes('Internal Server Error')) {
                return { success: false, error: 'SRM Portal encountered an error. Please try again later.' };
            }

            // Check if student has no attendance records yet
            if (html.toLowerCase().includes('no records') || html.toLowerCase().includes('no attendance')) {
                return {
                    success: true,
                    data: {
                        studentName: username,
                        registrationNumber: username,
                        records: []
                    },
                    error: 'No attendance records found. Your academic data may not be available yet.'
                };
            }

            return { success: false, error: 'Unable to find attendance data. The portal page structure may have changed. Please try Manual Sync or contact support.' };
        }

        const processedRecords: AttendanceRecord[] = data.map((r: any) => ({
            ...r,
            classesToMiss: calculateClassesToMiss(r.totalHours, r.attendedHours),
            classesToAttend: calculateClassesToAttend(r.totalHours, r.attendedHours)
        }));

        return {
            success: true,
            data: {
                studentName: username,
                registrationNumber: username,
                records: processedRecords
            }
        };
    }

    private parseInternalMarks(html: string, username: string): InternalMarksResult {
        const $ = cheerio.load(html);
        const subjects: SubjectMarks[] = [];

        // Parse the main marks table - look for multiple patterns
        $('table').each((_, table) => {
            const $t = $(table);
            const txt = $t.text().toLowerCase();

            // More flexible table detection - accept various header patterns
            // Added 'continuous' and 'assessment' as keywords
            const looksLikeMarksTable =
                (txt.includes('code') && (txt.includes('mark') || txt.includes('total') || txt.includes('internal'))) ||
                (txt.includes('subject') && txt.includes('mark')) ||
                (txt.includes('course') && (txt.includes('score') || txt.includes('assessment')));

            if (looksLikeMarksTable) {
                $t.find('tr').each((i, row) => {
                    const cols = $(row).find('td');
                    if (cols.length < 2) return;

                    const code = $(cols[0]).text().trim();
                    const nameCol = $(cols[1]).text().trim();

                    // Skip header rows
                    if (!code || code.toLowerCase().includes('code') || code.toLowerCase().includes('subject') || code.toLowerCase() === 'total') return;

                    // Fallback to col[1] being code if col[0] is just a serial number
                    let subjectCode = code;
                    let subjectName = nameCol;
                    let rangeStart = 2;

                    // Heuristic: if col[0] is short (1-2 chars) and numeric, it might be S.No
                    if (/^\d{1,2}$/.test(code) && cols.length > 2) {
                        subjectCode = $(cols[1]).text().trim();
                        subjectName = $(cols[2]).text().trim();
                        rangeStart = 3;
                    }

                    let marks = 0;
                    let maxMarks = 0; // 0 means unknown/default

                    // Search all columns for marks pattern "XX / YY"
                    for (let c = rangeStart; c < cols.length; c++) {
                        const colText = $(cols[c]).text().trim();

                        // Parse "40.00 / 50.00" or "40/50" format
                        if (colText.includes('/')) {
                            const parts = colText.split('/');
                            const obtained = parseFloat(parts[0].replace(/[^\d.]/g, ''));
                            const total = parseFloat(parts[1].replace(/[^\d.]/g, ''));

                            if (!isNaN(obtained) && !isNaN(total)) {
                                marks = obtained;
                                maxMarks = total;
                                break; // Found the total column
                            }
                        }
                    }

                    // If no "/" format found, look for best candidate number
                    // We assume the highest number in the row (that isn't an ID) might be max marks, 
                    // or specific column indices if we can guess.
                    // For now, let's look for the last numeric column as 'total' content if structure fits
                    if (marks === 0 && maxMarks === 0) {
                        // Search for a column that looks like a total mark (e.g. near the end)
                        // This is risky without knowing structure.
                        // Let's rely on common patterns: Total often at end.
                        for (let c = cols.length - 1; c >= rangeStart; c--) {
                            const colText = $(cols[c]).text().trim();
                            const val = parseFloat(colText);
                            if (!isNaN(val) && val >= 0 && val <= 100) {
                                marks = val;
                                maxMarks = 100; // Assume 100 if we just find a raw number
                                break;
                            }
                        }
                    }

                    // Skip if no valid code or marks found
                    if (subjectCode.length < 3) return;

                    // Determine max marks if still 0
                    if (maxMarks === 0) maxMarks = 100;

                    subjects.push({
                        subjectCode: subjectCode,
                        subjectName: subjectName || subjectCode,
                        totalMarks: marks,
                        maxTotalMarks: maxMarks,
                        components: []
                    });
                });

                // Stop after finding first valid marks table that has rows
                if (subjects.length > 0) {
                    return false; // Break cheerio loop
                }
            }
        });

        if (subjects.length === 0) {
            return { success: false, error: 'Internal marks table not found' };
        }

        return {
            success: true,
            data: {
                studentName: username,
                registrationNumber: username,
                subjects
            }
        };
    }

    public async fetchProfile(cookieStr: string, username: string): Promise<any> {
        console.error('[FshClient] fetchProfile called');

        try {
            await this.restoreCookies(cookieStr);

            // Fetch the dashboard page which contains profile data
            const dashboardUrl = '/students/template/HRDSystem.jsp';
            console.error('[FshClient] Fetching dashboard page for profile...');
            const resp = await this.client.get(dashboardUrl);
            const $ = cheerio.load(resp.data);

            // Initialize profile object
            const profile: any = {
                studentName: '',
                studentId: '',
                registerNo: '',
                emailId: '',
                institution: '',
                program: '',
                department: '',
                semester: ''
            };

            // Look for "Student Profile" section in the dashboard
            // The data is typically in a card/panel with label-value pairs
            $('body').find('*').each((_, elem) => {
                const text = $(elem).text().trim();

                // Check if this element or its parent contains profile labels
                if (text.includes('Student Name') || text.includes('Student ID') ||
                    text.includes('Register No') || text.includes('Email ID')) {

                    // Find the parent container
                    const parent = $(elem).closest('div, table, section');

                    // Extract data from label-value pairs
                    parent.find('*').each((_, child) => {
                        const childText = $(child).text().trim();
                        const nextText = $(child).next().text().trim();

                        if (childText.includes('Student Name') && nextText) {
                            profile.studentName = nextText;
                        } else if (childText.includes('Student ID') && nextText) {
                            profile.studentId = nextText;
                        } else if (childText.includes('Register No') && nextText) {
                            profile.registerNo = nextText;
                        } else if (childText.includes('Email ID') && nextText) {
                            profile.emailId = nextText;
                        } else if (childText.includes('Institution') && nextText) {
                            profile.institution = nextText;
                        } else if (childText.includes('Program') && nextText) {
                            profile.program = nextText;
                        }
                    });
                }
            });

            // Fallback: Try to extract from any text pattern matching
            const bodyText = $('body').text();

            // Extract Student Name if not found
            if (!profile.studentName) {
                const nameMatch = bodyText.match(/Student Name\s*[:\-]?\s*([A-Z\s]+)(?=\s*Student ID)/i);
                if (nameMatch) profile.studentName = nameMatch[1].trim();
            }

            console.error('[FshClient] Profile extracted:', profile);

            return {
                success: true,
                data: profile
            };

        } catch (e: any) {
            console.error('[FshClient] Profile error:', e.message);
            return { success: false, error: e.message };
        }
    }
}
