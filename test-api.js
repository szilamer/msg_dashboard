import fetch from 'node-fetch';

const API_URL = 'https://msg-dashboard2-cc72rdqt9-szilamers-projects.vercel.app/api/accounts';

async function testAPI() {
    try {
        // POST kérés - új fiók létrehozása
        console.log('Új fiók létrehozása...');
        const postResponse = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                platform: "test",
                username: "testuser",
                totalMessages: 10,
                unreadMessages: 5,
                oldestUnreadMessage: "Hello"
            })
        });

        console.log('POST státusz:', postResponse.status);
        console.log('POST headers:', postResponse.headers);
        
        // Ellenőrizzük a nyers választ
        const rawText = await postResponse.text();
        console.log('POST nyers válasz:', rawText);
        
        let postData;
        try {
            postData = JSON.parse(rawText);
            console.log('POST válasz (parsed):', postData);
        } catch (e) {
            console.error('Hiba a JSON parse során:', e);
        }

        // Várunk egy kicsit
        console.log('\nVárakozás 2 másodpercet...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // GET kérés - fiókok lekérése
        console.log('\nFiókok lekérése...');
        const getResponse = await fetch(API_URL);
        console.log('GET státusz:', getResponse.status);
        
        const getData = await getResponse.json();
        console.log('GET válasz:', getData);

    } catch (error) {
        console.error('Hiba történt:', error);
        if (error.response) {
            console.error('Válasz státusz:', error.response.status);
            console.error('Válasz headers:', error.response.headers);
        }
    }
}

testAPI(); 