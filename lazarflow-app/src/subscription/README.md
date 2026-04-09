# Subscription Module (`src/subscription/`)

This directory is an encapsulated slice managing premium billing, credit acquisitions, and tier unlocks.

## Contents
- `pages/SubscriptionPlansPage.tsx`: An engaging marketplace rendering the active subscription tiers or raw API credit packages available for purchase. Bootstraps the native `react-native-razorpay` bridge.
- `pages/PaymentStatusPage.tsx`: Handles dynamic routing from checkout callbacks. Fires animations reflecting either successful upgrades or failed transitions seamlessly.
