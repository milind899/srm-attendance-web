const puppeteer = require('puppeteer');

const LOGIN_URL = 'https://sp.srmist.edu.in/srmiststudentportal/students/loginManager/youLogin.jsp';

async function debugLogin() {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--start-maximized'],
        defaultViewport: null
    });

    const page = await browser.newPage();

    console.log('Opening FSH Portal...');
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    console.log('\n===========================================');
    console.log('PORTAL IS OPEN!');
    console.log('Username is: Mn7130');
    console.log('Please enter the PASSWORD and CAPTCHA');
    console.log('Then press Enter here (DO NOT click login yet!)');
    console.log('===========================================\n');

    // Wait for user to fill form
    await new Promise(resolve => process.stdin.once('data', resolve));

    console.log('\nAnalyzing the login button...');

    // Find the login button
    const buttonInfo = await page.evaluate(() => {
        const btn = document.querySelector('#btnConfirm');
        if (btn) {
            const rect = btn.getBoundingClientRect();
            const style = window.getComputedStyle(btn);
            return {
                found: true,
                id: btn.id,
                tagName: btn.tagName,
                visible: style.display !== 'none' && style.visibility !== 'hidden',
                text: btn.textContent?.trim(),
                rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                disabled: btn.disabled,
                type: btn.type || btn.getAttribute('type')
            };
        }

        // Try to find any submit button
        const allButtons = Array.from(document.querySelectorAll('input[type="submit"], button[type="submit"], button, input[type="button"]'));
        return {
            found: false,
            alternatives: allButtons.map(b => ({
                tagName: b.tagName,
                id: b.id,
                name: b.name,
                type: b.type || b.getAttribute('type'),
                text: b.textContent?.trim() || b.value,
                visible: window.getComputedStyle(b).display !== 'none'
            }))
        };
    });

    console.log('\nButton Analysis:', JSON.stringify(buttonInfo, null, 2));

    console.log('\nNow clicking the login button...');

    try {
        // Try different click methods
        const btn = await page.$('#btnConfirm');
        if (btn) {
            console.log('Found #btnConfirm, clicking...');
            await btn.click();
        } else {
            console.log('#btnConfirm not found, trying form submit...');
            await page.evaluate(() => {
                const form = document.querySelector('form');
                if (form) form.submit();
            });
        }
    } catch (e) {
        console.log('Click error:', e.message);
        // Try JavaScript click
        await page.evaluate(() => {
            const btn = document.querySelector('#btnConfirm');
            if (btn) btn.click();
        });
    }

    console.log('Waiting for navigation...');
    await page.waitForNavigation({ timeout: 30000 }).catch(() => console.log('Navigation timeout'));

    await new Promise(r => setTimeout(r, 3000));

    console.log('Current URL:', page.url());

    if (!page.url().includes('youLogin.jsp')) {
        console.log('\n=== LOGIN SUCCESS! ===');
        console.log('Looking for Attendance Details menu...');

        await page.screenshot({ path: 'after_login.png' });

        // Find attendance menu
        const menuItems = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('a, li, span, div'));
            return items
                .filter(el => (el.textContent || '').toLowerCase().includes('attendance'))
                .map(el => ({
                    tag: el.tagName,
                    text: el.textContent?.trim().substring(0, 50),
                    href: el.href || null
                }));
        });

        console.log('Attendance menu items found:', menuItems);
    } else {
        console.log('\n=== LOGIN FAILED ===');
        await page.screenshot({ path: 'login_failed.png' });
    }

    console.log('\nPress Enter to close browser...');
    await new Promise(resolve => process.stdin.once('data', resolve));
    await browser.close();
}

debugLogin().catch(console.error);
