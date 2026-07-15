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

\`\`\`js
client
client.user
client.user.tag
client.user.id
client.user.avatarURL()
client.ws.ping
client.uptime
client.readyAt
client.shard
client.options
client.application
client.application.id
\`\`\`

${EMOJI.new1}${EMOJI.new2} **Guild**

\`\`\`js
message.guild.name
message.guild.id
message.guild.ownerId
message.guild.memberCount
message.guild.createdAt
message.guild.iconURL()
message.guild.bannerURL()
message.guild.features
message.guild.verificationLevel
message.guild.premiumTier
message.guild.premiumSubscriptionCount
\`\`\`
`,

`
${EMOJI.new1}${EMOJI.new2} **User**

\`\`\`js
message.author.tag
message.author.id
message.author.username
message.author.discriminator
message.author.createdAt
message.author.avatarURL()
message.author.displayAvatarURL()
\`\`\`

${EMOJI.new1}${EMOJI.new2} **Message**

\`\`\`js
message.content
message.id
message.channel
message.channel.id
message.channel.name
message.createdAt
message.attachments
message.embeds
message.mentions.users
message.mentions.roles
\`\`\`

${EMOJI.new1}${EMOJI.new2} **Members**

\`\`\`js
message.guild.members.cache.size
message.guild.members.cache.map(m => m.user.tag)
message.guild.members.cache.filter(m => m.user.bot).size
message.guild.members.cache.filter(m => !m.user.bot).size
message.guild.members.cache.filter(m => m.presence)
\`\`\`
`,

`
${EMOJI.new1}${EMOJI.new2} **Roles**

\`\`\`js
message.guild.roles.cache.size
message.guild.roles.cache.map(r => r.name)
message.guild.roles.cache.map(r => r.id)
message.guild.roles.cache.sort((a,b)=>b.position-a.position)
message.member.roles.cache
message.member.permissions.toArray()
\`\`\`

${EMOJI.new1}${EMOJI.new2} **Permissions**

\`\`\`js
message.member.permissions.has("Administrator")
message.member.permissions.has("ManageGuild")
message.member.permissions.toArray()
message.guild.roles.everyone.permissions.toArray()
\`\`\`
`,

`
${EMOJI.new1}${EMOJI.new2} **Channels**

\`\`\`js
message.guild.channels.cache.size
message.guild.channels.cache.map(c => c.name)
message.guild.channels.cache.map(c => c.type)
message.channel.topic
message.channel.createdAt
message.channel.parent
\`\`\`

${EMOJI.new1}${EMOJI.new2} **Threads**

\`\`\`js
message.channel.threads.cache
message.channel.threads.cache.size
message.channel.threads.cache.map(t => t.name)
\`\`\`
`,

`
${EMOJI.new1}${EMOJI.new2} **Collections**

\`\`\`js
client.guilds.cache.size
client.users.cache.size
client.channels.cache.size
client.emojis.cache.size
client.stickers.cache.size

client.guilds.cache.map(g => g.name)
client.guilds.cache.map(g => g.id)
client.users.cache.map(u => u.tag)
\`\`\`

${EMOJI.new1}${EMOJI.new2} **Emojis**

\`\`\`js
client.emojis.cache.map(e => e.name)
client.emojis.cache.map(e => e.id)
client.emojis.cache.size
\`\`\`
`,

`
${EMOJI.new1}${EMOJI.new2} **Voice**

\`\`\`js
message.member.voice.channel
message.member.voice.channelId
message.guild.voiceStates.cache.size
message.guild.voiceStates.cache.map(v => v.member.user.tag)
\`\`\`

${EMOJI.new1}${EMOJI.new2} **Invites**

\`\`\`js
await message.guild.invites.fetch()
message.guild.invites.cache.size
message.guild.invites.cache.map(i => i.code)
\`\`\`
`,

`
${EMOJI.new1}${EMOJI.new2} **System**

\`\`\`js
process.memoryUsage()
process.memoryUsage().heapUsed
process.memoryUsage().heapTotal
process.cpuUsage()
process.version
process.platform
process.arch
process.pid
process.uptime()
\`\`\`

${EMOJI.new1}${EMOJI.new2} **Time**

\`\`\`js
Date.now()
new Date()
new Date().toISOString()
\`\`\`
`,

`
${EMOJI.new1}${EMOJI.new2} **Utilities**

\`\`\`js
BOT_INFO
EMOJI
getUptime()
Object.keys(client)
Object.keys(message)
typeof variable
JSON.stringify(object,null,2)
\`\`\`

${EMOJI.new1}${EMOJI.new2} **Database**

\`\`\`js
database
db
client.db
database.collection()
\`\`\`
`,

`
${EMOJI.new1}${EMOJI.new2} **Advanced**

\`\`\`js
client.eventNames()
client.listenerCount()
client.listeners()
Object.getOwnPropertyNames(client)
Reflect.ownKeys(client)
\`\`\`

${EMOJI.new1}${EMOJI.new2} **Examples**

\`\`\`js
!eval client.user.tag

!eval client.guilds.cache.map(g => g.name)

!eval message.guild.members.cache.size

!eval process.memoryUsage()

!eval message.guild.roles.cache.map(r => r.name)
\`\`\`
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