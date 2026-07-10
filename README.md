# Discord Ticket Bot

A ticket system bot: posts a panel with a dropdown (Purchase, Reseller, Claim Key, HWID Reset, Support), and creates a private ticket channel when someone picks a category.

## 1. Local setup

```bash
npm install
cp .env.example .env
```

Fill in `.env` with:
- `DISCORD_TOKEN` — from the Bot tab of your application
- `CLIENT_ID` — your application ID (General Information tab)
- `GUILD_ID` — your Discord server ID (enable Developer Mode in Discord settings, then right-click your server icon → Copy Server ID)
- `TICKET_CATEGORY_ID` — (optional) the channel category tickets should be created under
- `SUPPORT_ROLE_ID` — (optional) role that should see every ticket

Register the slash command, then start the bot:

```bash
node deploy-commands.js
npm start
```

In your server, run `/setup-tickets` in the channel where you want the panel to appear (needs Manage Channels permission).

## 2. Deploy to Railway

1. Push this folder to a GitHub repo (or use Railway's CLI to deploy directly — see below).
2. Go to https://railway.app → **New Project** → **Deploy from GitHub repo** → select your repo.
3. Once the project is created, go to your service → **Variables** tab, and add each variable from `.env.example` (DISCORD_TOKEN, CLIENT_ID, GUILD_ID, TICKET_CATEGORY_ID, SUPPORT_ROLE_ID) with your real values.
4. Railway auto-detects Node.js and runs `npm start` from `package.json` — no extra config needed.
5. Under the **Deployments** tab, watch the build logs. You should see `Logged in as YourBot#1234` once it's live.
6. Because this is a bot (not a web server), you do **not** need to expose a public domain/port — Railway will keep the process running as a background worker.

### Deploying via Railway CLI instead of GitHub
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```
Then set variables either in the dashboard or via:
```bash
railway variables set DISCORD_TOKEN=your_token_here
railway variables set CLIENT_ID=your_id_here
railway variables set GUILD_ID=your_guild_id_here
```

### Re-registering slash commands after deploy
Slash commands only need to be registered once (or whenever you change them). Run `node deploy-commands.js` locally (with the same `.env` values) — this talks to Discord's API directly, not to Railway, so it doesn't need to run on the server itself.

## 3. Customizing the categories
Edit the `TICKET_CATEGORIES` array at the top of `index.js` to change labels, emojis, or descriptions, and edit the embed text in `buildPanelEmbed()` (e.g. to add your shop link).

## Notes
- The bot needs the **Manage Channels** permission to create ticket channels, and the intents "Server Members" + "Message Content" enabled in the Discord Developer Portal (Bot tab).
- Never commit your `.env` file or share your token — if it ever leaks, reset it immediately from the Developer Portal.
