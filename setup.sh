#!/usr/bin/env bash
set -e
echo "TAPA Cloudflare Free setup"
echo "1) Installing Wrangler..."
npm install
echo "2) Logging in to Cloudflare..."
npx wrangler login
echo "3) Creating D1 database..."
npx wrangler d1 create tapa-membership-db
echo
echo "Copy the database_id shown above into wrangler.toml."
echo "Then run:"
echo "  npx wrangler r2 bucket create tapa-member-files"
echo "  npx wrangler secret put ADMIN_PASSWORD"
echo "  npx wrangler secret put SESSION_SECRET"
echo "  npm run db:remote"
echo "  npm run deploy"
