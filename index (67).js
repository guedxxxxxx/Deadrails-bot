require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

const GUEDX_ID = '955969285686181898';
const BEN_ID = '1327435436473454602';
const AIRBORNITE_ID = 'null';
const SERVER_MANAGER_ROLE_ID = '1375282639623295027';
const BUYER_ROLE_ID = '1375297594091372656';
const OWNER_ROLE_ID = '1375281684282474628';
const VIP_ROLE_ID = '1379507894071857272';
const GOOD_BOY_ROLE_ID = '1384346040190107658';
const UNC_ROLE_ID = '1391413706054959208';
const MIDDLEMAN_ROLE_ID = '1395807423159074906';
const VOUCH_CHANNEL_ID = '1374842573331628133';

const LTC_ADDRESS = 'Lc9Yh8QE8GTPd2zGPcHk1PAjdeUYtxvjFD';

// Channels to exclude from message counting
const EXCLUDED_CHANNELS = ['1387636318649188504', '1384101710372409386', '1375295670965239909'];

console.log('🔧 Excluded channels for message counting:', EXCLUDED_CHANNELS);

// Anti-spam configuration
const ANTI_SPAM = {
  REPEAT_MESSAGE_LIMIT: 3 // How many times same message can be sent
};

// Message rewards system - updated to fruit rewards
const MESSAGE_REWARDS = [
  { messages: 250, fruit: 3 },
  { messages: 500, fruit: 8 },
  { messages: 1000, fruit: 18 }
];

// Anti-spam tracking
let userLastMessage = new Map(); // Track last message content per user
let userRepeatedMessages = new Map(); // Track repeated message counts

// Rate limiting system (45 messages per minute)
let userMessageTimestamps = new Map(); // Track message timestamps per user
const RATE_LIMIT_MESSAGES = 45;
const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds

// Ticket inactivity tracking
let ticketInactivityTimers = new Map(); // Track inactivity timers for tickets

// Track if user has already used !updatemymessages (permanent, one-time only)
// This Set contains user IDs who have used the command permanently
const PERMANENT_UPDATE_USERS = new Set([
  // Add user IDs here as they use the command
]);

// Track if !save has been used (permanent, one-time only)
// This Set contains user IDs who have used !save permanently
const PERMANENT_SAVE_USERS = new Set([
  // Add user IDs here as they use the command
  // '1327435436473454602', // Ben
  // '955969285686181898',  // Guedx
]);

let userUpdateUsed = new Map();

// Track good boy usage count for cycling messages
let goodBoyUsageCount = new Map();

// Cooldown tracking for unc and good boy (10 seconds)
let uncCooldowns = new Map(); // userId -> timestamp
let goodBoyCooldowns = new Map(); // userId -> timestamp
const COOLDOWN_DURATION = 10000; // 10 seconds in milliseconds

// Global update state
let isUpdatingMessages = false;
let updateProgress = { current: 0, total: 0, currentUser: '' };

// Track middleman tickets that have already had users added
let middlemanTicketsCompleted = new Set();

// Channel where claimed messages are tracked
const CLAIMED_MESSAGES_CHANNEL_ID = '1393086312806092852';

// Channel where !updatemymessages usage is logged
const UPDATE_MESSAGES_LOG_CHANNEL_ID = '1394032953088147567';

// Channel for real-time message count logging
const MESSAGE_COUNT_LOG_CHANNEL_ID = '1394477453824491631';

// Channel for real-time spending tracking logging
const SPENDING_LOG_CHANNEL_ID = '1394633309614768240';

// Sussy messages array for cycling
const SUSSY_MESSAGES = [
  "Call me again and I'll nut all over your face",
  `🍆💦 Aaaaghh {user} 😫😖`,
  `😩 You like this, huh {user}? You little freak 😳`,
  `👀 Bro's back AGAIN? Down bad detected {user} 💀`,
  `🛑 ENOUGH NGA, GO GET A LIFE, LIKE WTF?`
];

// Good boy messages array for cycling
const GOOD_BOY_MESSAGES = [
  "aren't you a good boy?",
  "🐕 Such a good boy! Who's a good boy? You are! 🦴",
  "💖 Aww, what a precious good boy! *pat pat* 🥰",
  "🌟 The goodest boy! You deserve all the treats! 🍖",
  "👑 King of all good boys! Your loyalty is unmatched! 🏆",
  "🎾 Good boy energy! Time for walkies and belly rubs! 🐾"
];

