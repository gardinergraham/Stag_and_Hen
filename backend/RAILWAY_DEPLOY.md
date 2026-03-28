# Stag & Hen Backend - Railway Deployment

## Quick Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template)

## Environment Variables Required

Set these in Railway dashboard:

```env
MONGO_URL=mongodb+srv://your-atlas-url
DB_NAME=stagandhen
CORS_ORIGINS=https://your-expo-app.com,https://your-landing-page.vercel.app
```

## Setup Instructions

1. **Fork/Clone this repo**

2. **Create Railway Project**
   - Go to [Railway.app](https://railway.app)
   - Create new project
   - Connect your GitHub repo
   - Select the `/backend` folder

3. **Add MongoDB**
   - In Railway, add MongoDB plugin OR
   - Use MongoDB Atlas and add `MONGO_URL` env var

4. **Configure Environment**
   - Add `DB_NAME=stagandhen`
   - Add `CORS_ORIGINS` with your app domains

5. **Deploy**
   - Railway auto-deploys on push to main
   - Your API will be at: `https://your-app.railway.app/api/`

## API Endpoints

### Events
- `POST /api/events/` - Create event
- `GET /api/events/` - List events
- `GET /api/events/{id}` - Get event
- `PUT /api/events/{id}?owner_pin=XXXX` - Update event
- `DELETE /api/events/{id}?owner_pin=XXXX` - Delete event
- `GET /api/events/{id}/qr-code?owner_pin=XXXX` - Get QR code

### Auth
- `POST /api/auth/access-qr` - Join via QR
- `POST /api/auth/access-manual` - Join manually
- `POST /api/auth/owner-login` - Owner login

### Media
- `POST /api/media/` - Upload media
- `GET /api/media/event/{event_id}` - Get event media
- `DELETE /api/media/{id}?member_name=XXX` - Delete media

### Shop
- `GET /api/shop/items` - Get all items
- `GET /api/shop/categories` - Get categories
- `POST /api/shop/track-click/{id}` - Track affiliate click

### Kitty
- `POST /api/kitty/contribute` - Add to kitty (MOCKED)
- `POST /api/kitty/withdraw` - Withdraw (MOCKED)
- `GET /api/kitty/balance/{event_id}` - Get balance
- `GET /api/kitty/transactions/{event_id}` - Get transactions
