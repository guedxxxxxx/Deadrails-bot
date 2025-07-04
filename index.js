const {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

const GUEDX_ID = '955969285686181898';

const userTickets = new Map(); // userId => channelId
const userOrders = new Map();  // userId => totalRobux
const userItems = new Map();   // userId => [{name, emoji, price}]
const userEmbeds = new Map();  // userId => messageId of ticket embed

const LTC_ADDRESS = 'ltc1qr3lqtfc4em5mkfjrhjuh838nnhnpswpfxtqsu8';

function calculateDollarAmount(robux) {
  return (robux / 20 * 0.25).toFixed(2);
}

function getRobuxLink(robux) {
  if (robux <= 20) return 'https://www.roblox.com/game-pass/1044850980/20';
  if (robux <= 40) return 'http://www.roblox.com/game-pass/1027394973/40';
  return 'https://www.roblox.com/game-pass/1031209691/50';
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (message.content === '!deadrails') {
    const button = new ButtonBuilder()
      .setCustomId('open_menu')
      .setLabel('Select Your Product')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await message.channel.send({
      content: `🚂 **Welcome to the Dead Rails Shop!** 🚂

Discover the best classes and trains to boost your in-game experience.  
**Every single product costs 20 Robux**, except the *"Everything in-game"* bundle which gives you full access for only 50 Robux!

💸 **Special promotions:**  
- Buy **more than 3 products** and pay a flat rate of **50 Robux** for the entire order!  
- Orders that hit exactly 40 Robux pay the full 40 Robux with a dedicated payment link.  
- Orders below 40 Robux pay the normal total based on selected items.

📦 Click the button below to select your products and get ready for an amazing journey!`,
      components: [row]
    });
  }
});

