import {
    Message,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from "discord.js";

import {
    EMOJI
} from "../Utilities/emoji.js";


const OWNERS = [
    "1419744000977403994",
    "960946185768685618"
];


const pages = [

`
${EMOJI.new1}${EMOJI.new2} **Client**

\`client\`
\`client.user\`
\`client.user.tag\`
\`client.user.id\`
\`client.ws.ping\`
\`client.uptime\`
\`client.readyAt\`
\`client.shard\`
\`client.options\`

${EMOJI.new1}${EMOJI.new2} **Guild**

\`message.guild.name\`
\`message.guild.id\`
\`message.guild.ownerId\`
\`message.guild.memberCount\`
\`message.guild.createdAt\`
\`message.guild.iconURL()\`
\`message.guild.features\`
`,

`
${EMOJI.new1}${EMOJI.new2} **User**

\`message.author.tag\`
\`message.author.id\`
\`message.author.username\`
\`message.author.createdAt\`

${EMOJI.new1}${EMOJI.new2} **Message**

\`message.content\`
\`message.id\`
\`message.channel\`
\`message.channel.id\`
\`message.channel.name\`

${EMOJI.new1}${EMOJI.new2} **Members**

\`message.guild.members.cache.size\`
\`message.guild.members.cache.map(m => m.user.tag)\`
\`message.guild.members.cache.filter(m => m.user.bot).size\`
`,

`
${EMOJI.new1}${EMOJI.new2} **Roles**

\`message.guild.roles.cache.size\`
\`message.guild.roles.cache.map(r => r.name)\`
\`message.guild.roles.cache.map(r => r.id)\`

${EMOJI.new1}${EMOJI.new2} **Channels**

\`message.guild.channels.cache.size\`
\`message.guild.channels.cache.map(c => c.name)\`
\`message.guild.channels.cache.map(c => c.type)\`

${EMOJI.new1}${EMOJI.new2} **Collections**

\`client.guilds.cache.size\`
\`client.users.cache.size\`
\`client.channels.cache.size\`
\`client.emojis.cache.size\`
`,

`
${EMOJI.new1}${EMOJI.new2} **System**

\`process.memoryUsage()\`
\`process.cpuUsage()\`
\`process.version\`
\`process.platform\`
\`process.arch\`
\`process.pid\`
\`process.uptime()\`

${EMOJI.new1}${EMOJI.new2} **Utilities**

\`BOT_INFO\`
\`EMOJI\`
\`getUptime()\`
\`Object.keys(client)\`
\`Object.keys(message)\`
\`JSON.stringify()\`
`,

`
${EMOJI.new1}${EMOJI.new2} **Database**

\`database\`
\`db\`
\`client.db\`

${EMOJI.new1}${EMOJI.new2} **Examples**

\`!eval client.user.tag\`

\`!eval client.guilds.cache.size\`

\`!eval process.memoryUsage()\`

\`!eval message.guild.roles.cache.map(r => r.name)\`

\`!eval client.guilds.cache.map(g => g.name)\`
`
];


export default async function evalCommand(message: Message, args: string[]){


    if(!OWNERS.includes(message.author.id)){

        return message.reply(
            `${EMOJI.denied} You do not have permission to use this command.`
        );

    }


    if(!args.length){


        let page = 0;


        const embed = () =>

            new EmbedBuilder()

            .setColor("#D4AF37")

            .setTitle(
                `${EMOJI.lunar} Lunar Eval System`
            )

            .setDescription(
                pages[page]
            )

            .setFooter({

                text:
                `Page ${page + 1}/${pages.length} • Lunar Developer Console`

            })

            .setTimestamp();



        const buttons = () =>

            new ActionRowBuilder<ButtonBuilder>()

            .addComponents(

                new ButtonBuilder()

                .setCustomId("previous")

                .setEmoji(EMOJI.left)

                .setStyle(ButtonStyle.Secondary),


                new ButtonBuilder()

                .setCustomId("next")

                .setEmoji(EMOJI.right)

                .setStyle(ButtonStyle.Secondary)

            );



        const msg = await message.reply({

            embeds:[
                embed()
            ],

            components:[
                buttons()
            ]

        });



        const collector =
            msg.createMessageComponentCollector({

                time:60000

            });



        collector.on("collect", async interaction => {


            if(interaction.user.id !== message.author.id){

                return interaction.reply({

                    content:
                    `${EMOJI.denied} Only the executor can use this.`,

                    ephemeral:true

                });

            }


            if(interaction.customId === "next"){

                page++;

                if(page >= pages.length)
                    page = 0;

            }


            if(interaction.customId === "previous"){

                page--;

                if(page < 0)
                    page = pages.length - 1;

            }


            await interaction.update({

                embeds:[
                    embed()
                ]

            });


        });


        return;

    }


    const code = args.join(" ");


    try{


        let result =
            await eval(code);


        if(typeof result !== "string"){

            result =
            JSON.stringify(
                result,
                null,
                2
            );

        }


        if(result.length > 4000){

            result =
            result.substring(0,4000) +
            "...";

        }


        const embed =

        new EmbedBuilder()

        .setColor("#D4AF37")

        .setTitle(
            `${EMOJI.lunar} Eval Result`
        )

        .addFields({

            name:
            `${EMOJI.right} Output`,

            value:
            `\`\`\`js\n${result}\n\`\`\``

        })

        .setFooter({

            text:
            `Executed by ${message.author.tag}`

        })

        .setTimestamp();



        return message.reply({

            embeds:[
                embed
            ]

        });


    }catch(error){


        return message.reply({

            embeds:[

                new EmbedBuilder()

                .setColor("#8B0000")

                .setTitle(
                    `${EMOJI.error} Eval Error`
                )

                .setDescription(
                    `\`\`\`js\n${error}\n\`\`\``
                )

            ]

        });

    }

}