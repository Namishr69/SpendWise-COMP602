import { db } from '../src/config/firebase.js';

async function run() {
    const users = await db.collection('users').get();
    for (const u of users.docs) {
        const subsSnap = await db.collection('users').doc(u.id).collection('subscriptions').get();
        const accsSnap = await db.collection('users').doc(u.id).collection('bankAccounts').get();
        const userDoc = u.data();
        console.log(`User ${u.id}: email=${userDoc.email || 'unknown'}, subs=${subsSnap.docs.length}, bankAccounts=${accsSnap.docs.length}`);
    }
    process.exit(0);
}
run().catch(console.error);
