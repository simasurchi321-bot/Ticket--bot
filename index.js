require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
});

// ---- Ticket categories shown in the dropdown (edit these to fit your shop) ----
const TICKET_CATEGORIES = [
  { value: 'purchase', label: 'Purchase', emoji: '🛒', description: 'Help with buying a product' },
  { value: 'reseller', label: 'Reseller', emoji: '💰', description: 'Apply to our reseller program' },
  { value: 'claim-key', label: 'Claim Key', emoji: '🔑', description: 'Claim your role or product key' },
  { value: 'hwid-reset', label: 'HWID Reset', emoji: '🔒', description: 'Reset your hardware ID' },
  { value: 'support', label: 'Support', emoji: '🎫', description: 'General support' },
];

function buildPanelEmbed() {
  return new EmbedBuilder()
    .setColor(0x2b6cff)
    .setTitle('🎫 Support Tickets')
    .setDescription(
      'Open a ticket below!\n\n' +
      TICKET_CATEGORIES.map(c => `${c.emoji} **${c.label}** — ${c.description}`).join('\n') +
      '\n\n*Select a category from the dropdown below.*'
    );
}

function buildPanelRow() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket-category-select')
    .setPlaceholder('Select a category to open a ticket...')
    .addOptions(TICKET_CATEGORIES.map(c => ({
      label: c.label,
      value: c.value,
      description: c.description,
      emoji: c.emoji,
    })));
  return new ActionRowBuilder().addComponents(menu);
}

function buildCloseRow() {
  const closeButton = new ButtonBuilder()
    .setCustomId('ticket-close')
    .setLabel('Close Ticket')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('🔒');
  return new ActionRowBuilder().addComponents(closeButton);
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  try {
    // /setup-tickets command posts the panel
    if (interaction.isChatInputCommand() && interaction.commandName === 'setup-tickets') {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ content: 'You need Manage Channels permission to do this.', ephemeral: true });
      }
      await interaction.channel.send({ embeds: [buildPanelEmbed()], components: [buildPanelRow()] });
      return interaction.reply({ content: 'Ticket panel posted.', ephemeral: true });
    }

    // Dropdown selection -> create ticket channel
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket-category-select') {
      await interaction.deferReply({ ephemeral: true });

      const category = TICKET_CATEGORIES.find(c => c.value === interaction.values[0]);
      const guild = interaction.guild;
      const user = interaction.user;

      // Prevent duplicate open tickets per user per category
      const existing = guild.channels.cache.find(
        ch => ch.name === `${category.value}-${user.username}`.toLowerCase().slice(0, 100)
      );
      if (existing) {
        return interaction.editReply({ content: `You already have an open ticket: ${existing}` });
      }

      const overwrites = [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      ];
      if (process.env.SUPPORT_ROLE_ID) {
        overwrites.push({
          id: process.env.SUPPORT_ROLE_ID,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        });
      }

      const ticketChannel = await guild.channels.create({
        name: `${category.value}-${user.username}`.toLowerCase().slice(0, 100),
        type: ChannelType.GuildText,
        parent: process.env.TICKET_CATEGORY_ID || undefined,
        permissionOverwrites: overwrites,
      });

      const embed = new EmbedBuilder()
        .setColor(0x2b6cff)
        .setTitle(`${category.emoji} ${category.label} Ticket`)
        .setDescription(`Hello ${user}, thanks for opening a **${category.label}** ticket.\nA staff member will be with you shortly. Please describe your request in detail.`)
        .setFooter({ text: `Opened by ${user.tag}` })
        .setTimestamp();

      await ticketChannel.send({
        content: process.env.SUPPORT_ROLE_ID ? `<@&${process.env.SUPPORT_ROLE_ID}> <@${user.id}>` : `${user}`,
        embeds: [embed],
        components: [buildCloseRow()],
      });

      return interaction.editReply({ content: `Ticket created: ${ticketChannel}` });
    }

    // Close button
    if (interaction.isButton() && interaction.customId === 'ticket-close') {
      await interaction.reply({ content: 'Closing this ticket in 5 seconds...' });
      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 5000);
    }
  } catch (err) {
    console.error(err);
    if (interaction.isRepliable()) {
      const payload = { content: 'Something went wrong handling that action.', ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        interaction.editReply(payload).catch(() => {});
      } else {
        interaction.reply(payload).catch(() => {});
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
