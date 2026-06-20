import { createCanvas, loadImage } from "canvas";
import type { Message } from "discord.js";
import fs from 'fs';

export default function generateWelcomeImage(message :Message) {
    const path = '/home/kai/Desktop/Programming/lunarbot/assets/';
    
    loadImage(path + '/cherry.png').then(image => {
        const canvas = createCanvas(820, 291);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0)

        ctx.font = '100px'
        ctx.fillText(`Welcome ${message.author.displayName}`, -100, 0);

        const out = fs.createWriteStream(path + `/temp/${message.author.username}.png`);
        const stream = canvas.createPNGStream();
        stream.pipe(out);
        out.on('finish', () => console.log('Image has been processed.'));
    })
}