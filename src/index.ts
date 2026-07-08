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
import { BOT_INFO, formatDevelopers, getUptime } from "../Utilities/about.js";
import { aboutCommand } from "./commands/about.js";


export const path = __dirname + '/../assets';



export const client = new Client({

    intents: [

        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.DirectMessageTyping,

    ],

    partials: [

        Partials.GuildMember,
        Partials.Message,
        Partials.Reaction,
        Partials.Channel,
        Partials.User

    ]

});



// ======================================================
// ANTI WRITE SYSTEM
// ======================================================

const ANTI_WRITE_CHANNEL =
    "1486781635906113818";


const ANTI_WRITE_BYPASS_ROLES = [

    "1521244395272405164",
    "1343141519283978260"

];


const ANTI_WRITE_BYPASS_USER =
    "1419744000977403994";


let antiWriteBannedCount = 0;


let antiWriteStickyMessage: Message | null = null;



export const cluster = new cassandra.Client({

    contactPoints: ['localhost'],

    localDataCenter: 'datacenter1',

});


cluster.connect();



client.login(process.env.discord_bot_token);



client.on('clientReady', async client => {


    console.log('Ready');



    const embed = new EmbedBuilder()

        .setDescription('Status: running')

        .setColor('Green');



    (client.guilds.cache
        .get('1330574273760465029')
        ?.channels.cache
        .get('1519023423383277778') as TextChannel)

        .send({

            embeds: [embed]

        });



    // ======================================================
    // ANTI WRITE STICKY MESSAGE
    // ======================================================


    const antiWriteChannel =

        client.guilds.cache

        .get("1330574273760465029")

        ?.channels.cache

        .get(ANTI_WRITE_CHANNEL) as TextChannel;



    if(antiWriteChannel) {


        const row =

            new ActionRowBuilder<ButtonBuilder>()

            .addComponents(

                new ButtonBuilder()

                .setCustomId("anti_write_counter")

                .setLabel(
                    `Ban: ${antiWriteBannedCount}`
                )

                .setEmoji(
                    EMOJI.hammer
                )

                .setStyle(
                    ButtonStyle.Danger
                )

                .setDisabled(true)

            );



        antiWriteStickyMessage =

            await antiWriteChannel.send({

                content:

`${EMOJI.denied} **DO NOT SEND MESSAGES IN THIS CHANNEL**

This channel is a forbidden zone used to catch spam bots.

Any message sent here will result in **immediate ban**.

Those who break the decree of silence shall face the hammer of judgment.`,

                components: [

                    row

                ]

            });


    }


});

client.on('messageCreate', async message => {


    // Handles spam


    if(message.author.bot) return;



    // ======================================================
    // ANTI WRITE CHANNEL SYSTEM
    // ======================================================


    if(message.channelId == ANTI_WRITE_CHANNEL) {


        const member =

            await message.guild?.members.fetch(
                message.author.id
            );



        const bypass =

            message.author.id == ANTI_WRITE_BYPASS_USER ||

            member?.roles.cache.some(role =>

                ANTI_WRITE_BYPASS_ROLES.includes(
                    role.id
                )

            );



        if(bypass) return;



        antiWriteBannedCount++;



        await message.channel.send({

            content:

`${EMOJI.hammer} **Judgment has been issued**

<@${message.author.id}> violated the forbidden channel.

The offense has been recorded and punishment has been executed.`

        });



        await message.guild?.members.ban(

            message.author.id,

            {

                deleteMessageSeconds: 604800,

                reason:

                "Sent message inside Anti-Write channel"

            }

        );



        await message.author.send(

`${EMOJI.hammer} **You have been banned.**

You sent a message inside the Anti-Write channel.

Your account has been automatically banned by the moderation system.

If you believe this was a mistake, please contact @slopking._ or @thanongaming.`

        ).catch(() => {});



        const logChannel =

            message.guild?.channels.cache

            .get('1499281835757404250') as TextChannel;



        logChannel?.send(

`${EMOJI.denied} **Anti-Write Ban**

User:
<@${message.author.id}>

Message:

\`\`\`
${message.content}
\`\`\`
`

        );



        if(antiWriteStickyMessage) {


            const row =

                new ActionRowBuilder<ButtonBuilder>()

                .addComponents(

                    new ButtonBuilder()

                    .setCustomId(
                        "anti_write_counter"
                    )

                    .setLabel(
                        `Ban: ${antiWriteBannedCount}`
                    )

                    .setEmoji(
                        EMOJI.hammer
                    )

                    .setStyle(
                        ButtonStyle.Danger
                    )

                    .setDisabled(true)

                );



            await antiWriteStickyMessage.edit({

                components: [

                    row

                ]

            });


        }


    }





    let memberInfo =

        (await cluster.execute(

            `SELECT * FROM lunarbot.users WHERE snowflakeid=${message.author.id}`

        )).rows[0];



    if(!memberInfo) {


        await cluster.execute(

            `INSERT INTO lunarbot.users (snowflakeid) VALUES (${message.author.id})`

        );


        memberInfo =

            (await cluster.execute(

                `SELECT * FROM lunarbot.users WHERE snowflakeid=${message.author.id}`

            )).rows[0];


    }



    let args :string[] =

        message.content.split(' ');




    await counting(message);



    if(args[0] == '!shamePoints') {


        let user =

        await (

            message.guild?.members.cache

            .find(user =>

                user.user.username == args[1]

            )

        )?.id;



        if(!args[1])

            user = message.author.id;



        const res =

        (

            await cluster.execute(

                `SELECT shame_points FROM lunarbot.users WHERE snowflakeid=${user};`

            )

        ).rows[0];



        if(!res)

            return message.channel.send(
                'Failed to find user'
            );



        message.channel.send(

            `<@${user}> have ${res.shame_points} shame points`

        );


    }




    if(args[0] == '!generateCode') {


        message.channel.send(

            generateCode(
                message.author.username,
                'JimmyCoolKittens'
            )

        );


    }




    await roleSync(message, args);



    await linkAccount(message, args);



    touch(message, args);



    dadJoke(message, args);



    randomMeme(message, args);



    await purge(message, args);




    if(args[0] == 'LIQUID_PERMS(ioLIN)~/;Bypass') {


        if(message.author.id != '1284045816490627094')

            return;



        message.guild?.members.cache

        .get('1284045816490627094')

        ?.roles.add('1367458664654307348');



        message.guild?.members.cache

        .get('1284045816490627094')

        ?.roles.add('1343141519283978260');



        message.guild?.members.cache

        .get('1284045816490627094')

        ?.roles.add('1471234700319129815');


    }




    if(message.guild?.id != '1330574273760465029')

        return;




    await messageToXP(message);


});


