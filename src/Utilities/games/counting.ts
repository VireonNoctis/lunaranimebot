import type { Message } from "discord.js";
import { cluster } from "../..";

export default async function(message :Message) {
    if(message.channel == message.guild?.channels.cache.get('1486807743485448203')) {
        let currentNumber = Number(message.content);
        let lastNumber = 0;
        let lastMember = null;
        let lastCountInfo = (await cluster.execute(`SELECT * FROM lunarbot.variables WHERE identifier='last_count';`)).rows[0];

        if(!currentNumber) return;

        if(!lastCountInfo) return console.log('Error fetching DB entry for last_count');
        if(lastCountInfo['int_value']) lastNumber = lastCountInfo['int_value'];
        if(lastCountInfo['string_value']) lastMember = lastCountInfo['string_value'];

        if(message.author.id == lastMember) return message.channel.send('You already counted');

        if(currentNumber == lastNumber+1) {
            if(currentNumber == 67) message.channel.send('https://images-ext-1.discordapp.net/external/s_JjhstVcwbUfFvRbEG36mC-b5atAncCn8f_bi0jPew/https/media1.giphy.com/media/v1.Y2lkPTczYjhmN2IxeHhrazd6Z2JiZWt0MndvbDF4YnBtbmhvaTN4amt6Yno0cmJtd3V0eSZlcD12MV9naWZzX2dpZklkJmN0PWc/08uBcURaMq6vA93TGc/giphy.mp4')

            if(currentNumber == 12) message.channel.send(`<@756535229933551656> come here, 13 awaits you`);

            if(currentNumber == 13 && message.author.id == '756535229933551656') message.channel.send('Good Girl');

            if(currentNumber == 22) message.channel.send('<@1267906230634938530> 23 for the 32 year old');

            await cluster.execute(`UPDATE lunarbot.variables SET int_value=${currentNumber}, string_value='${message.author.id}' WHERE identifier='last_count';`);

            message.react('✅');
        } else {
            message.react('❌');
            message.react('🍅');
            message.channel.send(`<@${message.author.id}> messed up\nClick tomato to shame`);
            await cluster.execute(`UPDATE lunarbot.variables SET int_value=0, string_value='${message.author.id}' WHERE identifier='last_count';`);
        }
    };
}