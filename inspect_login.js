const axios = require('axios');
const cheerio = require('cheerio');

async function run() {
    try {
        const res = await axios.get('https://sp.srmist.edu.in/srmiststudentportal/students/loginManager/youLogin.jsp');
        const $ = cheerio.load(res.data);
        console.log('Inputs:');
        $('input').each((i, el) => {
            console.log('ID:', $(el).attr('id'), 'Name:', $(el).attr('name'), 'Type:', $(el).attr('type'));
        });
        console.log('Buttons:');
        $('button').each((i, el) => {
            console.log('ID:', $(el).attr('id'), 'Text:', $(el).text());
        });
    } catch (e) {
        console.error(e);
    }
}
run();
