import { db } from '../src/config/firebase.js';

async function run() {
    const userId = 'ZmdrNm8gBIQhJlma4vNnEhsQpUl2';
    const subsSnap = await db.collection('users').doc(userId).collection('subscriptions').get();
    console.log(`User has ${subsSnap.docs.length} subscriptions:`);
    subsSnap.docs.forEach(d => {
        const data = d.data();
        console.log(` - ${data.name} ($${data.amount}) source=${data.source} key=${data.detectionKey}`);
    });
    process.exit(0);
}
run().catch(console.error);
