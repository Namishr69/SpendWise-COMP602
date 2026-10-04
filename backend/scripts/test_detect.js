import { db } from '../src/config/firebase.js';
import { detectRecurring } from '../src/services/subscriptionDetection.js';

async function run() {
    const users = await db.collection('users').get();
    const userId = users.docs[0].id;

    const txnsSnap = await db.collection('users').doc(userId).collection('transactions').get();
    const transactions = txnsSnap.docs.map(d => d.data());

    console.log(`Loaded ${transactions.length} transactions`);
    
    // Check if Neon NZ or Disney+ are in candidates
    const candidates = detectRecurring(transactions);
    console.log(`Detected ${candidates.length} candidates`);

    const neon = candidates.filter(c => c.name.includes('Neon'));
    console.log('Neon NZ candidates:', JSON.stringify(neon, null, 2));

    const disney = candidates.filter(c => c.name.includes('Disney'));
    console.log('Disney+ candidates:', JSON.stringify(disney, null, 2));

    process.exit(0);
}

run();
