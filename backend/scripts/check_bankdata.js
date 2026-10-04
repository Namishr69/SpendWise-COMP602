import { db } from '../src/config/firebase.js';

async function run() {
    const users = await db.collection('users').get();
    for (const u of users.docs) {
        const userId = u.id;
        const accountsSnap = await db.collection('users').doc(userId).collection('bankAccounts').get();
        if (accountsSnap.empty) continue;
        
        console.log(`\nUser: ${userId}`);
        for (const acc of accountsSnap.docs) {
            const txnsSnap = await acc.ref.collection('transactions').get();
            console.log(`  Account ${acc.id}: ${txnsSnap.docs.length} transactions`);
            
            if (txnsSnap.docs.length > 0) {
                const merchants = [...new Set(txnsSnap.docs.map(d => d.data().merchant))];
                console.log(`  Merchants: ${merchants.join(', ')}`);
                console.log(`  Sample txn:`, JSON.stringify(txnsSnap.docs[0].data(), null, 2));
            }
        }
    }
    process.exit(0);
}
run().catch(console.error);
