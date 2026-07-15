import {
    EmbedBuilder
} from "discord.js";

import {
    EMOJI
} from "../Utilities/emoji.js";

import {
    BOT_INFO,
    formatDevelopers,
    getUptime
} from "../Utilities/about.js";



export async function aboutCommand(message){

    const client = message.client;


    const users =
        client.guilds.cache.reduce(
            (count, guild)=>
                count + guild.memberCount,
            0
        );


    const channels =
        client.channels.cache.size;


    const embed =
        new EmbedBuilder()

        .setColor("#D4AF37")

        .setTitle(
            `${EMOJI.lunar} ${BOT_INFO.name} — About`
        )

        .setDescription(

${EMOJI.approved} **Version**
\`${BOT_INFO.version}\`

${EMOJI.dev} **Developers**
${formatDevelopers("discord")}

${EMOJI.loading} **Uptime**
${getUptime()}

${EMOJI.new1}${EMOJI.new2} **Statistics**

${EMOJI.hammer} **Servers**
${client.guilds.cache.size.toLocaleString()}

${EMOJI.question} **Users**
${users.toLocaleString()}

${EMOJI.lunar} **Channels**
${channels.toLocaleString()}

${EMOJI.right} **Prefix**
\`${BOT_INFO.prefix}\`

${EMOJI.thumbsup} **Commands Used**
*Coming Soon*

// Change to stats.commandsUsed.toLocaleString() when db is done

${EMOJI.verify} **Gateway Ping**
${Math.round(client.ws.ping)}ms

        )

        .setFooter({

            text:
            "Imperial Systems • Discord"

        });


    await message.reply({

        embeds:[
            embed
        ]

    });

}