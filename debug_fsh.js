
const axios = require('axios');
const fs = require('fs');

async function fetchPage() {
    try {
        const response = await axios.get('https://sp.srmist.edu.in/srmiststudentportal/students/loginManager/youLogin.jsp');
        fs.writeFileSync('fsh_login.html', response.data);
        console.log('Page saved to fsh_login.html');
    } catch (e) {
        console.error('Error fetching page:', e.message);
    }
}

fetchPage();