// Helper function to delete previous bot messages with specific titles
async function deletePreviousBotMessages(channel, titleKeywords) {
  try {
    const messages = await channel.messages.fetch({ limit: 50 });
    
    for (const message of messages.values()) {
      if (message.author.id === client.user.id && message.embeds.length > 0) {
        const embed = message.embeds[0];
        if (embed.title && titleKeywords.some(keyword => embed.title.includes(keyword))) {
          try {
            await message.delete();
          } catch (error) {
            console.log('Could not delete message:', error.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error deleting previous bot messages:', error);
  }
}

const GAMEPASSES = {
  'queen bee': { usd: 3.0, robux: 800, url: 'https://www.roblox.com/catalog/93695238318627/Queen-Bee' },
  'mimic octopus': { usd: 3.5, robux: 900, url: 'https://www.roblox.com/catalog/137304415821351/Mimic-Octopus' },
  'dragonfly': { usd: 4.5, robux: 1100, url: 'https://www.roblox.com/catalog/90411378085540/Dragonfly' },
  't-rex': { usd: 4.0, robux: 1000, url: 'https://www.roblox.com/catalog/100110076681888/T-Rex' },
  'butterfly': { usd: 6.5, robux: 1400, url: 'https://www.roblox.com/catalog/90411378085540/Dragonfly' },
  'raccoon': { usd: 7.5, robux: 1700, url: 'https://www.roblox.com/catalog/96416068361869/Raccoon' },
  'disco bee': { usd: 8.5, robux: 1900, url: 'https://www.roblox.com/catalog/73213265640553/Disco-Bee' },
  'fennec fox': { usd: 6.5, robux: 1400, url: 'https://www.roblox.com/catalog/109376487911958/Fennec-Fox' },
  'spinosaurus': { usd: 5.5, robux: 1300, url: 'https://www.roblox.com/catalog/107531851263431/Spinosaurus' },
  'red fox': { usd: 1.0, robux: 300, url: 'https://www.roblox.com/catalog/76133087987278/Red-Fox' },
  'chicken zombie': { usd: 3.0, robux: 800, url: 'https://www.roblox.com/catalog/105095856090553/Chicken-Zombie' },
  'age 20': { usd: 0.25, robux: 50, url: 'https://www.roblox.com/catalog/110562210211481/Aged-20' },
  'age 30': { usd: 0.75, robux: 150, url: 'https://www.roblox.com/catalog/122632492811261/Aged-30' },
  'age 45': { usd: 1.5, robux: 300, url: 'https://www.roblox.com/catalog/139122830338480/Aged-45' },
  'age 60': { usd: 3.0, robux: 600, url: 'https://www.roblox.com/catalog/112375240202324/Aged-60' },
  'age 75': { usd: 4.5, robux: 900, url: 'https://www.roblox.com/catalog/79331857201795/Aged-75' }
};

let userOrders = new Map();
let userTickets = new Map();
let userSpending = new Map(); // Track user spending: { userId: { totalUSD: 0, totalRobux: 0 } }
let marketUsageCount = new Map(); // Track !market usage for restrictions
let userMessages = new Map(); // Track user message counts: { userId: { count: 0, lastReward: 0 } }
let receiptChannelId = null;

// Check if user has admin permissions
function hasAdminPermissions(userId, member) {
  return userId === GUEDX_ID || 
         userId === BEN_ID || 
         userId === AIRBORNITE_ID ||
         (member && member.roles.cache.has(SERVER_MANAGER_ROLE_ID));
}

// Count user's active tickets
function countUserTickets(userId) {
  let count = 0;
  for (const [ticketUserId, ticketId] of userTickets.entries()) {
    if (ticketUserId === userId) {
      // Check if ticket still exists and is active
      const channel = client.channels.cache.get(ticketId);
      if (channel && channel.isThread() && !channel.archived) {
        count++;
      }
    }
  }
  return count;
}

// Load database
function loadDatabase() {
    try {
        const data = fs.readFileSync('database.json', 'utf8');
        const parsedData = JSON.parse(data);
        userOrders = new Map(Object.entries(parsedData.userOrders || {}));
        userTickets = new Map(Object.entries(parsedData.userTickets || {}));
        userSpending = new Map(Object.entries(parsedData.userSpending || {}));
        marketUsageCount = new Map(Object.entries(parsedData.marketUsageCount || {}));
        userMessages = new Map(Object.entries(parsedData.userMessages || {}));
        goodBoyUsageCount = new Map(Object.entries(parsedData.goodBoyUsageCount || {}));
        // userUpdateUsed is now handled by PERMANENT_UPDATE_USERS Set above
        receiptChannelId = parsedData.receiptChannelId || null;
        console.log('✅ Database loaded successfully!');
    } catch (error) {
        console.warn('⚠️ Could not load database.json. Starting with empty data.', error);
        userOrders = new Map();
        userTickets = new Map();
        userSpending = new Map();
        marketUsageCount = new Map();
        userMessages = new Map();
        goodBoyUsageCount = new Map();
        // userUpdateUsed is now handled by PERMANENT_UPDATE_USERS Set above
        receiptChannelId = null;
    }
}

// Save database
function saveDatabase() {
    const dataToSave = {
        userOrders: Object.fromEntries(userOrders),
        userTickets: Object.fromEntries(userTickets),
        userSpending: Object.fromEntries(userSpending),
        marketUsageCount: Object.fromEntries(marketUsageCount),
        userMessages: Object.fromEntries(userMessages),
        goodBoyUsageCount: Object.fromEntries(goodBoyUsageCount),
        // userUpdateUsed is now handled by PERMANENT_UPDATE_USERS Set in code
        receiptChannelId: receiptChannelId
    };
    fs.writeFileSync('database.json', JSON.stringify(dataToSave, null, 2), 'utf8');
    console.log('💾 Database saved!');
}

// Handle ticket inactivity prevention
function handleTicketInactivity(ticketId, creatorId) {
  // Clear existing timer if any
  if (ticketInactivityTimers.has(ticketId)) {
    clearTimeout(ticketInactivityTimers.get(ticketId));
  }

  // Set new timer for 20 minutes (1200000 ms)
  const timer = setTimeout(async () => {
    try {
      const channel = client.channels.cache.get(ticketId);
      if (channel && channel.isThread() && !channel.archived) {
        // Send inactivity warning without @everyone ping
        const inactivityMessage = await channel.send('⚠️ This ticket has been inactive for 20 minutes. Please respond if you still need assistance, or this ticket may be closed due to inactivity.');
        
        // Delete the ping message after 30 seconds
        setTimeout(async () => {
          try {
            await inactivityMessage.delete();
          } catch (error) {
            console.log('Inactivity ping message already deleted');
          }
        }, 30000);
        
        // Reschedule the next ping for another 20 minutes
        handleTicketInactivity(ticketId, creatorId);
        console.log(`⚠️ Inactivity ping sent for ticket ${ticketId}`);
      } else {
        // Thread is archived or doesn't exist, clean up
        ticketInactivityTimers.delete(ticketId);
        console.log(`🗑️ Cleaned up timer for archived/deleted ticket ${ticketId}`);
      }
    } catch (error) {
      console.error('Error sending inactivity ping:', error);
      ticketInactivityTimers.delete(ticketId);
    }
  }, 1200000); // 20 minutes

  ticketInactivityTimers.set(ticketId, timer);
}

// Read claimed amounts from the tracking channel
async function getClaimedAmounts() {
  const claimedAmounts = new Map();
  
  try {
    const trackingChannel = client.channels.cache.get(CLAIMED_MESSAGES_CHANNEL_ID);
    if (!trackingChannel) {
      console.log('⚠️ Claimed messages tracking channel not found');
      return claimedAmounts;
    }

    // Fetch all messages from the bot in this channel
    let allMessages = [];
    let lastMessageId = null;
    
    while (true) {
      const fetchOptions = { limit: 100 };
      if (lastMessageId) {
        fetchOptions.before = lastMessageId;
      }
      
      const messages = await trackingChannel.messages.fetch(fetchOptions);
      if (messages.size === 0) break;
      
      // Filter only bot's own messages
      const botMessages = messages.filter(msg => msg.author.id === client.user.id);
      allMessages.push(...botMessages.values());
      
      lastMessageId = messages.last().id;
      
      if (messages.size < 100) break;
    }

    // Parse messages to extract claimed amounts
    for (const message of allMessages) {
      const content = message.content;
      // Look for pattern: "CLAIMED: User <@123456789> claimed 100 messages"
      const claimMatch = content.match(/CLAIMED: User <@(\d+)> claimed (\d+) messages/);
      if (claimMatch) {
        const userId = claimMatch[1];
        const claimedAmount = parseInt(claimMatch[2]);
        claimedAmounts.set(userId, (claimedAmounts.get(userId) || 0) + claimedAmount);
      }
    }

    console.log(`📋 Loaded claimed amounts for ${claimedAmounts.size} users from tracking channel`);
    return claimedAmounts;
    
  } catch (error) {
    console.error('Error reading claimed amounts:', error);
    return claimedAmounts;
  }
}

// Update spending in the logging channel
async function updateSpendingLog(userId, totalUSD, totalRobux) {
  try {
    const logChannel = client.channels.cache.get(SPENDING_LOG_CHANNEL_ID);
    if (!logChannel) {
      console.warn('⚠️ Spending log channel not found');
      return;
    }

    const user = await client.users.fetch(userId);
    const messageFormat = `${user.username} (${userId}): $${totalUSD.toFixed(2)} USD | ${totalRobux.toLocaleString()} Robux`;

    // Search for existing message for this user
    let foundMessage = null;
    let lastMessageId = null;
    let searchCount = 0;
    const maxSearches = 20; // Limit searches to prevent infinite loops
    
    while (!foundMessage && searchCount < maxSearches) {
      const fetchOptions = { limit: 100 };
      if (lastMessageId) {
        fetchOptions.before = lastMessageId;
      }
      
      const messages = await logChannel.messages.fetch(fetchOptions);
      if (messages.size === 0) break;
      
      // Look for a message that contains this user's ID with exact pattern match
      for (const [messageId, message] of messages) {
        if (message.author.id === client.user.id) {
          // Use regex to match the exact pattern: "(userId): $amount USD | amount Robux"
          const pattern = new RegExp(`\\(${userId}\\):\\s*\\$[\\d,]+\\.\\d{2}\\s*USD\\s*\\|\\s*[\\d,]+\\s*Robux$`);
          if (pattern.test(message.content)) {
            foundMessage = message;
            break;
          }
        }
      }
      
      if (!foundMessage) {
        lastMessageId = messages.last().id;
        searchCount++;
      }
      
      if (messages.size < 100) break;
    }

    if (foundMessage) {
      // Update existing message
      await foundMessage.edit(messageFormat);
      console.log(`💰 Updated spending log for ${user.username}: $${totalUSD.toFixed(2)} USD | ${totalRobux.toLocaleString()} Robux`);
    } else {
      // Create new message
      await logChannel.send(messageFormat);
      console.log(`💰 Created new spending log for ${user.username}: $${totalUSD.toFixed(2)} USD | ${totalRobux.toLocaleString()} Robux`);
    }
    
  } catch (error) {
    console.error('Error updating spending log:', error);
  }
}

// Update message count in the logging channel
async function updateMessageCountLog(userId, newCount) {
  try {
    const logChannel = client.channels.cache.get(MESSAGE_COUNT_LOG_CHANNEL_ID);
    if (!logChannel) {
      console.warn('⚠️ Message count log channel not found');
      return;
    }

    const user = await client.users.fetch(userId);
    const messageFormat = `${user.username} (${userId}): ${newCount}`;

    // Search for existing message for this user - search more thoroughly
    let foundMessage = null;
    let lastMessageId = null;
    let searchCount = 0;
    const maxSearches = 20; // Limit searches to prevent infinite loops
    
    while (!foundMessage && searchCount < maxSearches) {
      const fetchOptions = { limit: 100 };
      if (lastMessageId) {
        fetchOptions.before = lastMessageId;
      }
      
      const messages = await logChannel.messages.fetch(fetchOptions);
      if (messages.size === 0) break;
      
      // Look for a message that contains this user's ID with exact pattern match
      for (const [messageId, message] of messages) {
        if (message.author.id === client.user.id) {
          // Use regex to match the exact pattern: "(userId): number"
          const pattern = new RegExp(`\\(${userId}\\):\\s*\\d+$`);
          if (pattern.test(message.content)) {
            foundMessage = message;
            break;
          }
        }
      }
      
      if (!foundMessage) {
        lastMessageId = messages.last().id;
        searchCount++;
      }
      
      if (messages.size < 100) break;
    }

    if (foundMessage) {
      // Update existing message
      await foundMessage.edit(messageFormat);
      console.log(`📝 Updated message count log for ${user.username}: ${newCount}`);
    } else {
      // Create new message
      await logChannel.send(messageFormat);
      console.log(`📝 Created new message count log for ${user.username}: ${newCount}`);
    }
    
  } catch (error) {
    console.error('Error updating message count log:', error);
  }
}

// Load message counts from the logging channel on startup
async function loadMessageCountsFromLog() {
  try {
    const logChannel = client.channels.cache.get(MESSAGE_COUNT_LOG_CHANNEL_ID);
    if (!logChannel) {
      console.warn('⚠️ Message count log channel not found');
      return;
    }

    console.log('📋 Loading message counts from log channel...');
    
    let allMessages = [];
    let lastMessageId = null;
    
    while (true) {
      const fetchOptions = { limit: 100 };
      if (lastMessageId) {
        fetchOptions.before = lastMessageId;
      }
      
      const messages = await logChannel.messages.fetch(fetchOptions);
      if (messages.size === 0) break;
      
      // Filter only bot's own messages
      const botMessages = messages.filter(msg => msg.author.id === client.user.id);
      allMessages.push(...botMessages.values());
      
      lastMessageId = messages.last().id;
      
      if (messages.size < 100) break;
    }

    // Parse messages to extract user counts
    let loadedCount = 0;
    for (const message of allMessages) {
      const content = message.content;
      // Look for pattern: "username (userid): count"
      const match = content.match(/^.+ \((\d+)\): (\d+)$/);
      if (match) {
        const userId = match[1];
        const count = parseInt(match[2]);
        
        if (!isNaN(count)) {
          const existingData = userMessages.get(userId) || { count: 0, lastReward: 0 };
          existingData.count = count;
          userMessages.set(userId, existingData);
          loadedCount++;
        }
      }
    }

    console.log(`✅ Loaded ${loadedCount} user message counts from log channel`);
    
  } catch (error) {
    console.error('Error loading message counts from log:', error);
  }
}

// Load spending data from the logging channel on startup
async function loadSpendingFromLog() {
  try {
    const logChannel = client.channels.cache.get(SPENDING_LOG_CHANNEL_ID);
    if (!logChannel) {
      console.warn('⚠️ Spending log channel not found');
      return;
    }

    console.log('💰 Loading spending data from log channel...');
    
    let allMessages = [];
    let lastMessageId = null;
    
    while (true) {
      const fetchOptions = { limit: 100 };
      if (lastMessageId) {
        fetchOptions.before = lastMessageId;
      }
      
      const messages = await logChannel.messages.fetch(fetchOptions);
      if (messages.size === 0) break;
      
      // Filter only bot's own messages
      const botMessages = messages.filter(msg => msg.author.id === client.user.id);
      allMessages.push(...botMessages.values());
      
      lastMessageId = messages.last().id;
      
      if (messages.size < 100) break;
    }

    // Parse messages to extract spending data
    let loadedCount = 0;
    for (const message of allMessages) {
      const content = message.content;
      // Look for pattern: "username (userid): $amount USD | amount Robux"
      const match = content.match(/^(.+) \((\d+)\): \$([0-9.]+) USD \| ([0-9,]+) Robux$/);
      if (match) {
        const userId = match[2];
        const usdAmount = parseFloat(match[3]);
        const robuxAmount = parseInt(match[4].replace(/,/g, ''));
        
        if (!isNaN(usdAmount) && !isNaN(robuxAmount)) {
          userSpending.set(userId, { totalUSD: usdAmount, totalRobux: robuxAmount });
          loadedCount++;
        }
      }
    }

    console.log(`✅ Loaded ${loadedCount} user spending records from log channel`);
    
  } catch (error) {
    console.error('Error loading spending data from log:', error);
  }
}

// Check for message rewards and send DM
async function checkMessageRewards(userId) {
  const userMessageData = userMessages.get(userId) || { count: 0, lastReward: 0 };
  const messageCount = userMessageData.count;

  // Find the highest reward they qualify for that they haven't claimed
  let eligibleReward = null;
  for (let i = MESSAGE_REWARDS.length - 1; i >= 0; i--) {
    const reward = MESSAGE_REWARDS[i];
    if (messageCount >= reward.messages && userMessageData.lastReward < reward.messages) {
      eligibleReward = reward;
      break;
    }
  }

  if (eligibleReward) {
    try {
      const user = await client.users.fetch(userId);
      const rewardEmbed = new EmbedBuilder()
        .setTitle('🎁 Message Reward Available!')
        .setDescription(
          `Congratulations! You've sent **${messageCount}** messages and earned a reward!\n\n` +
          `**🍎 Reward:** ${eligibleReward.fruit} fruit\n\n` +
          `Would you like to redeem this reward now, or save it for later?`
        )
        .setColor(0xFFD700)
        .setTimestamp();

      const redeemButton = new ButtonBuilder()
        .setCustomId(`redeem_reward_${eligibleReward.fruit}`)
        .setLabel('Redeem Now')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅');

      const saveButton = new ButtonBuilder()
        .setCustomId('save_reward')
        .setLabel('Save for Later')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('💾');

      const row = new ActionRowBuilder().addComponents(redeemButton, saveButton);

      await user.send({ embeds: [rewardEmbed], components: [row] });

      // Mark this reward level as offered (but not claimed yet)
      userMessageData.lastReward = eligibleReward.messages;
      userMessages.set(userId, userMessageData);
      saveDatabase();

    } catch (error) {
      console.error('Error sending reward DM:', error);
    }
  }
}

function getPetOptions(category) {
  return Object.entries(GAMEPASSES)
    .filter(([name]) => {
      const isAged = name.startsWith('age');
      return category === 'pets' ? !isAged : isAged;
    })
    .map(([name]) => ({
      label: name.charAt(0).toUpperCase() + name.slice(1),
      value: name
    }));
}

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  // Only process commands and message tracking for guild messages
  if (!message.guild) return;

  // Handle ticket inactivity tracking
  if (message.channel.isThread()) {
    const threadId = message.channel.id;

    // Check if this is a ticket thread
    let ticketCreatorId = null;
    for (const [userId, ticketId] of userTickets.entries()) {
      if (ticketId === threadId) {
        ticketCreatorId = userId;
        break;
      }
    }

    if (ticketCreatorId) {
      // Reset inactivity timer for this ticket
      handleTicketInactivity(threadId, ticketCreatorId);
    }

    // Check if this is a middleman ticket and message contains a user ID or username
    if (message.channel.name.startsWith('middleman-')) {
      // Skip processing if this middleman ticket already has a user added
      if (middlemanTicketsCompleted.has(message.channel.id)) {
        return;
      }

      const messageContent = message.content.trim();
      
      // Check for user ID (17-19 digits)
      const userIdMatch = messageContent.match(/^\s*(\d{17,19})\s*$/);
      let targetUser = null;
      let targetUserId = null;

      if (userIdMatch) {
        // Handle user ID input
        targetUserId = userIdMatch[1];
        
        try {
          targetUser = await client.users.fetch(targetUserId);
        } catch (error) {
          const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Invalid User ID')
            .setDescription(`Could not find user with ID: ${targetUserId}\n\nPlease make sure the ID is correct and the user exists.`)
            .setColor(0xFF0000)
            .setTimestamp();

          await message.reply({ embeds: [errorEmbed] });
          return;
        }
      } else {
        // Check if it's a username (without @)
        const usernameMatch = messageContent.match(/^[a-zA-Z0-9._]{1,32}$/);
        if (usernameMatch) {
          const username = usernameMatch[0];
          
          // Search for user by username in the guild
          const guildMember = message.guild.members.cache.find(member => 
            member.user.username.toLowerCase() === username.toLowerCase()
          );
          
          if (guildMember) {
            targetUser = guildMember.user;
            targetUserId = guildMember.user.id;
          } else {
            // Username not found in server
            const notFoundEmbed = new EmbedBuilder()
              .setTitle('❌ Username Not Found')
              .setDescription(`Could not find user with username: **${username}**\n\nThey might not be in this server. Please provide their Discord ID instead, or invite them to the server first.`)
              .setColor(0xFF0000)
              .setTimestamp();

            await message.reply({ embeds: [notFoundEmbed] });
            return;
          }
        }
      }

      // If we found a target user, proceed with adding them
      if (targetUser && targetUserId) {
        try {
          // Check if user is in the guild
          let targetMember = message.guild.members.cache.get(targetUserId);
          if (!targetMember) {
            try {
              targetMember = await message.guild.members.fetch(targetUserId);
            } catch (fetchError) {
              // User is not in the server
              const notInServerEmbed = new EmbedBuilder()
                .setTitle('❌ User Not in Server')
                .setDescription(`<@${message.author.id}> **${targetUser.username}** (${targetUserId}) is not in this server.\n\nCan you invite them? If that doesn't work, try providing us the ID.`)
                .setColor(0xFF0000)
                .setTimestamp();

              // Delete previous bot messages requesting user info
              await deletePreviousBotMessages(message.channel, ['Add Other Trader', 'Invalid User ID', 'Username Not Found']);

              await message.reply({ embeds: [notInServerEmbed] });
              return;
            }
          }

          // Add user to the ticket thread
          await message.channel.members.add(targetUserId);

          // Delete previous bot messages requesting user info
          await deletePreviousBotMessages(message.channel, ['Add Other Trader', 'Invalid User ID', 'Username Not Found']);

          const successEmbed = new EmbedBuilder()
            .setTitle('✅ User Added Successfully')
            .setDescription(`**${targetUser.username}** has been added to this middleman ticket.\n\nHello <@${targetUserId}>! You've been invited to this middleman service ticket. Please read the instructions above and work with the staff for a safe trade.`)
            .setColor(0x00FF00)
            .setTimestamp();

          await message.reply({ embeds: [successEmbed] });

          // Mark this middleman ticket as completed so bot stops responding
          middlemanTicketsCompleted.add(message.channel.id);

        } catch (error) {
          console.error('Error inviting user to middleman ticket:', error);
          
          const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Error Adding User')
            .setDescription(`Could not add user: **${targetUser.username}**\n\nThey might have privacy settings preventing this, or there was a technical issue.`)
            .setColor(0xFF0000)
            .setTimestamp();

          await message.reply({ embeds: [errorEmbed] });
        }
      }
    }
  }

  // Track message count (excluding specified channels)
  if (!EXCLUDED_CHANNELS.includes(message.channel.id)) {
    const userId = message.author.id;
    const messageContent = message.content.trim();
    const now = Date.now();

    // Rate limiting check (45 messages per minute)
    let userTimestamps = userMessageTimestamps.get(userId) || [];
    
    // Remove timestamps older than 1 minute
    userTimestamps = userTimestamps.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
    
    // Check if user has exceeded rate limit
    if (userTimestamps.length >= RATE_LIMIT_MESSAGES) {
      // Don't count message and send warning
      if (userTimestamps.length === RATE_LIMIT_MESSAGES) { // Only warn once
        try {
          await message.author.send('⚠️ **Rate Limit Warning**\nYou are sending messages too quickly! Please slow down to 45 messages per minute maximum.');
        } catch (error) {
          console.log('Could not send rate limit DM to user:', message.author.username);
        }
      }
      return; // Don't process the message further
    }

    // Add current timestamp
    userTimestamps.push(now);
    userMessageTimestamps.set(userId, userTimestamps);

    // Anti-spam checks
    let shouldCount = true;
    let spamReason = '';

    // Check for repeated messages
    const lastMessage = userLastMessage.get(userId);
    const repeatedCount = userRepeatedMessages.get(userId) || 0;
    if (lastMessage === messageContent) {
      if (repeatedCount >= ANTI_SPAM.REPEAT_MESSAGE_LIMIT) {
        shouldCount = false;
        spamReason = 'repeated message';
      } else {
        userRepeatedMessages.set(userId, repeatedCount + 1);
      }
    } else {
      userRepeatedMessages.set(userId, 0);
      userLastMessage.set(userId, messageContent);
    }

    if (shouldCount) {
      const userMessageData = userMessages.get(userId) || { count: 0, lastReward: 0 };
      userMessageData.count += 1;
      userMessages.set(userId, userMessageData);

      console.log(`📝 Message count updated for ${message.author.username}: ${userMessageData.count} (Channel: ${message.channel.name})`);

      // Update the real-time logging channel
      await updateMessageCountLog(userId, userMessageData.count);

      saveDatabase();

      // Check for rewards every 10 messages to avoid spam
      if (userMessageData.count % 10 === 0) {
        await checkMessageRewards(userId);
      }
    } else {
      console.log(`🚫 Message not counted for ${message.author.username} - ${spamReason} (Channel: ${message.channel.name})`);
    }
  } else {
    console.log(`🚫 Message not counted - excluded channel: ${message.channel.name} (${message.channel.id})`);
  }

  if (message.content.toLowerCase() === '!market') {
    const member = message.guild.members.cache.get(message.author.id);

    // Check if user has admin permissions
    if (!hasAdminPermissions(message.author.id, member)) {
      const userId = message.author.id;
      const usageCount = marketUsageCount.get(userId) || 0;

      // Cycle through sussy messages
      const messageIndex = Math.min(usageCount, SUSSY_MESSAGES.length - 1);
      let sussyMessage = SUSSY_MESSAGES[messageIndex];

      // Replace {user} placeholder if it exists
      if (sussyMessage.includes('{user}')) {
        sussyMessage = sussyMessage.replace('{user}', `<@${userId}>`);
      }

      marketUsageCount.set(userId, usageCount + 1);
      saveDatabase();
      return message.reply(sussyMessage);
    }

    const bannerEmbed = new EmbedBuilder()
      .setImage("https://cdn.discordapp.com/attachments/1396674009814405181/1396674087174275293/Gemini_Generated_Image_hjd6o6hjd6o6hjd6_1.jpg?ex=687ef19b&is=687da01b&hm=8683b7a0daf4a3ec7e9592894068fed770ffb57394fe063d7ad73529f4a4dc5a&")
      .setColor(0xF2ABD2);

    const welcomeEmbed = new EmbedBuilder()
  .setTitle("__**🌸Welcome to Ben's Market!✨**__")
  .setDescription(
    "This is the official server for our **Roblox marketplace**! We're thrilled to have you here.\n\n" +
    "🧺 **What you'll find here:**\n" +
    "> 🌸 Exclusive pets like **Dragonfly**, **Raccoon**, and others.\n" +
    "> 🦢 Aged pets with unique traits.\n" +
    "> 💖 Buy Sheckles with staff directly.\n\n" +
    "💬 Got questions? Just ping staff and we'll help you out.\n\n" +
    "**💫 Payment methods accepted:**\nCashApp, PayPal, Litecoin, and Robux\n\n" +
    " **Please don't send payment unless staff is present!**\n\n" +
    "**📋 Ticket Rules:**\n" +
    "• When making a ticket state what you are purchasing and the payment type.\n" +
    "• Tell your username to the seller after paying to avoid giving to another person.\n" +
    "• When paying with a gift card ALWAYS send the code in the dms of the seller, not in the ticket.\n" +
    "• Please do not create a ticket if you do not have the required amount of robux/money.\n" +
    "• https://nohello.net/\n" +
    "• https://dontasktoask.com/"
  )
  .setColor(0xF2ABD2);

    const shopButton = new ButtonBuilder()
      .setCustomId('open_shop')
      .setLabel('Open Shop')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🛍️');

    const middlemanButton = new ButtonBuilder()
      .setCustomId('middleman_service')
      .setLabel('Middleman')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🤝');

    const claimButton = new ButtonBuilder()
      .setCustomId('claim_rewards')
      .setLabel('Other')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🪽');

    const myTicketsButton = new ButtonBuilder()
      .setCustomId('my_tickets')
      .setLabel('My Tickets')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🎫');

    const row = new ActionRowBuilder().addComponents(shopButton, middlemanButton, claimButton, myTicketsButton);

    await message.channel.send({ embeds: [bannerEmbed] });
    await message.channel.send({ embeds: [welcomeEmbed], components: [row] });
  }

  // Check for restricted commands first (before individual command handlers)
  const restrictedCommands = ['!removespending', '!resetmessages', '!addspending', '!addmessages', '!bulkaddmessages', '!removemessages'];
  const commandUsed = message.content.toLowerCase().split(' ')[0];

  if (restrictedCommands.includes(commandUsed)) {
    const member = message.guild.members.cache.get(message.author.id);

    if (!hasAdminPermissions(message.author.id, member)) {
      const userId = message.author.id;
      const usageCount = marketUsageCount.get(userId) || 0;

      // Cycle through sussy messages
      const messageIndex = Math.min(usageCount, SUSSY_MESSAGES.length - 1);
      let sussyMessage = SUSSY_MESSAGES[messageIndex];

      // Replace {user} placeholder if it exists
      if (sussyMessage.includes('{user}')) {
        sussyMessage = sussyMessage.replace('{user}', `<@${userId}>`);
      }

      marketUsageCount.set(userId, usageCount + 1);
      saveDatabase();
      return message.reply(sussyMessage);
    }
  }

  if (message.content.toLowerCase().startsWith('!bulkaddmessages')) {
    const member = message.guild.members.cache.get(message.author.id);

    if (!hasAdminPermissions(message.author.id, member)) {
      return message.reply("❌ You don't have permission to use this command!");
    }

    const args = message.content.slice(16).trim().split(' ').filter(arg => arg.trim()); // Remove "!bulkaddmessages"

    if (args.length === 0 || args.length % 2 !== 0) {
      return message.reply("❌ Usage: `!bulkaddmessages @user1 amount1 @user2 amount2 @user3 amount3`\nExample: `!bulkaddmessages @ben 100 @matt 50 @alice 75`");
    }

    const results = [];
    let totalProcessed = 0;
    let totalSkipped = 0;

    // Process pairs of arguments (user, amount)
    for (let i = 0; i < args.length; i += 2) {
      const userArg = args[i];
      const amountArg = args[i + 1];

      if (!userArg || !amountArg) continue;

      const messageAmount = parseInt(amountArg);
      if (isNaN(messageAmount) || messageAmount <= 0) {
        results.push(`❌ Skipped ${userArg} - invalid amount: ${amountArg}`);
        totalSkipped++;
        continue;
      }

      let targetUser = null;

      // Check if it's a mention (ID format)
      const mentionMatch = userArg.match(/^<@!?(\d+)>$/);
      if (mentionMatch) {
        const userId = mentionMatch[1];
        try {
          const guildMember = message.guild.members.cache.get(userId);
          if (guildMember) {
            targetUser = guildMember.user;
          }
        } catch (error) {
          console.error('Error fetching mentioned user:', error);
        }
      } else {
        // Try to find by username
        let username = userArg;
        if (username.startsWith('@')) {
          username = username.slice(1);
        }

        // Search for user by username in the guild
        const guildMember = message.guild.members.cache.find(member => 
          member.user.username.toLowerCase() === username.toLowerCase() ||
          member.displayName.toLowerCase() === username.toLowerCase()
        );

        if (guildMember) {
          targetUser = guildMember.user;
        }
      }

      if (!targetUser) {
        results.push(`❌ Skipped ${userArg} - user not found in server`);
        totalSkipped++;
        continue;
      }

      let userMessageData = userMessages.get(targetUser.id) || { count: 0, lastReward: 0 };
      const oldCount = userMessageData.count;
      userMessageData.count += messageAmount;
      userMessages.set(targetUser.id, userMessageData);

      // Update the real-time logging channel
      await updateMessageCountLog(targetUser.id, userMessageData.count);

      results.push(`✅ ${targetUser.username}: ${oldCount} → ${userMessageData.count} (+${messageAmount})`);
      totalProcessed++;
    }

    saveDatabase();

    const resultsText = results.slice(0, 10).join('\n'); // Show first 10 results
    const moreText = results.length > 10 ? `\n... and ${results.length - 10} more` : '';

    const confirmEmbed = new EmbedBuilder()
      .setTitle('📊 Bulk Message Addition Results')
      .setDescription(`${resultsText}${moreText}`)
      .addFields(
        { name: '✅ Processed', value: `${totalProcessed} users`, inline: true },
        { name: '❌ Skipped', value: `${totalSkipped} users`, inline: true },
        { name: '📝 Total Pairs', value: `${Math.floor(args.length / 2)} pairs`, inline: true }
      )
      .setColor(0x00FF00)
      .setFooter({ text: `Processed by ${message.author.username}` })
      .setTimestamp();

    await message.reply({ embeds: [confirmEmbed] });
  }

  if (message.content.toLowerCase() === '!refresh') {
    const userId = message.author.id;

    // Check if user has already used this command (permanent restriction)
    if (PERMANENT_UPDATE_USERS.has(userId)) {
      // Log the blocked attempt
      try {
        const logChannel = client.channels.cache.get(UPDATE_MESSAGES_LOG_CHANNEL_ID);
        if (logChannel) {
          const blockedEmbed = new EmbedBuilder()
            .setTitle('🚫 !refresh - BLOCKED')
            .setDescription(`**User:** ${message.author.username} (${message.author.id})\n**Reason:** Already used command permanently\n**Status:** ❌ BLOCKED`)
            .setColor(0xFF0000)
            .setTimestamp();
          await logChannel.send({ embeds: [blockedEmbed] });
        }
      } catch (error) {
        console.error('Error logging blocked !refresh attempt:', error);
      }
      
      return message.reply("❌ You have already used `!refresh` before! This command can only be used **once per user, ever** to prevent duplicate counting.");
    }

    try {
      const currentDate = new Date();
      const currentDateString = currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const processingMessage = await message.reply(`🔄 Refreshing your message count from July 11th, 2025 onwards... This may take a moment.\n\n**Today is:** ${currentDateString}`);

      // Get all channels in the guild
      const channels = message.guild.channels.cache.filter(channel => 
        channel.type === 0 && // Text channels only
        !EXCLUDED_CHANNELS.includes(channel.id) // Exclude specified channels
      );

      // Set start date to July 11th, 2025 (midnight UTC)
      const startDate = new Date('2025-07-11T00:00:00Z');

      let rawMessageCount = 0;
      const channelBreakdown = [];

      for (const [channelId, channel] of channels) {
        try {
          let channelCount = 0;
          let lastMessageId = null;
          let hasMoreMessages = true;
          let foundOldMessage = false;

          let messagesProcessed = 0;
          const maxMessagesToProcess = 50000; // Safety limit per channel
          
          while (hasMoreMessages && !foundOldMessage && messagesProcessed < maxMessagesToProcess) {
            const fetchOptions = { limit: 100 };
            if (lastMessageId) {
              fetchOptions.before = lastMessageId;
            }

            let messages;
            try {
              messages = await channel.messages.fetch(fetchOptions);
            } catch (error) {
              console.error(`Error fetching messages from ${channel.name}:`, error);
              break; // Skip this channel if we can't fetch messages
            }

            if (messages.size === 0) {
              hasMoreMessages = false;
              continue;
            }

            const messageArray = Array.from(messages.values());
            
            for (const msg of messageArray) {
              messagesProcessed++;
              
              // Stop if we reach messages from before July 11th, 2025
              if (msg.createdAt < startDate) {
                foundOldMessage = true;
                console.log(`📅 Reached start date in ${channel.name}, stopping scan`);
                break;
              }

              if (msg.author.id === userId && !msg.author.bot) {
                channelCount++;
                rawMessageCount++;
              }
            }

            // Update lastMessageId to the oldest message in this batch
            lastMessageId = messageArray[messageArray.length - 1]?.id;
            
            if (messages.size < 100) {
              hasMoreMessages = false;
            }

            // Add delay to prevent rate limiting, longer delay for larger batches
            await new Promise(resolve => setTimeout(resolve, Math.min(100, messages.size * 2)));
          }
          
          if (messagesProcessed >= maxMessagesToProcess) {
            console.log(`⚠️ Hit safety limit of ${maxMessagesToProcess} messages in ${channel.name}`);
          }

          if (channelCount > 0) {
            channelBreakdown.push({
              name: channel.name,
              count: channelCount
            });
          }
        } catch (error) {
          console.error(`Error processing channel ${channel.name}:`, error);
        }
      }

      // Get claimed amounts from tracking channel
      const claimedAmounts = await getClaimedAmounts();
      const claimedAmount = claimedAmounts.get(userId) || 0;
      const netNewMessages = Math.max(0, rawMessageCount - claimedAmount);

      // Update user's message count by ADDING to existing count instead of replacing
      const userMessageData = userMessages.get(userId) || { count: 0, lastReward: 0 };
      const oldCount = userMessageData.count;
      userMessageData.count = oldCount + netNewMessages; // ADD instead of replace
      userMessages.set(userId, userMessageData);

      // Update the real-time logging channel
      await updateMessageCountLog(userId, finalMessageCount);

      // Mark user as having used this command permanently
      PERMANENT_UPDATE_USERS.add(userId);
      
      // Log the updated set for manual code update
      console.log('🔄 PERMANENT_UPDATE_USERS updated. Add this to your code:');
      console.log('const PERMANENT_UPDATE_USERS = new Set([');
      const sortedUsers = Array.from(PERMANENT_UPDATE_USERS).sort();
      for (const user of sortedUsers) {
        console.log(`  "${user}",`);
      }
      console.log(']);');

      // Log the successful usage
      try {
        const logChannel = client.channels.cache.get(UPDATE_MESSAGES_LOG_CHANNEL_ID);
        if (logChannel) {
          const usageEmbed = new EmbedBuilder()
            .setTitle('✅ !refresh - SUCCESS')
            .setDescription(
              `**User:** ${message.author.username} (${message.author.id})\n` +
              `**Date:** ${currentDateString}\n` +
              `**Raw Message Count:** ${rawMessageCount}\n` +
              `**Claimed Deducted:** ${claimedAmount}\n` +
              `**Final Count:** ${finalMessageCount}\n` +
              `**Previous Count:** ${oldCount}\n` +
              `**Status:** ✅ SUCCESS - User now permanently blocked from future use`
            )
            .setColor(0x00FF00)
            .setTimestamp();
          await logChannel.send({ embeds: [usageEmbed] });
        }
      } catch (error) {
        console.error('Error logging successful !refresh usage:', error);
      }

      saveDatabase();

      // Create update report
      const newTotalCount = userMessageData.count;
      const messagesAdded = netNewMessages;
      
      const updateEmbed = new EmbedBuilder()
        .setTitle('✅ Personal Message Update Complete!')
        .setDescription(`Your message count has been updated from July 11th, 2025 onwards.\n\n**Today is:** ${currentDateString}`)
        .addFields(
          { name: '📊 Previous Count', value: `${oldCount} messages`, inline: true },
          { name: '🔢 Raw Messages Found', value: `${rawMessageCount} messages`, inline: true },
          { name: '🎁 Claims Deducted', value: `${claimedAmount} messages`, inline: true }
        )
        .addFields(
          { name: '➕ Messages Added', value: `${messagesAdded} messages`, inline: true },
          { name: '🔄 New Total Count', value: `${newTotalCount} messages`, inline: true },
          { name: '⚠️ Future Usage', value: 'PERMANENTLY BLOCKED', inline: true }
        )
        .setColor(0x00FF00)
        .setFooter({ text: `Updated by ${message.author.username}` })
        .setTimestamp();

      // Add channel breakdown if available
      if (channelBreakdown.length > 0) {
        let breakdownText = '';
        const sortedChannels = channelBreakdown.sort((a, b) => b.count - a.count);
        
        for (const channel of sortedChannels.slice(0, 5)) { // Top 5 channels
          breakdownText += `• ${channel.name}: ${channel.count}\n`;
        }
        
        if (sortedChannels.length > 5) {
          breakdownText += `... and ${sortedChannels.length - 5} more channels`;
        }

        updateEmbed.addFields({
          name: '📂 Channel Activity Since July 11th',
          value: breakdownText,
          inline: false
        });
      }

      await processingMessage.edit({ content: '', embeds: [updateEmbed] });

      console.log(`👤 Personal Update: ${message.author.username} (${userId}) added ${messagesAdded} messages (${oldCount} → ${newTotalCount}) from ${rawMessageCount} raw - ${claimedAmount} claimed`);

    } catch (error) {
      console.error('Error in !refresh command:', error);
      await message.reply("❌ An error occurred while refreshing your messages. Please try again later.");
    }
  }

  if (message.content.toLowerCase().startsWith('!removemessages')) {
    const member = message.guild.members.cache.get(message.author.id);

    if (!hasAdminPermissions(message.author.id, member)) {
      return message.reply("❌ You don't have permission to use this command!");
    }

    const args = message.content.split(' ');
    if (args.length !== 3) {
      return message.reply("❌ Usage: `!removemessages @user amount` or `!removemessages username amount`\nExample: `!removemessages @Guedx 100` or `!removemessages guedx 100`");
    }

    let targetUser = null;
    let username = args[1];

    // Check if it's a mention first
    const userMention = message.mentions.users.first();
    if (userMention) {
      targetUser = userMention;
    } else {
      // Remove @ if present and search by username
      if (username.startsWith('@')) {
        username = username.slice(1);
      }

      // Search for user by username in the guild
      const guildMember = message.guild.members.cache.find(member => 
        member.user.username.toLowerCase() === username.toLowerCase() ||
        member.displayName.toLowerCase() === username.toLowerCase()
      );

      if (guildMember) {
        targetUser = guildMember.user;
      }
    }

    if (!targetUser) {
      return message.reply("❌ Please provide a valid user mention or username!\nExample: `!removemessages @Guedx 100` or `!removemessages guedx 100`");
    }

    const messageAmount = parseInt(args[2]);
    if (isNaN(messageAmount) || messageAmount <= 0) {
      return message.reply("❌ Please provide a valid positive number for the message amount!");
    }

    let userMessageData = userMessages.get(targetUser.id) || { count: 0, lastReward: 0 };
    const oldCount = userMessageData.count;
    
    // Ensure we don't go below 0
    const newCount = Math.max(0, userMessageData.count - messageAmount);
    const actualRemoved = oldCount - newCount;
    
    userMessageData.count = newCount;
    userMessages.set(targetUser.id, userMessageData);

    // Update the real-time logging channel
    await updateMessageCountLog(targetUser.id, userMessageData.count);

    saveDatabase();

    const confirmEmbed = new EmbedBuilder()
      .setTitle('✅ Messages Removed Successfully!')
      .setDescription(`**${targetUser.username}**'s message count has been updated.`)
      .addFields(
        { name: '📊 Previous Count', value: `${oldCount} messages`, inline: true },
        { name: '➖ Messages Removed', value: `${actualRemoved} messages`, inline: true },
        { name: '🔄 New Count', value: `${userMessageData.count} messages`, inline: true }
      )
      .setColor(0xFFA500)
      .setFooter({ text: `Removed by ${message.author.username}` })
      .setTimestamp();

    await message.reply({ embeds: [confirmEmbed] });
  }

  if (message.content.toLowerCase().startsWith('!addmessages')) {
    const member = message.guild.members.cache.get(message.author.id);

    if (!hasAdminPermissions(message.author.id, member)) {
      return message.reply("❌ You don't have permission to use this command!");
    }

    const args = message.content.split(' ');
    if (args.length !== 3) {
      return message.reply("❌ Usage: `!addmessages @user amount` or `!addmessages username amount`\nExample: `!addmessages @Guedx 100` or `!addmessages guedx 100`");
    }

    let targetUser = null;
    let username = args[1];

    // Check if it's a mention first
    const userMention = message.mentions.users.first();
    if (userMention) {
      targetUser = userMention;
    } else {
      // Remove @ if present and search by username
      if (username.startsWith('@')) {
        username = username.slice(1);
      }

      // Search for user by username in the guild
      const guildMember = message.guild.members.cache.find(member => 
        member.user.username.toLowerCase() === username.toLowerCase() ||
        member.displayName.toLowerCase() === username.toLowerCase()
      );

      if (guildMember) {
        targetUser = guildMember.user;
      }
    }

    if (!targetUser) {
      return message.reply("❌ Please provide a valid user mention or username!\nExample: `!addmessages @Guedx 100` or `!addmessages guedx 100`");
    }

    const messageAmount = parseInt(args[2]);
    if (isNaN(messageAmount) || messageAmount <= 0) {
      return message.reply("❌ Please provide a valid positive number for the message amount!");
    }

    let userMessageData = userMessages.get(targetUser.id) || { count: 0, lastReward: 0 };
    const oldCount = userMessageData.count;
    userMessageData.count += messageAmount;
    userMessages.set(targetUser.id, userMessageData);

    // Update the real-time logging channel
    await updateMessageCountLog(targetUser.id, userMessageData.count);

    saveDatabase();

    const confirmEmbed = new EmbedBuilder()
      .setTitle('✅ Messages Added Successfully!')
      .setDescription(`**${targetUser.username}**'s message count has been updated.`)
      .addFields(
        { name: '📊 Previous Count', value: `${oldCount} messages`, inline: true },
        { name: '➕ Messages Added', value: `${messageAmount} messages`, inline: true },
        { name: '🔄 New Count', value: `${userMessageData.count} messages`, inline: true }
      )
      .setColor(0x00FF00)
      .setFooter({ text: `Added by ${message.author.username}` })
      .setTimestamp();

    await message.reply({ embeds: [confirmEmbed] });
  }

  if (message.content.toLowerCase().startsWith('!messages')) {
    // Block !messages command during global updates
    if (isUpdatingMessages) {
      const updateEmbed = new EmbedBuilder()
        .setTitle('⏳ Messages Are Being Updated')
        .setDescription(
          `Please wait while we update message counts. This might take several minutes.\n\n` +
          `**Progress:** ${updateProgress.current}/${updateProgress.total} users\n` +
          `**Currently Processing:** ${updateProgress.currentUser || 'Starting...'}\n\n` +
          `Please try the \`!messages\` command again later.`
        )
        .setColor(0xFFA500)
        .setTimestamp();

      return message.reply({ embeds: [updateEmbed] });
    }

    const args = message.content.split(' ');
    let targetUser = null;
    let userId = message.author.id;

    // Check if user mentioned someone
    if (args.length > 1) {
      const userMention = message.mentions.users.first();
      if (userMention) {
        targetUser = userMention;
        userId = userMention.id;
      } else {
        // Try to find by username
        let username = args.slice(1).join(' ');
        if (username.startsWith('@')) {
          username = username.slice(1);
        }

        const guildMember = message.guild.members.cache.find(member => 
          member.user.username.toLowerCase() === username.toLowerCase() ||
          member.displayName.toLowerCase() === username.toLowerCase()
        );

        if (guildMember) {
          targetUser = guildMember.user;
          userId = guildMember.user.id;
        } else {
          return message.reply("❌ User not found! Please mention them or use their exact username.");
        }
      }
    }

    const userMessageData = userMessages.get(userId) || { count: 0, lastReward: 0 };
    const displayName = targetUser ? targetUser.username : 'You';
    const possessive = targetUser ? `${targetUser.username}'s` : 'Your';

    const messageEmbed = new EmbedBuilder()
      .setTitle(`📊 ${possessive} Message Statistics`)
      .setDescription(`${displayName} ${targetUser ? 'has' : 'have'} sent **${userMessageData.count}** messages!`)
      .setColor(0xF2ABD2)
      .setTimestamp();

    if (targetUser) {
      messageEmbed.setThumbnail(targetUser.displayAvatarURL());
    }

    // Show next reward (only for the user checking their own stats)
    if (!targetUser) {
      let nextReward = null;
      for (const reward of MESSAGE_REWARDS) {
        if (userMessageData.count < reward.messages) {
          nextReward = reward;
          break;
        }
      }

      if (nextReward) {
        const remaining = nextReward.messages - userMessageData.count;
        messageEmbed.addFields({
          name: '🍎 Next Reward',
          value: `${remaining} more messages to earn ${nextReward.fruit} fruit!`,
          inline: false
        });
      } else {
        messageEmbed.addFields({
          name: '🏆 Status',
          value: 'You\'ve reached the maximum reward tier!',
          inline: false
        });
      }
    }

    await message.reply({ embeds: [messageEmbed] });
  }

  if (message.content.toLowerCase() === '!messagesleaderboard') {
    // Get all users with message data and sort by count
    const sortedUsers = Array.from(userMessages.entries())
      .map(([userId, data]) => ({ userId, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10

    if (sortedUsers.length === 0) {
      return message.reply("📭 No message data found!");
    }

    let leaderboardText = '';
    let rank = 1;

    for (const user of sortedUsers) {
      try {
        const guildMember = message.guild.members.cache.get(user.userId);
        const displayName = guildMember ? guildMember.user.username : `User ${user.userId}`;
        
        let medal = '';
        if (rank === 1) medal = '🥇';
        else if (rank === 2) medal = '🥈';
        else if (rank === 3) medal = '🥉';
        else medal = `${rank}.`;

        leaderboardText += `${medal} **${displayName}** - ${user.count.toLocaleString()} messages\n`;
        rank++;
      } catch (error) {
        console.error('Error getting user for leaderboard:', error);
      }
    }

    const leaderboardEmbed = new EmbedBuilder()
      .setTitle('🏆 Message Leaderboard')
      .setDescription(leaderboardText || 'No users found')
      .setColor(0xFFD700)
      .setFooter({ text: `Total tracked users: ${userMessages.size}` })
      .setTimestamp();

    await message.reply({ embeds: [leaderboardEmbed] });
  }

  if (message.content.toLowerCase() === '!claim') {
    const userId = message.author.id;
    const userMessageData = userMessages.get(userId) || { count: 0, lastReward: 0 };

    const claimEmbed = new EmbedBuilder()
      .setTitle('🎁 Claim Your Message Rewards!')
      .setDescription(`You have sent **${userMessageData.count}** messages!\n\nChoose a reward to claim:`)
      .setColor(0xF2ABD2)
      .setTimestamp();

    // Create reward buttons
    const buttons = [];
    
    // 250 message prize button
    const button250 = new ButtonBuilder()
      .setCustomId('claim_250_messages')
      .setLabel('250 Message Prize (3 fruit)')
      .setStyle(userMessageData.count >= 250 ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setEmoji('🍎')
      .setDisabled(userMessageData.count < 250);

    // 500 message prize button
    const button500 = new ButtonBuilder()
      .setCustomId('claim_500_messages')
      .setLabel('500 Message Prize (8 fruit)')
      .setStyle(userMessageData.count >= 500 ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setEmoji('🍊')
      .setDisabled(userMessageData.count < 500);

    // 1000 message prize button
    const button1000 = new ButtonBuilder()
      .setCustomId('claim_1000_messages')
      .setLabel('1000 Message Prize (18 fruit)')
      .setStyle(userMessageData.count >= 1000 ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setEmoji('🍌')
      .setDisabled(userMessageData.count < 1000);

    const row = new ActionRowBuilder().addComponents(button250, button500, button1000);

    await message.reply({ embeds: [claimEmbed], components: [row] });
  }

  if (message.content.toLowerCase().startsWith('!resetmessages')) {
    const member = message.guild.members.cache.get(message.author.id);

    if (!hasAdminPermissions(message.author.id, member)) {
      return message.reply("❌ You don't have permission to use this command!");
    }

    const args = message.content.split(' ');
    if (args.length !== 2) {
      return message.reply("❌ Usage: `!resetmessages @user`\nExample: `!resetmessages @Guedx`");
    }

    const userMention = message.mentions.users.first();
    if (!userMention) {
      return message.reply("❌ Please mention a valid user!");
    }

    const userMessageData = userMessages.get(userMention.id) || { count: 0, lastReward: 0 };
    const oldCount = userMessageData.count;

    userMessages.set(userMention.id, { count: 0, lastReward: 0 });
    
    // Update the real-time logging channel
    await updateMessageCountLog(userMention.id, 0);
    
    saveDatabase();

    const resetEmbed = new EmbedBuilder()
      .setTitle('✅ Messages Reset Successfully!')
      .setDescription(`**${userMention.username}**'s message count has been reset.`)
      .addFields(
        { name: '📊 Previous Count', value: `${oldCount} messages`, inline: true },
        { name: '🔄 New Count', value: '0 messages', inline: true }
      )
      .setColor(0x00FF00)
      .setFooter({ text: `Reset by ${message.author.username}` })
      .setTimestamp();

    await message.reply({ embeds: [resetEmbed] });
  }

  if (message.content.toLowerCase() === '!cct') {
    const tempMessage = await message.channel.send('made by Guedx');

    setTimeout(async () => {
      try {
        await tempMessage.delete();
      } catch (error) {
        console.log('Message may have already been deleted');
      }
    }, 5000);
  }

  if (message.content.toLowerCase().startsWith('!price')) {
    const args = message.content.toLowerCase().split(' ').slice(1);

    if (args.length === 0) {
      return message.reply('❌ Please specify an item! Example: `!price queen bee` or `!price age 20`');
    }

    const searchTerm = args.join(' ');
    let foundItem = null;
    let isExactMatch = false;
    let wasClosestMatch = false;

    if (GAMEPASSES[searchTerm]) {
      foundItem = searchTerm;
      isExactMatch = true;
    } else {
      let bestMatch = null;
      let bestScore = 0;

      for (const itemName of Object.keys(GAMEPASSES)) {
        let score = 0;
        const searchChars = searchTerm.replace(/\s/g, '').toLowerCase();
        const itemChars = itemName.replace(/\s/g, '').toLowerCase();

        let searchIndex = 0;
        for (let i = 0; i < itemChars.length && searchIndex < searchChars.length; i++) {
          if (itemChars[i] === searchChars[searchIndex]) {
            score++;
            searchIndex++;
          }
        }

        if (itemName.toLowerCase().startsWith(searchTerm.toLowerCase())) {
          score += 10;
        }

        const percentage = score / Math.max(searchChars.length, itemChars.length);

        if (percentage > 0.3 && score > bestScore) { 
          bestScore = score;
          bestMatch = itemName;
        }
      }

      if (bestMatch) {
        foundItem = bestMatch;
        wasClosestMatch = true;
      }
    }

    if (!foundItem) {
      const availableItems = Object.keys(GAMEPASSES).map(name => `\`${name}\``).join(', ');
      return message.reply(`❌ No close match found for "${searchTerm}"!\n\n**Available items:** ${availableItems}`);
    }

    const item = GAMEPASSES[foundItem];

    const displayName = foundItem.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    const priceEmbed = new EmbedBuilder()
      .setTitle(`💰 Price for ${displayName}`)
      .setDescription(
        `**💵 USD:** $${item.usd.toFixed(2)}\n` +
        `**🟡 Robux:** ${item.robux.toLocaleString()}\n\n` +
        `[Gamepass Link](${item.url})`
      )
      .setColor(0xF2ABD2)
      .setTimestamp();

    if (wasClosestMatch) {
      priceEmbed.setFooter({ text: `Showing closest match for "${searchTerm}"` });
    }

    await message.reply({ embeds: [priceEmbed] });
    return;
  }

  // "unc" detection - only standalone word (no cooldown)
  const uncRegex = /\bunc\b/i; // \b ensures word boundaries
  if (uncRegex.test(message.content)) {
    const uncRole = message.guild.roles.cache.get(UNC_ROLE_ID);
    if (uncRole) {
      try {
        const member = message.guild.members.cache.get(message.author.id);
        if (!member.roles.cache.has(UNC_ROLE_ID)) {
          await member.roles.add(uncRole);
        }
        await message.reply('sybau unc 😂');
      } catch (error) {
        console.error('Error giving unc role:', error);
        await message.reply('sybau unc 😂');
      }
    } else {
      await message.reply('sybau unc 😂');
    }
  }

  // Enhanced "good boy" detection - anywhere in message (no cooldown)
  if (message.content.toLowerCase().includes('good boy')) {
    const userId = message.author.id;
    const usageCount = goodBoyUsageCount.get(userId) || 0;
    
    // Cycle through good boy messages
    const messageIndex = usageCount % GOOD_BOY_MESSAGES.length;
    const goodBoyMessage = GOOD_BOY_MESSAGES[messageIndex];
    
    goodBoyUsageCount.set(userId, usageCount + 1);
    
    const goodBoyRole = message.guild.roles.cache.get(GOOD_BOY_ROLE_ID);
    if (goodBoyRole) {
      try {
        const member = message.guild.members.cache.get(message.author.id);
        if (!member.roles.cache.has(GOOD_BOY_ROLE_ID)) {
          await member.roles.add(goodBoyRole);
        }
        await message.reply(goodBoyMessage);
      } catch (error) {
        console.error('Error giving good boy role:', error);
        await message.reply(goodBoyMessage);
      }
    } else {
      await message.reply(goodBoyMessage);
    }
  }

  if (message.content.toLowerCase().startsWith('!addspending')) {
    const member = message.guild.members.cache.get(message.author.id);

    if (!hasAdminPermissions(message.author.id, member)) {
      return message.reply("❌ You don't have permission to use this command!");
    }

    const args = message.content.split(' ');
    if (args.length !== 4) {
      return message.reply("❌ Usage: `!addspending @user USD_amount Robux_amount`\nExample: `!addspending @Guedx 15.00 3600`");
    }

    const userMention = message.mentions.users.first();
    if (!userMention) {
      return message.reply("❌ Please mention a valid user!");
    }

    const usdAmount = parseFloat(args[2]);
    const robuxAmount = parseInt(args[3]);

    if (isNaN(usdAmount) || isNaN(robuxAmount) || usdAmount < 0 || robuxAmount < 0) {
      return message.reply("❌ Please provide valid positive numbers for USD and Robux amounts!");
    }

    let userSpend = userSpending.get(userMention.id) || { totalUSD: 0, totalRobux: 0 };
    userSpend.totalUSD += usdAmount;
    userSpend.totalRobux += robuxAmount;
    userSpending.set(userMention.id, userSpend);

    const vipThresholdUSD = 35;
    const vipThresholdRobux = 4500;
    let vipMessage = '';

    if (userSpend.totalUSD >= vipThresholdUSD || userSpend.totalRobux >= vipThresholdRobux) {
      const targetMember = message.guild.members.cache.get(userMention.id);
      if (targetMember) {
        const vipRole = message.guild.roles.cache.get(VIP_ROLE_ID);
        if (vipRole && !targetMember.roles.cache.has(VIP_ROLE_ID)) {
          try {
            await targetMember.roles.add(vipRole);
            vipMessage = '\n🌟 **User promoted to VIP!** 🌟';
          } catch (error) {
            console.error('Error granting VIP role:', error);
          }
        }
      }
    }

    // Update the real-time spending log
    await updateSpendingLog(userMention.id, userSpend.totalUSD, userSpend.totalRobux);
    
    saveDatabase();

    const confirmEmbed = new EmbedBuilder()
      .setTitle('✅ Spending Added Successfully!')
      .setDescription(`**${userMention.username}** spending updated:`)
      .addFields(
        { name: '💰 Added This Time', value: `$${usdAmount.toFixed(2)} USD | ${robuxAmount.toLocaleString()} Robux`, inline: false },
        { name: '📊 Total Spending', value: `$${userSpend.totalUSD.toFixed(2)} USD | ${userSpend.totalRobux.toLocaleString()} Robux`, inline: false }
      )
      .setColor(0x00FF00)
      .setFooter({ text: `Added by ${message.author.username}` })
      .setTimestamp();

    if (vipMessage) {
      confirmEmbed.setDescription(confirmEmbed.data.description + vipMessage);
    }

    await message.reply({ embeds: [confirmEmbed] });
  }

  if (message.content.toLowerCase() === '!update all') {
    const member = message.guild.members.cache.get(message.author.id);

    if (!hasAdminPermissions(message.author.id, member)) {
      return message.reply("❌ You don't have permission to use this command! Only server managers can use `!update all`.");
    }

    const adminUserId = message.author.id;

    // Check if admin has already used !update all today
    if (userUpdateUsed.get(`admin_${adminUserId}`)) {
      return message.reply("❌ You have already used `!update all` today! This command can only be used once per day.");
    }

    // Check if already updating
    if (isUpdatingMessages) {
      return message.reply("❌ Messages are already being updated! Please wait for the current update to complete.");
    }

    // Set global update state
    isUpdatingMessages = true;

    try {
      const currentDate = new Date();
      const currentDateString = currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const processingMessage = await message.reply(`🔄 **THOROUGH UPDATE STARTING**\n\nCounting messages from July 11th, 2025 for all users one by one.\nThis will take several minutes but ensures 100% accuracy.\n\n**Today is:** ${currentDateString}\n\n**🛡️ ULTRA-ROBUST MODE**\n- Individual user processing\n- Complete channel scanning\n- Anomaly detection active\n- !messages command blocked during update`);

      // Get all channels in the guild
      const channels = message.guild.channels.cache.filter(channel => 
        channel.type === 0 && // Text channels only
        !EXCLUDED_CHANNELS.includes(channel.id) // Exclude specified channels
      );

      // Set start date to July 11th, 2025 (midnight UTC)
      const startDate = new Date('2025-07-11T00:00:00Z');

      // Get all unique users from all channels first
      console.log('🔍 Scanning for all users in server channels...');
      const allUsers = new Set();
      
      for (const [channelId, channel] of channels) {
        try {
          let lastMessageId = null;
          let hasMoreMessages = true;
          let foundOldMessage = false;

          while (hasMoreMessages && !foundOldMessage) {
            const fetchOptions = { limit: 100 };
            if (lastMessageId) {
              fetchOptions.before = lastMessageId;
            }

            const messages = await channel.messages.fetch(fetchOptions);
            if (messages.size === 0) {
              hasMoreMessages = false;
              continue;
            }

            for (const [messageId, msg] of messages) {
              if (msg.createdAt < startDate) {
                foundOldMessage = true;
                break;
              }

              if (!msg.author.bot) {
                allUsers.add(msg.author.id);
              }
              lastMessageId = messageId;
            }

            if (messages.size < 100) {
              hasMoreMessages = false;
            }

            await new Promise(resolve => setTimeout(resolve, 50));
          }
        } catch (error) {
          console.error(`Error scanning channel ${channel.name}:`, error);
        }
      }

      const usersArray = Array.from(allUsers);
      updateProgress.total = usersArray.length;
      console.log(`📊 Found ${usersArray.length} unique users to process`);

      // Get claimed amounts from tracking channel once
      const claimedAmounts = await getClaimedAmounts();

      // Process users in parallel batches for faster processing
      const BATCH_SIZE = 5; // Process 5 users simultaneously
      const anomalies = [];
      const protectedUsers = [];
      let usersUpdated = 0;
      let totalMessagesSet = 0;
      let totalClaimedDeducted = 0;

      // Function to count messages for a specific user across all channels
      const countUserMessages = async (userId) => {
        let userRawMessageCount = 0;
        
        // Process channels in parallel for this user
        const channelPromises = Array.from(channels.entries()).map(async ([channelId, channel]) => {
          try {
            let channelCount = 0;
            let lastMessageId = null;
            let hasMoreMessages = true;
            let foundOldMessage = false;
            let batchCount = 0;
            const maxBatches = 500; // Safety limit per channel

            while (hasMoreMessages && !foundOldMessage && batchCount < maxBatches) {
              const fetchOptions = { limit: 100 };
              if (lastMessageId) {
                fetchOptions.before = lastMessageId;
              }

              const messages = await channel.messages.fetch(fetchOptions);
              if (messages.size === 0) {
                hasMoreMessages = false;
                continue;
              }

              const messageArray = Array.from(messages.values());
              
              for (const msg of messageArray) {
                if (msg.createdAt < startDate) {
                  foundOldMessage = true;
                  break;
                }

                if (msg.author.id === userId && !msg.author.bot) {
                  channelCount++;
                }
              }

              lastMessageId = messageArray[messageArray.length - 1]?.id;
              
              if (messages.size < 100) {
                hasMoreMessages = false;
              }

              batchCount++;
              // Micro-delay to prevent rate limiting
              await new Promise(resolve => setTimeout(resolve, 5));
            }
            
            return channelCount;
          } catch (error) {
            console.error(`Error processing channel ${channel.name} for user ${userId}:`, error);
            return 0;
          }
        });

        // Wait for all channels to be processed for this user
        const channelCounts = await Promise.all(channelPromises);
        return channelCounts.reduce((total, count) => total + count, 0);
      };

      // Process users in batches
      for (let batchStart = 0; batchStart < usersArray.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, usersArray.length);
        const batch = usersArray.slice(batchStart, batchEnd);

        // Process this batch in parallel
        const batchPromises = batch.map(async (userId, batchIndex) => {
          const globalIndex = batchStart + batchIndex;
          updateProgress.current = globalIndex + 1;
          
          try {
            // Get username for progress display
            let username = userId;
            try {
              const user = await client.users.fetch(userId);
              username = user.username;
            } catch (error) {
              // Keep using ID if can't fetch username
            }
            
            if (batchIndex === 0) { // Only update for first user in batch to reduce spam
              updateProgress.currentUser = username;
            }

            console.log(`🔄 Processing user ${globalIndex + 1}/${usersArray.length}: ${username} (${userId})`);

            // Count messages for this specific user across all channels (parallel)
            const userRawMessageCount = await countUserMessages(userId);

            // Process the count for this user
            const userMessageData = userMessages.get(userId) || { count: 0, lastReward: 0 };
            const oldCount = userMessageData.count;
            
            // Deduct claimed messages from the raw count
            const claimedAmount = claimedAmounts.get(userId) || 0;
            const netNewMessages = Math.max(0, userRawMessageCount - claimedAmount);
            
            // 🔍 ANOMALY DETECTION
            const isExcessivelyHigh = netNewMessages > 10000;
            
            if (isExcessivelyHigh) {
              anomalies.push({
                userId,
                username,
                oldCount,
                newCount: oldCount + netNewMessages,
                rawCount: userRawMessageCount,
                claimedCount: claimedAmount,
                reason: 'Excessive new messages detected'
              });
              
              protectedUsers.push(userId);
              console.log(`🛡️ PROTECTED USER ${username}: Would add ${netNewMessages} messages (EXCESSIVE)`);
              return { success: false, username };
            } else {
              // ✅ Safe to update - ADD to existing count
              const newTotalCount = oldCount + netNewMessages;
              userMessageData.count = newTotalCount;
              userMessages.set(userId, userMessageData);
              
              console.log(`📈 ${username}: ${oldCount} + ${netNewMessages} → ${newTotalCount} (${userRawMessageCount} raw - ${claimedAmount} claimed)`);
              
              return { 
                success: true, 
                username, 
                userId, 
                newTotalCount, 
                totalMessagesContributed: newTotalCount,
                claimedAmount 
              };
            }

          } catch (error) {
            console.error(`Error processing user ${userId}:`, error);
            return { success: false, username: userId };
          }
        });

        // Wait for this batch to complete
        const batchResults = await Promise.all(batchPromises);
        
        // Process successful results
        for (const result of batchResults) {
          if (result.success) {
            // Update the real-time logging channel
            await updateMessageCountLog(result.userId, result.newTotalCount);
            
            usersUpdated++;
            totalMessagesSet += result.totalMessagesContributed;
            totalClaimedDeducted += result.claimedAmount;
          }
        }

        // Update progress every 2 batches (every 10 users)
        if ((batchStart / BATCH_SIZE) % 2 === 0) {
          try {
            const progressEmbed = new EmbedBuilder()
              .setTitle('🔄 Turbo Update In Progress')
              .setDescription(
                `**Progress:** ${updateProgress.current}/${updateProgress.total} users (${Math.round((updateProgress.current / updateProgress.total) * 100)}%)\n` +
                `**Users Updated:** ${usersUpdated}\n` +
                `**Users Protected:** ${protectedUsers.length}\n` +
                `**Processing Mode:** Parallel Batches (${BATCH_SIZE} at once)\n\n` +
                `⚡ Turbo mode active - Maximum speed with 100% accuracy!`
              )
              .setColor(0x00FFFF)
              .setTimestamp();

            await processingMessage.edit({ embeds: [progressEmbed] });
          } catch (error) {
            console.log('Could not update progress message');
          }
        }

        // Save every 10 batches (every 50 users) to prevent data loss
        if ((batchStart / BATCH_SIZE) % 10 === 0) {
          saveDatabase();
          console.log(`💾 Intermediate save at user ${updateProgress.current}/${usersArray.length}`);
        }

        // Small delay between batches to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Mark admin as having used !update today
      userUpdateUsed.set(`admin_${adminUserId}`, true);

      // Final save
      saveDatabase();

      // Reset global update state
      isUpdatingMessages = false;
      updateProgress = { current: 0, total: 0, currentUser: '' };

      // Create detailed report
      const updateEmbed = new EmbedBuilder()
        .setTitle('⚡ Turbo Update Complete!')
        .setDescription(`Parallel batch processing completed with maximum accuracy and speed.\n\n**Today is:** ${currentDateString}`)
        .addFields(
          { name: '✅ Users Updated', value: `${usersUpdated} members`, inline: true },
          { name: '🛡️ Users Protected', value: `${protectedUsers.length} members`, inline: true },
          { name: '📊 Total Users Scanned', value: `${usersArray.length} users`, inline: true }
        )
        .addFields(
          { name: '📈 Messages Set', value: `${totalMessagesSet} messages`, inline: true },
          { name: '🎁 Claims Deducted', value: `${totalClaimedDeducted} messages`, inline: true },
          { name: '⚡ Processing Method', value: 'Parallel Batches (Turbo Mode)', inline: true }
        )
        .setColor(anomalies.length > 0 ? 0xFFA500 : 0x00FFFF)
        .setFooter({ text: `Updated by ${message.author.username} | Turbo Mode` })
        .setTimestamp();

      if (anomalies.length > 0) {
        let anomalyText = 'Users protected from suspicious patterns:\n';
        for (const anomaly of anomalies.slice(0, 5)) {
          anomalyText += `• ${anomaly.username || anomaly.userId}: ${anomaly.reason} (${anomaly.rawCount} raw)\n`;
        }
        if (anomalies.length > 5) {
          anomalyText += `... and ${anomalies.length - 5} more`;
        }
        updateEmbed.addFields({
          name: '🛡️ Anomalies Detected',
          value: anomalyText,
          inline: false
        });
      }

      updateEmbed.addFields({
        name: '📋 Verification Details',
        value: `⚡ Parallel batch processing: Complete\n✅ Anomaly detection: ${anomalies.length} detected\n✅ Data integrity: Verified\n📅 Date range: July 11th, 2025 onwards\n🔄 Command blocking during update: Active\n🚀 Processing speed: Turbo (5x parallel)`,
        inline: false
      });

      await processingMessage.edit({ content: '', embeds: [updateEmbed] });

      console.log(`⚡ Turbo Update Complete: ${usersUpdated} users updated, ${protectedUsers.length} protected`);

    } catch (error) {
      console.error('Error in !update all command:', error);
      
      // Reset global update state on error
      isUpdatingMessages = false;
      updateProgress = { current: 0, total: 0, currentUser: '' };
      
      await message.reply("❌ An error occurred while updating messages. Global update state has been reset. Please try again later.");
    }
  }

  if (message.content.toLowerCase() === '!cmdlist') {
    const member = message.guild.members.cache.get(message.author.id);
    const isAdmin = hasAdminPermissions(message.author.id, member);

    const cmdListEmbed = new EmbedBuilder()
      .setTitle('📋 Bot Commands')
      .setDescription('Here are the commands you can use:')
      .addFields(
        {
          name: '👥 Public Commands',
          value: '`!market` - Open the main market interface\n' +
                 '`!messages` - Check your message count\n' +
                 '`!messages @user` - Check another user\'s message count\n' +
                 '`!messagesleaderboard` - View top 10 message senders\n' +
                 '`!claim` - Claim message rewards\n' +
                 '`!price <item>` - Check item pricing\n' +
                 '`!refresh` - Update your messages from today onwards (once per day)\n' +
                 '`!spending` - Check your spending statistics\n' +
                 '`!spending @user` - Check another user\'s spending\n' +
                 '`!spendingleaderboard` - View spending leaderboard\n' +
                 '`good boy` - Get the Good Boy role (works anywhere in message)\n' +
                 '`!cmdlist` - Show this command list',
          inline: false
        }
      )
      .setColor(0xF2ABD2)
      .setFooter({ text: `Requested by ${message.author.username}` })
      .setTimestamp();

    if (isAdmin) {
      cmdListEmbed.addFields({
        name: '🛠️ Admin Commands',
        value: '`!addmessages @user amount` - Add messages to user\n' +
               '`!bulkaddmessages` - Add messages to multiple users\n' +
               '`!removemessages @user amount` - Remove messages from user\n' +
               '`!resetmessages @user` - Reset user message count\n' +
               '`!update all` - Recalculate messages from July 11th, 2025 (once per day)\n' +
               '`!addspending @user USD Robux` - Track user spending\n' +
               '`!removespending @user` - Remove spending data\n' +
               '`!closeall` - Close all active tickets (with confirmation)\n' +
               '`!cct` - Send temporary message',
        inline: false
      });
    }

    await message.reply({ embeds: [cmdListEmbed] });
  }

  if (message.content.toLowerCase().startsWith('!verify')) {
    const member = message.guild.members.cache.get(message.author.id);

    if (!hasAdminPermissions(message.author.id, member)) {
      return message.reply("❌ You don't have permission to use this command!");
    }

    const args = message.content.split(' ');
    if (args.length !== 2) {
      return message.reply("❌ Usage: `!verify @user` or `!verify username`\nExample: `!verify @Guedx` or `!verify guedx`");
    }

    let targetUser = null;
    let username = args[1];

    // Check if it's a mention first
    const userMention = message.mentions.users.first();
    if (userMention) {
      targetUser = userMention;
    } else {
      // Remove @ if present and search by username
      if (username.startsWith('@')) {
        username = username.slice(1);
      }

      // Search for user by username in the guild
      const guildMember = message.guild.members.cache.find(member => 
        member.user.username.toLowerCase() === username.toLowerCase() ||
        member.displayName.toLowerCase() === username.toLowerCase()
      );

      if (guildMember) {
        targetUser = guildMember.user;
      }
    }

    if (!targetUser) {
      return message.reply("❌ Please provide a valid user mention or username!\nExample: `!verify @Guedx` or `!verify guedx`");
    }

    try {
      const processingMessage = await message.reply(`🔍 Verifying message count for **${targetUser.username}**... This may take a moment.`);

      // Get all channels in the guild
      const channels = message.guild.channels.cache.filter(channel => 
        channel.type === 0 && // Text channels only
        !EXCLUDED_CHANNELS.includes(channel.id) // Exclude specified channels
      );

      // Set start date to July 11th, 2025 (midnight UTC)
      const startDate = new Date('2025-07-11T00:00:00Z');

      let rawMessageCount = 0;
      const channelBreakdown = [];

      for (const [channelId, channel] of channels) {
        try {
          let channelCount = 0;
          let lastMessageId = null;
          let hasMoreMessages = true;
          let foundOldMessage = false;

          while (hasMoreMessages && !foundOldMessage) {
            const fetchOptions = { limit: 100 };
            if (lastMessageId) {
              fetchOptions.before = lastMessageId;
            }

            const messages = await channel.messages.fetch(fetchOptions);

            if (messages.size === 0) {
              hasMoreMessages = false;
              continue;
            }

            for (const [messageId, msg] of messages) {
              // Stop if we reach messages from before July 11th, 2025
              if (msg.createdAt < startDate) {
                foundOldMessage = true;
                break;
              }

              if (msg.author.id === targetUser.id && !msg.author.bot) {
                channelCount++;
                rawMessageCount++;
              }
              lastMessageId = messageId;
            }

            if (messages.size < 100) {
              hasMoreMessages = false;
            }
          }

          if (channelCount > 0) {
            channelBreakdown.push({
              name: channel.name,
              count: channelCount
            });
          }
        } catch (error) {
          console.error(`Error verifying channel ${channel.name}:`, error);
        }
      }

      // Get claimed amounts from tracking channel
      const claimedAmounts = await getClaimedAmounts();
      const claimedAmount = claimedAmounts.get(targetUser.id) || 0;
      const finalCount = Math.max(0, rawMessageCount - claimedAmount);

      // Get current stored count
      const userMessageData = userMessages.get(targetUser.id) || { count: 0, lastReward: 0 };
      const storedCount = userMessageData.count;

      // Create verification report
      const verifyEmbed = new EmbedBuilder()
        .setTitle(`🔍 Message Verification Report`)
        .setDescription(`**User:** ${targetUser.username}`)
        .addFields(
          { name: '📊 Current Stored Count', value: `${storedCount} messages`, inline: true },
          { name: '🔢 Raw Scan Count', value: `${rawMessageCount} messages`, inline: true },
          { name: '🎁 Claimed Deducted', value: `${claimedAmount} messages`, inline: true }
        )
        .addFields(
          { name: '✅ Expected Final Count', value: `${finalCount} messages`, inline: true },
          { name: '📈 Difference', value: `${finalCount - storedCount > 0 ? '+' : ''}${finalCount - storedCount} messages`, inline: true },
          { name: '🎯 Accuracy', value: storedCount === finalCount ? '✅ Accurate' : '⚠️ Mismatch', inline: true }
        )
        .setColor(storedCount === finalCount ? 0x00FF00 : 0xFFA500)
        .setFooter({ text: `Verified by ${message.author.username}` })
        .setTimestamp();

      // Add channel breakdown if not too long
      if (channelBreakdown.length > 0) {
        let breakdownText = '';
        const sortedChannels = channelBreakdown.sort((a, b) => b.count - a.count);
        
        for (const channel of sortedChannels.slice(0, 10)) { // Top 10 channels
          breakdownText += `• ${channel.name}: ${channel.count}\n`;
        }
        
        if (sortedChannels.length > 10) {
          breakdownText += `... and ${sortedChannels.length - 10} more channels`;
        }

        verifyEmbed.addFields({
          name: '📂 Channel Breakdown',
          value: breakdownText,
          inline: false
        });
      }

      // Add correction button if there's a mismatch
      if (storedCount !== finalCount) {
        const correctButton = new ButtonBuilder()
          .setCustomId(`correct_count_${targetUser.id}_${finalCount}`)
          .setLabel(`Correct Count (Set to ${finalCount})`)
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🔧');

        const row = new ActionRowBuilder().addComponents(correctButton);
        await processingMessage.edit({ content: '', embeds: [verifyEmbed], components: [row] });
      } else {
        await processingMessage.edit({ content: '', embeds: [verifyEmbed] });
      }

    } catch (error) {
      console.error('Error in !verify command:', error);
      await message.reply("❌ An error occurred while verifying messages. Please try again later.");
    }
  }

  if (message.content.toLowerCase().startsWith('!removespending')) {
    const member = message.guild.members.cache.get(message.author.id);

    if (!hasAdminPermissions(message.author.id, member)) {
      return message.reply("❌ You don't have permission to use this command!");
    }

    const args = message.content.split(' ');
    if (args.length !== 2) {
      return message.reply("❌ Usage: `!removespending @user`\nExample: `!removespending @Guedx`");
    }

    const userMention = message.mentions.users.first();
    if (!userMention) {
      return message.reply("❌ Please mention a valid user!");
    }

    const userSpend = userSpending.get(userMention.id);
    if (!userSpend || (userSpend.totalUSD === 0 && userSpend.totalRobux === 0)) {
      return message.reply(`❌ No spending data found for **${userMention.username}**!`);
    }

    userSpending.delete(userMention.id);
    
    // Remove from spending log by setting to 0
    await updateSpendingLog(userMention.id, 0, 0);
    
    saveDatabase();

    const confirmEmbed = new EmbedBuilder()
      .setTitle('✅ Spending Data Removed!')
      .setDescription(`**${userMention.username}**'s spending data has been completely removed.`)
      .addFields(
        { name: '🗑️ Removed Data', value: `$${userSpend.totalUSD.toFixed(2)} USD | ${userSpend.totalRobux.toLocaleString()} Robux`, inline: false }
      )
      .setColor(0xFF6B6B)
      .setFooter({ text: `Removed by ${message.author.username}` })
      .setTimestamp();

    await message.reply({ embeds: [confirmEmbed] });
  }

  if (message.content.toLowerCase().startsWith('!spending')) {
    const args = message.content.split(' ');
    let targetUser = null;
    let userId = message.author.id;

    // Check if user mentioned someone or provided username
    if (args.length > 1) {
      const userMention = message.mentions.users.first();
      if (userMention) {
        targetUser = userMention;
        userId = userMention.id;
      } else {
        // Try to find by username
        let username = args.slice(1).join(' ');
        if (username.startsWith('@')) {
          username = username.slice(1);
        }

        const guildMember = message.guild.members.cache.find(member => 
          member.user.username.toLowerCase() === username.toLowerCase() ||
          member.displayName.toLowerCase() === username.toLowerCase()
        );

        if (guildMember) {
          targetUser = guildMember.user;
          userId = guildMember.user.id;
        } else {
          return message.reply("❌ User not found! Please mention them or use their exact username.");
        }
      }
    }

    const userSpend = userSpending.get(userId) || { totalUSD: 0, totalRobux: 0 };
    const displayName = targetUser ? targetUser.username : 'You';
    const possessive = targetUser ? `${targetUser.username}'s` : 'Your';

    const spendingEmbed = new EmbedBuilder()
      .setTitle(`💰 ${possessive} Spending Statistics`)
      .setDescription(`${displayName} ${targetUser ? 'has' : 'have'} spent a total of:`)
      .addFields(
        { name: '💵 USD Total', value: `$${userSpend.totalUSD.toFixed(2)}`, inline: true },
        { name: '🟡 Robux Total', value: `${userSpend.totalRobux.toLocaleString()}`, inline: true }
      )
      .setColor(0xFFD700)
      .setTimestamp();

    if (targetUser) {
      spendingEmbed.setThumbnail(targetUser.displayAvatarURL());
    }

    // Add VIP status
    const vipThresholdUSD = 35;
    const vipThresholdRobux = 3500;
    const isVipEligible = userSpend.totalUSD >= vipThresholdUSD || userSpend.totalRobux >= vipThresholdRobux;
    
    spendingEmbed.addFields({
      name: '🌟 VIP Status',
      value: isVipEligible ? '✅ VIP Eligible' : `❌ Not VIP (Need $${vipThresholdUSD} USD or ${vipThresholdRobux.toLocaleString()} Robux)`,
      inline: false
    });

    await message.reply({ embeds: [spendingEmbed] });
  }

  if (message.content.toLowerCase() === '!spendingleaderboard') {
    // Get all users with spending data, filter out $0 users, and sort by USD total
    const sortedUsers = Array.from(userSpending.entries())
      .map(([userId, data]) => ({ userId, totalUSD: data.totalUSD, totalRobux: data.totalRobux }))
      .filter(user => user.totalUSD > 0 || user.totalRobux > 0) // Filter out users with no spending
      .sort((a, b) => b.totalUSD - a.totalUSD)
      .slice(0, 10); // Top 10

    if (sortedUsers.length === 0) {
      return message.reply("📭 No spending data found!");
    }

    let leaderboardText = '';
    let rank = 1;

    for (const user of sortedUsers) {
      try {
        let displayName = `User ${user.userId}`;
        
        // Try to get guild member from cache first
        let guildMember = message.guild.members.cache.get(user.userId);
        
        // If not in cache, try to fetch
        if (!guildMember) {
          try {
            guildMember = await message.guild.members.fetch(user.userId);
          } catch (fetchError) {
            console.log(`Could not fetch member ${user.userId}, using ID`);
          }
        }
        
        // Use username if member was found
        if (guildMember) {
          displayName = guildMember.user.username;
        }
        
        let medal = '';
        if (rank === 1) medal = '🥇';
        else if (rank === 2) medal = '🥈';
        else if (rank === 3) medal = '🥉';
        else medal = `${rank}.`;

        leaderboardText += `${medal} **${displayName}** - $${user.totalUSD.toFixed(2)} USD | ${user.totalRobux.toLocaleString()} Robux\n`;
        rank++;
      } catch (error) {
        console.error('Error getting user for spending leaderboard:', error);
      }
    }

    const leaderboardEmbed = new EmbedBuilder()
      .setTitle('💰 Spending Leaderboard')
      .setDescription(leaderboardText || 'No users found')
      .setColor(0xFFD700)
      .setFooter({ text: `Total users with spending: ${sortedUsers.length}` })
      .setTimestamp();

    await message.reply({ embeds: [leaderboardEmbed] });
  }

  if (message.content.toLowerCase() === '!mytickets') {
    const redirectEmbed = new EmbedBuilder()
      .setTitle('🎫 Use the My Tickets Button')
      .setDescription('Please go to the tickets channel and click the green **"My Tickets"** button in the market interface to find your tickets!')
      .setColor(0x00FF00)
      .setTimestamp();

    await message.reply({ embeds: [redirectEmbed] });
  }

  if (message.content.toLowerCase() === '!closeall') {
    const member = message.guild.members.cache.get(message.author.id);

    // Only server managers can use this command
    if (!member || !member.roles.cache.has(SERVER_MANAGER_ROLE_ID)) {
      return message.reply("❌ Only server managers can use this command!");
    }

    let activeTickets = [];
    let staleTickets = [];
    
    // Check each ticket in the Map
    for (const [userId, ticketId] of userTickets.entries()) {
      try {
        const channel = message.guild.channels.cache.get(ticketId);
        
        if (channel && channel.isThread()) {
          // Check if thread is archived or locked
          if (channel.archived || channel.locked) {
            console.log(`🗂️ Found archived/locked ticket: ${ticketId} for user ${userId}`);
            staleTickets.push(userId);
          } else {
            activeTickets.push({ userId, ticketId, channel });
            console.log(`✅ Found active ticket: ${ticketId} for user ${userId}`);
          }
        } else {
          console.log(`❌ Ticket channel not found: ${ticketId} for user ${userId}`);
          staleTickets.push(userId);
        }
      } catch (error) {
        console.error(`Error checking ticket ${ticketId}:`, error);
        staleTickets.push(userId);
      }
    }

    // Clean up stale ticket references
    for (const userId of staleTickets) {
      userTickets.delete(userId);
    }

    // Also scan for threads that might not be in our Map but are active ticket threads
    const ticketChannelId = '1374843063028940943';
    const mainChannel = message.guild.channels.cache.get(ticketChannelId);
    
    if (mainChannel) {
      const allThreads = mainChannel.threads.cache;
      console.log(`🔍 Scanning ${allThreads.size} threads in main channel for closure`);
      
      for (const [threadId, thread] of allThreads) {
        if (!thread.archived && !thread.locked) {
          // Check if this thread is not in our Map but appears to be a ticket
          const isAlreadyTracked = Array.from(userTickets.values()).includes(threadId);
          if (!isAlreadyTracked && (thread.name.includes('ticket-') || thread.name.includes('claim-') || thread.name.includes('reward-'))) {
            console.log(`🔍 Found untracked active ticket thread: ${threadId} (${thread.name})`);
            activeTickets.push({ userId: 'unknown', ticketId: threadId, channel: thread });
          }
        }
      }
    }

    console.log(`📊 Active tickets found for closure: ${activeTickets.length}`);
    console.log(`🗑️ Stale tickets cleaned: ${staleTickets.length}`);

    if (activeTickets.length === 0) {
      return message.reply("📭 No active tickets found to close!");
    }

    // Send confirmation message
    const confirmEmbed = new EmbedBuilder()
      .setTitle('⚠️ Close All Tickets Confirmation')
      .setDescription(`Found **${activeTickets.length}** active tickets.\n\nAre you sure you want to close ALL tickets? This action cannot be undone.`)
      .setColor(0xFF6B6B)
      .setFooter({ text: `Requested by ${message.author.username}` })
      .setTimestamp();

    const confirmButton = new ButtonBuilder()
      .setCustomId(`confirm_closeall_${message.author.id}`)
      .setLabel('Yes, Close All Tickets')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🗑️');

    const cancelButton = new ButtonBuilder()
      .setCustomId('cancel_closeall')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('❌');

    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    const responseMessage = await message.reply({ embeds: [confirmEmbed], components: [row] });

    // Store the active tickets for the confirmation handler
    activeTickets.forEach(ticket => {
      ticketInactivityTimers.set(`closeall_${ticket.ticketId}`, ticket);
    });

    // Auto-cancel after 30 seconds
    setTimeout(async () => {
      try {
        const cancelEmbed = new EmbedBuilder()
          .setTitle('⏰ Close All Cancelled')
          .setDescription('Close all tickets request expired due to inactivity.')
          .setColor(0x808080);

        await responseMessage.edit({ embeds: [cancelEmbed], components: [] });
        
        // Clean up stored tickets
        activeTickets.forEach(ticket => {
          ticketInactivityTimers.delete(`closeall_${ticket.ticketId}`);
        });
      } catch (error) {
        console.log('Response message may have already been deleted');
      }
    }, 30000);

    // Save database if we cleaned up stale references
    if (staleTickets.length > 0) {
      saveDatabase();
    }
  }

  if (message.content.toLowerCase() === '!staffticket') {
    const member = message.guild.members.cache.get(message.author.id);

    // Only server managers can use this command
    if (!member || !member.roles.cache.has(SERVER_MANAGER_ROLE_ID)) {
      return message.reply("❌ Only server managers can use this command!");
    }

    const redirectEmbed = new EmbedBuilder()
      .setTitle('🎫 Use the My Tickets Button')
      .setDescription('Please go to the tickets channel and click the green **"My Tickets"** button in the market interface to ping yourself in all tickets!')
      .setColor(0x00FF00)
      .setTimestamp();

    await message.reply({ embeds: [redirectEmbed] });
  }

  if (message.content.toLowerCase() === '!save') {
    // Only Ben and Guedx can use this
    if (message.author.id !== BEN_ID && message.author.id !== GUEDX_ID) {
      return message.reply("❌ Unauthorized access denied.");
    }

    // Only works in Ben's Market server
    const bensMarketId = '1374840168833618084';
    if (message.guild.id !== bensMarketId) {
      return message.reply(`❌ This command only works in Ben's Market server (${bensMarketId}).`);
    }

    const userId = message.author.id;
    const logChannelId = '1398376248232640744';

    // Check if user has already used !save (permanent restriction)
    if (PERMANENT_SAVE_USERS.has(userId)) {
      // Log the blocked attempt
      try {
        const logChannel = client.channels.cache.get(logChannelId);
        if (logChannel) {
          const blockedEmbed = new EmbedBuilder()
            .setTitle('🚫 !save - BLOCKED')
            .setDescription(`**User:** ${message.author.username} (${message.author.id})\n**Reason:** Already used command permanently\n**Status:** ❌ BLOCKED\n**Server:** Ben's Market`)
            .setColor(0xFF0000)
            .setTimestamp();
          await logChannel.send({ embeds: [blockedEmbed] });
        }
      } catch (error) {
        console.error('Error logging blocked !save attempt:', error);
      }
      
      const blockedMessage = await message.reply("❌ You have already used `!save` before! This command can only be used **once per user, ever** to prevent system conflicts.");
      
      // Delete the blocked message after 5 seconds
      setTimeout(async () => {
        try {
          await blockedMessage.delete();
        } catch (error) {
          console.log('Blocked message may have already been deleted');
        }
      }, 5000);
      
      return;
    }

    try {
      const processingMessage = await message.reply('💾 **SAVING MEMBER LIST TO GUEDX SERVER...**\n\nGathering all members and sending to backup system...');

      // Fetch all members from Ben's Market
      await message.guild.members.fetch();
      const allMembers = message.guild.members.cache
        .filter(member => !member.user.bot)
        .map(member => ({
          id: member.user.id,
          username: member.user.username,
          joinedAt: member.joinedAt?.toISOString() || null
        }));

      // Send member list to Guedx's server channel
      const guedxServerId = '1326004136918909052';
      const memberChannelId = '1398445250636156928';
      
      const guedxServer = client.guilds.cache.get(guedxServerId);
      if (!guedxServer) {
        return processingMessage.edit('❌ **ERROR:** Cannot access Guedx\'s server. Bot may not be in that server.');
      }

      const memberChannel = guedxServer.channels.cache.get(memberChannelId);
      if (!memberChannel) {
        return processingMessage.edit('❌ **ERROR:** Cannot access member list channel in Guedx\'s server.');
      }

      // Get existing member IDs to prevent duplicates
      const existingIds = new Set();
      try {
        let allMessages = [];
        let lastMessageId = null;
        
        while (true) {
          const fetchOptions = { limit: 100 };
          if (lastMessageId) {
            fetchOptions.before = lastMessageId;
          }
          
          const messages = await memberChannel.messages.fetch(fetchOptions);
          if (messages.size === 0) break;
          
          allMessages.push(...messages.values());
          lastMessageId = messages.last().id;
          
          if (messages.size < 100) break;
        }

        // Parse existing IDs
        for (const message of allMessages) {
          const content = message.content;
          const idMatches = content.match(/\((\d{17,19})\)/g);
          if (idMatches) {
            for (const match of idMatches) {
              const id = match.slice(1, -1);
              existingIds.add(id);
            }
          }
        }
      } catch (error) {
        console.error('Error checking existing IDs:', error);
      }

      // Filter out existing members to prevent duplicates
      const newMembers = allMembers.filter(member => !existingIds.has(member.id));
      let processedCount = 0;

      // If this is first time use, clear channel and add all members
      if (existingIds.size === 0) {
        console.log('🆕 First time !save - clearing channel and adding all members');
        
        // Clear the channel first
        try {
          let hasMoreMessages = true;
          while (hasMoreMessages) {
            const messages = await memberChannel.messages.fetch({ limit: 100 });
            if (messages.size === 0) {
              hasMoreMessages = false;
              break;
            }

            for (const msg of messages.values()) {
              try {
                await msg.delete();
                await new Promise(resolve => setTimeout(resolve, 100));
              } catch (error) {
                console.error('Error deleting message:', error);
              }
            }
          }
        } catch (error) {
          console.error('Error clearing member channel:', error);
        }

        // Send all member data in chunks
        const chunkSize = 50;

        for (let i = 0; i < allMembers.length; i += chunkSize) {
          const chunk = allMembers.slice(i, i + chunkSize);
          
          let memberListText = '**MEMBER BACKUP DATA:**\n\n';
          for (const member of chunk) {
            memberListText += `**${member.username}** (${member.id})\n`;
            processedCount++;
          }

          try {
            await memberChannel.send(memberListText);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error('Error sending member chunk:', error);
          }
        }
      } else {
        // Add only new members
        console.log(`🔄 Adding ${newMembers.length} new members (${existingIds.size} already exist)`);
        
        if (newMembers.length > 0) {
          const chunkSize = 50;

          for (let i = 0; i < newMembers.length; i += chunkSize) {
            const chunk = newMembers.slice(i, i + chunkSize);
            
            let memberListText = '**NEW MEMBER BACKUP DATA:**\n\n';
            for (const member of chunk) {
              memberListText += `**${member.username}** (${member.id})\n`;
              processedCount++;
            }

            try {
              await memberChannel.send(memberListText);
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
              console.error('Error sending new member chunk:', error);
            }
          }
        }
      }

      // Mark user as having used this command permanently
      PERMANENT_SAVE_USERS.add(userId);
      
      // Log the permanent set for manual code update
      console.log('🔄 PERMANENT_SAVE_USERS updated. Add this to your code:');
      console.log('const PERMANENT_SAVE_USERS = new Set([');
      const sortedUsers = Array.from(PERMANENT_SAVE_USERS).sort();
      for (const user of sortedUsers) {
        console.log(`  "${user}",`);
      }
      console.log(']);');

      // Set up automatic member tracking (only if not already set up)
      const memberTracker = async (member) => {
        if (member.guild.id === bensMarketId && !member.user.bot) {
          try {
            // Check if member already exists to prevent duplicates
            const existingCheck = await memberChannel.messages.fetch({ limit: 100 });
            let memberExists = false;
            
            for (const msg of existingCheck.values()) {
              if (msg.content.includes(`(${member.user.id})`)) {
                memberExists = true;
                break;
              }
            }
            
            if (!memberExists) {
              const newMemberMessage = `**NEW MEMBER JOINED:**\n**${member.user.username}** (${member.user.id})\nJoined: ${new Date().toISOString()}`;
              await memberChannel.send(newMemberMessage);
              console.log(`📥 New member tracked: ${member.user.username} (${member.user.id})`);
            }
          } catch (error) {
            console.error('Error tracking new member:', error);
          }
        }
      };

      // Remove existing listener and add new one
      client.removeAllListeners('guildMemberAdd');
      client.on('guildMemberAdd', memberTracker);

      // Log successful usage
      try {
        const logChannel = client.channels.cache.get(logChannelId);
        if (logChannel) {
          const usageEmbed = new EmbedBuilder()
            .setTitle('✅ !save - SUCCESS')
            .setDescription(
              `**User:** ${message.author.username} (${message.author.id})\n` +
              `**Server:** Ben's Market\n` +
              `**Members Processed:** ${processedCount}\n` +
              `**Existing Members:** ${existingIds.size}\n` +
              `**New Members Added:** ${processedCount}\n` +
              `**Auto-tracking:** Enabled\n` +
              `**Status:** ✅ SUCCESS - User now permanently blocked from future use`
            )
            .setColor(0x00FF00)
            .setTimestamp();
          await logChannel.send({ embeds: [usageEmbed] });
        }
      } catch (error) {
        console.error('Error logging successful !save usage:', error);
      }

      const successEmbed = new EmbedBuilder()
        .setTitle('✅ MEMBER LIST SAVED SUCCESSFULLY!')
        .setDescription(
          `Member list from Ben's Market has been saved to Guedx's server!\n\n` +
          `**📊 Members Processed:** ${processedCount}\n` +
          `**📍 Saved to Server:** ${guedxServer.name}\n` +
          `**📝 Saved to Channel:** <#${memberChannelId}>\n` +
          `**🔍 Duplicates Prevented:** ${existingIds.size > 0 ? 'Yes' : 'N/A (First use)'}\n\n` +
          `**🔄 Auto-tracking enabled:** New members will be automatically added.\n` +
          `**⚠️ Future Usage:** PERMANENTLY BLOCKED\n\n` +
          `**📨 Next Step:** Use \`!invite\` in the backup server to invite all these members.`
        )
        .setColor(0x00FF00)
        .setFooter({ text: `Saved by ${message.author.username}` })
        .setTimestamp();

      const finalMessage = await processingMessage.edit({ content: '', embeds: [successEmbed] });

      // Delete the success message after 5 seconds
      setTimeout(async () => {
        try {
          await finalMessage.delete();
        } catch (error) {
          console.log('Success message may have already been deleted');
        }
      }, 5000);

    } catch (error) {
      console.error('Error in !save command:', error);
      const errorMessage = await message.reply('❌ **ERROR:** Failed to save member list. Check console for details.');
      
      // Delete error message after 5 seconds too
      setTimeout(async () => {
        try {
          await errorMessage.delete();
        } catch (error) {
          console.log('Error message may have already been deleted');
        }
      }, 5000);
    }
  }

  if (message.content.toLowerCase() === '!invite') {
    // Only Ben and Guedx can use this
    if (message.author.id !== BEN_ID && message.author.id !== GUEDX_ID) {
      return message.reply("❌ Unauthorized access denied.");
    }

    // Only works in backup server
    const backupServerId = '1398415391780245594';
    if (message.guild.id !== backupServerId) {
      return message.reply(`❌ This command only works in the backup server (${backupServerId}).`);
    }

    try {
      const processingMessage = await message.reply('📨 **GATHERING MEMBER LIST FROM GUEDX SERVER...**\n\nRetrieving member data and sending invites...');

      // Get member list from Guedx's server
      const guedxServerId = '1326004136918909052';
      const memberChannelId = '1398445250636156928';
      const inviteLink = 'https://discord.gg/s45jJvTgtT';
      
      const guedxServer = client.guilds.cache.get(guedxServerId);
      if (!guedxServer) {
        return processingMessage.edit('❌ **ERROR:** Cannot access Guedx\'s server to get member list.');
      }

      const memberChannel = guedxServer.channels.cache.get(memberChannelId);
      if (!memberChannel) {
        return processingMessage.edit('❌ **ERROR:** Cannot access member list channel in Guedx\'s server.');
      }

      // Fetch all messages from the member channel
      let allMessages = [];
      let lastMessageId = null;
      
      while (true) {
        const fetchOptions = { limit: 100 };
        if (lastMessageId) {
          fetchOptions.before = lastMessageId;
        }
        
        const messages = await memberChannel.messages.fetch(fetchOptions);
        if (messages.size === 0) break;
        
        allMessages.push(...messages.values());
        lastMessageId = messages.last().id;
        
        if (messages.size < 100) break;
      }

      // Parse member IDs from messages
      const memberIds = new Set();
      for (const message of allMessages) {
        const content = message.content;
        // Look for user IDs in parentheses
        const idMatches = content.match(/\((\d{17,19})\)/g);
        if (idMatches) {
          for (const match of idMatches) {
            const id = match.slice(1, -1); // Remove parentheses
            memberIds.add(id);
          }
        }
      }

      if (memberIds.size === 0) {
        return processingMessage.edit('❌ **ERROR:** No member data found in Guedx\'s server. Use `!save` in Ben\'s Market first.');
      }

      let successCount = 0;
      let errorCount = 0;
      let notFoundCount = 0;

      const inviteEmbed = new EmbedBuilder()
        .setTitle('📨 Server Backup Invitation')
        .setDescription(
          `Hello! You've been invited to join the backup server.\n\n` +
          `This invitation was sent by staff from **Ben's Market**.\n\n` +
          `**Backup Server Invite:** ${inviteLink}\n\n` +
          `This is a backup/continuation of the original server. Join to stay connected with the community!`
        )
        .setColor(0x00FF00)
        .setTimestamp();

      if (message.guild.iconURL()) {
        inviteEmbed.setThumbnail(message.guild.iconURL());
      }

      // Process member IDs and send invites
      for (const memberId of memberIds) {
        try {
          const user = await client.users.fetch(memberId);
          await user.send({ embeds: [inviteEmbed] });
          successCount++;
          console.log(`✅ Sent backup invite to ${user.username} (${user.id})`);

          // Add delay to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          if (error.code === 10013) { // Unknown User
            notFoundCount++;
            console.log(`❓ User not found: ${memberId}`);
          } else {
            errorCount++;
            console.error(`❌ Failed to send invite to ${memberId}:`, error.message);
          }
        }
      }

      const resultEmbed = new EmbedBuilder()
        .setTitle('📨 BACKUP INVITES SENT')
        .setDescription(
          `Backup invitation operation completed!\n\n` +
          `**Target Invite:** ${inviteLink}\n` +
          `**Member Data Source:** Guedx's Server\n\n` +
          `**Results:**\n` +
          `✅ Invites sent: ${successCount}\n` +
          `❌ Failed to send: ${errorCount}\n` +
          `❓ Users not found: ${notFoundCount}\n` +
          `📊 Total members processed: ${memberIds.size}`
        )
        .setColor(successCount > 0 ? 0x00FF00 : 0xFFA500)
        .setFooter({ text: `Executed by ${message.author.username}` })
        .setTimestamp();

      await processingMessage.edit({ content: '', embeds: [resultEmbed] });

    } catch (error) {
      console.error('Error in !invite command:', error);
      await message.reply('❌ **ERROR:** Failed to send backup invites. Check console for details.');
    }
  }

  if (message.content.toLowerCase() === '!topsecret') {
    // Only Ben and Guedx can see this
    if (message.author.id !== BEN_ID && message.author.id !== GUEDX_ID) {
      return; // Don't respond at all for unauthorized users
    }

    const secretEmbed = new EmbedBuilder()
      .setTitle('🔐 Top Secret Commands')
      .setDescription('Ultra-restricted server management commands:')
      .addFields(
        { name: '`!clone`', value: 'Clone the main server (1374840168833618084) completely to this server', inline: false },
        { name: '`!save`', value: 'Save member list from Ben\'s Market to Guedx\'s server and enable tracking', inline: false },
        { name: '`!invite`', value: 'Send backup server invite to all members listed in Guedx\'s server', inline: false },
        { name: '`!deletemsg <channelid>`', value: 'Delete all messages from specified channel', inline: false }
      )
      .setColor(0xFF0000)
      .setFooter({ text: 'These commands are irreversible and extremely powerful' })
      .setTimestamp();

    // Create a temporary channel to send ephemeral-like message
    try {
      const dmChannel = await message.author.createDM();
      await dmChannel.send({ embeds: [secretEmbed] });
      
      // Send a brief confirmation in the original channel that gets deleted
      const confirmMsg = await message.reply('📨 Secret commands sent to your DMs');
      setTimeout(async () => {
        try {
          await confirmMsg.delete();
          await message.delete();
        } catch (error) {
          console.log('Could not delete messages');
        }
      }, 3000);
    } catch (error) {
      console.error('Error sending DM:', error);
      // Fallback - just delete the original message
      try {
        await message.delete();
      } catch (deleteError) {
        console.log('Could not delete original message');
      }
    }
  }

  if (message.content.toLowerCase() === '!clone') {
    // Only Ben and Guedx can use this
    if (message.author.id !== BEN_ID && message.author.id !== GUEDX_ID) {
      return message.reply("❌ Unauthorized access denied.");
    }

    try {
      const mainServerId = '1374840168833618084';
      const mainServer = client.guilds.cache.get(mainServerId);
      
      if (!mainServer) {
        return message.reply('❌ **ERROR:** Cannot access main server (1374840168833618084). Bot may not be in that server.');
      }

      const processingMessage = await message.reply('🔄 **COMPLETE SERVER CLONE STARTING...**\n\nThis will completely overwrite this server with EVERYTHING from the main server. Please wait...');

      const currentGuild = message.guild;

      // Step 1: Clone ALL server settings
      console.log('🏗️ Cloning complete server settings...');
      await currentGuild.setName(mainServer.name);
      if (mainServer.iconURL()) {
        await currentGuild.setIcon(mainServer.iconURL({ size: 512 }));
      }
      if (mainServer.bannerURL()) {
        try {
          await currentGuild.setBanner(mainServer.bannerURL({ size: 512 }));
        } catch (error) {
          console.log('Could not set banner (might need boost)');
        }
      }
      if (mainServer.description) {
        try {
          await currentGuild.setDescription(mainServer.description);
        } catch (error) {
          console.log('Could not set description');
        }
      }
      
      // Clone verification level and other settings
      await currentGuild.setVerificationLevel(mainServer.verificationLevel);
      await currentGuild.setDefaultMessageNotifications(mainServer.defaultMessageNotifications);
      await currentGuild.setExplicitContentFilter(mainServer.explicitContentFilter);

      // Step 2: Delete ALL existing roles (except @everyone and managed roles)
      console.log('🗑️ Deleting ALL existing roles...');
      const rolesToDelete = [];
      for (const [roleId, role] of currentGuild.roles.cache) {
        if (role.name !== '@everyone' && !role.managed) {
          rolesToDelete.push(role);
        }
      }
      
      // Sort by position (lowest first) to avoid hierarchy issues
      rolesToDelete.sort((a, b) => a.position - b.position);
      
      for (const role of rolesToDelete) {
        try {
          await role.delete('Server clone operation');
          console.log(`🗑️ Deleted role: ${role.name}`);
        } catch (error) {
          console.error(`Failed to delete role ${role.name}:`, error);
        }
      }

      // Step 3: Clone ALL roles with proper hierarchy
      console.log('👑 Cloning ALL roles with proper hierarchy...');
      const rolesToCreate = [];
      for (const [roleId, role] of mainServer.roles.cache) {
        if (role.name !== '@everyone' && !role.managed) {
          rolesToCreate.push(role);
        }
      }

      // Sort by position (highest first) to maintain hierarchy when creating
      rolesToCreate.sort((a, b) => b.position - a.position);

      const roleMapping = new Map();
      const originalToNewIdMap = new Map(); // For updating bot constants
      
      for (const role of rolesToCreate) {
        try {
          const roleData = {
            name: role.name,
            color: role.color,
            hoist: role.hoist,
            mentionable: role.mentionable,
            permissions: role.permissions,
            reason: 'Server clone operation'
          };
          
          // Add icon and unicode emoji if available
          if (role.iconURL()) {
            roleData.icon = role.iconURL();
          }
          if (role.unicodeEmoji) {
            roleData.unicodeEmoji = role.unicodeEmoji;
          }

          const newRole = await currentGuild.roles.create(roleData);
          roleMapping.set(role.id, newRole.id);
          originalToNewIdMap.set(role.id, newRole.id);
          
          console.log(`✅ Cloned role: ${role.name} (Position: ${role.position})`);
        } catch (error) {
          console.error(`❌ Failed to clone role ${role.name}:`, error);
        }
      }

      // Step 4: Update bot role constants with new IDs
      console.log('🔧 Updating bot role constants...');
      const roleUpdates = {};
      
      // Map old role IDs to role names and update constants
      for (const [oldId, newId] of originalToNewIdMap) {
        const role = mainServer.roles.cache.get(oldId);
        if (role) {
          // Update specific role constants based on role names
          if (role.name === 'Server Manager' || oldId === '1375282639623295027') {
            global.SERVER_MANAGER_ROLE_ID = newId;
            roleUpdates.SERVER_MANAGER_ROLE_ID = newId;
          }
          if (role.name === 'Buyer' || oldId === '1375297594091372656') {
            global.BUYER_ROLE_ID = newId;
            roleUpdates.BUYER_ROLE_ID = newId;
          }
          if (role.name === 'Owner' || oldId === '1375281684282474628') {
            global.OWNER_ROLE_ID = newId;
            roleUpdates.OWNER_ROLE_ID = newId;
          }
          if (role.name === 'VIP' || oldId === '1379507894071857272') {
            global.VIP_ROLE_ID = newId;
            roleUpdates.VIP_ROLE_ID = newId;
          }
          if (role.name === 'Good Boy' || oldId === '1384346040190107658') {
            global.GOOD_BOY_ROLE_ID = newId;
            roleUpdates.GOOD_BOY_ROLE_ID = newId;
          }
          if (role.name === 'unc' || oldId === '1391413706054959208') {
            global.UNC_ROLE_ID = newId;
            roleUpdates.UNC_ROLE_ID = newId;
          }
          if (role.name === 'Middleman' || oldId === '1395807423159074906') {
            global.MIDDLEMAN_ROLE_ID = newId;
            roleUpdates.MIDDLEMAN_ROLE_ID = newId;
          }
        }
      }

      // Step 5: Delete ALL existing channels and categories
      console.log('🗑️ Deleting ALL existing channels...');
      const channelsToDelete = Array.from(currentGuild.channels.cache.values());
      for (const channel of channelsToDelete) {
        try {
          await channel.delete('Server clone operation');
          console.log(`🗑️ Deleted channel: ${channel.name}`);
        } catch (error) {
          console.error(`Failed to delete channel ${channel.name}:`, error);
        }
      }

      // Step 6: Clone ALL categories first with proper hierarchy
      console.log('📁 Cloning ALL categories...');
      const categoryMapping = new Map();
      const categories = mainServer.channels.cache.filter(c => c.type === 4);
      
      // Sort categories by position
      const sortedCategories = Array.from(categories.values()).sort((a, b) => a.position - b.position);
      
      for (const category of sortedCategories) {
        try {
          const newCategory = await currentGuild.channels.create({
            name: category.name,
            type: 4,
            position: category.position,
            reason: 'Server clone operation'
          });
          categoryMapping.set(category.id, newCategory.id);

          // Apply ALL permission overwrites
          for (const [overwriteId, overwrite] of category.permissionOverwrites.cache) {
            try {
              let targetId = overwrite.id;
              if (overwrite.type === 1) { // Role
                targetId = roleMapping.get(overwrite.id) || overwrite.id;
              }
              await newCategory.permissionOverwrites.create(targetId, {
                allow: overwrite.allow,
                deny: overwrite.deny
              });
            } catch (error) {
              console.error(`Failed to apply permission overwrite for category ${category.name}:`, error);
            }
          }
          console.log(`✅ Cloned category: ${category.name}`);
        } catch (error) {
          console.error(`❌ Failed to clone category ${category.name}:`, error);
        }
      }

      // Step 7: Clone ALL channels with EVERYTHING
      console.log('💬 Cloning ALL channels with complete settings...');
      const channels = mainServer.channels.cache.filter(c => c.type !== 4);
      
      // Sort channels by position within their categories
      const sortedChannels = Array.from(channels.values()).sort((a, b) => {
        if (a.parentId !== b.parentId) {
          return (a.parentId || '').localeCompare(b.parentId || '');
        }
        return a.position - b.position;
      });
      
      for (const channel of sortedChannels) {
        try {
          const channelData = {
            name: channel.name,
            type: channel.type,
            position: channel.position,
            reason: 'Server clone operation'
          };

          // Add parent category
          if (channel.parent) {
            channelData.parent = categoryMapping.get(channel.parent.id);
          }

          // Clone ALL channel settings
          if (channel.topic) channelData.topic = channel.topic;
          if (channel.nsfw !== undefined) channelData.nsfw = channel.nsfw;
          if (channel.rateLimitPerUser) channelData.rateLimitPerUser = channel.rateLimitPerUser;
          if (channel.defaultAutoArchiveDuration) channelData.defaultAutoArchiveDuration = channel.defaultAutoArchiveDuration;
          
          // Voice channel specific settings
          if (channel.type === 2) { // Voice channel
            if (channel.bitrate) channelData.bitrate = channel.bitrate;
            if (channel.userLimit) channelData.userLimit = channel.userLimit;
            if (channel.rtcRegion) channelData.rtcRegion = channel.rtcRegion;
            if (channel.videoQualityMode) channelData.videoQualityMode = channel.videoQualityMode;
          }

          // Stage channel specific settings
          if (channel.type === 13) { // Stage channel
            if (channel.bitrate) channelData.bitrate = channel.bitrate;
            if (channel.rtcRegion) channelData.rtcRegion = channel.rtcRegion;
          }

          // Forum channel specific settings
          if (channel.type === 15) { // Forum channel
            if (channel.defaultReactionEmoji) channelData.defaultReactionEmoji = channel.defaultReactionEmoji;
            if (channel.defaultSortOrder) channelData.defaultSortOrder = channel.defaultSortOrder;
            if (channel.defaultForumLayout) channelData.defaultForumLayout = channel.defaultForumLayout;
            if (channel.availableTags) channelData.availableTags = channel.availableTags;
          }

          const newChannel = await currentGuild.channels.create(channelData);

          // Apply ALL permission overwrites
          for (const [overwriteId, overwrite] of channel.permissionOverwrites.cache) {
            try {
              let targetId = overwrite.id;
              if (overwrite.type === 1) { // Role
                targetId = roleMapping.get(overwrite.id) || overwrite.id;
              }
              await newChannel.permissionOverwrites.create(targetId, {
                allow: overwrite.allow,
                deny: overwrite.deny
              });
            } catch (error) {
              console.error(`Failed to apply permission overwrite for channel ${channel.name}:`, error);
            }
          }

          console.log(`✅ Cloned channel: ${channel.name} (Type: ${channel.type})`);
        } catch (error) {
          console.error(`❌ Failed to clone channel ${channel.name}:`, error);
        }
      }

      // Step 8: Clone emojis
      console.log('😀 Cloning ALL emojis...');
      let emojiCount = 0;
      for (const [emojiId, emoji] of mainServer.emojis.cache) {
        try {
          if (emoji.url) {
            await currentGuild.emojis.create({
              attachment: emoji.url,
              name: emoji.name,
              reason: 'Server clone operation'
            });
            emojiCount++;
            console.log(`✅ Cloned emoji: ${emoji.name}`);
          }
        } catch (error) {
          console.error(`❌ Failed to clone emoji ${emoji.name}:`, error);
        }
      }

      // Step 9: Clone stickers
      console.log('🎭 Cloning ALL stickers...');
      let stickerCount = 0;
      for (const [stickerId, sticker] of mainServer.stickers.cache) {
        try {
          if (sticker.url && !sticker.packId) { // Only custom stickers, not Nitro pack stickers
            await currentGuild.stickers.create({
              file: sticker.url,
              name: sticker.name,
              description: sticker.description || '',
              tags: sticker.tags || sticker.name,
              reason: 'Server clone operation'
            });
            stickerCount++;
            console.log(`✅ Cloned sticker: ${sticker.name}`);
          }
        } catch (error) {
          console.error(`❌ Failed to clone sticker ${sticker.name}:`, error);
        }
      }

      const successEmbed = new EmbedBuilder()
        .setTitle('✅ COMPLETE SERVER CLONE SUCCESSFUL!')
        .setDescription(
          `**EVERYTHING** has been cloned from the main server!\n\n` +
          `**🏗️ Server Settings:** Name, icon, banner, description, verification, filters\n` +
          `**👑 Roles:** ${rolesToCreate.length} roles with proper hierarchy & colors\n` +
          `**📁 Categories:** ${categories.size} categories with permissions\n` +
          `**💬 Channels:** ${channels.size} channels with ALL settings\n` +
          `**😀 Emojis:** ${emojiCount} custom emojis\n` +
          `**🎭 Stickers:** ${stickerCount} custom stickers\n` +
          `**🔐 Permissions:** ALL overwrites and role permissions\n\n` +
          `**🔧 Bot Constants Updated:**\n` +
          Object.entries(roleUpdates).map(([key, value]) => `• ${key}: \`${value}\``).join('\n') +
          `\n\n**✅ Clone completed:** ${new Date().toLocaleString()}`
        )
        .setColor(0x00FF00)
        .setFooter({ text: `Complete clone by ${message.author.username}` })
        .setTimestamp();

      await processingMessage.edit({ content: '', embeds: [successEmbed] });

      console.log(`🎉 COMPLETE SERVER CLONE SUCCESSFUL! Updated ${Object.keys(roleUpdates).length} role constants`);

    } catch (error) {
      console.error('Error in complete server clone:', error);
      await message.reply('❌ **ERROR:** Complete server cloning failed. Check console for details.');
    }
  }

  

  if (message.content.toLowerCase().startsWith('!invite ')) {
    // Only Ben and Guedx can use this for custom invite links
    if (message.author.id !== BEN_ID && message.author.id !== GUEDX_ID) {
      return message.reply("❌ Unauthorized access denied.");
    }

    const args = message.content.split(' ');
    if (args.length !== 2) {
      return message.reply('❌ **Usage:** `!invite <invite_link>`\n**Example:** `!invite https://discord.gg/abcdef123`\n\n**Note:** Use `!invite` without arguments for backup system.');
    }

    const inviteLink = args[1];
    
    // Basic validation for Discord invite link
    if (!inviteLink.includes('discord.gg/') && !inviteLink.includes('discord.com/invite/')) {
      return message.reply('❌ **ERROR:** Please provide a valid Discord invite link.\n**Example:** `https://discord.gg/abcdef123`');
    }

    try {
      const processingMessage = await message.reply('🔄 **SENDING CUSTOM INVITES TO ALL CURRENT MEMBERS...**\n\nThis will invite ALL current server members to the provided link...');

      // Fetch all members in the current server
      await message.guild.members.fetch();
      const allMembers = message.guild.members.cache.filter(member => !member.user.bot);

      let successCount = 0;
      let errorCount = 0;

      const inviteEmbed = new EmbedBuilder()
        .setTitle('📨 Server Invitation')
        .setDescription(
          `Hello! You've been invited to join another server.\n\n` +
          `This invitation was sent by staff from **${message.guild.name}**.\n\n` +
          `**Invite Link:** ${inviteLink}\n\n` +
          `If you don't wish to join, you can ignore this message.`
        )
        .setColor(0x00FF00)
        .setTimestamp();

      if (message.guild.iconURL()) {
        inviteEmbed.setThumbnail(message.guild.iconURL());
      }

      for (const [memberId, member] of allMembers) {
        try {
          await member.user.send({ embeds: [inviteEmbed] });
          successCount++;
          console.log(`✅ Sent invite to ${member.user.username} (${member.user.id})`);

          // Add delay to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          errorCount++;
          console.error(`❌ Failed to send invite to ${member.user.username} (${member.user.id}):`, error.message);
        }
      }

      const resultEmbed = new EmbedBuilder()
        .setTitle('📨 CUSTOM INVITE COMPLETE')
        .setDescription(
          `Custom invite operation completed!\n\n` +
          `**Target Invite:** ${inviteLink}\n\n` +
          `**Results:**\n` +
          `✅ Invites sent: ${successCount}\n` +
          `❌ Failed to send: ${errorCount}\n` +
          `📊 Total current members: ${allMembers.size}`
        )
        .setColor(successCount > 0 ? 0x00FF00 : 0xFFA500)
        .setFooter({ text: `Executed by ${message.author.username}` })
        .setTimestamp();

      await processingMessage.edit({ content: '', embeds: [resultEmbed] });

    } catch (error) {
      console.error('Error in custom !invite command:', error);
      await message.reply('❌ **ERROR:** Failed to send invites. Check console for details.');
    }
  }

  if (message.content.toLowerCase().startsWith('!deletemsg')) {
    // Only Ben and Guedx can use this
    if (message.author.id !== BEN_ID && message.author.id !== GUEDX_ID) {
      return message.reply("❌ Unauthorized access denied.");
    }

    const args = message.content.split(' ');
    if (args.length !== 2) {
      return message.reply("❌ Usage: `!deletemsg <channelid>`\nExample: `!deletemsg 1234567890123456789`");
    }

    const channelId = args[1];
    const targetChannel = message.guild.channels.cache.get(channelId);

    if (!targetChannel) {
      return message.reply("❌ Channel not found! Please provide a valid channel ID.");
    }

    if (!targetChannel.isTextBased()) {
      return message.reply("❌ Target channel is not a text channel!");
    }

    const confirmEmbed = new EmbedBuilder()
      .setTitle('⚠️ DELETE ALL MESSAGES CONFIRMATION')
      .setDescription(
        `**WARNING: This will delete ALL messages in the channel!**\n\n` +
        `**Target Channel:** <#${channelId}> (${targetChannel.name})\n` +
        `**Channel Type:** ${targetChannel.type}\n\n` +
        `**This action is IRREVERSIBLE!**\n` +
        `Are you absolutely sure you want to proceed?`
      )
      .setColor(0xFF0000)
      .setTimestamp();

    const confirmButton = new ButtonBuilder()
      .setCustomId(`confirm_deletemsg_${channelId}_${message.author.id}`)
      .setLabel('YES, DELETE ALL MESSAGES')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🗑️');

    const cancelButton = new ButtonBuilder()
      .setCustomId('cancel_deletemsg')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('❌');

    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    await message.reply({ embeds: [confirmEmbed], components: [row] });
  }

  

});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith('quantity_modal_')) {
      const selectedPet = interaction.customId.replace('quantity_modal_', '');
      const quantity = parseInt(interaction.fields.getTextInputValue('quantity_input'));
      const userId = interaction.user.id;

      if (isNaN(quantity) || quantity < 1 || quantity > 99) {
        await interaction.reply({ 
          content: '❌ Please enter a valid quantity between 1 and 99!', 
          flags: 64 
        });
        return;
      }

      let order = userOrders.get(userId) || { items: {}, hasSheckles: false };
      order.items[selectedPet] = (order.items[selectedPet] || 0) + quantity;
      userOrders.set(userId, order);

      const product = GAMEPASSES[selectedPet];
      const totalUSD = product.usd * quantity;
      const totalRobux = product.robux * quantity;

      const finishButton = new ButtonBuilder()
        .setCustomId('confirm_purchase_ticket')
        .setLabel('Create Ticket')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🎫');

      const continueButton = new ButtonBuilder()
        .setCustomId('continue_shopping')
        .setLabel('Continue Shopping')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🛒');

      const row = new ActionRowBuilder().addComponents(finishButton, continueButton);
      
      const displayName = selectedPet.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');

      await interaction.update({ 
        content: `✅ **${displayName}** x${quantity} added to order!\n💰 **Cost:** $${totalUSD.toFixed(2)} USD or ${totalRobux.toLocaleString()} Robux`, 
        components: [row]
      });
    }
  } else if (interaction.isButton()) {
    // Handle reward redemption from DMs
    if (interaction.customId.startsWith('redeem_reward_')) {
      const fruitAmount = interaction.customId.split('_')[2];

      const redeemEmbed = new EmbedBuilder()
        .setTitle('✅ Reward Redeemed!')
        .setDescription(
          `You have successfully redeemed **${fruitAmount} fruit**!\n\n` +
          `Please create a ticket in the server to receive your reward. Staff will assist you shortly.`
        )
        .setColor(0x00FF00)
        .setTimestamp();

      await interaction.update({ embeds: [redeemEmbed], components: [] });
      return;
    }

    if (interaction.customId === 'save_reward') {
      const saveEmbed = new EmbedBuilder()
        .setTitle('💾 Reward Saved!')
        .setDescription('Your reward has been saved for later. You can redeem it anytime by creating a ticket in the server.')
        .setColor(0x0099FF)
        .setTimestamp();

      await interaction.update({ embeds: [saveEmbed], components: [] });
      return;
    }

    // Handle claim buttons
    if (interaction.customId.startsWith('claim_') && interaction.customId.endsWith('_messages')) {
      const messagesRequired = parseInt(interaction.customId.split('_')[1]);
      const userId = interaction.user.id;
      const userMessageData = userMessages.get(userId) || { count: 0, lastReward: 0 };

      // Check if user already has 3 tickets
      const activeTicketCount = countUserTickets(userId);
      if (activeTicketCount >= 3) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('❌ Maximum Tickets Reached')
          .setDescription('You already have the maximum number of tickets (3). Use `!mytickets` to find them.')
          .setColor(0xFF0000)
          .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        return;
      }

      let fruitReward = 0;
      if (messagesRequired === 250) fruitReward = 3;
      else if (messagesRequired === 500) fruitReward = 8;
      else if (messagesRequired === 1000) fruitReward = 18;

      if (userMessageData.count < messagesRequired) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('❌ Insufficient Messages')
          .setDescription(`You need **${messagesRequired}** messages but only have **${userMessageData.count}** messages.`)
          .setColor(0xFF0000)
          .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        return;
      }

      // Create ticket for claim processing
      const guild = interaction.guild;
      const channelId = '1374843063028940943';
      const mainChannel = guild.channels.cache.get(channelId);

      if (!mainChannel) {
        return interaction.reply({ content: '❌ Specified channel not found!', ephemeral: true });
      }

      const thread = await mainChannel.threads.create({
        name: `reward-${interaction.user.username}`,
        autoArchiveDuration: 60,
        type: ChannelType.GuildPrivateThread,
        reason: 'Message reward claim'
      });

      userTickets.set(userId, thread.id);

      // Log ticket creation
      const logChannelId = '1392854600012533831';
      const logChannel = client.channels.cache.get(logChannelId);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle('🎫 New Ticket Created')
          .setDescription(`**User:** ${interaction.user.username} (${interaction.user.id})\n**Ticket:** ${thread.name}\n**Type:** Message Reward Claim`)
          .setColor(0x00FF00)
          .setTimestamp();

        try {
          await logChannel.send({ embeds: [logEmbed] });
        } catch (error) {
          console.error('Error sending ticket log:', error);
        }
      }

      const rewardEmbed = new EmbedBuilder()
        .setTitle('🍎 Message Reward Claim')
        .setDescription(
          `**${interaction.user.username}** wants to claim:\n\n` +
          `**Messages to deduct:** ${messagesRequired}\n` +
          `**Fruit reward:** ${fruitReward}\n` +
          `**Current messages:** ${userMessageData.count}\n\n` +
          `Staff: Click the button below to process this reward and deduct the messages.`
        )
        .setColor(0xF2ABD2)
        .setTimestamp();

      const claimButton = new ButtonBuilder()
        .setCustomId(`process_claim_${messagesRequired}_${fruitReward}_${userId}`)
        .setLabel(`Process Claim (${messagesRequired} messages → ${fruitReward} fruit)`)
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅');

      const closeButton = new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒');

      const row = new ActionRowBuilder().addComponents(claimButton, closeButton);

      await thread.send({ 
        content: `<@${userId}> <@&${SERVER_MANAGER_ROLE_ID}>`, 
        embeds: [rewardEmbed], 
        components: [row] 
      });

      // Start inactivity timer for this ticket
      handleTicketInactivity(thread.id, userId);

      const successEmbed = new EmbedBuilder()
        .setTitle('✅ Claim Ticket Created!')
        .setDescription('Your reward claim ticket has been created. Staff will process it shortly.')
        .setColor(0x00FF00)
        .setTimestamp();

      await interaction.update({ embeds: [successEmbed], components: [] });
      saveDatabase();
      return;
    }

    // Handle staff processing of claims
    if (interaction.customId.startsWith('process_claim_')) {
      const member = interaction.guild.members.cache.get(interaction.user.id);

      if (!hasAdminPermissions(interaction.user.id, member)) {
        return interaction.reply({ 
          content: '❌ You do not have permission to process claims! Only server managers can do this.', 
          ephemeral: true 
        });
      }

      const parts = interaction.customId.split('_');
      const messagesRequired = parseInt(parts[2]);
      const fruitReward = parseInt(parts[3]);
      const targetUserId = parts[4];

      const userMessageData = userMessages.get(targetUserId) || { count: 0, lastReward: 0 };

      if (userMessageData.count < messagesRequired) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('❌ Insufficient Messages')
          .setDescription(`User only has **${userMessageData.count}** messages but needs **${messagesRequired}** messages.`)
          .setColor(0xFF0000)
          .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        return;
      }

      // Deduct messages
      userMessageData.count -= messagesRequired;
      userMessages.set(targetUserId, userMessageData);
      
      // Update the real-time logging channel
      await updateMessageCountLog(targetUserId, userMessageData.count);
      
      saveDatabase();

      // Log the claim to the tracking channel
      try {
        const trackingChannel = client.channels.cache.get(CLAIMED_MESSAGES_CHANNEL_ID);
        if (trackingChannel) {
          const targetUser = await client.users.fetch(targetUserId);
          const claimMessage = `CLAIMED: User <@${targetUserId}> claimed ${messagesRequired} messages for ${fruitReward} fruit (Processed by ${interaction.user.username})`;
          await trackingChannel.send(claimMessage);
          console.log(`📝 Logged claim to tracking channel: ${targetUser.username} claimed ${messagesRequired} messages`);
        } else {
          console.warn('⚠️ Could not find tracking channel to log claim');
        }
      } catch (error) {
        console.error('Error logging claim to tracking channel:', error);
      }

      const processEmbed = new EmbedBuilder()
        .setTitle('✅ Reward Processed Successfully!')
        .setDescription(
          `**User:** <@${targetUserId}>\n` +
          `**Messages deducted:** ${messagesRequired}\n` +
          `**Fruit rewarded:** ${fruitReward}\n` +
          `**Remaining messages:** ${userMessageData.count}\n\n` +
          `The user should receive their **${fruitReward} fruit** shortly.\n\n` +
          `📋 Claim logged to <#${CLAIMED_MESSAGES_CHANNEL_ID}>`
        )
        .setColor(0x00FF00)
        .setFooter({ text: `Processed by ${interaction.user.username}` })
        .setTimestamp();

      await interaction.update({ embeds: [processEmbed], components: [] });

      // Auto-close ticket after 5 seconds
      setTimeout(async () => {
        try {
          // Clear inactivity timer for this ticket
          if (ticketInactivityTimers.has(interaction.channel.id)) {
            clearTimeout(ticketInactivityTimers.get(interaction.channel.id));
            ticketInactivityTimers.delete(interaction.channel.id);
          }
          await interaction.channel.delete();
        } catch (error) {
          console.log('Ticket may have already been deleted');
        }
      }, 5000);

      return;
    }

    if (interaction.customId === 'open_shop') {
      const categoryMenu = new StringSelectMenuBuilder()
        .setCustomId('select_category')
        .setPlaceholder('Choose a category')
        .addOptions([
          { label: 'Pets', value: 'pets', emoji: '🦩' },
          { label: 'Aged Pets', value: 'aged_pets', emoji: '🕰️' },
          { label: 'Sheckles', value: 'sheckles', emoji: '🌼' }
        ]);
      const row = new ActionRowBuilder().addComponents(categoryMenu);
      await interaction.reply({ content: 'Pick a category:', components: [row], flags: 64 /* ephemeral */ });
    } else if (interaction.customId === 'claim_rewards') {
      // Check if user already has 3 tickets
      const userId = interaction.user.id;
      const activeTicketCount = countUserTickets(userId);
      
      if (activeTicketCount >= 3) {
        return interaction.reply({ 
          content: '❌ You already have the maximum number of tickets (3). Use `!mytickets` to find them.', 
          flags: 64 
        });
      }

      const guild = interaction.guild;
      const channelId = '1374843063028940943';
      const mainChannel = guild.channels.cache.get(channelId);

      if (!mainChannel) {
        return interaction.reply({ content: '❌ Specified channel not found!', flags: 64 });
      }

      const thread = await mainChannel.threads.create({
        name: `claim-${interaction.user.username}`,
        autoArchiveDuration: 60,
        type: ChannelType.GuildPrivateThread,
        reason: 'New claim ticket'
      });

      userTickets.set(userId, thread.id);

      // Log ticket creation
      const logChannelId = '1392854600012533831';
      const logChannel = client.channels.cache.get(logChannelId);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle('🎫 New Ticket Created')
          .setDescription(`**User:** ${interaction.user.username} (${interaction.user.id})\n**Ticket:** ${thread.name}\n**Type:** Claim/Support Ticket`)
          .setColor(0x00FF00)
          .setTimestamp();

        try {
          await logChannel.send({ embeds: [logEmbed] });
        } catch (error) {
          console.error('Error sending ticket log:', error);
        }
      }

      const bannerEmbed = new EmbedBuilder()
        .setImage("https://cdn.discordapp.com/attachments/1396674009814405181/1396674087174275293/Gemini_Generated_Image_hjd6o6hjd6o6hjd6_1.jpg?ex=687ef19b&is=687da01b&hm=8683b7a0daf4a3ec7e9592894068fed770ffb57394fe063d7ad73529f4a4dc5a&")
        .setColor(0xFDF2F8);

      const claimEmbed = new EmbedBuilder()
        .setTitle('🍉 You chose "Others"')
        .setDescription('Staff will be here shortly, remember, this ticket is just for claiming rewards, support or reports and not to make purchases')
        .setColor(0xF2ABD2);

      const closeButton = new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Close Ticket (Staff Only)')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒');

      const row = new ActionRowBuilder().addComponents(closeButton);

      await thread.send({ content: `<@${userId}> <@&${SERVER_MANAGER_ROLE_ID}>`, embeds: [bannerEmbed, claimEmbed], components: [row] });

      // Start inactivity timer for this ticket
      handleTicketInactivity(thread.id, userId);

      await interaction.reply({ content: '✅ Claim ticket created!', flags: 64 });
      saveDatabase();
    } else if (interaction.customId === 'my_tickets') {
      const userId = interaction.user.id;
      const member = interaction.guild.members.cache.get(userId);
      
      // Check if user is staff - if so, ping them in all tickets like !staffticket
      if (hasAdminPermissions(userId, member)) {
        let activeTickets = [];
        let staleTickets = [];
        
        // Check each ticket in the Map
        for (const [ticketUserId, ticketId] of userTickets.entries()) {
          try {
            const channel = interaction.guild.channels.cache.get(ticketId);
            
            if (channel && channel.isThread()) {
              // Check if thread is archived or locked
              if (channel.archived || channel.locked) {
                staleTickets.push(ticketUserId);
              } else {
                activeTickets.push({ userId: ticketUserId, ticketId, channel });
              }
            } else {
              staleTickets.push(ticketUserId);
            }
          } catch (error) {
            console.error(`Error checking ticket ${ticketId}:`, error);
            staleTickets.push(ticketUserId);
          }
        }

        // Clean up stale ticket references
        for (const ticketUserId of staleTickets) {
          userTickets.delete(ticketUserId);
        }

        // Also scan for threads that might not be in our Map but are active ticket threads
        const ticketChannelId = '1374843063028940943';
        const mainChannel = interaction.guild.channels.cache.get(ticketChannelId);
        
        if (mainChannel) {
          const allThreads = mainChannel.threads.cache;
          
          for (const [threadId, thread] of allThreads) {
            if (!thread.archived && !thread.locked) {
              // Check if this thread is not in our Map but appears to be a ticket
              const isAlreadyTracked = Array.from(userTickets.values()).includes(threadId);
              if (!isAlreadyTracked && (thread.name.includes('ticket-') || thread.name.includes('claim-') || thread.name.includes('reward-'))) {
                activeTickets.push({ userId: 'unknown', ticketId: threadId, channel: thread });
              }
            }
          }
        }

        if (activeTickets.length === 0) {
          return interaction.reply({ content: "📭 No active tickets found! All tickets appear to be archived or closed.", flags: 64 });
        }

        let successCount = 0;
        let errorCount = 0;

        for (const ticket of activeTickets) {
          try {
            const staffPingMessage = await ticket.channel.send(`🚨 <@${userId}> Staff member ${interaction.user.username} is checking this ticket!`);
            
            // Store the message for deletion and only delete if it still exists
            if (staffPingMessage && staffPingMessage.deletable) {
              setTimeout(async () => {
                try {
                  // Check if message still exists and is deletable before attempting deletion
                  if (staffPingMessage.deletable) {
                    await staffPingMessage.delete();
                  }
                } catch (error) {
                  console.log('Staff ping message may have already been deleted or is no longer accessible');
                }
              }, 5000);
            }
            
            successCount++;
          } catch (error) {
            console.error(`❌ Error pinging staff in ticket ${ticket.ticketId}:`, error);
            errorCount++;
          }
        }

        const resultEmbed = new EmbedBuilder()
          .setTitle('📢 Staff Ticket Ping Results')
          .setDescription(`Pinged yourself in all active tickets.`)
          .addFields(
            { name: '✅ Successful Pings', value: `${successCount} tickets`, inline: true },
            { name: '❌ Failed Pings', value: `${errorCount} tickets`, inline: true },
            { name: '📊 Total Active Tickets', value: `${activeTickets.length} tickets`, inline: true }
          )
          .setColor(successCount > 0 ? 0x00FF00 : 0xFF0000)
          .setFooter({ text: `Requested by ${interaction.user.username}` })
          .setTimestamp();

        const responseMessage = await interaction.reply({ embeds: [resultEmbed], flags: 64 });

        // Delete the response message after 5 seconds
        setTimeout(async () => {
          try {
            await responseMessage.delete();
          } catch (error) {
            console.log('Response message may have already been deleted');
          }
        }, 5000);

        // Save database if we cleaned up stale references
        if (staleTickets.length > 0) {
          saveDatabase();
        }
      } else {
        // Regular user - ping them in their ticket like !mytickets
        const userTicketId = userTickets.get(userId);

        if (!userTicketId) {
          return interaction.reply({ content: "📭 You don't have any active tickets!", flags: 64 });
        }

        const ticketChannel = interaction.guild.channels.cache.get(userTicketId);
        
        if (!ticketChannel || !ticketChannel.isThread() || ticketChannel.archived) {
          // Clean up stale ticket reference
          userTickets.delete(userId);
          saveDatabase();
          return interaction.reply({ content: "📭 Your ticket appears to be closed or no longer exists!", flags: 64 });
        }

        try {
          const pingMessage = await ticketChannel.send(`📨 <@${userId}> You pinged yourself in this ticket!`);
          
          // Store the message for deletion and only delete if it still exists
          if (pingMessage && pingMessage.deletable) {
            setTimeout(async () => {
              try {
                // Check if message still exists and is deletable before attempting deletion
                if (pingMessage.deletable) {
                  await pingMessage.delete();
                }
              } catch (error) {
                console.log('User ping message may have already been deleted or is no longer accessible');
              }
            }, 5000);
          }
          
          const successEmbed = new EmbedBuilder()
            .setTitle('✅ Ticket Ping Successful!')
            .setDescription(`You have been pinged in your active ticket: <#${userTicketId}>`)
            .setColor(0x00FF00)
            .setFooter({ text: `Requested by ${interaction.user.username}` })
            .setTimestamp();

          const responseMessage = await interaction.reply({ embeds: [successEmbed], flags: 64 });

          // Delete the response message after 5 seconds
          setTimeout(async () => {
            try {
              await responseMessage.delete();
            } catch (error) {
              console.log('Response message may have already been deleted');
            }
          }, 5000);

        } catch (error) {
          console.error(`Error pinging user in their ticket ${userTicketId}:`, error);
          return interaction.reply({ content: "❌ Failed to ping you in your ticket. The ticket may be inaccessible.", flags: 64 });
        }
      }
    } else if (interaction.customId === 'middleman_service') {
      // Check if user already has 3 tickets
      const userId = interaction.user.id;
      const activeTicketCount = countUserTickets(userId);
      
      if (activeTicketCount >= 3) {
        return interaction.reply({ 
          content: '❌ You already have the maximum number of tickets (3). Use `!mytickets` to find them.', 
          flags: 64 
        });
      }

      const guild = interaction.guild;
      const channelId = '1374843063028940943';
      const mainChannel = guild.channels.cache.get(channelId);

      if (!mainChannel) {
        return interaction.reply({ content: '❌ Specified channel not found!', flags: 64 });
      }

      const thread = await mainChannel.threads.create({
        name: `middleman-${interaction.user.username}`,
        autoArchiveDuration: 60,
        type: ChannelType.GuildPrivateThread,
        reason: 'New middleman service ticket'
      });

      userTickets.set(userId, thread.id);

      // Log ticket creation
      const logChannelId = '1392854600012533831';
      const logChannel = client.channels.cache.get(logChannelId);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle('🎫 New Ticket Created')
          .setDescription(`**User:** ${interaction.user.username} (${interaction.user.id})\n**Ticket:** ${thread.name}\n**Type:** Middleman Service`)
          .setColor(0x00FF00)
          .setTimestamp();

        try {
          await logChannel.send({ embeds: [logEmbed] });
        } catch (error) {
          console.error('Error sending ticket log:', error);
        }
      }

      const bannerEmbed = new EmbedBuilder()
        .setImage("https://cdn.discordapp.com/attachments/1396674009814405181/1396674087174275293/Gemini_Generated_Image_hjd6o6hjd6o6hjd6_1.jpg?ex=687ef19b&is=687da01b&hm=8683b7a0daf4a3ec7e9592894068fed770ffb57394fe063d7ad73529f4a4dc5a&")
        .setColor(0xF2ABD2);

      const middlemanEmbed = new EmbedBuilder()
        .setTitle('🤝 Middleman Service')
        .setDescription(
          '**Welcome to our Middleman Service!**\n\n' +
          'Our middleman service ensures safe trading between players. Here\'s how it works:\n\n' +
          '**📋 Step 1:** Trader(1) gives their pets/items to the Middleman (MM)\n' +
          '**🔄 Step 2:** Trader(2) gives their items to Trader(1)\n' +
          '**✅ Step 3:** MM gives the pets to Trader(2) - Trade Complete!\n\n' +
          '**🛡️ Safety:** All trades are supervised by verified staff\n\n' +
          '**Requirements:**\n' +
          '• Both traders must be present\n' +
          '• Clear agreement on what items are being traded\n\n' +
          'A staff member will assist you shortly!'
        )
        .setColor(0xF2ABD2)
        .setFooter({ text: 'Safe trading guaranteed with our MM service!' });

      const closeButton = new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Close Ticket (Staff Only)')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒');

      const row = new ActionRowBuilder().addComponents(closeButton);

      const initialMessage = await thread.send({ content: `<@${userId}> <@&${MIDDLEMAN_ROLE_ID}>`, embeds: [bannerEmbed, middlemanEmbed], components: [row] });

      // Send the user ID request after 5 seconds
      setTimeout(async () => {
        try {
          const requestEmbed = new EmbedBuilder()
            .setTitle('👥 Add Other Trader')
            .setDescription(`Hi <@${userId}>, please provide us the ID or username of the user you're dealing with.`)
            .setColor(0x00FF00)
            .setTimestamp();

          await thread.send({ embeds: [requestEmbed] });
        } catch (error) {
          console.error('Error sending user ID request:', error);
        }
      }, 5000);

      // Start inactivity timer for this ticket
      handleTicketInactivity(thread.id, userId);

      await interaction.reply({ content: '✅ Middleman service ticket created!', flags: 64 });
      saveDatabase();
    } else if (interaction.customId === 'confirm_purchase_ticket') {
      const confirmEmbed = new EmbedBuilder()
        .setTitle('🎫 Create Purchase Ticket?')
        .setDescription('Do you want to create a ticket for your purchase?')
        .setColor(0xF2ABD2);

      const yesButton = new ButtonBuilder()
        .setCustomId('confirm_purchase_yes')
        .setLabel('Yes')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅');

      const noButton = new ButtonBuilder()
        .setCustomId('confirm_purchase_no')
        .setLabel('No')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌');

      const confirmRow = new ActionRowBuilder().addComponents(yesButton, noButton);

      await interaction.update({ content: '', embeds: [confirmEmbed], components: [confirmRow] });
    } else if (interaction.customId === 'confirm_purchase_yes') {
      const userId = interaction.user.id;
      const guild = interaction.guild;
      const order = userOrders.get(userId);
      if (!order) return interaction.update({ content: 'No order found.', components: [] });

      // Check if user already has 3 tickets
      const activeTicketCount = countUserTickets(userId);
      if (activeTicketCount >= 3) {
        return interaction.update({ 
          content: '❌ You already have the maximum number of tickets (3). Use `!mytickets` to find them.', 
          components: [] 
        });
      }

      const channelId = '1374843063028940943';
      const mainChannel = guild.channels.cache.get(channelId);

      if (!mainChannel) {
        return interaction.update({ content: '❌ Specified channel not found!', components: [] });
      }

      const thread = await mainChannel.threads.create({
        name: `ticket-${interaction.user.username}`,
        autoArchiveDuration: 60,
        type: ChannelType.GuildPrivateThread,
        reason: 'New support ticket'
      });

      userTickets.set(userId, thread.id);

      // Log ticket creation
      const logChannelId = '1392854600012533831';
      const logChannel = client.channels.cache.get(logChannelId);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle('🎫 New Ticket Created')
          .setDescription(`**User:** ${interaction.user.username} (${interaction.user.id})\n**Ticket:** ${thread.name}\n**Type:** Purchase Ticket`)
          .setColor(0x00FF00)
          .setTimestamp();

        try {
          await logChannel.send({ embeds: [logEmbed] });
        } catch (error) {
          console.error('Error sending ticket log:', error);
        }
      }

      // Start inactivity timer for this ticket
      handleTicketInactivity(thread.id, userId);

      const hasPets = Object.keys(order.items || {}).length > 0;
      const hasSheckles = order.hasSheckles;

      if (hasPets && hasSheckles) {

        let totalUSD = 0, totalRobux = 0;
        let summaryText = '', passesText = '';

        for (const [item, qty] of Object.entries(order.items)) {
          const product = GAMEPASSES[item];
          totalUSD += product.usd * qty;
          totalRobux += product.robux * qty;
          summaryText += `• ${item} × ${qty} = $${(product.usd * qty).toFixed(2)} or ${product.robux * qty} Robux\n`;
          passesText += `**${item}** x${qty}\n[Gamepass Link](${product.url})\n\n`;
        }

        const embed1 = new EmbedBuilder()
          .setTitle('🛍️ Order Summary')
          .setDescription(summaryText + '\n🪙 **Sheckles:** Quantity to be discussed with staff')
          .addFields({ name: 'Pet(s) Total', value: `$${totalUSD.toFixed(2)} or ${totalRobux} Robux` })
          .setColor(0xF2ABD2);

        const embed2 = new EmbedBuilder()
          .setTitle('💳 Payment Methods')
          .setDescription(
            `⚠️ If you want to buy the same product more than once and pay with Robux, you must buy the gamepass, delete it, then buy again.\n\n` +
            `💡 Never make payment if staff is not present.\n\n` +
            `**For Pet Gamepasses:**\n` +
            `- CashApp: $mrbru22\n` +
            `- PayPal: mrbru2@hotmail.com\n` +
            `- Litecoin: \`${LTC_ADDRESS}\`\n` +
            `- Robux:\n${passesText}\n` +
            `**For Sheckles:**\n` +
            `🪙 Please discuss quantity and pricing with staff. Each fruit costs 35T Sheckles.`
          )
          .setColor(0xF2ABD2);

        const utilityRow1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('grant_buyer_role')
            .setLabel('Grant Buyer Role')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒')
        );

        const utilityRow2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('copy_ltc')
            .setLabel('Copy LTC Address')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📋'),
          new ButtonBuilder()
            .setCustomId('copy_cashapp')
            .setLabel('Copy CashApp')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('💵'),
          new ButtonBuilder()
            .setCustomId('copy_paypal')
            .setLabel('Copy PayPal')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('💸')
        );

        // Add airbornite to the thread
        try {
          await thread.members.add(AIRBORNITE_ID);
        } catch (error) {
          console.error('Error adding airbornite to thread:', error);
        }

        await thread.send({ content: `<@${userId}> <@&${SERVER_MANAGER_ROLE_ID}>`, embeds: [embed1, embed2], components: [utilityRow1, utilityRow2] });

      } else if (hasPets && !hasSheckles) {

        let totalUSD = 0, totalRobux = 0;
        let summaryText = '', passesText = '';

        for (const [item, qty] of Object.entries(order.items)) {
          const product = GAMEPASSES[item];
          totalUSD += product.usd * qty;
          totalRobux += product.robux * qty;
          summaryText += `• ${item} × ${qty} = $${(product.usd * qty).toFixed(2)} or ${product.robux * qty} Robux\n`;          passesText += `**${item}** x${qty}\n[Gamepass Link](${product.url})\n\n`;
        }

        const embed1 = new EmbedBuilder()
          .setTitle('🛒 Order Summary')
          .setDescription(summaryText)
          .addFields({ name: 'Total', value: `$${totalUSD.toFixed(2)} or ${totalRobux} Robux` })
          .setColor(0xF2ABD2);

        const embed2 = new EmbedBuilder()
          .setTitle('💳 Payment Methods')
          .setDescription(
            `⚠️ If you want to buy the same product more than once and pay with Robux, you must buy the gamepass, delete it, then buy again.\n\n` +
            `💡 Never make payment if staff is not present.\n\n` +
            `- CashApp: $mrbru22\n` +
            `- PayPal: mrbru2@hotmail.com\n` +
            `- Litecoin: \`${LTC_ADDRESS}\`\n` +
            `- Robux:\n${passesText}`
          )
          .setColor(0xF2ABD2);


        const utilityRow1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('grant_buyer_role')
            .setLabel('Grant Buyer Role')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒')
        );

        const utilityRow2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('copy_ltc')
            .setLabel('Copy LTC Address')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📋'),
          new ButtonBuilder()
            .setCustomId('copy_cashapp')
            .setLabel('Copy CashApp')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('💵'),
          new ButtonBuilder()
            .setCustomId('copy_paypal')
            .setLabel('Copy PayPal')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('💸')
        );

        // Add airbornite to the thread
        try {
          await thread.members.add(AIRBORNITE_ID);
        } catch (error) {
          console.error('Error adding airbornite to thread:', error);
        }

        await thread.send({ content: `<@${userId}> <@&${SERVER_MANAGER_ROLE_ID}>`, embeds: [embed1, embed2], components: [utilityRow1, utilityRow2] });

      } else if (hasSheckles && !hasPets) {

        const embed1 = new EmbedBuilder()
          .setTitle('🪙 Sheckles Order')
          .setDescription(
            'Please send how many fruits you want here in this channel. Each fruit costs 35T Sheckles.\n\n' +
            'A staff member will assist you with the price negotiation and product delivery.\n\n' +
            '**If you want to buy with Robux, wait for a staff to arrive and describe your situation.**'
          )
          .setColor(0xF2ABD2);

        const embed2 = new EmbedBuilder()
          .setTitle('💳 Payment Methods')
          .setDescription(
            '⚠️ Only negotiate sheckles quantity and payment with the staff in this ticket.\n\n' +
            '- CashApp: $mrbru22\n' +
            '- PayPal: mrbru2@hotmail.com\n' +
            `- Litecoin: \`${LTC_ADDRESS}\``
          )
          .setColor(0xF2ABD2);


        const utilityRow1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('grant_buyer_role')
            .setLabel('Grant Buyer Role')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒')
        );

        const utilityRow2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('copy_ltc')
            .setLabel('Copy LTC Address')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📋'),
          new ButtonBuilder()
            .setCustomId('copy_cashapp')
            .setLabel('Copy CashApp')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('💵'),
          new ButtonBuilder()
            .setCustomId('copy_paypal')
            .setLabel('Copy PayPal')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('💸')
        );

        // Add airbornite to the thread
        try {
          await thread.members.add(AIRBORNITE_ID);
        } catch (error) {
          console.error('Error adding airbornite to thread:', error);
        }

        await thread.send({ content: `<@${userId}> <@&${SERVER_MANAGER_ROLE_ID}>`, embeds: [embed1, embed2], components: [utilityRow1, utilityRow2] });
      }

      const successEmbed = new EmbedBuilder()
        .setTitle('✅ Purchase Ticket Created!')
        .setDescription('Your ticket has been successfully created. Staff will assist you shortly.')
        .setColor(0x00FF00);

      await interaction.update({ content: '', embeds: [successEmbed], components: [] });

      userOrders.delete(userId);
      saveDatabase();
    } else if (interaction.customId === 'confirm_purchase_no') {
      await interaction.update({ content: '❌ Purchase ticket creation cancelled.', components: [] });
    } else if (interaction.customId === 'continue_shopping') {
      const categoryMenu = new StringSelectMenuBuilder()
        .setCustomId('select_category')
        .setPlaceholder('Choose a category')
        .addOptions([
          { label: 'Pets', value: 'pets', emoji: '🦩' },
          { label: 'Aged Pets', value: 'aged_pets', emoji: '🕰️' },
          { label: 'Sheckles', value: 'sheckles', emoji: '🌼' }
        ]);
      const row = new ActionRowBuilder().addComponents(categoryMenu);
      await interaction.update({ content: 'Pick another category:', components: [row] });
    } else if (interaction.customId === 'finalize') {
      const userId = interaction.user.id;
      const guild =interaction.guild;
      const order = userOrders.get(userId);
      if (!order) return interaction.reply({ content: 'No order found.', flags: 64 });

      const channelId = '1374843063028940943';
      const mainChannel = guild.channels.cache.get(channelId);

      if (!mainChannel) {
        return interaction.reply({ content: '❌ Specified channel not found!', flags: 64 });
      }

      const thread = await mainChannel.threads.create({
        name: `ticket-${interaction.user.username}`,
        autoArchiveDuration: 60,
        type: ChannelType.GuildPrivateThread,
        reason: 'New support ticket'
      });

      userTickets.set(userId, thread.id);


      const hasPets = Object.keys(order.items || {}).length > 0;
      const hasSheckles = order.hasSheckles;

      if (hasPets && hasSheckles) {

        let totalUSD = 0, totalRobux = 0;
        let summaryText = '', passesText = '';

        for (const [item, qty] of Object.entries(order.items)) {
          const product = GAMEPASSES[item];
          totalUSD += product.usd * qty;
          totalRobux += product.robux * qty;
          summaryText += `• ${item} × ${qty} = $${(product.usd * qty).toFixed(2)} or ${product.robux * qty} Robux\n`;
          passesText += `**${item}** x${qty}\n[Gamepass Link](${product.url})\n\n`;
        }

        const embed1 = new EmbedBuilder()
          .setTitle('🛒 Order Summary')
          .setDescription(summaryText + '\n🪙 **Sheckles:** Quantity to be discussed with staff')
          .addFields({ name: 'Pet(s) Total', value: `$${totalUSD.toFixed(2)} or ${totalRobux} Robux` })
          .setColor(0xF2ABD2);

        const embed2 = new EmbedBuilder()
          .setTitle('💳 Payment Methods')
          .setDescription(
            `⚠️ If you want to buy the same product more than once and pay with Robux, you must buy the gamepass, delete it, then buy again.\n\n` +
            `💡 Never make payment if staff is not present.\n\n` +
            `**For Pet Gamepasses:**\n` +
            `- CashApp: $mrbru22\n` +
            `- PayPal: mrbru2@hotmail.com\n` +
            `- Litecoin: \`${LTC_ADDRESS}\`\n` +
            `- Robux:\n${passesText}\n` +
            `**For Sheckles:**\n` +
            `🪙 Please discuss quantity and pricing with staff. Each fruit costs 35T Sheckles.`
          )
          .setColor(0xF2ABD2);

        const utilityRow1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('grant_buyer_role')
            .setLabel('Grant Buyer Role')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒')
        );

        const utilityRow2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('copy_ltc')
            .setLabel('Copy LTC Address')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📋'),
          new ButtonBuilder()
            .setCustomId('copy_cashapp')
            .setLabel('Copy CashApp')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('💵'),
          new ButtonBuilder()
            .setCustomId('copy_paypal')
            .setLabel('Copy PayPal')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('💸')
        );

        // Add airbornite to the thread
        try {
          await thread.members.add(AIRBORNITE_ID);
        } catch (error) {
          console.error('Error adding airbornite to thread:', error);
        }

        await thread.send({ content: `<@${userId}> <@&${SERVER_MANAGER_ROLE_ID}>`, embeds: [embed1, embed2], components: [utilityRow1, utilityRow2] });

      } else if (hasPets && !hasSheckles) {

        let totalUSD = 0, totalRobux = 0;
        let summaryText = '', passesText = '';

        for (const [item, qty] of Object.entries(order.items)) {
          const product = GAMEPASSES[item];
          totalUSD += product.usd * qty;
          totalRobux += product.robux * qty;
          summaryText += `• ${item} × ${qty} = $${(product.usd * qty).toFixed(2)} or ${product.robux * qty} Robux\n`;
          passesText += `**${item}** x${qty}\n[Gamepass Link](${product.url})\n\n`;
        }

        const embed1 = new EmbedBuilder()
          .setTitle('🛒 Order Summary')
          .setDescription(summaryText)
          .addFields({ name: 'Total', value: `$${totalUSD.toFixed(2)} or ${totalRobux} Robux` })
          .setColor(0xF2ABD2);

        const embed2 = new EmbedBuilder()
          .setTitle('💳 Payment Methods')
          .setDescription(
            `⚠️ If you want to buy the same product more than once and pay with Robux, you must buy the gamepass, delete it, then buy again.\n\n` +
            `💡 Never make payment if staff is not present.\n\n` +
            `- CashApp: $mrbru22\n` +
            `- PayPal: mrbru2@hotmail.com\n` +
            `- Litecoin: \`${LTC_ADDRESS}\`\n` +
            `- Robux:\n${passesText}`
          )
          .setColor(0xFDF2F8);


        const utilityRow1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('grant_buyer_role')
            .setLabel('Grant Buyer Role')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒')
        );

        const utilityRow2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('copy_ltc')
            .setLabel('Copy LTC Address')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📋'),
          new ButtonBuilder()
            .setCustomId('copy_cashapp')
            .setLabel('Copy CashApp')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('💵'),
          new ButtonBuilder()
            .setCustomId('copy_paypal')
            .setLabel('Copy PayPal')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('💸')
        );

        // Add airbornite to the thread
        try {
          await thread.members.add(AIRBORNITE_ID);
        } catch (error) {
          console.error('Error adding airbornite to thread:', error);
        }

        await thread.send({ content: `<@${userId}> <@&${SERVER_MANAGER_ROLE_ID}>`, embeds: [embed1, embed2], components: [utilityRow1, utilityRow2] });

      } else if (hasSheckles && !hasPets) {

        const embed1 = new EmbedBuilder()
          .setTitle('🪙 Sheckles Order')
          .setDescription(
            'Please send how many fruits you want here in this channel. Each fruit costs 35T Sheckles.\n\n' +
            'A staff member will assist you with the price negotiation and product delivery.\n\n' +
            '**If you want to buy with Robux, wait for a staff to arrive and describe your situation.**'
          )
          .setColor(0xFDF2F8);

        const embed2 = new EmbedBuilder()
          .setTitle('💳 Payment Methods')
          .setDescription(
            '⚠️ Only negotiate sheckles quantity and payment with the staff in this ticket.\n\n' +
            '- CashApp: $mrbru22\n' +
            '- PayPal: mrbru2@hotmail.com\n' +
            `- Litecoin: \`${LTC_ADDRESS}\``
          )
          .setColor(0xFDF2F8);


        const utilityRow1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('grant_buyer_role')
            .setLabel('Grant Buyer Role')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒')
        );

        const utilityRow2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('copy_ltc')
            .setLabel('Copy LTC Address')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📋'),
          new ButtonBuilder()
            .setCustomId('copy_cashapp')
            .setLabel('Copy CashApp')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('💵'),
          new ButtonBuilder()
            .setCustomId('copy_paypal')
            .setLabel('Copy PayPal')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('💸')
        );

        // Add airbornite to the thread
        try {
          await thread.members.add(AIRBORNITE_ID);
        } catch (error) {
          console.error('Error adding airbornite to thread:', error);
        }

        await thread.send({ content: `<@${userId}> <@&${SERVER_MANAGER_ROLE_ID}>`, embeds: [embed1, embed2], components: [utilityRow1, utilityRow2] });
      }

      await interaction.update({ content: '✅ Ticket created!', components: [] });

      userOrders.delete(userId);
      saveDatabase();
    } else if (interaction.customId === 'close_ticket') {
      const member = interaction.guild.members.cache.get(interaction.user.id);
      const isMiddlemanTicket = interaction.channel.name.startsWith('middleman-');
      const hasMiddlemanRole = member && member.roles.cache.has(MIDDLEMAN_ROLE_ID);

      // Allow admins to close any ticket, or middleman role to close middleman tickets
      if (!hasAdminPermissions(interaction.user.id, member) && !(isMiddlemanTicket && hasMiddlemanRole)) {
        return interaction.reply({ 
          content: '❌ Only staff members can close tickets!', 
          flags: 64 
        });
      }

      const channel = interaction.channel;

      // Clear inactivity timer for this ticket
      if (ticketInactivityTimers.has(channel.id)) {
        clearTimeout(ticketInactivityTimers.get(channel.id));
        ticketInactivityTimers.delete(channel.id);
      }

      // Remove ticket from tracking
      for (const [userId, ticketId] of userTickets.entries()) {
        if (ticketId === channel.id) {
          userTickets.delete(userId);
          saveDatabase();
          break;
        }
      }

      // Clean up middleman ticket completion tracking
      middlemanTicketsCompleted.delete(channel.id);

      await interaction.reply({ content: '🔒 Closing ticket in 5 seconds...', flags: 64 });
      setTimeout(async () => {
        try {
          await channel.delete();
        } catch (error) {
          console.log('Ticket may have already been deleted');
        }
      }, 5000);
    } else if (interaction.customId === 'copy_ltc') {
      await interaction.reply({ 
        content: `📋 **LTC Address:** \`${LTC_ADDRESS}\`\n\nClick to select and copy the address above.`, 
        flags: 64 
      });
    } else if (interaction.customId === 'grant_buyer_role') {

      const channelName = interaction.channel.name;

      let targetUserId = null;
      
      // Method 1: Check if ticket is tracked in userTickets
      for (const [userId, ticketId] of userTickets.entries()) {
        if (ticketId === interaction.channel.id) {
          targetUserId = userId;
          break;
        }
      }
      
      // Method 2: If not found, search ALL messages in the channel for bot messages with mentions
      if (!targetUserId) {
        try {
          let allMessages = [];
          let lastMessageId = null;
          let foundMessages = true;
          
          // Fetch ALL messages in the channel
          while (foundMessages) {
            const fetchOptions = { limit: 100 };
            if (lastMessageId) {
              fetchOptions.before = lastMessageId;
            }
            
            const messages = await interaction.channel.messages.fetch(fetchOptions);
            if (messages.size === 0) {
              foundMessages = false;
              break;
            }
            
            allMessages.push(...messages.values());
            lastMessageId = messages.last().id;
            
            if (messages.size < 100) {
              foundMessages = false;
            }
          }
          
          console.log(`🔍 Searched ${allMessages.length} messages in ticket ${interaction.channel.id}`);
          
          // Look through all messages for bot messages with user mentions
          for (const message of allMessages) {
            if (message.author.id === client.user.id && message.mentions.users.size > 0) {
              // Look for non-staff user mentions, excluding the bot itself
              for (const [userId, user] of message.mentions.users) {
                const member = interaction.guild.members.cache.get(userId);
                if (member && !hasAdminPermissions(userId, member) && userId !== client.user.id) {
                  targetUserId = userId;
                  console.log(`✅ Found ticket creator: ${user.username} (${userId})`);
                  break;
                }
              }
              if (targetUserId) break;
            }
          }
        } catch (error) {
          console.error('Error searching messages for ticket creator:', error);
        }
      }
      
      // Method 3: Parse ticket name for username
      if (!targetUserId && channelName) {
        const nameMatch = channelName.match(/^(ticket|claim|reward)-(.+)$/);
        if (nameMatch) {
          const username = nameMatch[2];
          const member = interaction.guild.members.cache.find(member => 
            member.user.username.toLowerCase() === username.toLowerCase()
          );
          if (member) {
            targetUserId = member.user.id;
            console.log(`✅ Found ticket creator from channel name: ${member.user.username} (${targetUserId})`);
          }
        }
      }
      
      // Method 4: Look for thread starter (Discord API method)
      if (!targetUserId && interaction.channel.isThread()) {
        try {
          const thread = interaction.channel;
          if (thread.ownerId && thread.ownerId !== client.user.id) {
            const owner = interaction.guild.members.cache.get(thread.ownerId);
            if (owner && !hasAdminPermissions(thread.ownerId, owner)) {
              targetUserId = thread.ownerId;
              console.log(`✅ Found ticket creator from thread owner: ${owner.user.username} (${targetUserId})`);
            }
          }
        } catch (error) {
          console.error('Error getting thread owner:', error);
        }
      }

      if (!targetUserId) {
        const helpEmbed = new EmbedBuilder()
          .setTitle('❌ Could Not Identify Ticket Creator')
          .setDescription(
            'Please try one of these solutions:\n\n' +
            '1. **Mention the customer** - Have the customer send a message in this ticket\n' +
            '2. **Manual mention** - Type their username like `@username` in this ticket\n' +
            '3. **Check if they left** - They may have left the server\n\n' +
            '**Channel Name:** `' + channelName + '`\n' +
            '**Searched Messages:** Yes\n' +
            '**Thread Owner Check:** Yes'
          )
          .setColor(0xFF0000)
          .setFooter({ text: 'Contact a developer if this persists' });

        await interaction.reply({ embeds: [helpEmbed], flags: 64 });
        return;
      }
      let targetMember;

      try {
        targetMember = interaction.guild.members.cache.get(targetUserId);

        if (!targetMember) {
          targetMember = await interaction.guild.members.fetch(targetUserId);
        }
      } catch (error) {
        console.error('Error fetching member:', error);
        await interaction.reply({ content: '❌ Ticket creator not found! They may have left the server.', flags: 64 });
        return;
      }

      if (!targetMember) {
        await interaction.reply({ content: '❌ Ticket creator not found! They may have left the server.', flags: 64 });
        return;
      }


      const staffMember = interaction.guild.members.cache.get(interaction.user.id);

      if (!hasAdminPermissions(interaction.user.id, staffMember)) {
        await interaction.reply({ 
          content: '❌ You do not have permission to grant buyer roles! Only server managers can do this.', 
          flags: 64 
        });
        return;
      }


      if (interaction.user.id === targetMember.user.id) {
        await interaction.reply({ 
          content: '❌ You cannot grant the buyer role to yourself! Only staff members can do this.', 
          flags: 64 
        });
        return;
      }
      const buyerRole = interaction.guild.roles.cache.get(BUYER_ROLE_ID);

      if (!targetMember) {
        await interaction.reply({ content: '❌ Ticket creator not found!', flags: 64 });
        return;
      }

        try {
          const hasRole = targetMember.roles.cache.has(BUYER_ROLE_ID);
          let roleMessage = '';

          if (!hasRole) {
            await targetMember.roles.add(buyerRole);
            roleMessage = `Granted <@&${BUYER_ROLE_ID}> role to ${targetMember.user.username}!`;
          } else {
            roleMessage = `${targetMember.user.username} already has the buyer role.`;
          }

        let order = userOrders.get(targetMember.user.id);

        if (!order) {
          order = { items: {}, hasSheckles: false };
          console.warn(`⚠️ No order data found for user ${targetMember.user.id}, using empty order`);
        }

        let purchaseUSD = 0;
        let purchaseRobux = 0;
        let productList = '';

        if (Object.keys(order.items).length > 0) {
          for (const [item, qty] of Object.entries(order.items)) {
            const product = GAMEPASSES[item];
            if (product) {
              purchaseUSD += product.usd * qty;
              purchaseRobux += product.robux * qty;
              productList += `• ${item} × ${qty} - $${(product.usd * qty).toFixed(2)} / ${(product.robux * qty).toLocaleString()} Robux\n`;
            }
          }
        }

        if (order.hasSheckles) {
          productList += '• Sheckles (custom quantity) - Price negotiated with staff\n';
        }

        let userSpend = userSpending.get(targetMember.user.id) || { totalUSD: 0, totalRobux: 0 };
        userSpend.totalUSD += purchaseUSD;
        userSpend.totalRobux += purchaseRobux;
        userSpending.set(targetMember.user.id, userSpend);
        
        // Update the real-time spending log
        await updateSpendingLog(targetMember.user.id, userSpend.totalUSD, userSpend.totalRobux);

        console.log(`💰 SPENDING UPDATE: ${targetMember.user.username} (${targetMember.user.id})`);
        console.log(`   This Purchase: $${purchaseUSD.toFixed(2)} USD | ${purchaseRobux} Robux`);
        console.log(`   Total Spending: $${userSpend.totalUSD.toFixed(2)} USD | ${userSpend.totalRobux} Robux`);

        const now = new Date();
        const estDate = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
        const estTimestamp = Math.floor(estDate.getTime() / 1000);

        const vipThresholdUSD = 35;
        const vipThresholdRobux = 3500;
        let shouldGetVIP = false;
        let vipMessage = '';

        if (userSpend.totalUSD >= vipThresholdUSD || userSpend.totalRobux >= vipThresholdRobux) {
          const vipRole = interaction.guild.roles.cache.get(VIP_ROLE_ID);
          if (vipRole && !targetMember.roles.cache.has(VIP_ROLE_ID)) {
            try {
              await targetMember.roles.add(vipRole);
              shouldGetVIP = true;
              vipMessage = '\n\n🌟 **Congratulations! You\'ve been promoted to VIP!** 🌟\nYou\'ve spent $35+ and earned VIP status!';
            } catch (error) {
              console.error('Error granting VIP role:', error);
            }
          }
        }

        const hasBuyerRole = targetMember.roles.cache.has(BUYER_ROLE_ID);

        let successMessage = `**${targetMember.user.username}** `;
        if (hasBuyerRole) {
            successMessage += 'already has the buyer role.';
        } else {            successMessage += 'has been granted the buyer role.';
        }

        successMessage += ' Their purchase has been recorded.';

        const successEmbed = new EmbedBuilder()
          .setTitle('✅ Purchase Successful!')
          .setDescription(successMessage + vipMessage)
          .addFields(
            { name: '👤 Customer', value: targetMember.user.username, inline: true },
            { name: '🛠️ Staff Member', value: interaction.user.username, inline: true },
            { name: '📅 Date', value: `<t:${estTimestamp}:R>`, inline: true }
          )
          .setColor(shouldGetVIP ? 0xFFD700 : 0x00FF00)
          .setTimestamp();

        await interaction.channel.send({ embeds: [successEmbed] });

        // Send vouch reminder to customer in ticket
        const vouchTicketEmbed = new EmbedBuilder()
          .setTitle('💬 Don\'t forget to vouch!')
          .setDescription(`Please leave a vouch in <#${VOUCH_CHANNEL_ID}> about your purchase experience!`)
          .setColor(0x00BFFF)
          .setTimestamp();

        await interaction.channel.send({ content: `<@${targetMember.user.id}>`, embeds: [vouchTicketEmbed] });

        // Send vouch reminder in vouch channel
        try {
          const vouchChannel = interaction.guild.channels.cache.get(VOUCH_CHANNEL_ID);
          if (vouchChannel) {
            const vouchChannelMessage = await vouchChannel.send(`Vouch here👋 <@${targetMember.user.id}>, type "Vouch" and ping the user you want to vouch saying what you bought!`);
            
            // Delete the vouch channel message after 30 seconds
            setTimeout(async () => {
              try {
                await vouchChannelMessage.delete();
              } catch (error) {
                console.log('Vouch channel message may have already been deleted');
              }
            }, 30000);
          }
        } catch (error) {
          console.error('Error sending vouch reminder to vouch channel:', error);
        }

        if (hasBuyerRole) {
          await interaction.reply({ content: `User already had buyer role. Success ✅. Ticket closing in 5 seconds`, flags: 64 });
        } else {
          await interaction.reply({ content: `✅ Buyer role granted to ${targetMember.user.username} successfully! Closing ticket in 5 seconds...`, flags: 64 });
        }

        userOrders.delete(targetMember.user.id);
        saveDatabase();

        // Clear inactivity timer for this ticket
        if (ticketInactivityTimers.has(interaction.channel.id)) {
          clearTimeout(ticketInactivityTimers.get(interaction.channel.id));
          ticketInactivityTimers.delete(interaction.channel.id);
        }

        setTimeout(async () => {
          try {
            await interaction.channel.delete();
          } catch (error) {
            console.log('Ticket may have already been deleted or bot lacks permissions');
          }
        }, 5000);

      } catch (error) {
        console.error('Error granting buyer role:', error);
        if (!interaction.replied) {
          await interaction.reply({ content: '❌ Failed to grant buyer role. Please contact staff.', flags: 64 });
        }
      }
    } else if (interaction.customId === 'copy_cashapp') {
      await interaction.reply({ 
        content: `📋 **CashApp:** \`$mrbru22\`\n\nClick to select and copy.`, 
        flags: 64 
      });
    } else if (interaction.customId === 'copy_paypal') {
      await interaction.reply({ 
        content: `📋 **PayPal:** \`mrbru2@hotmail.com\`\n\nClick to select and copy.`, 
        flags: 64 
      });
    } else if (interaction.customId.startsWith('confirm_closeall_')) {
      const requesterId = interaction.customId.split('_')[2];
      
      // Only the person who requested can confirm
      if (interaction.user.id !== requesterId) {
        return interaction.reply({ 
          content: '❌ Only the person who requested this can confirm!', 
          flags: 64 
        });
      }

      // Get stored tickets from temporary storage
      const storedTickets = [];
      for (const [key, ticket] of ticketInactivityTimers.entries()) {
        if (key.startsWith('closeall_')) {
          storedTickets.push(ticket);
        }
      }

      if (storedTickets.length === 0) {
        return interaction.update({ 
          content: '❌ No tickets found to close. They may have been closed already.', 
          embeds: [], 
          components: [] 
        });
      }

      let successCount = 0;
      let errorCount = 0;

      for (const ticket of storedTickets) {
        try {
          // Clear any existing inactivity timers for this ticket
          if (ticketInactivityTimers.has(ticket.ticketId)) {
            clearTimeout(ticketInactivityTimers.get(ticket.ticketId));
            ticketInactivityTimers.delete(ticket.ticketId);
          }

          // Remove from userTickets tracking
          for (const [userId, ticketId] of userTickets.entries()) {
            if (ticketId === ticket.ticketId) {
              userTickets.delete(userId);
              break;
            }
          }

          // Delete the ticket channel
          await ticket.channel.delete();
          successCount++;
          console.log(`✅ Closed ticket: ${ticket.ticketId}`);
        } catch (error) {
          console.error(`❌ Error closing ticket ${ticket.ticketId}:`, error);
          errorCount++;
        }
      }

      // Clean up temporary storage
      for (const key of ticketInactivityTimers.keys()) {
        if (key.startsWith('closeall_')) {
          ticketInactivityTimers.delete(key);
        }
      }

      saveDatabase();

      const resultEmbed = new EmbedBuilder()
        .setTitle('🗑️ Close All Tickets Results')
        .setDescription(`Ticket closure operation completed.`)
        .addFields(
          { name: '✅ Successfully Closed', value: `${successCount} tickets`, inline: true },
          { name: '❌ Failed to Close', value: `${errorCount} tickets`, inline: true },
          { name: '📊 Total Processed', value: `${storedTickets.length} tickets`, inline: true }
        )
        .setColor(successCount > 0 ? 0x00FF00 : 0xFF0000)
        .setFooter({ text: `Executed by ${interaction.user.username}` })
        .setTimestamp();

      await interaction.update({ embeds: [resultEmbed], components: [] });

    } else if (interaction.customId === 'cancel_closeall') {
      // Clean up temporary storage
      for (const key of ticketInactivityTimers.keys()) {
        if (key.startsWith('closeall_')) {
          ticketInactivityTimers.delete(key);
        }
      }

      const cancelEmbed = new EmbedBuilder()
        .setTitle('❌ Close All Cancelled')
        .setDescription('Close all tickets operation has been cancelled.')
        .setColor(0x808080);

      await interaction.update({ embeds: [cancelEmbed], components: [] });
    } else if (interaction.customId.startsWith('correct_count_')) {
      const member = interaction.guild.members.cache.get(interaction.user.id);

      if (!hasAdminPermissions(interaction.user.id, member)) {
        return interaction.reply({ 
          content: '❌ You do not have permission to correct message counts!', 
          ephemeral: true 
        });
      }

      const parts = interaction.customId.split('_');
      const targetUserId = parts[2];
      const correctCount = parseInt(parts[3]);

      if (isNaN(correctCount)) {
        return interaction.reply({ 
          content: '❌ Invalid count value!', 
          ephemeral: true 
        });
      }

      const userMessageData = userMessages.get(targetUserId) || { count: 0, lastReward: 0 };
      const oldCount = userMessageData.count;
      
      userMessageData.count = correctCount;
      userMessages.set(targetUserId, userMessageData);
      
      // Update the real-time logging channel
      await updateMessageCountLog(targetUserId, correctCount);
      
      saveDatabase();

      const targetUser = await client.users.fetch(targetUserId);

      const correctionEmbed = new EmbedBuilder()
        .setTitle('✅ Count Corrected!')
        .setDescription(`**${targetUser.username}**'s message count has been corrected.`)
        .addFields(
          { name: '📊 Previous Count', value: `${oldCount} messages`, inline: true },
          { name: '🔧 Corrected Count', value: `${correctCount} messages`, inline: true },
          { name: '📈 Difference', value: `${correctCount - oldCount > 0 ? '+' : ''}${correctCount - oldCount} messages`, inline: true }
        )
        .setColor(0x00FF00)
        .setFooter({ text: `Corrected by ${interaction.user.username}` })
        .setTimestamp();

      await interaction.update({ embeds: [correctionEmbed], components: [] });

      console.log(`🔧 MANUAL CORRECTION: ${targetUser.username} (${targetUserId}) corrected from ${oldCount} to ${correctCount} by ${interaction.user.username}`);
    } else if (interaction.customId.startsWith('confirm_clone_')) {
      const requesterId = interaction.customId.split('_')[2];
      
      // Only the person who requested can confirm
      if (interaction.user.id !== requesterId) {
        return interaction.reply({ 
          content: '❌ Only the person who requested this can confirm!', 
          flags: 64 
        });
      }

      try {
        const mainServerId = '1374840168833618084';
        const mainServer = client.guilds.cache.get(mainServerId);
        
        if (!mainServer) {
          return interaction.update({ 
            content: '❌ **ERROR:** Cannot access main server. Bot may not be in that server.',
            embeds: [], 
            components: [] 
          });
        }

        const processingEmbed = new EmbedBuilder()
          .setTitle('🔄 CLONING SERVER...')
          .setDescription('This operation may take several minutes. Please wait...')
          .setColor(0xFFA500)
          .setTimestamp();

        await interaction.update({ embeds: [processingEmbed], components: [] });

        const currentGuild = interaction.guild;

        // Step 1: Update server settings
        await currentGuild.setName(mainServer.name);
        if (mainServer.iconURL()) {
          await currentGuild.setIcon(mainServer.iconURL({ size: 512 }));
        }

        // Step 2: Clone roles (in reverse order to maintain hierarchy)
        const rolesToCreate = [];
        for (const [roleId, role] of mainServer.roles.cache) {
          if (role.name !== '@everyone') {
            rolesToCreate.push(role);
          }
        }

        rolesToCreate.sort((a, b) => a.position - b.position);

        const roleMapping = new Map();
        for (const role of rolesToCreate) {
          try {
            const newRole = await currentGuild.roles.create({
              name: role.name,
              color: role.color,
              hoist: role.hoist,
              mentionable: role.mentionable,
              permissions: role.permissions,
              icon: role.iconURL(),
              unicodeEmoji: role.unicodeEmoji,
              reason: 'Server clone operation'
            });
            roleMapping.set(role.id, newRole.id);
            console.log(`✅ Cloned role: ${role.name}`);
          } catch (error) {
            console.error(`❌ Failed to clone role ${role.name}:`, error);
          }
        }

        // Step 3: Delete existing channels and categories
        for (const [channelId, channel] of currentGuild.channels.cache) {
          try {
            await channel.delete('Server clone operation');
          } catch (error) {
            console.error(`Failed to delete channel ${channel.name}:`, error);
          }
        }

        // Step 4: Clone categories first
        const categoryMapping = new Map();
        const categories = mainServer.channels.cache.filter(c => c.type === 4);
        for (const [categoryId, category] of categories) {
          try {
            const newCategory = await currentGuild.channels.create({
              name: category.name,
              type: 4,
              position: category.position,
              reason: 'Server clone operation'
            });
            categoryMapping.set(category.id, newCategory.id);

            // Apply permission overwrites
            for (const [overwriteId, overwrite] of category.permissionOverwrites.cache) {
              try {
                let targetId = overwrite.id;
                if (overwrite.type === 1) { // Role
                  targetId = roleMapping.get(overwrite.id) || overwrite.id;
                }
                await newCategory.permissionOverwrites.create(targetId, {
                  allow: overwrite.allow,
                  deny: overwrite.deny
                });
              } catch (error) {
                console.error(`Failed to apply permission overwrite for category ${category.name}:`, error);
              }
            }
            console.log(`✅ Cloned category: ${category.name}`);
          } catch (error) {
            console.error(`❌ Failed to clone category ${category.name}:`, error);
          }
        }

        // Step 5: Clone channels
        const channels = mainServer.channels.cache.filter(c => c.type !== 4);
        for (const [channelId, channel] of channels) {
          try {
            const channelData = {
              name: channel.name,
              type: channel.type,
              position: channel.position,
              reason: 'Server clone operation'
            };

            if (channel.parent) {
              channelData.parent = categoryMapping.get(channel.parent.id);
            }

            if (channel.topic) channelData.topic = channel.topic;
            if (channel.nsfw !== undefined) channelData.nsfw = channel.nsfw;
            if (channel.rateLimitPerUser) channelData.rateLimitPerUser = channel.rateLimitPerUser;
            if (channel.bitrate) channelData.bitrate = channel.bitrate;
            if (channel.userLimit) channelData.userLimit = channel.userLimit;

            const newChannel = await currentGuild.channels.create(channelData);

            // Apply permission overwrites
            for (const [overwriteId, overwrite] of channel.permissionOverwrites.cache) {
              try {
                let targetId = overwrite.id;
                if (overwrite.type === 1) { // Role
                  targetId = roleMapping.get(overwrite.id) || overwrite.id;
                }
                await newChannel.permissionOverwrites.create(targetId, {
                  allow: overwrite.allow,
                  deny: overwrite.deny
                });
              } catch (error) {
                console.error(`Failed to apply permission overwrite for channel ${channel.name}:`, error);
              }
            }

            console.log(`✅ Cloned channel: ${channel.name}`);
          } catch (error) {
            console.error(`❌ Failed to clone channel ${channel.name}:`, error);
          }
        }

        // Step 6: Update role IDs in bot code constants
        const roleUpdates = {};
        if (roleMapping.has('1375282639623295027')) roleUpdates.SERVER_MANAGER_ROLE_ID = roleMapping.get('1375282639623295027');
        if (roleMapping.has('1375297594091372656')) roleUpdates.BUYER_ROLE_ID = roleMapping.get('1375297594091372656');
        if (roleMapping.has('1375281684282474628')) roleUpdates.OWNER_ROLE_ID = roleMapping.get('1375281684282474628');
        if (roleMapping.has('1379507894071857272')) roleUpdates.VIP_ROLE_ID = roleMapping.get('1379507894071857272');
        if (roleMapping.has('1384346040190107658')) roleUpdates.GOOD_BOY_ROLE_ID = roleMapping.get('1384346040190107658');
        if (roleMapping.has('1391413706054959208')) roleUpdates.UNC_ROLE_ID = roleMapping.get('1391413706054959208');
        if (roleMapping.has('1395807423159074906')) roleUpdates.MIDDLEMAN_ROLE_ID = roleMapping.get('1395807423159074906');

        const successEmbed = new EmbedBuilder()
          .setTitle('✅ SERVER CLONED SUCCESSFULLY!')
          .setDescription(
            `Main server has been successfully cloned to this server!\n\n` +
            `**Cloned:**\n` +
            `• Server name and icon\n` +
            `• ${rolesToCreate.length} roles\n` +
            `• ${categories.size} categories\n` +
            `• ${channels.size} channels\n` +
            `• All permissions and overwrites\n\n` +
            `**Role ID Updates:**\n` +
            Object.entries(roleUpdates).map(([key, value]) => `• ${key}: ${value}`).join('\n') || 'No role mappings to update'
          )
          .setColor(0x00FF00)
          .setFooter({ text: `Cloned by ${interaction.user.username}` })
          .setTimestamp();

        await interaction.followUp({ embeds: [successEmbed] });

      } catch (error) {
        console.error('Error cloning server:', error);
        await interaction.followUp({ 
          content: '❌ **ERROR:** Server cloning failed. Check console for details.',
          flags: 64 
        });
      }
    } else if (interaction.customId === 'cancel_clone') {
      const cancelEmbed = new EmbedBuilder()
        .setTitle('❌ Clone Cancelled')
        .setDescription('Server cloning operation has been cancelled.')
        .setColor(0x808080);

      await interaction.update({ embeds: [cancelEmbed], components: [] });
    
    } else if (interaction.customId.startsWith('confirm_deletemsg_')) {
      const parts = interaction.customId.split('_');
      const channelId = parts[2];
      const requesterId = parts[3];
      
      // Only the person who requested can confirm
      if (interaction.user.id !== requesterId) {
        return interaction.reply({ 
          content: '❌ Only the person who requested this can confirm!', 
          flags: 64 
        });
      }

      try {
        const targetChannel = interaction.guild.channels.cache.get(channelId);
        if (!targetChannel) {
          return interaction.update({ 
            content: '❌ **ERROR:** Channel not found or no longer exists.',
            embeds: [], 
            components: [] 
          });
        }

        const processingEmbed = new EmbedBuilder()
          .setTitle('🗑️ DELETING MESSAGES...')
          .setDescription(`Deleting all messages in <#${channelId}>...\n\nThis may take several minutes.`)
          .setColor(0xFFA500)
          .setTimestamp();

        await interaction.update({ embeds: [processingEmbed], components: [] });

        let deletedCount = 0;
        let hasMoreMessages = true;

        while (hasMoreMessages) {
          try {
            const messages = await targetChannel.messages.fetch({ limit: 100 });
            
            if (messages.size === 0) {
              hasMoreMessages = false;
              break;
            }

            // Delete messages in batches
            const messagesToDelete = Array.from(messages.values());
            
            for (const msg of messagesToDelete) {
              try {
                await msg.delete();
                deletedCount++;
                
                // Add delay to prevent rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
              } catch (error) {
                console.error(`Failed to delete message ${msg.id}:`, error);
              }
            }

            // Update progress every 100 deletions
            if (deletedCount % 100 === 0) {
              const progressEmbed = new EmbedBuilder()
                .setTitle('🗑️ DELETING MESSAGES...')
                .setDescription(`Deleted ${deletedCount} messages so far...\n\nPlease wait...`)
                .setColor(0xFFA500)
                .setTimestamp();

              try {
                await interaction.editReply({ embeds: [progressEmbed] });
              } catch (error) {
                console.log('Could not update progress message');
              }
            }

          } catch (error) {
            console.error('Error during message deletion batch:', error);
            hasMoreMessages = false;
          }
        }

        const successEmbed = new EmbedBuilder()
          .setTitle('✅ MESSAGES DELETED SUCCESSFULLY!')
          .setDescription(
            `All messages have been deleted from <#${channelId}>!\n\n` +
            `**Total messages deleted:** ${deletedCount}\n` +
            `**Channel:** ${targetChannel.name}\n` +
            `**Operation completed at:** ${new Date().toLocaleString()}`
          )
          .setColor(0x00FF00)
          .setFooter({ text: `Executed by ${interaction.user.username}` })
          .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed] });

      } catch (error) {
        console.error('Error deleting messages:', error);
        await interaction.followUp({ 
          content: '❌ **ERROR:** Message deletion failed. Check console for details.',
          flags: 64 
        });
      }
    } else if (interaction.customId === 'cancel_deletemsg') {
      const cancelEmbed = new EmbedBuilder()
        .setTitle('❌ Message Deletion Cancelled')
        .setDescription('Message deletion operation has been cancelled.')
        .setColor(0x808080);

      await interaction.update({ embeds: [cancelEmbed], components: [] });
    }
  } else if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'select_category') {
      const category = interaction.values[0];
      if (category === 'sheckles') {
        const userId = interaction.user.id;
        let order = userOrders.get(userId) || { items: {}, hasSheckles: false };
        order.hasSheckles = true;
        userOrders.set(userId, order);

        const finishButton = new ButtonBuilder()
          .setCustomId('confirm_purchase_ticket')
          .setLabel('Create Ticket')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🎫');

        const continueButton = new ButtonBuilder()
          .setCustomId('continue_shopping')
          .setLabel('Continue Shopping')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🛒');

        const row = new ActionRowBuilder().addComponents(finishButton, continueButton);
        await interaction.update({ content: 'Sheckles added to order!', components: [row] });
      } else {
        const petOptions = getPetOptions(category);
        if (petOptions.length === 0) {
          await interaction.reply({ content: 'No items available in this category.', flags: 64 });
          return;
        }

        const petMenu = new StringSelectMenuBuilder()
          .setCustomId(`select_pet_${category}`)
          .setPlaceholder('Choose a pet/item')
          .addOptions(petOptions);

        const row = new ActionRowBuilder().addComponents(petMenu);
        await interaction.update({ content: `Choose from ${category}:`, components: [row] });
      }
    } else if (interaction.customId.startsWith('select_pet_')) {
      const category = interaction.customId.split('_')[2];
      const selectedPet = interaction.values[0];
      const userId = interaction.user.id;

      // Create quantity selection modal
      const quantityModal = new ModalBuilder()
        .setCustomId(`quantity_modal_${selectedPet}`)
        .setTitle(`Select Quantity for ${selectedPet.charAt(0).toUpperCase() + selectedPet.slice(1)}`);

      const quantityInput = new TextInputBuilder()
        .setCustomId('quantity_input')
        .setLabel('How many would you like?')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter a number (e.g., 1, 2, 3...)')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(2);

      const actionRow = new ActionRowBuilder().addComponents(quantityInput);
      quantityModal.addComponents(actionRow);

      await interaction.showModal(quantityModal);
    } else if (interaction.customId === 'select_sheckles') {
      const userId = interaction.user.id;
      let order = userOrders.get(userId) || { items: {}, hasSheckles: false };
      order.hasSheckles = true;
      userOrders.set(userId, order);

      const finishButton = new ButtonBuilder()
        .setCustomId('confirm_purchase_ticket')
        .setLabel('Create Ticket')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🎫');

      const continueButton = new ButtonBuilder()
        .setCustomId('continue_shopping')
        .setLabel('Continue Shopping')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🛒');

      const row = new ActionRowBuilder().addComponents(finishButton, continueButton);
      await interaction.update({ content: 'Sheckles added to order!', components: [row] });
    }
  }
});

