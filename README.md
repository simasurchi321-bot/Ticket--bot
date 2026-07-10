# Ticket Support Bot

A Discord bot with a support panel dropdown that opens private ticket channels.

## Setup on Railway

1. Push these files to a GitHub repo (do NOT commit a .env file — see .gitignore)
2. Create a new Railway project → Deploy from GitHub repo
3. Go to the Variables tab and add:
   - DISCORD_TOKEN = your bot token (from Discord Developer Portal > Bot)
   - GUILD_ID = your Discord server ID (right-click server icon > Copy Server ID, need Developer Mode on)
   - TICKET_CATEGORY_ID = (optional) category ID where ticket channels should be created
   - STAFF_ROLE_ID = (optional) role ID that can see all tickets
4. Railway will build and deploy automatically
5. Check the Deploy logs for:
   Logged in as YourBot#1234
   Slash command /panel registered (guild).
6. In Discord, type /panel in any channel to post the ticket panel
