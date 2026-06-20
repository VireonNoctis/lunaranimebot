import TelegramBot from "node-telegram-bot-api";
import { client } from "..";
import type { TextChannel } from "discord.js";

export default async function linkChitChat() {
    const token = process.env.TELEGRAM_TOKEN;
    if(!token) return;

    const bot = new TelegramBot(token, {polling: true});

    bot.on('message', async msg => {
        let id = -1003860971024;

        if(msg.chat.id == id) {
            let author = msg.from;

            if(!author) return;

            var photo_url = null;

            await bot.getUserProfilePhotos(author.id).then(res => {
                let file_id = res.photos[0][0]?.file_id;

                if(!file_id) return;

                let file = bot.getFile(file_id);
                file.then(result => {
                    let file_path = result.file_path;
                    photo_url = `https://api.telegram.org/file/bot${token}/${file_path}`;
                })
            });

            const userHook = (await client.guilds.cache.get('1330574273760465029')?.channels.cache.get('1463041674501689502') as TextChannel)
                .createWebhook({ name: author.first_name, avatar: photo_url });

            if(!msg.text) return;

            (await userHook).send(msg.text);

            setTimeout(async () => {
                (await userHook).delete();
            }, 2000);
        }
    })
}