import type { Message, TextChannel } from "discord.js";

let methods :string[] = [
            'normal',
            'violent',
            'gay',
            'french',
            'interlectually',
            'illegal',
            'private',
            'explosive',
            'lovely',
            '67',
            'mischievous',
            'midas',
            'miku',
            'political',
            'German',
            'wet',
            'embarrassing',
            'earth shattering',
            'bone breaking',
            'flesh melting',
            'romantic',
            'sexual',
            'flying',
            'red',
            'green',
            'blue',
            'pink',
            'orange',
            'impregnating',
            'erotic',
            'stinky',
            'legal',
            'fishy',
            'golden',
            'mathematical',
            'blinding',
            'Indonesian',
            'miku beam',
            'numerical',
            'binary',
            'breath taking',
            'rough',
            'beautiful',
            'anime like',
            'Vireon',
            'plague giving'
        ];

export default function(message :Message, args :string[]) {
    if(args[0] == '!touch') {
        if(args[1] == '@everyone') return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> touched ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!kiss') {
        if(args[1] == '@everyone') return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> kissed ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!hug') {
        if(args[1] == '@everyone') return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> hugged ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!fuck') {
        if(args[1] == '@everyone') return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> fucked ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!touchtips') {
        if(args[1] == '@everyone') return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> touched tips with ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!touchclits') {
        if(args[1] == '@everyone') return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> touched clits with ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!suck') {
        if(args[1] == '@everyone') return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> sucked ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} off in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!gangbang') {
        if(args[1] == '@everyone') return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> gangbanged with ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }
}