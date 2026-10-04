import { db } from '../src/config/firebase.js';

async function run() {
    const users = await db.collection('users').get();
    for (const u of users.docs) {
        const txnsSnap = await db.collection('users').doc(u.id).collection('transactions').get();
        if (txnsSnap.empty) continue;
        const txns = txnsSnap.docs.map(d => d.data());
        console.log(`User ID: ${u.id} has ${txns.length} txns`);
        
        const hasNeon = txns.some(t => t.merchant === 'Neon NZ');
        if (hasNeon) {
            console.log('User has Neon NZ!');
            const { detectRecurring } = await import('../src/services/subscriptionDetection.js');
            const candidates = detectRecurring(txns);
            console.log(`Detected ${candidates.length} candidates:`);
            console.log(candidates.map(c => c.name));
            
            const neonCandidate = candidates.find(c => c.name === 'Neon NZ');
            console.log('Neon candidate:', neonCandidate);
        }
    }
    process.exit(0);
}
run();
