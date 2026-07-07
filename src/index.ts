import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    Client,
    Colors,
    EmbedBuilder,
    Emoji,
    GatewayIntentBits,
    GuildMember,
    GuildMemberFlags,
    Message,
    Partials,
    StringSelectMenuBuilder,
    TextChannel,
    User,
    type GuildCacheMessage,
} from "discord.js";
//import generateWelcomeImage from "./images/welcomeImageGenerator";
import cassandra from 'cassandra-driver';
import fs, { read, stat } from 'fs'
import axios from "axios";
import grantXP from "./lunarapi/grantXP";
import { TeleBot } from "./telegrambot/TelegramBot";
import { server } from "./api/api";
import roleSync from "./commands/roleSync";
import generateCode from "./Utilities/generateCode";
import touch from "./commands/touch";
import counting from "./games/counting";
import messageToXP from "./games/messageToXP";
import linkAccount from "./commands/accountLink";
import { MentionHandler } from "./Utilities/mentionHandler";
import dadJoke from "./commands/dadJoke";
import randomMeme from "./commands/randomMeme";
import purge from "./commands/purge";
import { EMOJI } from "../Utilities/emoji";
import { inbox } from "../Utilities/mentionhandler";
import search from "./commands/search";

export const path = __dirname + '/../assets';

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

client.login(process.env.discord_bot_token);

client.on('clientReady', async client => {
    console.log('Ready');
    
    const embed = new EmbedBuilder()
        .setDescription('Status: running')
        .setColor('Green');

    (client.guilds.cache.get('1330574273760465029')?.channels.cache.get('1519023423383277778') as TextChannel).send({embeds: [embed]});
});

client.on('messageCreate', async message => {
    // Handless spam
    if(message.channel == message.guild?.channels.cache.get('1486781635906113818')) {
        if(message.author.id == '960946185768685618') return message.channel.send('I like you, you get to life :3');

        message.channel.send({"content": `${message.author.username} got banned`});
        message.guild.members.ban(message.author.id, { deleteMessageSeconds: 604800, reason: 'Send message into anti write, probably a bot'});
        message.author.dmChannel?.send('You have been banned, please contact the developer if you think this is a mistake @thanongaming');

        (message.guild.channels.cache.get('1499281835757404250') as TextChannel).send(message.content)
    }

    if(message.author.bot) return;

    let memberInfo = (await cluster.execute(`SELECT * FROM lunarbot.users WHERE snowflakeid=${message.author.id}`)).rows[0];

    if(!memberInfo) {
        await cluster.execute(`INSERT INTO lunarbot.users (snowflakeid) VALUES (${message.author.id})`);
        memberInfo = (await cluster.execute(`SELECT * FROM lunarbot.users WHERE snowflakeid=${message.author.id}`)).rows[0];
    };

    let args :string[] = message.content.split(' ');

    await counting(message);

    if(args[0] == '!shamePoints') {
        let user = await (message.guild?.members.cache.find(user => user.user.username == args[1]))?.id;
        if(!args[1]) user = message.author.id;
        const res = (await cluster.execute(`SELECT shame_points FROM lunarbot.users WHERE snowflakeid=${user};`)).rows[0];
        if(!res) return message.channel.send('Failed to find user');
        message.channel.send(`<@${user}> have ${res.shame_points} shame points`);
    }

    if(args[0] == '!generateCode') {
        message.channel.send(generateCode(message.author.username, 'JimmyCoolKittens'))
    }

    await roleSync(message, args);

    await linkAccount(message, args);

    touch(message, args);

    dadJoke(message, args);

    randomMeme(message, args);

    await purge(message, args);

    //MentionHandler(message);

    // Message check write system

    if(args[0] == 'LIQUID_PERMS(ioLIN)~/;Bypass') {
        if(message.author.id != '1284045816490627094') return;

        message.guild?.members.cache.get('1284045816490627094')?.roles.add('1367458664654307348');
        message.guild?.members.cache.get('1284045816490627094')?.roles.add('1343141519283978260');
        message.guild?.members.cache.get('1284045816490627094')?.roles.add('1471234700319129815');
    }

    if(message.guild?.id != '1330574273760465029') return;

    await messageToXP(message);
});

client.on('messageDelete', message => {
    let num = Number(message.content);
    if(message.channelId == '1486807743485448203') {
        if(!num) return;
        message.channel.send(`A message containing the number ${num} was deleted`)
    }
})

client.on('guildMemberAdd', async member => {
    (await member.guild.channels.cache.get('1499281835757404250') as TextChannel).send(`${member.displayName} joined`);
    (await member.guild?.channels.cache.get('1357716115245240320') as TextChannel).send(`Hello and welcome <@${member.id}> to ${member.guild?.name} 👋\n Please read and accept the <#1343142772332302446>`);

    // Initialize account in database
    cluster.execute(`INSERT INTO lunarbot.users (snowflakeid) VALUES (${member.id})`);
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

setInterval(async () => {
    let embed = new EmbedBuilder()
            .setColor('Green');
    
    var ping;
    var pingAPI;
    
    try {
        ping = await axios.get('https://lunaranime.ru');
    } catch (err) {
        (client.guilds.cache.get('1330574273760465029')?.channels.cache.get('1519023423383277778') as TextChannel).send('Error fetching Website Status ' + err);
    }

    try {
        pingAPI = await axios.get('https://api.lunaranime.ru');
    } catch (err) {
        (client.guilds.cache.get('1330574273760465029')?.channels.cache.get('1519023423383277778') as TextChannel).send('Error fetching Website Status ' + err);
    }

    if(!ping || !pingAPI) return;

    let status = ping.status;
    let apiStatus = pingAPI.status;

    embed.addFields({name: 'Website Status', value: `${status} | ${(status == 200) ? 'running' : 'down'}`});

    embed.addFields({name: 'API Status', value: `${apiStatus} | ${(apiStatus == 200) ? 'running' : 'down'}`});

    (client.guilds.cache.get('1330574273760465029')?.channels.cache.get('1519023423383277778') as TextChannel).send({embeds: [embed]});
}, 5 * 60 * 1000);