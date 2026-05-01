# Universal Ad Generator — Deploy to Vercel

## What This Is
A Next.js app that generates complete ad campaigns (copy + images + video prompts) for any business using Google Gemini AI. Supports free tier (customer uses own key) and paid/pro tier (your key, protected by access code).

---

## Step 1 — Push to GitHub

1. Create a new repo on GitHub (github.com → New repository)
2. Name it: `ad-generator` (or anything you like)
3. Make it **Private** (recommended)
4. Open Terminal on your Mac and run:

```bash
cd ~/Downloads/ad-generator   # or wherever you unzipped the files
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ad-generator.git
git push -u origin main
```

---

## Step 2 — Deploy on Vercel

1. Go to **vercel.com** and log in
2. Click **"Add New Project"**
3. Click **"Import"** next to your `ad-generator` repo
4. Leave all settings as default
5. Click **"Deploy"**

Vercel will build and deploy automatically. You'll get a URL like:
`https://ad-generator-yourname.vercel.app`

---

## Step 3 — Add Environment Variables

This is the most important step. Without this, the paid tier won't work.

1. In Vercel, go to your project → **Settings** → **Environment Variables**
2. Add these two variables:

| Name | Value |
|------|-------|
| `GEMINI_API_KEY` | Your Gemini API key from Google AI Studio |
| `PAID_ACCESS_CODE` | A secret code you choose (e.g. `GOLD2025` or any password) |

3. Click **Save**
4. Go to **Deployments** → click the three dots on your latest deploy → **Redeploy**

---

## Step 4 — Test It

1. Open your Vercel URL
2. Fill in brand setup
3. **Free tier:** enter your own Gemini key
4. **Paid tier:** enter your `PAID_ACCESS_CODE`
5. Add a product and generate your first campaign

---

## Getting a Gemini API Key (Free)

1. Go to **aistudio.google.com**
2. Sign in with Google
3. Click **"Get API Key"** → **"Create API Key"**
4. Copy it — this is your `GEMINI_API_KEY`

The free tier has generous limits (60 requests/minute on Gemini 1.5 Pro).

---

## Selling Access

To give a customer paid access:
- Charge them however you want (Stripe, PayPal, etc.)
- Send them your Vercel URL + the `PAID_ACCESS_CODE` you set
- They enter the code on the setup screen

To change the access code later:
- Update `PAID_ACCESS_CODE` in Vercel Environment Variables
- Redeploy

---

## Local Development (Optional)

```bash
cd ad-generator
npm install
cp .env.example .env.local
# Edit .env.local with your keys
npm run dev
# Open http://localhost:3000
```

---

## You Are Gold! Version

The You Are Gold! version (your personal tool) is a separate HTML file.
Keep it separate — it's yours, pre-loaded with your blends.
