import { ChannelType, Client, Colors, EmbedBuilder, Emoji, GatewayIntentBits, GuildMember, GuildMemberFlags, Message, Partials, TextChannel, User, type GuildCacheMessage } from "discord.js";
//import generateWelcomeImage from "./images/welcomeImageGenerator";
import cassandra from 'cassandra-driver';
import fs, { read } from 'fs'
import axios from "axios";
import grantXP from "./Utilities/grantXP";
import { TeleBot } from "./telegrambot/TelegramBot";
import { server } from "./api/api";
import roleSync from "./Utilities/roleSync";
import generateCode from "./Utilities/generateCode";

export const client = new Client({ intents: [ GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.DirectMessageTyping,
], partials: [Partials.GuildMember, Partials.Message, Partials.Reaction, Partials.Channel, Partials.User]});

export const cluster = new cassandra.Client({
    contactPoints: ['localhost'],
    localDataCenter: 'datacenter1',
});

cluster.connect();

// if(process.env.TELEGRAM_TOKEN) { var telegrambot = new TeleBot(process.env.TELEGRAM_TOKEN); telegrambot.sendAsWebhook(-1003301284161_1); };

//
export const path = __dirname + '/../assets'

client.login(process.env.discord_bot_token);

client.on('clientReady', client => {
    console.log('Ready');
});

server();

client.on('typingStart', typing => {

})

