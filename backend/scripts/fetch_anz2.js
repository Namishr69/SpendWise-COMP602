import { db } from '../src/config/firebase.js';
import anzAccountService from '../src/services/anzAccountService.js';

async function run() {
    const users = await db.collection('users').get();
    for (const u of users.docs) {
        const userId = u.id;
        const accountsSnap = await db.collection('users').doc(userId).collection('bankAccounts').get();
        if (accountsSnap.empty) continue;

        console.log('User ID:', userId);
        for (const acc of accountsSnap.docs) {
            const accountId = acc.data().accountId;
            console.log('Account ID:', accountId);
            
            try {
                const txns = await anzAccountService.fetchTransactions(userId, accountId);
                console.log(`Fetched ${txns.length} raw transactions`);
                
                const neon = txns.filter(t => t.merchant === 'Neon NZ' || (t.description && t.description.includes('Neon')));
                if (neon.length) console.log('Neon NZ:', JSON.stringify(neon.slice(0, 2), null, 2));

                const disney = txns.filter(t => t.merchant === 'Disney+' || (t.description && t.description.includes('Disney')));
                if (disney.length) console.log('Disney+:', JSON.stringify(disney.slice(0, 2), null, 2));
            } catch(e) {
                console.error(e.message);
            }
        }
    }
    process.exit(0);
}

run();
