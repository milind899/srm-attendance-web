import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import * as cheerio from 'cheerio';
import { AttendanceRecord, ScraperResult } from '../types';
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

        const loginUrl = '/students/loginManager/youLogin.jsp';

        try {
            console.error('[FshClient] Posting to login...');
            const loginResp = await this.client.post(loginUrl, params.toString(), {
                maxRedirects: 5,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            console.error('[FshClient] Login response received');

            if (loginResp.data.includes('Invalid credentials') || loginResp.data.includes('Invalid Captcha')) {
                const $ = cheerio.load(loginResp.data);
                const errorMsg = $('.alert-danger').text().trim() || 'Login failed (Invalid Credentials/Captcha)';
                return { success: false, error: errorMsg };
            }

            const attendanceUrl = '/students/report/studentAttendanceDetails.jsp';

            console.error('[FshClient] Fetching attendance page...');
            const attResp = await this.client.get(attendanceUrl);
            const attHtml = attResp.data;

            return this.parseAttendance(attHtml, username);

        } catch (e: any) {
            console.error('[FshClient] Error:', e.message);
            return {
                success: false,
                error: e.message
            };
        }
    }

    private parseAttendance(html: string, username: string): ScraperResult {
        const $ = cheerio.load(html);
        const data: any[] = [];

        // FSH Table columns (from screenshot):
        // 0: Code, 1: Description, 2: Max hours, 3: Att hours, 4: Absent, 5: Average %, 6: OD/ML, 7: Total %

        $('table').each((_, table) => {
            const $t = $(table);
            const txt = $t.text().toLowerCase();

            // Look for attendance table
            if (txt.includes('code') && (txt.includes('max') || txt.includes('att') || txt.includes('average'))) {
                console.error('[FshClient] Found attendance table');

                $t.find('tr').each((i, row) => {
                    const cols = $(row).find('td');
                    if (cols.length < 6) return;

                    const code = $(cols[0]).text().trim();

                    // Skip header row or total row
                    if (!code || code.toLowerCase().includes('code') || code.toLowerCase() === 'total') return;

                    // Column 1: Subject Name
                    const name = $(cols[1]).text().trim();

                    // Column 2: Max. hours (Total)
                    const maxHours = parseFloat($(cols[2]).text().trim()) || 0;

                    // Column 3: Att. hours (Attended)
                    const attHours = parseFloat($(cols[3]).text().trim()) || 0;

                    // Column 5 or 7: Percentage (Average % or Total %)
                    let pct = NaN;
                    // Try column 5 first (Average %)
                    const avgPct = parseFloat($(cols[5]).text().trim());
                    if (!isNaN(avgPct) && avgPct >= 0 && avgPct <= 100) {
                        pct = avgPct;
                    }
                    // Fallback to column 7 (Total %)
                    if (isNaN(pct) && cols.length > 7) {
                        const totalPct = parseFloat($(cols[7]).text().trim());
                        if (!isNaN(totalPct) && totalPct >= 0 && totalPct <= 100) {
                            pct = totalPct;
                        }
                    }

                    if (isNaN(pct)) return;

                    console.error(`[FshClient] Parsed: ${code} - Max:${maxHours}, Att:${attHours}, %:${pct}`);

                    data.push({
                        subjectCode: code,
                        subjectName: name,
                        totalHours: maxHours,
                        attendedHours: attHours,
                        percentage: Math.round(pct * 100) / 100
                    });
                });
            }
        });

        if (data.length === 0) {
            return { success: false, error: 'Attendance table not found in response' };
        }

        console.error(`[FshClient] Found ${data.length} subjects`);

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
}
