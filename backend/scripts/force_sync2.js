import { db } from '../src/config/firebase.js';

async function run() {
    const users = await db.collection('users').get();
    for (const u of users.docs) {
        const txnsSnap = await db.collection('users').doc(u.id).collection('transactions').get();
        if (txnsSnap.docs.length > 0) {
            console.log(`User ID: ${u.id} has ${txnsSnap.docs.length} transactions`);
        }
    }
    process.exit(0);
}

run();