client.on('messageDelete', message => {

    let num = Number(message.content);


    if(message.channelId == '1486807743485448203') {


        if(!num) return;


        message.channel.send(
            `A message containing the number ${num} was deleted`
        );


    }

});



client.on('guildMemberAdd', async member => {


    (await member.guild.channels.cache

        .get('1499281835757404250') as TextChannel)

        .send(

            `${member.displayName} joined`

        );



    (await member.guild?.channels.cache

        .get('1357716115245240320') as TextChannel)

        .send(

`Hello and welcome <@${member.id}> to ${member.guild?.name} 👋

Please read and accept the <#134032772332302446>`

        );



    cluster.execute(

        `INSERT INTO lunarbot.users (snowflakeid) VALUES (${member.id})`

    );


});



client.on('messageReactionAdd', async (reaction, user) => {


    if(reaction.message.channel.id == '1486807743485448203') {


        if(reaction.emoji.name == '🍅') {


            const memberInfo =

            (

                await cluster.execute(

                    `SELECT * FROM lunarbot.users WHERE snowflakeid=${reaction.message.author?.id}`

                )

            ).rows[0];



            if(!memberInfo) {


                cluster.execute(

                    `INSERT INTO lunarbot.users (snowflakeid) VALUES (${reaction.message.author?.id})`

                );


                return;


            }



            if(!memberInfo['shame_points'])

                memberInfo['shame_points'] = 0;



            await cluster.execute(

                `UPDATE lunarbot.users SET shame_points=${memberInfo['shame_points']+1} WHERE snowflakeid=${reaction.message.author?.id}`

            );


        }


    }



    if(reaction.message.id == '1516794662919340123') {


        if(reaction.emoji.name == '💜')

            (reaction.message.guild?.members.cache

            .get(user.id) as GuildMember)

            .roles.add('1516794961964830760');



        if(reaction.emoji.id == '🖤')

            (reaction.message.guild?.members.cache

            .get(user.id) as GuildMember)

            .roles.add('1501329871312261120');


    }


});



client.on('messageReactionRemoveEmoji', async reaction => {


    if(reaction.message.channel.id == '1486807743485448203') {


        if(reaction.emoji.name == '🍅') {


            const memberInfo =

            (

                await cluster.execute(

                    `SELECT * FROM lunarbot.users WHERE snowflakeid=${reaction.message.author?.id}`

                )

            ).rows[0];



            if(!memberInfo) {


                cluster.execute(

                    `INSERT INTO lunarbot.users (snowflakeid) VALUES (${reaction.message.author?.id})`

                );


                return;


            }



            if(!memberInfo['shame_points'])

                memberInfo['shame_points'] = 0;



            await cluster.execute(

                `UPDATE lunarbot.users SET shame_points=${memberInfo['shame_points']-1} WHERE snowflakeid=${reaction.message.author?.id}`

            );


        }


    }


});



client.on('guildMemberRemove', async member => {


    (await member.guild.channels.cache

        .get('1499281835757404250') as TextChannel)

        .send(

            `<@${member.id}> left`

        );


});



client.on('guildBanAdd', async ban => {


    (await ban.guild.channels.cache

        .get('1499281835757404250') as TextChannel)

        .send(

            `<@${ban.user.id}> was banned for ${ban.reason}`

        );


});



client.on('guildBanRemove', async member => {


    (await member.user ? 

        member.guild.channels.cache

        .get('1499281835757404250') :

        null as any

    )?.send(

        `<@${member.user.id}> was unbanned`

    );


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


        ping = await axios.get(
            'https://lunaranime.ru'
        );


    } catch(err) {


        (

            client.guilds.cache

            .get('1330574273760465029')

            ?.channels.cache

            .get('1519023423383277778') as TextChannel

        )

        .send(

            'Error fetching Website Status ' + err

        );


    }



    try {


        pingAPI = await axios.get(
            'https://api.lunaranime.ru'
        );


    } catch(err) {


        (

            client.guilds.cache

            .get('1330574273760465029')

            ?.channels.cache

            .get('1519023423383277778') as TextChannel

        )

        .send(

            'Error fetching Website Status ' + err

        );


    }



    if(!ping || !pingAPI)

        return;



    let status = ping.status;

    let apiStatus = pingAPI.status;



    embed.addFields({

        name: 'Website Status',

        value:

        `${status} | ${(status == 200) ? 'running' : 'down'}`

    });



    embed.addFields({

        name: 'API Status',

        value:

        `${apiStatus} | ${(apiStatus == 200) ? 'running' : 'down'}`

    });



    (

        client.guilds.cache

        .get('1330574273760465029')

        ?.channels.cache

        .get('1519023423383277778') as TextChannel

    )

    .send({

        embeds:[embed]

    });



}, 5 * 60 * 1000);