client.on('messageCreate', async message => {
    if(message.author.bot) return;

    let memberInfo = (await cluster.execute(`SELECT * FROM lunarbot.users WHERE snowflakeid=${message.author.id}`)).rows[0];

    if(!memberInfo) {
        await cluster.execute(`INSERT INTO lunarbot.users (snowflakeid) VALUES (${message.author.id})`);
        memberInfo = (await cluster.execute(`SELECT * FROM lunarbot.users WHERE snowflakeid=${message.author.id}`)).rows[0];
    };

    let args :string[] = message.content.split(' ');

    // Handless spam
    if(message.channel == message.guild?.channels.cache.get('1486781635906113818')) {
        if(message.author.id == '960946185768685618') return message.channel.send('I like you, you get to life :3');

        message.channel.send({"content": `${message.author.username} got banned`});
        message.guild.members.ban(message.author.id, { deleteMessageSeconds: 604800, reason: 'Send message into anti write, probably a bot'});
        message.author.dmChannel?.send('You have been banned, please contact the developer if you think this is a mistake @thanongaming');
    }

    if(message.channel == message.guild?.channels.cache.get('1486807743485448203')) {
        let currentNumber = Number(message.content);
        let lastNumber = 0;
        let lastMember = null;
        let lastCountInfo = (await cluster.execute(`SELECT * FROM lunarbot.variables WHERE identifier='last_count';`)).rows[0];

        if(!currentNumber) return;

        if(!lastCountInfo) return console.log('Error fetching DB entry for last_count');
        if(lastCountInfo['int_value']) lastNumber = lastCountInfo['int_value'];
        if(lastCountInfo['string_value']) lastMember = lastCountInfo['string_value'];

        if(message.author.id == lastMember) return message.channel.send('You already counted');

        if(currentNumber == lastNumber+1) {
            if(currentNumber == 67) message.channel.send('https://images-ext-1.discordapp.net/external/s_JjhstVcwbUfFvRbEG36mC-b5atAncCn8f_bi0jPew/https/media1.giphy.com/media/v1.Y2lkPTczYjhmN2IxeHhrazd6Z2JiZWt0MndvbDF4YnBtbmhvaTN4amt6Yno0cmJtd3V0eSZlcD12MV9naWZzX2dpZklkJmN0PWc/08uBcURaMq6vA93TGc/giphy.mp4')

            if(currentNumber == 12) message.channel.send(`<@756535229933551656> come here, 13 awaits you`);

            if(currentNumber == 13 && message.author.id == '756535229933551656') message.channel.send('Good Girl');

            if(currentNumber == 22) message.channel.send('<@1267906230634938530> 23 for the 32 year old');

            await cluster.execute(`UPDATE lunarbot.variables SET int_value=${currentNumber}, string_value='${message.author.id}' WHERE identifier='last_count';`);

            message.react('✅');
        } else {
            message.react('❌');
            message.react('🍅');
            message.channel.send(`<@${message.author.id}> messed up\nClick tomato to shame`);
            await cluster.execute(`UPDATE lunarbot.variables SET int_value=0, string_value='${message.author.id}' WHERE identifier='last_count';`);
        }
    };

    if(args[0] == '!openCrates') {
        if(!args[1]) return message.channel.send('please specifiy how many crates to open');

        if(message.author.id != '960946185768685618') return;

        let toOpen :number = Number(args[1]);

        const embed = new EmbedBuilder()
                .setTitle(`Crate outcome for ${toOpen} Legendary Crates`);

        let wins = [];

        for(let i = 0; i < toOpen; i++) {
            const casino = await axios.post('https://api.lunaranime.ru/api/rewards/casino/crates/open', {
                "crate_tier": "legendary"
            }, {
                headers: {
                    Authorization: process.env.lunar_token
                }
            });

            wins.push({'name': casino.data.item_name, 'value': String(casino.data.luna_coins)});
        }

        embed.addFields(wins);

        message.channel.send({embeds: [embed]});
    }

    if(args[0] == '!shamePoints') {
        let user = await (message.guild?.members.cache.find(user => user.displayName == args[1]))?.id;
        if(!args[1]) user = message.author.id;
        const res = (await cluster.execute(`SELECT shame_points FROM lunarbot.users WHERE snowflakeid=${user};`)).rows[0];
        if(!res) return message.channel.send('Failed to find user');
        message.channel.send(`<@${user}> have ${res.shame_points} shame points`);
    }

    if(args[0] == '!generateCode') {
        message.channel.send(generateCode(message.author.username))
    }

    if(args[0] == '!link') {
        let code = ''
        if(message.guild) return message.channel.send('Please send me a dm using this formate `!link <lunar anime account username>`');
        if(!args[1]) return message.channel.send('Please add a username or your code');
        const doesUserExist = (await cluster.execute(`SELECT * FROM lunarbot.accountlinks WHERE snowflakeid=${message.author.id} ALLOW FILTERING`)).rows;
        if(!doesUserExist) return message.channel.send('User already found in database, please send a dm to <@960946185768685618> for fixing')

        try {
            var accountInfo = await axios.get(`https://api.lunaranime.ru/api/animes/profile?username=${args[1]}`, {headers: { 'X-Scraper-Guard-Bypass': `${process.env.bypass_token}`}});
        } catch (err) {
            return message.channel.send('Failed to fetch account info');
        }

        try {
            axios.post('https://api.lunaranime.ru/api/notification/admin-send', {
                'user_identifier': `${args[1]}`,
                'type_': 'custom',
                'content': `Please dm the lunar bot the following: !link-code ${code}`
            },{
                headers: {
                    'X-Scraper-Guard-Bypass': `${process.env.bypass_token}`,
                    'Authorization': `${process.env.lunar_token}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (err) {
            console.log('Failed to link ' + err)
        }

        message.channel.send('Please check your Lunar Anime Notifications');

        cluster.execute(`INSERT INTO lunarbot.accountlinks (snowflakeid, lunaruuid, verification_code, verified) VALUES (${message.author.id}, ${accountInfo.data.data.user_id}, ${code}, false)`)
    }

    roleSync(message, args);

    if(!message.guild) {
        if(message.content.startsWith('!link-code')) {
            const accountInfo = (await cluster.execute(`SELECT * FROM lunarbot.accountlinks WHERE snowflakeid=${message.author.id} ALLOW FILTERING;`)).rows[0];
            if(!accountInfo) return message.channel.send('database error');
            if(accountInfo['verified'] == true) return message.channel.send('This account is already linked')
            let code = +accountInfo['verification_code'];

            if(!args[1]) return message.channel.send('Please enter a valid code');
            let verifyCode :number = +args[1];
            if(verifyCode == code) {
                message.channel.send('linked successfully');
                await cluster.execute(`UPDATE lunarbot.accountlinks SET verified=true WHERE snowflakeid=${message.author.id} AND lunaruuid=${accountInfo.lunaruuid};`);
                (await (await client.guilds.fetch('1330574273760465029')).channels.cache.get('1499281835757404250') as TextChannel).send(`discord user <@${message.author.id}> Successfully linked their lunar account with uuid ${accountInfo['lunaruuid']}`);
            } else {
                message.channel.send('Verification failed');
            }
        }
    }

    if(message.channel.id == '1343142761519644774') {
        //telegrambot.sendMessage(-1003301284161_9, message.content);
    }

    if(args[0] == '!bulduck67') {
        if(message.author.id != '960946185768685618') return;

        if(!args[1]) return;

        (await message.channel.messages.fetch({limit: +args[1]})).forEach(msg => {
            msg.delete();
        })
    }

    if(args[0] == '!say') {
        if(message.author.id = '') {};
    }

    // Message check write system

    if(message.guild?.id != '1330574273760465029') return;
    const userInfo = (await cluster.execute(`SELECT * FROM lunarbot.accountlinks WHERE snowflakeid=${message.author.id} ALLOW FILTERING;`)).rows[0];
    if(!userInfo) return;
    if(!userInfo.verified) return;
    const chance = Math.random() * 100;
    let penalty = 1;
    let count = {};

    if(message.content.length > 500) { penalty = penalty - 0.2; console.log('Penalty reduction 500 ' + penalty) }
    else if(message.content.length > 1000) { penalty = penalty - 0.4; console.log('Penalty reduction 1000 ' + penalty) };

    if(message.content == ((await message.channel.messages.fetch({ limit: 2 })).last() as Message).content) { penalty = penalty - 0.9; console.log('Penalty reduction same ' + penalty) };
    if(message.content.startsWith(((await message.channel.messages.fetch({ limit: 2 })).last() as Message).content)) { penalty = penalty - 0.3; console.log('Penalty reduction similiar start ' + penalty) };

    if(message.author.id == ((await message.channel.messages.fetch({ limit: 2 })).last() as Message).author.id) { penalty = penalty - 0.1; console.log('Penalty reduction same sender ' + penalty) };

    // Time
    if(!userInfo.last_message_time) userInfo.last_message_time = new Date().getTime() - 10000;

    let timeSinceLastMessage = new Date().getTime() - userInfo.last_message_time;

    if(timeSinceLastMessage > 1000) { penalty = penalty - 0.1; console.log('Penalty reduction 1 secs ' + penalty) }
    else if(timeSinceLastMessage > 5000) { penalty = penalty - 0.2; console.log('Penalty reduction 5 secs ' + penalty) }
    else if(timeSinceLastMessage > 10000) { penalty = penalty - 0.3; console.log('Penalty reduction 10 secs ' + penalty) };

    // calculate when user joined
    const guildMember = message.guild?.members.cache.get(message.author.id);
    if(!guildMember) return;
    if(!guildMember?.joinedAt) return;
    if(guildMember.joinedAt?.getTime() < (7 * 24 * 60 * 60 * 1000)) { penalty = penalty + 0.2; console.log('First week bonus') };

    // Badge penalty subtraction

    if(message.content.length < 0) return;

    if(chance > 50) {
        const length = Math.floor((message.content.length / 10) * penalty);
        xpGrantingFinal(message, userInfo, chance, length, penalty, timeSinceLastMessage);
    } else if (chance > 75) {
        const length = Math.floor(((message.content.length / 10) * 1.25) * penalty);
        xpGrantingFinal(message, userInfo, chance, length, penalty, timeSinceLastMessage);
    } else if (chance > 100) {
        const length = Math.floor(((message.content.length / 10) * 1.5) * penalty);
        xpGrantingFinal(message, userInfo, chance, length, penalty, timeSinceLastMessage);
    }
});

client.on('messageDelete', message => {
    let num = Number(message.content);
    if(message.channelId == '1486807743485448203') {
        if(!num) return;
        message.channel.send(`A message containing the number ${num} was deleted`)
    }
})

async function xpGrantingFinal(message :Message, userInfo :cassandra.types.Row, chance :number, amount :number, penalty :number, timeSinceLastMessage :number) {
    if(amount < 0) return;

    cluster.execute(`UPDATE lunarbot.accountlinks SET last_message_time=${new Date().getTime()} WHERE snowflakeid=${message.author.id} AND lunaruuid=${userInfo.lunaruuid}`);
    console.log(`Chance: ${chance} | message length: ${amount} | penalty: ${penalty} | lastXPGain ${userInfo['last_message_time']} time since then: ${timeSinceLastMessage}`);
    console.log(`gave xp to ${userInfo.lunaruuid} amount: ${amount}`);
    let xpGive = await grantXP(userInfo.lunaruuid, amount);

    if(xpGive) {
        (await message.guild?.channels.cache.get('1499281835757404250') as TextChannel).send(`Gave xp to ${userInfo.lunaruuid} aka ${xpGive.username} xp given ${xpGive.xp_granted}`);
        const embed = new EmbedBuilder()
    .setColor(0x7C5CFF)
    .setAuthor({
        name: "🌙 Lunar XP",
        iconURL: client.user?.displayAvatarURL()
    })
    .setDescription(
        `╭─ ✦ **Experience Gained**
        │
        │ <a:65270roseblooming:1369250407225884672> **${xpGive.username}** earned **+${xpGive.xp_granted} XP**
        │
        │ <a:59120white:1369250400401620992> Level: **${xpGive.new_level}**
        │ <a:59586leftwing:1369250402834583693> Current XP: **${xpGive.new_xp}**
        │
        ${xpGive.leveled_up
        ? `│ <a:72687pink:1369250415971012689> **Level Up!**
        │ :97637pink: **${xpGive.previous_level}** ➜ **${xpGive.new_level}**
        │`
        : ""}
        ╰────────────`
            )
    .setFooter({
        text: "☾ Lunar XP • "
    }).setTimestamp();

        (await message.guild?.channels.cache.get('1514345477188092024') as TextChannel).send({embeds: [embed]});
    } else {
        (await message.guild?.channels.cache.get('1499281835757404250') as TextChannel).send(`Response 400 error`);
    }
}

client.on('guildMemberAdd', async member => {
    (await member.guild.channels.cache.get('1499281835757404250') as TextChannel).send(`${member.displayName} joined`);
    (await member.guild?.channels.cache.get('1357716115245240320') as TextChannel).send(`Hello and welcome <@${member.id}> to ${member.guild?.name} 👋\n Please read and accept the <#1343142772332302446>`);

    // Initialize account in database
    cluster.execute(`INSERT INTO lunarbot.users (snowflakeid) VALUES (${member.id})`);
    try {
        let guild = await client.guilds.cache.get('1330574273760465029');
        guild?.channels.cache.get('1517215700304003312')?.setName('Discord Members: ' + guild?.memberCount).catch((err) => console.log(err));
        let onlineUsers = (await axios.get('https://api.lunaranime.ru/api/presence/online-users')).data.count;
        if(!onlineUsers) onlineUsers = 1000;
        guild?.channels.cache.get('1517215817358643291')?.setName('Online on Lunar: ' + onlineUsers).catch((err) => console.log(err));
    } catch (err) {
        console.log(err);
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    if(reaction.message.channel.id == '1486807743485448203') {
        if(reaction.emoji.name == '🍅') {
            const memberInfo = (await cluster.execute(`SELECT * FROM lunarbot.users WHERE snowflakeid=${reaction.message.author?.id}`)).rows[0];
            if(!memberInfo) { cluster.execute(`INSERT INTO lunarbot.users (snowflakeid) VALUES (${reaction.message.author?.id})`); return; }            
            if(!memberInfo['shame_points']) memberInfo['shame_points'] = 0;
            await cluster.execute(`UPDATE lunarbot.users SET shame_points=${memberInfo['shame_points']+1} WHERE snowflakeid=${reaction.message.author?.id}`);
        }
    }

    if(reaction.message.id == '1516794662919340123') {
        if(reaction.emoji.name == '💜') (reaction.message.guild?.members.cache.get(user.id) as GuildMember).roles.add('1516794961964830760');
        if(reaction.emoji.id == '🖤') (reaction.message.guild?.members.cache.get(user.id) as GuildMember).roles.add('1501329871312261120');
    }
});

client.on('messageReactionRemoveEmoji', async reaction => {
    if(reaction.message.channel.id == '1486807743485448203') {
        if(reaction.emoji.name == '🍅') {
            const memberInfo = (await cluster.execute(`SELECT * FROM lunarbot.users WHERE snowflakeid=${reaction.message.author?.id}`)).rows[0];
            if(!memberInfo) { cluster.execute(`INSERT INTO lunarbot.users (snowflakeid) VALUES (${reaction.message.author?.id})`); return; }            
            if(!memberInfo['shame_points']) memberInfo['shame_points'] = 0;
            await cluster.execute(`UPDATE lunarbot.users SET shame_points=${memberInfo['shame_points']-1} WHERE snowflakeid=${reaction.message.author?.id}`);
        }
    }
});

client.on('guildMemberRemove', async member => {
    (await member.guild.channels.cache.get('1499281835757404250') as TextChannel).send(`<@${member.id}> left`);
});

client.on('guildBanAdd', async ban => {
    (await ban.guild.channels.cache.get('1499281835757404250') as TextChannel).send(`<@${ban.user.id}> was banned for ${ban.reason}`);
});

client.on('guildBanRemove', async member => {
    (await member.guild.channels.cache.get('1499281835757404250') as TextChannel).send(`<@${member.user.id}> was unbanned`);
});

client.on('error', err => {
    console.log(err);
});