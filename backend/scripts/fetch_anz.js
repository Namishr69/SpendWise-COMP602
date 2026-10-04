import { db } from '../src/config/firebase.js';
import anzAccountService from '../src/services/anzAccountService.js';

async function run() {
    const users = await db.collection('users').get();
    const userId = users.docs[0].id;
    console.log('User ID:', userId);

    const accountsSnap = await db.collection('users').doc(userId).collection('bankAccounts').get();
    if (accountsSnap.empty) {
        console.log('No accounts linked');
        process.exit(0);
    }
    
    const accountId = accountsSnap.docs[0].data().accountId;
    console.log('Account ID:', accountId);

    const txns = await anzAccountService.fetchTransactions(userId, accountId);
    console.log(`Fetched ${txns.length} raw transactions`);
    
    const neon = txns.filter(t => t.merchant === 'Neon NZ' || (t.description && t.description.includes('Neon')));
    console.log('Neon NZ:', JSON.stringify(neon.slice(0, 2), null, 2));

    const disney = txns.filter(t => t.merchant === 'Disney+' || (t.description && t.description.includes('Disney')));
    console.log('Disney+:', JSON.stringify(disney.slice(0, 2), null, 2));

    process.exit(0);
}

run();
