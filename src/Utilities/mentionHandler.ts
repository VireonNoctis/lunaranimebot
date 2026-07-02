import { MembershipScreeningFieldType, type Message } from "discord.js";
import { cluster } from "..";

export async function MentionHandler(message :Message) {
    const userMention = /<@!?\d+>/;

    await cluster.execute(`INSERT INTO lunarbot.mentions (message_author_id, mentioned_id, message_id, archived, id, channel_id, guild_id) VALUES (${message.author.id}, ${userMention}, ${message.id}, false, ${generateId()}, ${message.channelId}, ${message.guildId});`);

    console.log('Success ' + userMention);
}

const generateId = () => {
    const randomNumber = Math.random() * 85;
    const timeMs = new Date().getMilliseconds();
    const randomFactor = (Math.pow((Math.PI * (Math.random() * 100 / 2)), Math.random() * 5) / 10);

    const num :number = Math.floor(timeMs / randomNumber - randomFactor);

    return num;
}