const puppeteer = require('puppeteer');

const LOGIN_URL = 'https://sp.srmist.edu.in/srmiststudentportal/students/loginManager/youLogin.jsp';

async function fullDebug() {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--start-maximized'],
        defaultViewport: null,
        slowMo: 100
    });

    const page = await browser.newPage();

    console.log('=== STEP 1: Opening login page ===');
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('Page loaded:', page.url());

    const formInfo = await page.evaluate(() => {
        return {
            usernameField: !!document.querySelector('input[name="txtAN"]'),
            passwordField: !!document.querySelector('input[name="txtSK"]'),
            captchaField: !!document.querySelector('input[name="ccode"]'),
            captchaImage: !!document.querySelector('img[src*="captcha"]')
        };
    });

    console.log('\n=== FORM FIELDS FOUND ===');
    console.log(formInfo);

    console.log('\n=== STEP 2: Enter credentials ===');
    console.log('Please enter USERNAME (Mn7130), PASSWORD and CAPTCHA in the browser');
    console.log('Press Enter here when done...\n');

    await new Promise(resolve => process.stdin.once('data', resolve));

    const formValues = await page.evaluate(() => {
        const u = document.querySelector('input[name="txtAN"]');
        const p = document.querySelector('input[name="txtSK"]');
        const c = document.querySelector('input[name="ccode"]');
        return {
            username: u ? u.value : 'NOT FOUND',
            password: p && p.value ? '***filled***' : 'EMPTY',
            captcha: c ? c.value : 'NOT FOUND'
        };
    });
    console.log('Form values:', formValues);

    console.log('\n=== STEP 3: Finding buttons ===');
    const buttons = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.map((b, i) => {
            const rect = b.getBoundingClientRect();
            return {
                index: i,
                text: (b.textContent || '').trim(),
                size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
                visible: rect.width > 0
            };
        }).filter(b => b.visible);
    });
    console.log('Buttons:', buttons);

    console.log('\nPress Enter to click Login button...');
    await new Promise(resolve => process.stdin.once('data', resolve));

    console.log('\n=== STEP 4: Clicking login ===');
    await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        for (const btn of btns) {
            if ((btn.textContent || '').trim().toLowerCase() === 'login') {
                btn.click();
                return 'clicked';
            }
        }
        return 'not found';
    });

    console.log('Clicked, waiting 5 seconds...');
    await new Promise(r => setTimeout(r, 5000));

    console.log('Current URL:', page.url());

    if (!page.url().includes('youLogin.jsp')) {
        console.log('\n✅ LOGIN SUCCESS!');
        await page.screenshot({ path: 'step4_success.png' });

        console.log('\n=== STEP 5: Finding Attendance menu ===');
        await new Promise(r => setTimeout(r, 2000));

        const menuItems = await page.evaluate(() => {
            const items = [];
            document.querySelectorAll('a').forEach((a, i) => {
                if ((a.textContent || '').toLowerCase().includes('attendance')) {
                    items.push({ i, id: a.id, text: a.textContent.trim() });
                }
            });
            return items;
        });
        console.log('Attendance links:', menuItems);

        console.log('\nPress Enter to click Attendance Details...');
        await new Promise(resolve => process.stdin.once('data', resolve));

        await page.evaluate(() => {
            const link = document.querySelector('#listId9') ||
                Array.from(document.querySelectorAll('a')).find(a =>
                    (a.textContent || '').toLowerCase().includes('attendance details'));
            if (link) link.click();
        });

        await new Promise(r => setTimeout(r, 4000));
        console.log('After click URL:', page.url());
        await page.screenshot({ path: 'step5_attendance.png' });

        const tables = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('table')).map((t, i) => ({
                i, rows: t.rows.length, text: t.textContent.substring(0, 80)
            }));
        });
        console.log('\n=== TABLES FOUND ===');
        tables.forEach(t => console.log(`Table ${t.i}: ${t.rows} rows - "${t.text}..."`));

    } else {
        console.log('\n❌ LOGIN FAILED - still on login page');
        await page.screenshot({ path: 'step4_failed.png' });
    }

    console.log('\nPress Enter to close...');
    await new Promise(resolve => process.stdin.once('data', resolve));
    await browser.close();
}

fullDebug().catch(console.error);
