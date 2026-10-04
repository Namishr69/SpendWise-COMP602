import { db } from '../src/config/firebase.js';

async function run() {
    const users = await db.collection('users').get();
    if (users.empty) {
        console.log('No users found');
        process.exit(0);
    }
    const userId = users.docs[0].id;
    console.log('User ID:', userId);

    const txns = await db.collection('users').doc(userId).collection('transactions').get();
    const records = txns.docs.map(d => d.data());
    console.log(`Found ${records.length} transactions`);

    const disney = records.filter(t => t.merchant === 'Disney+');
    console.log('Disney+:', disney.slice(0, 20).map(t => `${t.bookedAt} ${t.amount} ${t.direction}`));

    const neon = records.filter(t => t.merchant === 'Neon NZ');
    console.log('Neon NZ:', neon.slice(0, 20).map(t => `${t.bookedAt} ${t.amount} ${t.direction}`));

    process.exit(0);
}

run();
