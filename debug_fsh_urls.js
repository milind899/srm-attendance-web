
const axios = require('axios');

const BASE_HOST = 'https://sp.srmist.edu.in';
const LOGIN_URL = `${BASE_HOST}/srmiststudentportal/students/loginManager/youLogin.jsp`;
const CAPTCHA_URL = `${BASE_HOST}/srmiststudentportal/captchas`;

async function testUrl(url, name) {
    console.log(`Testing ${name}: ${url}`);

    // Test 1: Simple GET
    try {
        await axios.get(url);
        console.log(`  [SUCCESS] Simple GET for ${name}`);
    } catch (e) {
        console.log(`  [FAILED] Simple GET for ${name}: ${e.message}`);
    }

    // Test 2: GET with User-Agent
    try {
        await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        console.log(`  [SUCCESS] User-Agent GET for ${name}`);
    } catch (e) {
        console.log(`  [FAILED] User-Agent GET for ${name}: ${e.message}`);
    }
}

async function runTests() {
    await testUrl(LOGIN_URL, 'Login Page');
    await testUrl(CAPTCHA_URL, 'Captcha URL');
}

runTests();
