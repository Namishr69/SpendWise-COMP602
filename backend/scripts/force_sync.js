import { db } from '../src/config/firebase.js';
import { detectRecurring } from '../src/services/subscriptionDetection.js';
import subscriptionDetectionService from '../src/services/subscriptionDetectionService.js';

async function run() {
    const users = await db.collection('users').get();
    const userId = users.docs[0].id;
    console.log('User ID:', userId);

    const txnsSnap = await db.collection('users').doc(userId).collection('transactions').get();
    const transactions = txnsSnap.docs.map(d => d.data());

    console.log(`Loaded ${transactions.length} transactions`);
    
    // Call detectAndPersist manually
    const result = await subscriptionDetectionService.detectAndPersist(userId, transactions);
    console.log('Detection result:', result);

    process.exit(0);
}

run();
