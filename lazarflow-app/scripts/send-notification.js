
const { Expo } = require('expo-server-sdk');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase Client (Use SERVICE_ROLE_KEY for admin access if RLS blocks reading others' profiles)
// Ideally, run this in a secure environment.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_KEY/SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const expo = new Expo();

const sendPushNotification = async (title, body) => {
    console.log(`\n🚀 Preparing to send notification...`);
    console.log(`Title: ${title}`);
    console.log(`Body: ${body}\n`);

    // 1. Fetch tokens from Supabase
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('expo_push_token')
        .not('expo_push_token', 'is', null);

    if (error) {
        console.error('Error fetching tokens:', error);
        return;
    }

    if (!profiles || profiles.length === 0) {
        console.log('No registered push tokens found.');
        return;
    }

    let messages = [];
    let tokens = new Set(); // Use Set to avoid duplicates

    for (let profile of profiles) {
        if (profile.expo_push_token) {
            tokens.add(profile.expo_push_token);
        }
    }

    console.log(`Found ${tokens.size} unique device(s) to notify.`);

    // 2. Construct messages
    for (let pushToken of tokens) {
        if (!Expo.isExpoPushToken(pushToken)) {
            console.error(`Push token ${pushToken} is not a valid Expo push token`);
            continue;
        }

        messages.push({
            to: pushToken,
            sound: 'default',
            title: title,
            body: body,
            data: { withSome: 'data' },
        });
    }

    // 3. Send chunks
    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];

    for (let chunk of chunks) {
        try {
            let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            console.log('Tickets:', ticketChunk);
            tickets.push(...ticketChunk);
        } catch (error) {
            console.error(error);
        }
    }

    console.log(`\n🎉 Notification logic execution completed.`);
};

// --- Execution ---
const args = process.argv.slice(2);
const title = args[0] || "Test Notification";
const body = args[1] || "This is a test message from LazarFlow Server!";

sendPushNotification(title, body);
