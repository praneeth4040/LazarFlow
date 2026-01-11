const axios = require('axios');
// This script would normally need an OAuth2 token for FCM V1, 
// but we can test the Legacy endpoint if you enable it in the console.

const FCM_TOKEN = 'eq8yeR18RfWlx-F4kH3JYw:APA91bG0TZonF_VNQRGfNOyARICgjJt1IHuq7JKHAiZ34_GEQtomQhWRhBdhf2DTW1FkCQDPaCxhJltqjVw9OJx81IgJ76yiG5vMO3SFpfQJtxkc9_uCfec';

console.log('📡 Attempting to check the Expo Receipt status...');

// Since we have the Expo ID from your last run, let's check what happened to it
const EXPO_RECEIPT_ID = '019badcb-8a37-7655-9368-ef4bcc45e04a';

async function checkStatus() {
  try {
    const response = await axios.post('https://exp.host/--/api/v2/push/getReceipts', {
      ids: [EXPO_RECEIPT_ID],
    });
    console.log('📊 Expo Receipt Status:', JSON.stringify(response.data, null, 2));
    
    if (response.data.data[EXPO_RECEIPT_ID]?.status === 'error') {
      console.error('❌ ERROR MESSAGE:', response.data.data[EXPO_RECEIPT_ID].message);
      console.log('\n💡 This error usually confirms that the Firebase Legacy API must be enabled.');
    }
  } catch (error) {
    console.error('Error checking receipt:', error.message);
  }
}

checkStatus();
