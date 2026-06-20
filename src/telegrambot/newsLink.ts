import TelegramBot from "node-telegram-bot-api";

export default async function telebot(message :string) {
    const token = process.env.TELEGRAM_TOKEN;
    if(!token) return;

    const bot = new TelegramBot(token, {polling:true});

    bot.sendMessage('-1003301284161_9', message);

    bot.on('message', (msg) => {
        const Hi = "hi"
        if(msg.text?.toString().toLowerCase().indexOf(Hi) === 0) {
            bot.sendMessage(msg.chat.id, 'Hi ' + msg.chat.id)
        }
    });
}