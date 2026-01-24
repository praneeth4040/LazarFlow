const { Expo } = require('expo-server-sdk');

/**
 * VERIFY NOTIFICATIONS SCRIPT
 * 
 * This script does two things:
 * 1. Sends a test notification to a specific Expo Push Token.
 * 2. Waits and checks the delivery receipt to confirm if it reached Expo's servers successfully.
 */

// --- CONFIGURATION ---
// Replace this with your actual device's push token
const PUSH_TOKEN = 'ExponentPushToken[eN83QNE2QCDcEkkSg_pABQ]';

// Initialize the Expo SDK client
let expo = new Expo();

async function runVerification() {
    console.log('🚀 Starting Notification Verification...');

    // 1. Validate the token
    if (!Expo.isExpoPushToken(PUSH_TOKEN)) {
        console.error(`❌ Error: ${PUSH_TOKEN} is not a valid Expo push token.`);
        return;
    }

    console.log(`📍 Testing for token: ${PUSH_TOKEN}`);

    // 2. Prepare the message
    let messages = [{
        to: PUSH_TOKEN,
        sound: 'default',
        title: 'LazarFlow Test',
        body: 'This is a verification message to check notification delivery! ✅',
        data: {
            type: 'test_verification',
            timestamp: new Date().toISOString()
        },
        priority: 'high',
        channelId: 'default',
    }];

    // 3. Send the notification
    let ticketIds = [];
    try {
        console.log('📤 Sending notification to Expo...');
        let ticketChunks = await expo.sendPushNotificationsAsync(messages);
        console.log('✅ Sent! Ticket Response:', JSON.stringify(ticketChunks, null, 2));

        // Extract ticket IDs for checking receipts later
        for (let ticket of ticketChunks) {
            if (ticket.id) {
                ticketIds.push(ticket.id);
            }
        }
    } catch (error) {
        console.error('❌ Failed to send notification:', error);
        return;
    }

    if (ticketIds.length === 0) {
        console.error('❌ No ticket IDs received. Cannot check receipt status.');
        return;
    }

    // 4. Wait for Expo to process the delivery and check receipts
    console.log('\n⏳ Waiting 5 seconds for Expo to process the delivery receipt...');

    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
        console.log('🔍 Checking delivery receipts...');
        let receiptIdChunks = expo.chunkPushNotificationReceiptIds(ticketIds);

        for (let chunk of receiptIdChunks) {
            let receipts = await expo.getPushNotificationReceiptsAsync(chunk);
            console.log('📊 Receipt Results:', JSON.stringify(receipts, null, 2));

            for (let receiptId in receipts) {
                let { status, message, details } = receipts[receiptId];
                if (status === 'ok') {
                    console.log(`✅ Success for receipt ${receiptId}: Notification delivered to provider.`);
                } else if (status === 'error') {
                    console.error(`❌ Error for receipt ${receiptId}: ${message}`);
                    if (details) {
                        console.error('   Details:', JSON.stringify(details));
                    }
                    console.log('\n💡 Tip: If you see "DeviceNotRegistered", the token might be old or the app was uninstalled.');
                    console.log('💡 Tip: If you see FCM errors, check your google-services.json and Firebase configuration.');
                }
            }
        }
    } catch (error) {
        console.error('❌ Error fetching receipts:', error);
    }

    console.log('\n🏁 Verification process complete.');
}

runVerification();
