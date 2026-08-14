# TAPA Digital Membership & Processor Registry — Cloudflare Free Edition

This version is built specifically for Cloudflare Workers + D1 + R2 + Workers Static Assets.

## What is included
- Public membership registration form
- Original TAPA registration fields plus expanded processor classifications
- Multiple processor groups + primary group
- Support-needs and credential tracking
- Optional document uploads
- Unique application numbers
- Applicant status lookup
- Secure admin sign-in using Cloudflare Worker secrets
- Admin dashboard
- Review / approve / reject / request more information
- Internal notes
- Search and status filtering
- CSV export
- Editable processor groups
- Share button for WhatsApp
- PWA / Add to Home Screen support
- D1 database
- R2 file storage

## Free Cloudflare services used
- Workers Static Assets: site files
- Workers: application/API logic
- D1: member/application database
- R2: document storage

## First-time deployment

You need a free Cloudflare account and Node.js installed.

### 1. Install
    npm install

### 2. Log into Cloudflare
    npx wrangler login

### 3. Create the D1 database
    npx wrangler d1 create tapa-membership-db

Cloudflare will print a `database_id`.
Open `wrangler.toml` and replace:
    REPLACE_WITH_D1_DATABASE_ID

### 4. Create the free R2 bucket
    npx wrangler r2 bucket create tapa-member-files

### 5. Admin email
The administrator email is already set to:
    tapatobago@gmail.com

### 6. Create secure secrets
    npx wrangler secret put ADMIN_PASSWORD
Enter the admin password when asked.

Then:
    npx wrangler secret put SESSION_SECRET
Enter a long random secret phrase when asked.

### 7. Create the database tables
    npm run db:remote

### 8. Deploy
    npm run deploy

Wrangler will return the public HTTPS address, normally similar to:
    https://tapa-membership-portal.<your-subdomain>.workers.dev

Share that address in the TAPA WhatsApp group.

## Updating later
After editing the app:
    npm run deploy

## Important
Do not put the admin password directly in the code or wrangler.toml. Keep it in a Worker secret as described above.
