const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  ChannelType,
  REST,
  Routes,
} = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// ---- CONFIG ----
const TICKET_CATEGORY_ID = process.env.TICKET_CATEGORY_ID; // Discord category channels go under
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID; // role that can see tickets

const CATEGORIES = [
  { label: 'Purchase', value: 'purchase', emoji: '🛒', description: 'Help with buying a product' },
  { label: 'Reseller', value: 'reseller', emoji: '💰', description: 'Apply to our reseller program' },
  { label: 'Claim Key', value: 'claim_key', emoji: '🔑', description: 'Claim your role or product key' },
  { label: 'HWID Reset', value: 'hwid_reset', emoji: '🔒', description: 'Reset your hardware ID' },
  { label: 'Support', value: 'support', emoji: '🎫', description: 'General support' },
];

client.once('clientReady', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Auto-register the /panel command on every startup.
  // This means you never have to run a separate register script -
  // Railway (or any host) will re-register it each time the bot boots.
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    const commands = [
      { name: 'panel', description: 'Post the ticket support panel in this channel' },
    ];

    if (process.env.GUILD_ID) {
      // Guild commands update instantly - best for a single server
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
        { body: commands }
      );
      console.log('Slash command /panel registered (guild).');
    } else {
      // Global commands can take up to an hour to show up everywhere
      await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
      console.log('Slash command /panel registered (global - may take up to 1 hour to appear).');
    }
  } catch (err) {
    console.error('Failed to register slash command:', err);
  }
});

// Slash command: /panel  -> posts the ticket panel embed
client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === 'panel') {
      const embed = new EmbedBuilder()
        .setTitle('🎫 Support Tickets')
        .setDescription('Open a ticket below!\n\nSelect a category from the dropdown.')
        .setColor(0x2b6cff);

      const menu = new StringSelectMenuBuilder()
        .setCustomId('ticket_category')
        .setPlaceholder('Select a category to open a ticket...')
        .addOptions(CATEGORIES);

      const row = new ActionRowBuilder().addComponents(menu);

      await interaction.reply({ content: 'Panel posted!', ephemeral: true });
      await interaction.channel.send({ embeds: [embed], components: [row] });
    }

    // Handle dropdown selection -> create ticket channel
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_category') {
      await interaction.deferReply({ ephemeral: true });

      const category = interaction.values[0];
      const guild = interaction.guild;

      const channelName = `${category}-${interaction.user.username}`.toLowerCase().slice(0, 90);

      const permissionOverwrites = [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
      ];

      if (STAFF_ROLE_ID) {
        permissionOverwrites.push({
          id: STAFF_ROLE_ID,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        });
      }

      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: TICKET_CATEGORY_ID || undefined,
        permissionOverwrites,
      });

      await ticketChannel.send({
        content: `${interaction.user} opened a **${category}** ticket. Staff will be with you shortly.${
          STAFF_ROLE_ID ? ` <@&${STAFF_ROLE_ID}>` : ''
        }`,
      });

      await interaction.editReply({
        content: `Your ticket has been created: ${ticketChannel}`,
      });
    }
  } catch (err) {
    // Log the full error so it shows up clearly in Railway logs
    console.error('Error handling interaction:', err);

    // Try to tell the user something went wrong instead of a silent timeout
    const errorMessage = `Something went wrong: ${err.message}`;
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    } catch (replyErr) {
      console.error('Failed to send error reply:', replyErr);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
