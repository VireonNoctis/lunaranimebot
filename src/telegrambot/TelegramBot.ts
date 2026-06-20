import TelegramBot from "node-telegram-bot-api";
import { client } from "..";
import type { TextChannel } from "discord.js";

export class TeleBot {
    public bot: TelegramBot;
    private token :string;

    public constructor(token :string) {
        console.log('Initilization');

        this.token = token;
        console.log('Logged in');

        this.bot = new TelegramBot(this.token, {polling:true});
    }

    public sendAsWebhook(channel_id :number) {
        this.bot.on('message', async (msg) => {
            console.log('check 0 ' + msg.chat.id);
            if(msg.chat.id = channel_id) {
                console.log('check 1');
                if(!msg.from) return;
                console.log('check 1');

                var photo_url = null;

                await this.bot.getUserProfilePhotos(msg.from.id).then(res => {
                    if(!res.photos || !res.photos[0] || !res.photos[0][0]) return;

                    let fileId = res.photos[0][0].file_id;

                    if(!fileId) return;

                    let file = this.bot.getFile(fileId);

                    file.then(result => {
                        let filePath = result.file_path;
                        photo_url = `https://api.telegram.org/file/bot${this.token}/${filePath}`;
                    });
                });

                const getChannel = ((client.guilds.cache.get('1330574273760465029'))?.channels.cache.get('1463041674501689502') as TextChannel)

                if(!getChannel) return console.log('An error occured fetch that channel');

                let name = msg.from.username;

                if(!name) name = msg.from.first_name;

                const userHook = getChannel.createWebhook({ name: name, avatar: photo_url });
                
                if(!msg.text) return;
    
                (await userHook).send(msg.text);
    
                setTimeout(async () => {
                    (await userHook).delete();
                }, 2000);
            }
        });
    }

    public sendMessage(channel_id :number, message :string) {
        this.bot.sendMessage(channel_id, message);
    }
}