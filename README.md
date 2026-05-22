# Voice Agent Backend (Vapi Call Ended Webhook)

## What this does
- Exposes `POST /vapi/call-ended` to receive Vapi call-ended webhook payloads
- Normalizes key call fields and stores them in Neon/Postgres
- Preserves full raw webhook payload in `raw_payload` JSONB for debugging and future extraction

## API Endpoint
- `POST /vapi/call-ended`
- `GET /vapi/calls?limit=50&cursor=...`

Example payload (minimum):

```json
{
  "callId": "call_123",
  "customer": { "number": "+15555555555", "name": "John" },
  "analysis": {
    "summary": "Customer needs HVAC repair tomorrow morning in Denver.",
    "transcript": "Caller: My AC stopped working...",
    "structuredData": {
      "serviceNeeded": "HVAC repair",
      "addressOrCity": "Denver",
      "preferredTime": "Tomorrow morning",
      "isEmergency": false
    }
  }
}
```

Example response:

```json
{
  "success": true,
  "callId": "call_123",
  "isEmergency": false
}
```

## Dashboard call list endpoint
Use `GET /vapi/calls` for the dashboard. The backend proxies Vapi's call list API and keeps pagination state.

Query params:
- `limit` - number of records to fetch, between 1 and 100, defaults to 50
- `cursor` - pagination cursor from the previous response

Response shape:

```json
{
  "success": true,
  "items": [],
  "pagination": {
    "limit": 50,
    "cursor": null,
    "nextCursor": null,
    "hasMore": false,
    "total": null
  },
  "raw": {}
}
```

## Database schema
Run SQL file:

- `sql/schema.sql`

It creates a `call_logs` table with:
- Required call metadata (`call_id`, `caller_phone`, `intent`, `is_emergency`)
- Business fields (`service_needed`, `customer_name`, `address_or_city`, `preferred_time`)
- AI outputs (`summary`, `transcript`)
- Full webhook JSON (`raw_payload`)
- Timestamps + indexes

## Setup
1. Copy env file:
   - `cp .env.example .env`
2. Put your Neon connection string in `DATABASE_URL`
3. Set `VAPI_API_KEY` from your Vapi account
4. Run schema in Neon SQL editor: contents of `sql/schema.sql`
5. Install deps and run server:
   - `npm install`
   - `npm run dev`

## Project structure (MVC-style)
- `src/index.ts` - app entrypoint
- `src/routes/vapiRoutes.ts` - route definitions
- `src/controllers/callController.ts` - request handlers
- `src/services/callService.ts` - normalization and persistence orchestration
- `src/db.ts` - Postgres access layer

## Health check
- `GET /health`

## Vapi webhook config
Point your Vapi call-ended server webhook URL to:
- `https://<your-domain>/vapi/call-ended`

For local testing, use ngrok and use the https forwarding URL.
