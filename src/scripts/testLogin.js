const diyanetService = require('../services/diyanetService');

console.log('Script başladı');

async function testLogin() {
    try {
        const token = await diyanetService.login();
        console.log('Token başarıyla alındı:', token);
    } catch (error) {
        console.error('Giriş sırasında hata:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else if (error.request) {
            console.error('Request:', error.request);
        } else {
            console.error('Error:', error);
        }
    }
    console.log('Script bitti');
}

testLogin(); 