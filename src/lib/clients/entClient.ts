import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { AttendanceRecord } from '../types';

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

    async loginAndFetch(username: string, password: string): Promise<any> {
        try {
            console.log('[ENT-HTTP] Starting fast HTTP-based login...');

            // Step 1: Get login page to obtain session cookies
            console.log('[ENT-HTTP] Step 1: Getting login page...');
            const loginPageResp = await this.client.get('/');

            // Step 2: Login via Zoho (attempt direct API call)
            console.log('[ENT-HTTP] Step 2: Attempting Zoho login...');

            // Try direct Zoho login endpoint
            const zohoLoginData = new URLSearchParams({
                'LOGIN_ID': username,
                'PASSWORD': password,
                'IS_AJAX': 'true'
            });

            try {
                const zohoResp = await this.client.post(
                    'https://accounts.zoho.com/signin/v2/lookup/password',
                    zohoLoginData,
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Referer': this.baseUrl
                        }
                    }
                );

                console.log('[ENT-HTTP] Zoho login response:', zohoResp.status);
            } catch (zohoErr: any) {
                console.log('[ENT-HTTP] Zoho direct login failed, trying alternative...');
            }

            // Step 3: Try to access academia directly with credentials
            console.log('[ENT-HTTP] Step 3: Accessing academia portal...');
            const portalResp = await this.client.get('/portal/academia-academic-services');

            // Step 4: Try to get attendance data directly
            console.log('[ENT-HTTP] Step 4: Fetching attendance data...');

            // Try common API endpoints
            const possibleEndpoints = [
                '/api/attendance/get',
                '/portal/api/myattendance',
                '/services/attendance/fetch',
                '/zc_services/attendance'
            ];

            let attendanceData = null;
            for (const endpoint of possibleEndpoints) {
                try {
                    const resp = await this.client.get(endpoint);
                    if (resp.data && resp.status === 200) {
                        console.log(`[ENT-HTTP] Found data at ${endpoint}`);
                        attendanceData = resp.data;
                        break;
                    }
                } catch (e) {
                    // Endpoint doesn't exist, continue
                }
            }

            if (attendanceData) {
                return this.parseAttendanceData(attendanceData);
            }

            // Step 5: If API endpoints don't work, try scraping the HTML
            console.log('[ENT-HTTP] Step 5: Attempting HTML scraping fallback...');
            const attendancePageResp = await this.client.get('/#Page:My_Attendance');
            const html = attendancePageResp.data;

            return this.parseHTML(html);

        } catch (error: any) {
            console.error('[ENT-HTTP] Error:', error.message);
            return {
                success: false,
                error: `HTTP-based login failed: ${error.message}. ENT portal may require browser-based authentication. Please use manual sync instead.`
            };
        }
    }

    private parseAttendanceData(data: any): any {
        // Parse JSON response from API
        try {
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

                return {
                    success: true,
                    data: {
                        studentName: 'Student',
                        registrationNumber: 'Unknown',
                        records
                    }
                };
            }
        } catch (e) {
            console.error('[ENT-HTTP] Failed to parse API data');
        }

        return { success: false, error: 'Unable to parse attendance data' };
    }

    private parseHTML(html: string): any {
        const $ = cheerio.load(html);
        const records: AttendanceRecord[] = [];

        // Try to find attendance table
        $('table').each((i, table) => {
            const $table = $(table);
            const headerText = $table.find('tr').first().text().toLowerCase();

            // Check if this looks like an attendance table
            if (headerText.includes('code') && (headerText.includes('attn') || headerText.includes('present') || headerText.includes('%'))) {
                console.log('[ENT-HTTP] Found attendance table via HTML parsing');

                $table.find('tr').slice(1).each((j, row) => {
                    const $row = $(row);
                    const cells = $row.find('td').map((k, cell) => $(cell).text().trim()).get();

                    if (cells.length >= 4) {
                        const code = cells[0];
                        const name = cells[1];

                        // Skip header rows
                        if (code.toLowerCase().includes('code') || !code.match(/[A-Z0-9]{3,}/)) {
                            return;
                        }

                        // Extract numbers
                        let total = 0, attended = 0, percentage = 0;
                        for (let idx = 2; idx < cells.length; idx++) {
                            const val = cells[idx].replace('%', '').trim();
                            if (/^\d+$/.test(val)) {
                                const num = parseInt(val);
                                if (num > 0 && num <= 100 && percentage === 0) {
                                    percentage = num;
                                } else if (total === 0) {
                                    total = num;
                                } else if (attended === 0) {
                                    attended = num;
                                }
                            }
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
            error: 'No attendance data found in HTML. ENT portal requires browser-based authentication with Zoho SSO. Please use the "Manual Sync" option instead.'
        };
    }
}
