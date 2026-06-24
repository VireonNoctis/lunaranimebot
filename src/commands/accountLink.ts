import { TextChannel, type Message } from "discord.js";
import generateCode from "../Utilities/generateCode";
import { client, cluster } from "..";
import axios from "axios";
import { getAccountInfoThroughUsername } from "../lunarapi/accountInfo";
import { log } from "../Utilities/logger";
import sendNotification from "../lunarapi/sendNotification";

export default async function(message :Message, args :string[]) {
    //if(message.guild) return (message.channel as TextChannel).send(`Please send me a dm with: \`!link <@${message.author.id}>\``);

    if(args[0] == '!link' && !message.guild) {
        let code = generateCode(message.author.username);
        if(!args[1]) return (message.channel as TextChannel).send('Please add a username or your code');
        const doesDiscordUserExist = (await cluster.execute(`SELECT * FROM lunarbot.accountlinks WHERE snowflakeid=${message.author.id} ALLOW FILTERING`)).rows;
        if(!doesDiscordUserExist) return (message.channel as TextChannel).send('User already found in database, please send a dm to <@960946185768685618> for fixing');

        var accountInfo = await getAccountInfoThroughUsername(args[1]);
        if(!accountInfo) return (message.channel as TextChannel).send('Failed to fetch account Info.');

        const doesLunarUserExist = (await cluster.execute(`SELECT * FROM lunarbot.accountlinks WHERE lunaruuid=${accountInfo.data.data.user_id} ALLOW FILTERING`)).rows;
        if(!doesLunarUserExist) return (message.channel as TextChannel).send('User already found in database, please send a dm to <@960946185768685618> for fixing');

        await sendNotification(`Please send this back !link-code ${code}`, args[1]);

        if(!sendNotification) return message.author.send('');

        (message.channel as TextChannel).send('Please check your Lunar Anime Notifications');

        await cluster.execute(`INSERT INTO lunarbot.accountlinks (snowflakeid, lunaruuid, verification_code, verified) VALUES (${message.author.id}, ${accountInfo.data.data.user_id}, '${code}', false)`)
    }

    if(args[0] == 'llink-code' && !message.guild) {
        const accountInfo = (await cluster.execute(`SELECT * FROM lunarbot.accountlinks WHERE snowflakeid=${message.author.id} ALLOW FILTERING;`)).rows[0];
        if(!accountInfo) return (message.channel as TextChannel).send('database error');
        
        if(accountInfo['verified'] == true) return (message.channel as TextChannel).send('This account is already linked')
        let code = accountInfo['verification_code'];

        if(!args[1]) return (message.channel as TextChannel).send('Please enter a valid code');

        if(code == args[1]) {
            await cluster.execute(`UPDATE lunarbot.accountlinks SET verified=true WHERE snowflakeid=${message.author.id} AND lunaruuid=${accountInfo.lunaruuid};`);
            const guild = await (await client.guilds.fetch()).get('1330574273760465029')?.fetch();
            (await guild?.members.fetch())?.get(message.author.id)?.roles.add('1403390546164187217');

            log('Account Verification', `discord user <@${message.author.id}> Successfully linked their lunar account with uuid ${accountInfo.lunaruuid}`);
            (message.channel as TextChannel).send('linked successfully');
        } else {
            (message.channel as TextChannel).send('Verification failed');
        }
    }
}