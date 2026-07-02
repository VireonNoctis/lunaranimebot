import { MessageFlags, MessageFlagsBitField, TextChannel, type Message } from "discord.js";
import generateCode from "../Utilities/generateCode";
import { client, cluster } from "..";
import axios from "axios";
import { getAccountInfoThroughUsername } from "../lunarapi/accountInfo";
import { log } from "../Utilities/logger";
import sendNotification from "../lunarapi/sendNotification";
import { types } from "cassandra-driver";

export default async function linkAccount(message :Message, args :string[]) {

    if(args[0] == '!link') {
        if(!args[1]) return (message.channel as TextChannel).send('Please add a username or your code');
        let code = generateCode(message.author.username, args[1]);

        var accountInfo = await getAccountInfoThroughUsername(args[1]);
        if(!accountInfo) return (message.channel as TextChannel).send('Failed to fetch account Info.');

        const doesAccountExist = (await cluster.execute(`SELECT * FROM lunarbot.accountlinks WHERE lunaruuid=${accountInfo.data.data.user_id} AND snowflakeid=${message.author.id}`)).rows[0];
        if(!doesAccountExist) (message.channel as TextChannel).send('Account name with UUID found in db');

        await sendNotification(`Please send this back !link-code ${code}`, args[1]);

        if(!sendNotification) return message.author.send('failed to send Notification');

        (message.channel as TextChannel).send({content: 'Please check your Lunar Anime Notifications', flags: [ "64" ]});

        await cluster.execute(`INSERT INTO lunarbot.accountlinks (snowflakeid, lunaruuid, verification_code, verified) VALUES (${message.author.id}, ${accountInfo.data.data.user_id}, '${code}', false)`)
    }

    if(args[0] == '!link-code') {
        const brokenCode = args[1]?.split('-');

        if(!brokenCode || !brokenCode[0]) return;

        var newInfo = await getAccountInfoThroughUsername(brokenCode[0]);
        if(!newInfo) return (message.channel as TextChannel).send('Failed to fetch account Info.');

        const accountInfo = (await cluster.execute(`SELECT * FROM lunarbot.accountlinks WHERE snowflakeid=${message.author.id} AND lunaruuid=${newInfo.data.data.user_id}`)).rows[0];
        if(!accountInfo) return (message.channel as TextChannel).send('database error (error 3 - link code related)');
        
        if(accountInfo['verified'] == true) return (message.channel as TextChannel).send('This account is already linked');
        let code = accountInfo['verification_code'];

        if(!args[1]) return (message.channel as TextChannel).send('Please enter a valid code');

        if(code == args[1]) {
            await cluster.execute(`UPDATE lunarbot.accountlinks SET verified=true WHERE snowflakeid=${message.author.id} AND lunaruuid=${accountInfo.lunaruuid};`);
            const guild = await (await client.guilds.fetch()).get('1330574273760465029')?.fetch();
            (await guild?.members.fetch())?.get(message.author.id)?.roles.add('1403390546164187217');
            if(message.deletable) message.delete();

            log('Account Verification', `discord user <@${message.author.id}> Successfully linked their lunar account with uuid ${accountInfo.lunaruuid}`);
            (message.channel as TextChannel).send('linked successfully');
        } else {
            (message.channel as TextChannel).send('Verification failed');
        }
    }
}