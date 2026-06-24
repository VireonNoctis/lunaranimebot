import { EmbedBuilder, Message, TextChannel } from "discord.js";
import grantXP from "../../lunarapi/grantXP";
import cassandra from 'cassandra-driver';
import { client, cluster } from "../..";

export default async function(message :Message) {
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
}

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
    }
}
