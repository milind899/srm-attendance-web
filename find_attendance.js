const puppeteer = require('puppeteer');

const LOGIN_URL = 'https://sp.srmist.edu.in/srmiststudentportal/students/loginManager/youLogin.jsp';

async function findAttendanceMenu() {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--start-maximized'],
        defaultViewport: null
    });

    const page = await browser.newPage();

    console.log('Opening FSH Portal...');
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    console.log('\n===========================================');
    console.log('Please LOGIN manually (username, password, captcha)');
    console.log('Once you see the dashboard, press Enter here');
    console.log('===========================================\n');

    await new Promise(resolve => process.stdin.once('data', resolve));

    console.log('Current URL:', page.url());
    console.log('\nSearching for Attendance-related menu items...\n');

    // Find all elements containing "attendance"
    const attendanceItems = await page.evaluate(() => {
        const results = [];
        const allElements = document.querySelectorAll('*');

        allElements.forEach((el, i) => {
            const text = (el.textContent || '').toLowerCase();
            if (text.includes('attendance') && el.children.length < 3) {
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);

                if (rect.width > 0 && rect.height > 0 && style.display !== 'none') {
                    results.push({
                        tag: el.tagName,
                        id: el.id || null,
                        class: el.className || null,
                        text: el.textContent?.trim().substring(0, 80),
                        rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
                        clickable: el.onclick ? true : (el.tagName === 'A' || el.tagName === 'BUTTON' || el.getAttribute('onclick'))
                    });
                }
            }
        });

        return results;
    });

    console.log('Found', attendanceItems.length, 'elements with "attendance":\n');
    attendanceItems.forEach((item, i) => {
        console.log(`[${i}] ${item.tag} | id="${item.id}" | class="${item.class?.substring(0, 30)}" | text="${item.text?.substring(0, 40)}..." | size=${item.rect.w}x${item.rect.h} | clickable=${item.clickable}`);
    });

    console.log('\n===========================================');
    console.log('Enter the index to click, or "skip":');
    console.log('===========================================\n');

    const input = await new Promise(resolve => {
        process.stdin.once('data', data => resolve(data.toString().trim()));
    });

    if (input !== 'skip') {
        const idx = parseInt(input);
        console.log('\nClicking element', idx);

        await page.evaluate((targetIdx) => {
            const allElements = document.querySelectorAll('*');
            let count = 0;

            for (const el of allElements) {
                const text = (el.textContent || '').toLowerCase();
                if (text.includes('attendance') && el.children.length < 3) {
                    const rect = el.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        if (count === targetIdx) {
                            console.log('Clicking:', el.tagName, el.textContent?.trim());
                            el.click();
                            return;
                        }
                        count++;
                    }
                }
            }
        }, idx);

        await new Promise(r => setTimeout(r, 5000));
        console.log('\nAfter click URL:', page.url());

        // Try to find attendance table
        const tables = await page.evaluate(() => {
            const tbls = document.querySelectorAll('table');
            return Array.from(tbls).map(t => ({
                rows: t.rows.length,
                text: t.textContent?.substring(0, 200)
            }));
        });

        console.log('\nTables found:', tables.length);
        tables.forEach((t, i) => console.log(`Table ${i}: ${t.rows} rows, text: "${t.text?.substring(0, 100)}..."`));

        await page.screenshot({ path: 'attendance_page.png' });
        console.log('\nScreenshot saved: attendance_page.png');
    }

    console.log('\nPress Enter to close...');
    await new Promise(resolve => process.stdin.once('data', resolve));
    await browser.close();
}

findAttendanceMenu().catch(console.error);
