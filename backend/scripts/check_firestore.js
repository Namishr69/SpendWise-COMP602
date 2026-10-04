import { db } from '../src/config/firebase.js';

async function run() {
    const users = await db.collection('users').get();
    for (const u of users.docs) {
        const txns = await db.collection('users').doc(u.id).collection('transactions').get();
        const subs = await db.collection('users').doc(u.id).collection('subscriptions').get();
        
        const hasDisney = txns.docs.some(d => d.data().merchant === 'Disney+');
        const hasNeon = txns.docs.some(d => d.data().merchant === 'Neon NZ');
        
        if (hasDisney || hasNeon) {
            console.log(`User ${u.id} has ${txns.docs.length} txns, ${subs.docs.length} subs. Disney: ${hasDisney}, Neon: ${hasNeon}`);
            console.log(`Subscriptions for user ${u.id}:`);
            subs.docs.forEach(s => {
                const data = s.data();
                console.log(` - ${data.name} ($${data.amount})`);
            });
            
            // Re-run detect and persist manually for this user to see logs
            const txnsData = txns.docs.map(d => d.data());
            const { detectRecurring } = await import('../src/services/subscriptionDetection.js');
            const candidates = detectRecurring(txnsData);
            console.log(`\nFound ${candidates.length} candidates using detectRecurring:`);
            candidates.forEach(c => console.log(` - ${c.name} (${c.billingCycle})`));
        }
    }
    process.exit(0);
}
run().catch(console.error);
