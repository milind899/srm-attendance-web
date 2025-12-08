const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const axios = require('axios');

try {
    console.log('Testing imports...');
    const jar = new CookieJar();
    const client = wrapper(axios.create({ jar }));
    console.log('Dependencies loaded successfully.');
} catch (e) {
    console.error('Dependency Error:', e);
}
