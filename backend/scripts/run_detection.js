import { db } from '../src/config/firebase.js';
import { detectRecurring } from '../src/services/subscriptionDetection.js';
import subscriptionDetectionService from '../src/services/subscriptionDetectionService.js';

async function run() {
    const userId = 'ZmdrNm8gBIQhJlma4vNnEhsQpUl2'; // user with Disney+/Neon
    
    const accountsSnap = await db.collection('users').doc(userId).collection('bankAccounts').get();
    const allTransactions = [];
    
    for (const acc of accountsSnap.docs) {
        const txnsSnap = await acc.ref.collection('transactions').get();
        const txns = txnsSnap.docs.map(d => ({ transactionId: d.id, ...d.data() }));
        allTransactions.push(...txns);
        console.log(`Account ${acc.id}: ${txns.length} txns`);
    }
    
    console.log(`\nTotal transactions: ${allTransactions.length}`);
    
    const debits = allTransactions.filter(t => t.direction === 'debit');
    console.log(`Debits: ${debits.length}`);
    console.log(`Unique merchants: ${[...new Set(debits.map(t => t.merchant))].join(', ')}`);
    
    const candidates = detectRecurring(allTransactions);
    console.log(`\nDetected ${candidates.length} candidates:`);
    candidates.forEach(c => console.log(` - ${c.name} (${c.billingCycle}) $${c.amount} key=${c.detectionKey}`));
    
    console.log('\n--- Running detectAndPersist ---');
    const result = await subscriptionDetectionService.detectAndPersist(userId, allTransactions);
    console.log('Result:', result);
    
    process.exit(0);
}
run().catch(console.error);
