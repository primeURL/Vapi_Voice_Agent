# Twilio + Vapi Setup Guide
### Complete Step-by-Step for ABC Home Services Voice AI Agent

---

## Overview

This guide walks you through everything from creating a Twilio account to making
your first real inbound call to the AI agent.

```
Caller dials Twilio number
        ↓
Twilio forwards call to Vapi (via webhook)
        ↓
Vapi runs your AI assistant
        ↓
Call ends → Vapi sends data to your backend webhook
        ↓
Backend saves transcript + call record to PostgreSQL
```

---

## PART 1 — Create a Twilio Account

### Step 1: Sign Up
1. Go to [twilio.com](https://www.twilio.com) → click **Sign Up**
2. Enter your name, email, and password
3. Verify your email address
4. Enter your mobile number for verification (any number works — Indian number is fine)
5. Twilio gives you **$15 free trial credit** automatically

### Step 2: Complete the Onboarding
1. Answer the onboarding questions:
   - "What do you want to build?" → **Voice**
   - "How do you want to build it?" → **With code**
   - "What language?" → **Node.js**
2. Skip or complete — doesn't matter, just gets to the dashboard

### Step 3: Note Your Credentials
On the Twilio Console dashboard, find and save:
```
Account SID  → ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Auth Token   → your_auth_token_here
```
You will need both for Vapi integration.

---

## PART 2 — Buy a Twilio Phone Number

### Step 4: Buy a US Number
1. Twilio Console → **Phone Numbers** → **Manage** → **Buy a Number**
2. Set filters:
   - **Country** → United States (+1)
   - **Capabilities** → check **Voice** ✅
3. Click **Search**
4. Pick any available number → click **Buy**
5. Confirm purchase

> ⚠️ **Important:** Buy a US number, NOT an Indian number.
> Indian numbers on Twilio require business KYC verification and don't support
> voice on trial accounts. US numbers work immediately.

You now have a number like `+1 541 834 9925`. Note it down.

---

## PART 3 — Create a Vapi Account & Assistant

### Step 5: Sign Up on Vapi
1. Go to [vapi.ai](https://vapi.ai) → click **Sign Up**
2. Verify your email
3. Go to **Settings** → **API Keys** → copy your **Vapi API Key**

### Step 6: Create the AI Assistant
1. Vapi Dashboard → **Assistants** → **Create Assistant**
2. Choose **Blank**
3. Set **Name**: `ABC Home Services`
4. Set **Model**: Claude Haiku or GPT-4o Mini (cheaper, fast)
5. Set **First Message**:
   ```
   Hi! Thanks for calling ABC Home Services — how can I help today?
   ```
6. Set **System Prompt** (paste this):

```
You are a virtual receptionist for ABC Home Services. You answer inbound
phone calls professionally and concisely — keep all responses short and
natural for a phone call (1–3 sentences max).
.
.
.
.
.
```

7. Click **Save** → note the **Assistant ID**

---

## PART 4 — Connect Twilio Number to Vapi

### Step 7: Import Twilio Number into Vapi
1. Vapi Dashboard → **Phone Numbers** → **Add Phone Number**
2. Select **Import from Twilio**
3. Enter:
   - **Account SID** → from Step 3
   - **Auth Token** → from Step 3
   - **Phone Number** → your Twilio number e.g. `+15418349925`
4. Click **Import**

> ✅ Vapi automatically sets the Twilio webhook behind the scenes.
> You don't need to manually configure anything in Twilio console.

### Step 8: Assign Assistant to the Number
1. In Vapi → **Phone Numbers** → click your imported number
2. Under **Inbound Call Handler** → select `ABC Home Services`
3. Click **Save**

### Step 9: Verify Twilio Webhook (Optional — just to confirm)
1. Twilio Console → **Phone Numbers** → **Active Numbers** → click your number
2. Scroll to **Voice Configuration**
3. You should see:
   ```
   A call comes in → Webhook
   URL → https://api.vapi.ai/twilio/inbound_call
   HTTP → POST
   
   Call status changes → https://api.vapi.ai/twilio/status
   ```
   If these are set, Twilio and Vapi are correctly connected ✅

---

## PART 5 — Set Up Backend Webhook

### Step 10: Start Your Node.js Backend
```bash
git clone https://github.com/primeURL/Vapi_Voice_Agent.git
cd Vapi_Voice_Agent
npm install
cp .env.example .env
npm run dev
```

### Step 11: Expose with ngrok
```bash
# In a new terminal
ngrok http 3000
# Copy the HTTPS URL e.g. https://abc123.ngrok.io
```

### Step 12: Set Webhook in Vapi
1. Vapi Dashboard → **Assistants** → click `ABC Home Services`
2. Scroll to **Advanced** → **Server URL**
3. Paste: `https://abc123.ngrok.io/vapi/call-ended`
4. Save

> This tells Vapi to send call results (transcript, summary, recording) to
> your backend after every call ends.

### How the EJS dashboard works
1. When you open `/` or `/dashboard`, Express routes the request to the dashboard controller.
2. The controller reads call logs and stats from PostgreSQL.
3. It renders `views/dashboard.ejs` on the server with `res.render(...)`.
4. EJS replaces tags like `<%= stats.totalCalls %>` and loops through `logs` to build the HTML page.
5. So the dashboard is server-rendered first, and the browser receives ready-made HTML.

### How the webhook works here
1. Vapi finishes a call and sends the final call payload to `POST /vapi/call-ended`.
2. The backend checks that the payload is the final end-of-call report.
3. It normalizes fields like transcript, summary, intent, caller number, and duration.
4. The normalized call data is saved into PostgreSQL.
5. When you refresh the EJS dashboard, it reads the latest saved rows and shows them.

---

## PART 6 — Testing

### Trial Account Limitation ⚠️
Twilio trial accounts can **only receive calls from verified phone numbers**.
Any unverified number calling your Twilio number will get an error message.

You have two options:

---

### Option A: Verify Numbers (for real inbound calls)

To allow a specific number to call your Twilio number:

1. Twilio Console → **Phone Numbers** → **Manage** → **Verified Caller IDs**
2. Click **Add a new Caller ID**
3. Enter the number that will call (e.g. your friend's US number, or your Indian number)
4. Twilio will call/SMS that number with a code
5. Enter the code → verified ✅
6. That number can now call your Twilio number

> You need to verify every number that will call you during testing.
> On a paid account this restriction is completely removed.

---

### Option B: Use Vapi Outbound API (Recommended for testing from India)

Instead of calling the Twilio number, make Vapi call YOU:

```bash
curl -X POST https://api.vapi.ai/call/phone \
  -H "Authorization: Bearer YOUR_VAPI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "assistantId": "YOUR_ASSISTANT_ID",
    "phoneNumberId": "YOUR_VAPI_PHONE_NUMBER_ID",
    "customer": {
      "number": "+91XXXXXXXXXX"
    }
  }'
```

Your phone rings → you pick up → speak with the AI agent → call ends →
webhook fires → data saved to DB.

> This tests the complete end-to-end flow including webhook capture.
> This is how all 5 test scenarios were validated in this assessment.

---

### Run All 5 Test Scenarios

```bash
ts-node trigger-test-calls.ts
```

| # | Scenario | What to Say | Expected Intent |
|---|---|---|---|
| 1 | Booking | "My AC is not working, can someone come tomorrow?" | `booking_request` |
| 2 | Emergency | "My pipe burst and water is everywhere" | `emergency` |
| 3 | Pricing Known | "How much is a plumbing diagnostic?" | `pricing_question` |
| 4 | Pricing Unknown | "How much is water heater repair?" | `pricing_question` |
| 5 | Service Area | "Do you service Lakewood?" | `service_area_question` |

---

## PART 7 — Upgrade to Paid (Production)

To allow **any number in the world** to call your Twilio number:

1. Twilio Console → top right → **Upgrade Account**
2. Add a credit card
3. Minimum top-up: **$20**
4. After upgrade:
   - No more verified caller ID restriction
   - Any number can call `+15418349925` directly
   - US calls cost ~$0.0085/min to receive

---


## Quick Reference

```
Twilio Console      → https://console.twilio.com
Vapi Dashboard      → https://dashboard.vapi.ai
Your Twilio No.     → +1 541 834 9925
Vapi Webhook URL    → https://api.vapi.ai/twilio/inbound_call
Frontend Dashboard  → GET  /
Dashboard Page      → GET  /dashboard
Calls API           → GET  /api/calls
Webhook Endpoint    → POST /vapi/call-ended
Health Check        → GET  /health
```