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


    const embed =
        new EmbedBuilder()

        .setColor("#D4AF37")

        .setTitle(
            `${EMOJI.moon} ${BOT_INFO.name} — About`
        )

        .setDescription(
`
${EMOJI.approved} **Version**
\`${BOT_INFO.version}\`

${EMOJI.staff} **Developers**
${formatDevelopers("discord")}

${EMOJI.loading} **Uptime**
${getUptime()}

${EMOJI.hammer} **Servers**
${client.guilds.cache.size.toLocaleString()}

${EMOJI.question} **Users**
${users.toLocaleString()}
`
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