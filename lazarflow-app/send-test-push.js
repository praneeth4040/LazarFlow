const { Expo } = require('expo-server-sdk');

// 1. PASTE YOUR TOKEN HERE
const PUSH_TOKEN = 'ExponentPushToken[PXJHlQO_0gZF5kkYxn4CTr]';

// Create a new Expo SDK client
let expo = new Expo();

// Create the messages that you want to send to clients
let messages = [];
if (!Expo.isExpoPushToken(PUSH_TOKEN)) {
  console.error(`❌ Push token ${PUSH_TOKEN} is not a valid Expo push token`);
  process.exit(1);
}

messages.push({
  to: PUSH_TOKEN,
  sound: 'default',
  title: 'LazarFlow ',
  body: 'welcome to Lazarflow !',
  data: { test: true },
  channelId: 'default',
  priority: 'high',
  _displayInForeground: true, // Force show even if app is open
});

(async () => {
  console.log('📤 Sending notification...');
  try {
    let ticketChunk = await expo.sendPushNotificationsAsync(messages);
    console.log('✅ Success! Ticket:', ticketChunk);
    console.log('\nCheck your phone now.');
  } catch (error) {
    console.error('❌ Error sending notification:', error);
  }
})();
