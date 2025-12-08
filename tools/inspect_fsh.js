const axios = require('axios');
const fs = require('fs');

async function fetchLogin() {
    try {
        const response = await axios.get('https://sp.srmist.edu.in/srmiststudentportal/students/loginManager/youLogin.jsp');
        console.log('Status:', response.status);
        console.log('Headers:', response.headers);
        console.log('Body Preview:', response.data.substring(0, 500));
        fs.writeFileSync('fsh_login_source.html', response.data);
        console.log('Full HTML saved to fsh_login_source.html');
    } catch (e) {
        console.error('Error:', e.message);
    }
}

fetchLogin();