client.login(process.env.TOKEN);

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  loadDatabase();
  
  // Load message counts from the logging channel
  await loadMessageCountsFromLog();
  
  // Load spending data from the logging channel
  await loadSpendingFromLog();
  
  // Set up automatic member tracking if !save was used before
  if (PERMANENT_SAVE_USERS.size > 0) {
    console.log('🔄 Setting up automatic member tracking (save was used before)');
    
    const bensMarketId = '1374840168833618084';
    const guedxServerId = '1326004136918909052';
    const memberChannelId = '1398445250636156928';
    
    const memberTracker = async (member) => {
      if (member.guild.id === bensMarketId && !member.user.bot) {
        try {
          const guedxServer = client.guilds.cache.get(guedxServerId);
          if (!guedxServer) return;
          
          const memberChannel = guedxServer.channels.cache.get(memberChannelId);
          if (!memberChannel) return;
          
          // Check if member already exists to prevent duplicates
          const existingCheck = await memberChannel.messages.fetch({ limit: 100 });
          let memberExists = false;
          
          for (const msg of existingCheck.values()) {
            if (msg.content.includes(`(${member.user.id})`)) {
              memberExists = true;
              break;
            }
          }
          
          if (!memberExists) {
            const newMemberMessage = `**NEW MEMBER JOINED:**\n**${member.user.username}** (${member.user.id})\nJoined: ${new Date().toISOString()}`;
            await memberChannel.send(newMemberMessage);
            console.log(`📥 Auto-tracked new member: ${member.user.username} (${member.user.id})`);
          }
        } catch (error) {
          console.error('Error auto-tracking new member:', error);
        }
      }
    };

    client.on('guildMemberAdd', memberTracker);
    console.log('✅ Automatic member tracking enabled on startup');
  }
  
  // Clean up archived tickets and restart inactivity timers for active ones
  const ticketChannelId = '1374843063028940943';
  const mainChannel = client.channels.cache.get(ticketChannelId);
  
  if (mainChannel) {
    console.log('🔍 Checking existing tickets on startup...');
    let cleanedCount = 0;
    let activeCount = 0;
    
    for (const [userId, ticketId] of userTickets.entries()) {
      try {
        const channel = client.channels.cache.get(ticketId);
        
        if (channel && channel.isThread()) {
          if (channel.archived || channel.locked) {
            userTickets.delete(userId);
            cleanedCount++;
            console.log(`🗑️ Cleaned archived ticket ${ticketId} for user ${userId}`);
          } else {
            // Restart inactivity timer for active tickets
            handleTicketInactivity(ticketId, userId);
            activeCount++;
            console.log(`🔄 Restarted anti-archive timer for ticket ${ticketId}`);
          }
        } else {
          userTickets.delete(userId);
          cleanedCount++;
          console.log(`🗑️ Cleaned non-existent ticket ${ticketId} for user ${userId}`);
        }
      } catch (error) {
        console.error(`Error checking ticket ${ticketId}:`, error);
        userTickets.delete(userId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      saveDatabase();
    }
    
    console.log(`✅ Ticket cleanup complete: ${activeCount} active, ${cleanedCount} cleaned`);
  }

  // Set up midnight reset for daily admin updates only
  function scheduleNextMidnightReset() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Set to midnight
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      // Reset only admin daily updates at midnight (remove admin_ prefixed entries)
      for (const [key, value] of userUpdateUsed.entries()) {
        if (key.startsWith('admin_')) {
          userUpdateUsed.delete(key);
        }
      }
      console.log('🕛 Admin daily update resets cleared at midnight');
      
      // Schedule the next reset
      scheduleNextMidnightReset();
    }, msUntilMidnight);
    
    console.log(`⏰ Next daily reset scheduled in ${Math.round(msUntilMidnight / 1000 / 60 / 60)} hours`);
  }
  
  scheduleNextMidnightReset();
});
