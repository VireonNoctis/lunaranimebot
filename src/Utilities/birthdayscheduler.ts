

// For index.ts add this:
// import { startBirthdayScheduler } from "./birthdayScheduler.js";
// 
// client.once("ready", () => {
//    startBirthdayScheduler(client);
// });






import { Client, EmbedBuilder } from "discord.js";
import { EMOJI } from "../Utilities/emoji.js";

// ─────────────────────────────
// Configuration
// ─────────────────────────────

const GUILD_ID = "YOUR_GUILD_ID";
const BIRTHDAY_ROLE_ID = "YOUR_BIRTHDAY_ROLE_ID";
const BIRTHDAY_CHANNEL_ID = "1343142761519644774";

const CHECK_INTERVAL = 60_000; // 1 minute

// ─────────────────────────────
// Database Placeholder
// Replace this with ScyllaDB query
// ─────────────────────────────

interface BirthdayData {
    userId: string;
    day: number;
    month: number;
    year?: number;
}

async function getBirthdays(): Promise<BirthdayData[]> {
    /*
        Example Scylla table:

        CREATE TABLE birthdays (
            user_id text PRIMARY KEY,
            day int,
            month int,
            year int
        );

        Query example:

        SELECT user_id, day, month, year
        FROM birthdays;
    */

    return [];
}


// ─────────────────────────────
// Scheduler
// ─────────────────────────────

const activeBirthdays = new Map<string, number>();

export function startBirthdayScheduler(client: Client) {

    console.log("🎂 Birthday scheduler started.");

    checkBirthdays(client);

    setInterval(() => {
        checkBirthdays(client);
    }, CHECK_INTERVAL);
}


// ─────────────────────────────
// Birthday Checker
// ─────────────────────────────

async function checkBirthdays(client: Client) {

    const now = new Date();

    const today = now.getDate();
    const currentMonth = now.getMonth() + 1;


    const birthdays = await getBirthdays();


    for (const birthday of birthdays) {

        if (
            birthday.day !== today ||
            birthday.month !== currentMonth
        ) continue;


        if (activeBirthdays.has(birthday.userId))
            continue;


        const guild = client.guilds.cache.get(GUILD_ID);

        if (!guild)
            continue;


        const member = await guild.members
            .fetch(birthday.userId)
            .catch(() => null);


        if (!member)
            continue;


        const role = guild.roles.cache.get(
            BIRTHDAY_ROLE_ID
        );


        if (role)
            await member.roles.add(role).catch(() => {});


        const channel = guild.channels.cache.get(
            BIRTHDAY_CHANNEL_ID
        );


        if (channel?.isTextBased()) {

            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle("🎉 Happy Birthday!")
                .setDescription(
`${EMOJI.aniheart} Happy Birthday <@${birthday.userId}>!

The Lunaranime community wishes you an amazing day! 🥳

May your year be filled with happiness, success, and many great memories.

🎂 Everyone wish them a happy birthday!`
                )
                .setTimestamp();


            await channel.send({
                content: `<@${birthday.userId}>`,
                embeds: [embed]
            });
        }


        activeBirthdays.set(
            birthday.userId,
            Date.now()
        );


        // Remove role after 24 hours

        setTimeout(async () => {

            if (role) {
                await member.roles
                    .remove(role)
                    .catch(() => {});
            }


            activeBirthdays.delete(
                birthday.userId
            );

        }, 24 * 60 * 60 * 1000);
    }
}
