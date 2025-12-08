const puppeteer = require('puppeteer');

const LOGIN_URL = 'https://sp.srmist.edu.in/srmiststudentportal/students/loginManager/youLogin.jsp';

// CHANGE THESE TO YOUR ACTUAL CREDENTIALS
const USERNAME = 'YOUR_USERNAME';
const PASSWORD = 'YOUR_PASSWORD';
const CAPTCHA = 'MANUAL_CAPTCHA'; // You'll need to solve this manually

async function debugFSH() {
    const browser = await puppeteer.launch({
        headless: false, // Show browser
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1280, height: 900 }
    });

    try {
        const page = await browser.newPage();

        console.log('1. Navigating to login page...');
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for user to manually solve CAPTCHA and login
        console.log('\n=== MANUAL STEPS REQUIRED ===');
        console.log('1. Enter your username and password');
        console.log('2. Solve the CAPTCHA');
        console.log('3. Click Login');
        console.log('4. Once logged in, press Enter in this terminal...');
        console.log('==============================\n');

        // Wait for user input
        await new Promise(resolve => {
            process.stdin.once('data', resolve);
        });

        console.log('2. Analyzing page after login...');

        // Take screenshot of current state
        await page.screenshot({ path: 'debug_after_login.png', fullPage: true });
        console.log('   Screenshot saved: debug_after_login.png');

        // Analyze sidebar/menu structure
        const menuAnalysis = await page.evaluate(() => {
            const results = [];

            // Find all potential menu items
            const menuSelectors = [
                'nav a', 'nav li', '.sidebar a', '.sidebar li',
                '.menu a', '.menu li', '[class*="menu"] a', '[class*="nav"] a',
                'ul li a', 'a[href]'
            ];

            for (const selector of menuSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const el of elements) {
                    const text = (el.textContent || '').trim();
                    if (text.toLowerCase().includes('attendance')) {
                        results.push({
                            selector,
                            text,
                            tagName: el.tagName,
                            href: el.getAttribute('href') || 'none',
                            onclick: el.getAttribute('onclick') || 'none',
                            className: el.className || 'none',
                            id: el.id || 'none',
                            parentTag: el.parentElement?.tagName || 'none',
                            parentClass: el.parentElement?.className || 'none'
                        });
                    }
                }
            }

            return results;
        });

        console.log('\n=== MENU ELEMENTS CONTAINING "ATTENDANCE" ===');
        if (menuAnalysis.length === 0) {
            console.log('No elements found! Checking all visible text...');

            const allText = await page.evaluate(() => {
                return document.body.innerText.substring(0, 2000);
            });
            console.log('Page text preview:', allText);
        } else {
            menuAnalysis.forEach((item, i) => {
                console.log(`\n[${i + 1}]`);
                console.log(`  Text: "${item.text}"`);
                console.log(`  Tag: ${item.tagName}`);
                console.log(`  href: ${item.href}`);
                console.log(`  onclick: ${item.onclick}`);
                console.log(`  class: ${item.className}`);
                console.log(`  id: ${item.id}`);
                console.log(`  parent: ${item.parentTag}.${item.parentClass}`);
            });
        }

        // Try to find and click Attendance Details
        console.log('\n3. Attempting to click Attendance Details...');

        const clickResult = await page.evaluate(() => {
            // Look for the specific menu item
            const allLinks = document.querySelectorAll('a, li, span, div');
            for (const link of allLinks) {
                const text = (link.textContent || '').trim();
                if (text.toLowerCase() === 'attendance details' ||
                    text.toLowerCase() === 'attendance') {
                    console.log('Found:', link.tagName, link.outerHTML.substring(0, 200));
                    link.click();
                    return { success: true, element: link.outerHTML.substring(0, 200) };
                }
            }
            return { success: false };
        });

        console.log('Click result:', clickResult);

        // Wait and take screenshot
        await new Promise(r => setTimeout(r, 3000));
        await page.screenshot({ path: 'debug_after_click.png', fullPage: true });
        console.log('   Screenshot saved: debug_after_click.png');

        // Check current URL
        console.log('   Current URL:', page.url());

        // Look for attendance table
        const tableInfo = await page.evaluate(() => {
            const tables = document.querySelectorAll('table');
            return {
                count: tables.length,
                previews: Array.from(tables).map(t => t.textContent?.substring(0, 200) || '')
            };
        });

        console.log(`\n=== TABLES FOUND: ${tableInfo.count} ===`);
        tableInfo.previews.forEach((preview, i) => {
            console.log(`Table ${i}: ${preview}...`);
        });

        console.log('\n4. Press Enter to close browser...');
        await new Promise(resolve => {
            process.stdin.once('data', resolve);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

debugFSH();