client.on('interactionCreate', async interaction => {
  if (interaction.isButton()) {
    if (interaction.customId === 'open_menu') {
      const menu = new StringSelectMenuBuilder()
        .setCustomId('category_select')
        .setPlaceholder('Choose a category')
        .addOptions([
          { label: 'Classes', value: 'classes', emoji: '⚔️' },
          { label: 'Trains', value: 'trains', emoji: '🚂' },
          { label: 'Everything', value: 'everything', emoji: '🧾' }
        ]);

      const row = new ActionRowBuilder().addComponents(menu);
      await interaction.reply({ content: 'Select a category below:', components: [row], ephemeral: true });
    }

    if (interaction.customId === 'close_ticket') {
      const channel = interaction.channel;

      await interaction.reply({ content: '✅ Ticket will be closed.', ephemeral: true });

      userTickets.forEach((chId, userId) => {
        if (chId === channel.id) {
          userTickets.delete(userId);
          userOrders.delete(userId);
          userItems.delete(userId);
          userEmbeds.delete(userId);
        }
      });

      await channel.delete();
    }

    if (interaction.customId === 'copy_ltc') {
      await interaction.reply({
        content: `Click the key to copy:\n\`${LTC_ADDRESS}\``,
        ephemeral: true
      });
    }
  }

  if (interaction.isStringSelectMenu()) {
    const selectedId = interaction.customId;

    if (selectedId === 'category_select') {
      const selectedCategory = interaction.values[0];

      if (selectedCategory === 'everything') {
        const user = interaction.user;
        const guild = interaction.guild;

        const total = 50;
        const usd = calculateDollarAmount(total);
        const robuxLink = getRobuxLink(total);

        const embed = {
          title: '🛒 Order Summary',
          description: `🧾 Everything in-game = 50 robux\n\n📦 **Total:** 50 robux ($${usd})`,
          color: 0x00b0f4
        };

        const paymentEmbed = {
          title: '💳 Payment Information',
          description: `
⚠️ **Please wait for support to arrive before making the payment!**

**Payment methods below**
🔸 **For LTC:** \`${LTC_ADDRESS}\`
🔸 **For Robux:** [Payment Link](${robuxLink})

🔸 **Coin:** Litecoin (LTC)  
🔸 **Network:** LTC Mainnet  
💬 **Support will be here in 1–2 minutes to assist you.`,
          color: 0xffd700,
          thumbnail: { url: 'https://cryptologos.cc/logos/litecoin-ltc-logo.png' }
        };

        const closeButton = new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger);

        const copyLTCButton = new ButtonBuilder()
          .setCustomId('copy_ltc')
          .setLabel('Copy LTC Address')
          .setStyle(ButtonStyle.Secondary);

        const buttonsRow = new ActionRowBuilder().addComponents(closeButton, copyLTCButton);

        const channel = await guild.channels.create({
          name: `ticket-${user.username}`,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            { id: GUEDX_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
          ]
        });

        const message = await channel.send({
          content: `<@${GUEDX_ID}>`,
          embeds: [embed, paymentEmbed],
          components: [buttonsRow]
        });

        userTickets.set(user.id, channel.id);
        userEmbeds.set(user.id, message.id);

        await interaction.reply({ content: '✅ Ticket created for Everything access!', ephemeral: true });
        return;
      }

      const classOptions = [
        'Musician', 'Miner', 'Doctor', 'Arsonist', 'Packmaster', 'Necromancer',
        'Conductor', 'Werewolf', 'The Alamo', 'High Roller', 'Cowboy', 'Hunter',
        'Milkman', 'Demolitionist', 'Survivalist', 'Priest', 'Zombie', 'Vampire',
        'President', 'Ironclad'
      ];

      const trainOptions = [
        'Cattle Car', 'Gold Rush', 'Passenger Train', 'Armored Train', 'Ghost Train', 'Wooden Train'
      ];

      const makeOptions = (labels) =>
        labels.map(label => ({
          label: label,  // no price shown here
          value: label.toLowerCase().replace(/ /g, '_'),
          emoji: '🛒'
        }));

      const menu = new StringSelectMenuBuilder()
        .setCustomId('product_select')
        .setPlaceholder(`Choose a ${selectedCategory === 'classes' ? 'class' : 'train'}`)
        .addOptions(selectedCategory === 'classes'
          ? makeOptions(classOptions)
          : makeOptions(trainOptions));

      const row = new ActionRowBuilder().addComponents(menu);
      await interaction.update({ content: 'Select a product below:', components: [row] });
    }

    if (selectedId === 'product_select') {
      const user = interaction.user;
      const guild = interaction.guild;
      const selectedProduct = interaction.values[0];
      const displayName = selectedProduct.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      const productEntry = { name: displayName, emoji: '🛒', price: 20 };
      const prevList = userItems.get(user.id) || [];
      const newList = [...prevList, productEntry];
      userItems.set(user.id, newList);

      let total = newList.reduce((sum, item) => sum + item.price, 0);

      // Promotion: If more than 3 items, fixed 50 robux total
      if (newList.length > 3) total = 50;

      const usd = calculateDollarAmount(total);
      userOrders.set(user.id, total);

      const robuxLink = getRobuxLink(total);

      const productListText = newList.map(p => `${p.emoji} ${p.name} = 20 robux`).join('\n');
      let promoNote = '';

      if (newList.length > 3) {
        promoNote = `💸 **Promo:** You bought more than 3 products, so the total price is fixed at 50 Robux!`;
      } else if (total > 40) {
        promoNote = `💸 **Promo:** Your total passed 40 Robux, so the 50 Robux payment link is used.`;
      } else if (total === 40) {
        promoNote = `💸 **Tier:** Your total is exactly 40 Robux, using the 40 Robux link.`;
      }

      const embed = {
        title: '🛒 Order Summary',
        description: `${productListText}\n\n📦 **Total:** ${total} robux ($${usd})\n${promoNote}`,
        color: 0x00b0f4
      };

      const paymentEmbed = {
        title: '💳 Payment Information',
        description: `
⚠️ **Please wait for support to arrive before making the payment!**

**Payment methods below**
🔸 **For LTC:** \`${LTC_ADDRESS}\`
🔸 **For Robux:** [Payment Link](${robuxLink})

🔸 **Coin:** Litecoin (LTC)  
🔸 **Network:** LTC Mainnet  
💬 **Support will be here in 1–2 minutes to assist you.`,
        color: 0xffd700,
        thumbnail: { url: 'https://cryptologos.cc/logos/litecoin-ltc-logo.png' }
      };

      const closeButton = new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger);

      const copyLTCButton = new ButtonBuilder()
        .setCustomId('copy_ltc')
        .setLabel('Copy LTC Address')
        .setStyle(ButtonStyle.Secondary);

      const buttonsRow = new ActionRowBuilder().addComponents(closeButton, copyLTCButton);

      const existingChannelId = userTickets.get(user.id);
      const existingChannel = existingChannelId ? guild.channels.cache.get(existingChannelId) : null;

      if (existingChannel) {
        const embedMsgId = userEmbeds.get(user.id);
        const embedMsg = await existingChannel.messages.fetch(embedMsgId);

        await embedMsg.edit({ embeds: [embed, paymentEmbed], components: [buttonsRow] });
        await interaction.reply({ content: '✅ Product added to your order!', ephemeral: true });
      } else {
        const channel = await guild.channels.create({
          name: `ticket-${user.username}`,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            { id: GUEDX_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
          ]
        });

        const message = await channel.send({
          content: `<@${GUEDX_ID}>`,
          embeds: [embed, paymentEmbed],
          components: [buttonsRow]
        });

        userTickets.set(user.id, channel.id);
        userEmbeds.set(user.id, message.id);

        await interaction.reply({ content: '✅ Ticket created and product added!', ephemeral: true });
      }

      const moreMenu = new StringSelectMenuBuilder()
        .setCustomId('additional_purchase')
        .setPlaceholder('Anything else?')
        .addOptions([
          { label: 'Yes', value: 'yes', emoji: '👍' },
          { label: 'No', value: 'no', emoji: '✖️' }
        ]);
      const moreRow = new ActionRowBuilder().addComponents(moreMenu);
      await interaction.followUp({ content: 'Do you want to purchase anything else?', components: [moreRow], ephemeral: true });
    }

    if (selectedId === 'additional_purchase') {
      const choice = interaction.values[0];
      if (choice === 'no') {
        await interaction.update({ content: '✅ Your ticket has been successfully created!', components: [] });
      } else {
        const menu = new StringSelectMenuBuilder()
          .setCustomId('category_select')
          .setPlaceholder('Choose a category')
          .addOptions([
            { label: 'Classes', value: 'classes', emoji: '⚔️' },
            { label: 'Trains', value: 'trains', emoji: '🚂' },
            { label: 'Everything', value: 'everything', emoji: '🧾' }
          ]);
        const row = new ActionRowBuilder().addComponents(menu);
        await interaction.update({ content: 'Select a category below:', components: [row] });
      }
    }
  }
});

client.login(process.env.TOKEN);
