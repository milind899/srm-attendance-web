const puppeteer = require('puppeteer');

const LOGIN_URL = 'https://sp.srmist.edu.in/srmiststudentportal/students/loginManager/youLogin.jsp';

async function openPortal() {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
        defaultViewport: null
    });

    const page = await browser.newPage();

    console.log('Opening FSH Portal...');
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    console.log('\n=== PORTAL IS OPEN ===');
    console.log('1. Login manually with your credentials');
    console.log('2. Navigate to Attendance Details');
    console.log('3. Once on attendance page, press Enter here to capture structure');
    console.log('========================\n');

    // Wait for user
    await new Promise(resolve => process.stdin.once('data', resolve));

    console.log('Analyzing current page...');
    console.log('Current URL:', page.url());

    // Take screenshot
    await page.screenshot({ path: 'attendance_page.png', fullPage: true });
    console.log('Screenshot saved: attendance_page.png');

    // Analyze page structure
    const analysis = await page.evaluate(() => {
        const tables = document.querySelectorAll('table');
        const result = {
            url: window.location.href,
            tables: []
        };

        for (let i = 0; i < tables.length; i++) {
            const t = tables[i];
            const rows = t.querySelectorAll('tr');
            const cols = rows[0]?.querySelectorAll('th, td') || [];
            result.tables.push({
                index: i,
                rowCount: rows.length,
                colCount: cols.length,
                headers: Array.from(cols).map(c => c.textContent?.trim().substring(0, 30)),
                preview: t.textContent?.substring(0, 300)
            });
        }

        return result;
    });

    console.log('\n=== PAGE ANALYSIS ===');
    console.log('URL:', analysis.url);
    console.log(`Tables found: ${analysis.tables.length}`);

    for (const table of analysis.tables) {
        console.log(`\nTable ${table.index}: ${table.rowCount} rows, ${table.colCount} cols`);
        console.log('Headers:', table.headers);
        console.log('Preview:', table.preview?.substring(0, 200));
    }

    console.log('\nPress Enter to close browser...');
    await new Promise(resolve => process.stdin.once('data', resolve));

    await browser.close();
}

openPortal().catch(console.error);
