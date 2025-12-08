const puppeteer = require('puppeteer');

const LOGIN_URL = 'https://sp.srmist.edu.in/srmiststudentportal/students/loginManager/youLogin.jsp';

async function findRealButton() {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--start-maximized'],
        defaultViewport: null
    });

    const page = await browser.newPage();

    console.log('Opening FSH Portal...');
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    console.log('\n===========================================');
    console.log('STEP 1: Fill in username (Mn7130), password, and captcha');
    console.log('STEP 2: Press Enter here BEFORE clicking login');
    console.log('===========================================\n');

    await new Promise(resolve => process.stdin.once('data', resolve));

    console.log('\nSearching for ALL clickable elements near the form...\n');

    // Find all potentially clickable elements
    const allButtons = await page.evaluate(() => {
        const results = [];

        // Get all potential button-like elements
        const selectors = [
            'button', 'input[type="submit"]', 'input[type="button"]',
            'a', '[role="button"]', '[onclick]', '.btn', '.button',
            '[class*="login"]', '[class*="submit"]', '[class*="confirm"]'
        ];

        const elements = document.querySelectorAll(selectors.join(','));

        elements.forEach((el, i) => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);

            // Only include visible elements with actual size
            if (rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden') {
                results.push({
                    index: i,
                    tag: el.tagName,
                    id: el.id || null,
                    class: el.className || null,
                    type: el.type || el.getAttribute('type'),
                    text: (el.textContent || el.value || '').trim().substring(0, 50),
                    rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
                    onclick: el.onclick ? 'yes' : (el.getAttribute('onclick') ? 'attr' : 'no')
                });
            }
        });

        return results;
    });

    console.log('Found', allButtons.length, 'clickable elements:\n');
    allButtons.forEach(btn => {
        console.log(`[${btn.index}] ${btn.tag} | id="${btn.id}" | text="${btn.text}" | size=${btn.rect.w}x${btn.rect.h} | onclick=${btn.onclick}`);
    });

    console.log('\n===========================================');
    console.log('Which element looks like the login button?');
    console.log('Enter the index number to click it (or "skip" to skip):');
    console.log('===========================================\n');

    const input = await new Promise(resolve => {
        process.stdin.once('data', data => resolve(data.toString().trim()));
    });

    if (input !== 'skip' && allButtons[parseInt(input)]) {
        const selected = allButtons[parseInt(input)];
        console.log('\nClicking:', selected.tag, 'with id:', selected.id);

        const selector = selected.id ? `#${selected.id}` : `${selected.tag}[class="${selected.class}"]`;

        try {
            await page.click(selector);
            console.log('Click successful!');
        } catch (e) {
            console.log('Regular click failed, trying evaluate...');
            await page.evaluate((idx) => {
                const elements = document.querySelectorAll('button, input[type="submit"], input[type="button"], a, [role="button"], [onclick], .btn, .button, [class*="login"], [class*="submit"], [class*="confirm"]');
                let count = 0;
                for (const el of elements) {
                    const rect = el.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        if (count === idx) {
                            el.click();
                            break;
                        }
                        count++;
                    }
                }
            }, parseInt(input));
        }

        await new Promise(r => setTimeout(r, 5000));
        console.log('\nCurrent URL:', page.url());

        if (!page.url().includes('youLogin.jsp')) {
            console.log('\n🎉 LOGIN SUCCESS! 🎉');
            await page.screenshot({ path: 'success_login.png' });
            console.log('Screenshot saved: success_login.png');
        } else {
            console.log('\n❌ Still on login page');
            await page.screenshot({ path: 'still_login.png' });
        }
    }

    console.log('\nPress Enter to close browser...');
    await new Promise(resolve => process.stdin.once('data', resolve));
    await browser.close();
}

findRealButton().catch(console.error);
