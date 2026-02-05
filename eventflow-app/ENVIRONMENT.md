# EventFlow AI - Environment Configuration Guide

**Version:** v2.1 (SaaS Tier Structure)  
**Updated:** 2026-02-05

---

## 📋 Overview

This guide explains all environment variables needed for EventFlow AI to work correctly.

**Important:**
- `.env` file contains sensitive information - **NEVER commit to Git**
- `.env.example` contains template values - safe to commit
- Secrets for Edge Functions must be set in Supabase Dashboard

---

## 🔐 Security Best Practices

### 1. Keep Secrets Separate

| Type | Where to Store | Example |
|-------|-----------------|----------|
| Public keys | `.env` (safe for frontend) | `VITE_SUPABASE_URL` |
| Private keys | Supabase Dashboard → Secrets | `GEMINI_API_KEY` |
| Database credentials | `.env` (local only) | `SUPABASE_DB_PASSWORD` |

### 2. Production vs Development

```bash
# Development
VITE_DEBUG=true
VITE_LOG_LEVEL=debug

# Production
VITE_DEBUG=false
VITE_LOG_LEVEL=error
```

---

## 📝 Environment Variables Reference

### Supabase Configuration

| Variable | Required | Description | Source |
|----------|-----------|-------------|---------|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Public API key | Supabase Dashboard → Settings → API |
| `SUPABASE_DB_PASSWORD` | ✅ | Database password (local only) | Set during project creation |

### AI Configuration (Edge Functions Secrets)

| Variable | Required | Description | How to Set |
|----------|-----------|-------------|--------------|
| `GEMINI_API_KEY` | ✅ | Gemini API key for AI features | **Supabase Dashboard** → Edge Functions → Secrets → Add New → `GEMINI_API_KEY` |

**How to get:**
1. Go to https://aistudio.google.com/app/apikey
2. Create new API key
3. Copy key and add to Supabase Secrets

### WhatsApp Configuration (Edge Functions Secrets)

| Variable | Required | Description | How to Set |
|----------|-----------|-------------|--------------|
| `GREEN_API_INSTANCE` | ✅ | Green API instance ID | **Supabase Dashboard** → Edge Functions → Secrets |
| `GREEN_API_TOKEN` | ✅ | Green API token | **Supabase Dashboard** → Edge Functions → Secrets |

**How to get:**
1. Go to https://green-api.com
2. Create account and instance
3. Copy instance ID and token

### Security Configuration

| Variable | Required | Description |
|----------|-----------|-------------|
| `ENCRYPTION_KEY` | ✅ | 32+ character key for encrypting API credentials |

**How to generate:**
```bash
openssl rand -base64 32
```

### Tier Management (v2.1)

| Variable | Required | Description | How to Set |
|----------|-----------|-------------|--------------|
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key for admin operations | **Supabase Dashboard** → Edge Functions → Secrets |

**How to get:**
1. Go to Supabase Dashboard → Settings → API
2. Scroll to "service_role"
3. Copy key and add to Secrets

### Notification Configuration

| Variable | Required | Description | Source |
|----------|-----------|-------------|---------|
| `VITE_VAPID_PUBLIC_KEY` | ✅ | Public key for push notifications | Generate locally |
| `VAPID_PRIVATE_KEY` | ❌ | Private key (DO NOT commit) | Generate locally |

**How to generate:**
```bash
npx web-push generate-vapid-keys
```

### Feature Flags

| Variable | Default | Description |
|----------|-----------|-------------|
| `VITE_ENABLE_AI_CHAT` | `true` | Enable AI chat feature |
| `VITE_ENABLE_VENDOR_ANALYSIS` | `true` | Enable vendor analysis |
| `VITE_ENABLE_SIMULATION` | `true` | Enable day simulation |
| `VITE_ENABLE_TRIAL_MODE` | `true` | Enable trial mode (v2.1) |

### Tier Limits (Base Tier)

| Variable | Default | Description |
|----------|-----------|-------------|
| `VITE_BASE_EVENTS_LIMIT` | `5` | Events per year (Base tier) |
| `VITE_BASE_PARTICIPANTS_LIMIT` | `100` | Participants per event (Base tier) |
| `VITE_BASE_MESSAGES_LIMIT` | `200` | Messages per month (Base tier) |
| `VITE_BASE_AI_MESSAGES_LIMIT` | `50` | AI messages per month (Base tier) |

### Trial Configuration (v2.1)

| Variable | Default | Description |
|----------|-----------|-------------|
| `VITE_TRIAL_DURATION_DAYS` | `7` | Trial duration in days |
| `VITE_TRIAL_WARNING_DAYS` | `5` | Days before trial ends to show banner |

### Debug Configuration

| Variable | Default | Description |
|----------|-----------|-------------|
| `VITE_DEBUG` | `false` | Enable debug mode (dev only) |
| `VITE_LOG_LEVEL` | `info` | Log level: `error`, `warn`, `info`, `debug` |

---

## 🚀 Quick Setup Guide

### Step 1: Copy Template

```bash
cp .env.example .env
```

### Step 2: Get Supabase Credentials

1. Go to Supabase Dashboard
2. Settings → API
3. Copy Project URL and Anon Key
4. Paste into `.env`

### Step 3: Set Edge Function Secrets

Go to Supabase Dashboard → Edge Functions → Secrets and add:

```
GEMINI_API_KEY=your-gemini-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GREEN_API_INSTANCE=your-instance-id
GREEN_API_TOKEN=your-token
```

### Step 4: Generate Encryption Key

```bash
openssl rand -base64 32
```

Paste the output into `ENCRYPTION_KEY` in `.env`.

### Step 5: Run Development Server

```bash
npm run dev
```

---

## 🔍 Troubleshooting

### Issue: "Supabase connection failed"

**Solution:**
1. Check `VITE_SUPABASE_URL` is correct
2. Verify `VITE_SUPABASE_ANON_KEY` is valid
3. Check Supabase project is active

### Issue: "AI chat not working"

**Solution:**
1. Verify `GEMINI_API_KEY` is set in Supabase Secrets
2. Check key has proper permissions
3. Verify `VITE_ENABLE_AI_CHAT=true`

### Issue: "Edge Function timeout"

**Solution:**
1. Check `SUPABASE_SERVICE_ROLE_KEY` is correct
2. Verify key has proper permissions
3. Check Supabase Edge Functions logs

### Issue: "Trial not starting"

**Solution:**
1. Verify database migration applied (trial columns exist)
2. Check `start-trial` function is deployed
3. Check `VITE_ENABLE_TRIAL_MODE=true`

---

## ✅ Verification Checklist

Before deploying to production, verify:

- [ ] `.env` file created
- [ ] `.env` is in `.gitignore`
- [ ] Supabase URL and Anon Key set
- [ ] `GEMINI_API_KEY` added to Supabase Secrets
- [ ] `SUPABASE_SERVICE_ROLE_KEY` added to Supabase Secrets
- [ ] `GREEN_API_INSTANCE` and `TOKEN` added (if using WhatsApp)
- [ ] Encryption key generated (32+ chars)
- [ ] All Edge Functions deployed
- [ ] Database migrations applied

---

## 📚 Additional Resources

- [Supabase Secrets Documentation](https://supabase.com/docs/guides/functions/secrets)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Green API Documentation](https://green-api.com/en/docs)

---

**Last Updated:** 2026-02-05  
**Version:** v2.1
