import { EmbedBuilder, Message } from "discord.js";
import chrono from "chrono-node";
import { EMOJI } from "../Utilities/emoji.js";


export default {

    name: "birthday",

    description:
        "Register your birthday for automatic birthday celebrations.",

    usage:
        "!birthday <date>",


    async execute(message: Message, args: string[]) {

        const input = args.join(" ").trim();


        if (!input) {

            return sendResponse(
                message,
                invalidUsageEmbed(),
                false
            );

        }


        const parsed = chrono.parseDate(input);


        if (!parsed) {

            return sendResponse(
                message,
                invalidDateEmbed(),
                false
            );

        }


        const day = parsed.getDate();

        const month = parsed.getMonth() + 1;


        let year: number | null = null;


        if (/\d{4}/.test(input)) {

            year = parsed.getFullYear();

        }


        if (
            day < 1 ||
            day > 31 ||
            month < 1 ||
            month > 12
        ) {

            return sendResponse(
                message,
                invalidDateEmbed(),
                false
            );

        }


        // ─────────────────────────────
        // ScyllaDB Save Placeholder
        // ─────────────────────────────
        /*
            Table example:

            CREATE TABLE birthdays (
                user_id text PRIMARY KEY,
                day int,
                month int,
                year int
            );


            Query:

            INSERT INTO birthdays
            (user_id, day, month, year)
            VALUES (?, ?, ?, ?);

        */


        await saveBirthday({

            userId: message.author.id,

            day,

            month,

            year

        });



        return sendResponse(
            message,
            successEmbed(day, month, year),
            true
        );

    }

};


// ─────────────────────────────
// Database Placeholder
// ─────────────────────────────

async function saveBirthday(data: {

    userId: string;

    day: number;

    month: number;

    year: number | null;

}) {


    /*
        Replace with ScyllaDB insert.

        Example:

        await scylla.execute(
            `
            INSERT INTO birthdays
            (user_id, day, month, year)
            VALUES (?, ?, ?, ?)
            `,
            [
                data.userId,
                data.day,
                data.month,
                data.year
            ]
        );

    */


    return true;

}



// ─────────────────────────────
// Embeds
// ─────────────────────────────

function successEmbed(
    day: number,
    month: number,
    year: number | null
) {

    return new EmbedBuilder()

        .setColor(0x57F287)

        .setTitle(
            `${EMOJI.approved} Birthday Registered`
        )

        .setDescription(
`${EMOJI.aniheart} Your birthday has been saved!

**Birthday**
• Day: **${day}**
• Month: **${month}**
${year ? `• Year: **${year}**` : "• Year: Not provided"}

${EMOJI.approved} On your birthday:
• You receive the 🎉 Happy Birthday role.
• A message is sent in <#1343142761519644774>.
• The role is removed after 24 hours.

You can update your birthday anytime using:
\`!birthday <date>\``
        );

}



function invalidUsageEmbed() {

    return new EmbedBuilder()

        .setColor(0xED4245)

        .setTitle(
            `${EMOJI.error} Invalid Usage`
        )

        .setDescription(
`${EMOJI.question} Use:

\`!birthday <date>\`

Examples:

\`!birthday 25/12\`
\`!birthday 25-12-2005\`
\`!birthday Dec 25\`
\`!birthday December 25 2005\``
        );

}



function invalidDateEmbed() {

    return new EmbedBuilder()

        .setColor(0xED4245)

        .setTitle(
            `${EMOJI.error} Invalid Date`
        )

        .setDescription(
`I couldn't understand that birthday.

Accepted formats:

• \`25/12\`
• \`25/12/2005\`
• \`25-12-2005\`
• \`2005-12-25\`
• \`25 Dec\`
• \`December 25 2005\`

Invalid examples:

• \`32/12\`
• \`31/02\`
• \`hello\``
        );

}



// ─────────────────────────────
// DM / Fallback Response
// ─────────────────────────────

async function sendResponse(
    message: Message,
    embed: EmbedBuilder,
    success: boolean
) {

    await message.delete()
        .catch(() => {});


    try {

        await message.author.send({
            embeds: [embed]
        });


        const reply =
            await message.channel.send(
`${success ? EMOJI.approved : EMOJI.error} I've sent you a DM with the details.`
            );


        setTimeout(() => {

            reply.delete()
                .catch(() => {});

        }, 8000);


    } catch {


        const reply =
            await message.channel.send({

                content: `<@${message.author.id}>`,

                embeds: [embed]

            });


        setTimeout(() => {

            reply.delete()
                .catch(() => {});

        }, 8000);

    }

}