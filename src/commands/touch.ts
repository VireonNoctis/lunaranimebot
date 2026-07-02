import { EmbedBuilder, GuildMember, User, type Message, type TextChannel } from "discord.js";
import { client } from "..";
import fs from 'fs';

let oldMethods :string[] = [
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
            'non binary',
            'breath taking',
            'rough',
            'beautiful',
            'anime like',
            'Vireon',
            'plague giving',
            'suicide',
            'trash',
            'touching',
            'flamboyant',
            'cuck',
            'dimsempai',
            'shrinking',
            'monumental',
            'video producing',
            'family guy',
            'cursed',
            'civil engineer',
            'sexy',
            'boomer',
            'npc like',
            'marketing',
            'traditional',
            'typescript',
            'burning',
            'ram using',
            'igniting',
            'disdurbing',
            'femboy',
            'predatory',
            'philosophical',
            'russian',
            'dark'
        ];

    const methods = (fs.readFileSync(__dirname + '/../../assets/_.txt', 'utf-8')).split('\n');
    const countries = (fs.readFileSync(__dirname + '/../../assets/countries.txt', 'utf-8')).split('\n');

export default function(message :Message, args :string[]) {
    if(args[0] == '!touch') {
        if(args[1] == '@everyone') return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> touched ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!poke') {
        if(args[1] == '@everyone') return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> pocked ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
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
        if(!(message.channel as TextChannel).nsfw) return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> fucked ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!touchtips') {
        if(args[1] == '@everyone') return;
        if(!(message.channel as TextChannel).nsfw) return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> touched tips with ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!touchclits') {
        if(args[1] == '@everyone') return;
        if(!(message.channel as TextChannel).nsfw) return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> touched clits with ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!suck') {
        if(args[1] == '@everyone') return;
        if(!(message.channel as TextChannel).nsfw) return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> sucked ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} off in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!gangbang') {
        if(args[1] == '@everyone') return;
        if(!(message.channel as TextChannel).nsfw) return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> gangbanged with ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!punch') {
        if(args[1] == '@everyone') return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> puched ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!kick') {
        if(args[1] == '@everyone') return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> kicked ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!slap') {
        if(args[1] == '@everyone') return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> slapped ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!slapAss') {
        if(args[1] == '@everyone') return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> slapped ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} ass in a(n) ${methods[randomTouch]} way (${((Math.floor(Math.random() * 10) > 5) ? 'it jiggled' : 'it fell off')}) (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!feminize') {
        if(args[1] == '@everyone') return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> force feminized ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;

        const id = args[1]?.replaceAll('<', '').replaceAll('@', '').replaceAll('>', '');

        console.log(id);

        if(!id) return;

        message.guild?.members.cache.get(id)?.setNickname('Geraldine');

        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!cuddle') {
        if(args[1] == '@everyone') return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> cuddled with ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!pinch') {
        if(args[1] == '@everyone') return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> pinched ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!scissor') {
        if(args[1] == '@everyone') return;
        if(!(message.channel as TextChannel).nsfw) return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> scissored with ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!pat') {
        if(args[1] == '@everyone') return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        let toPat = args[1]

        if(args[1] == 'dog') toPat = '<@1419744000977403994>'; // Vireon
        if(args[1] == 'puppy') toPat = '<@960946185768685618>'; // Dei
        if(args[1] == 'kitten') toPat = '<@756535229933551656>'; // Dora

        const touchMessage = `<@${message.author.id}> patted ${toPat} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!marry') {
        if(args[1] == '@everyone') return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> married ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!lick') {
        if(args[1] == '@everyone') return;
        if(!(message.channel as TextChannel).nsfw) return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> licked ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!deport') {
        if(args[1] == '@everyone') return;

        const randomTouch = Math.floor(Math.random() * methods.length);
        const randomCountrie = Math.floor(Math.random() * countries.length);

        const touchMessage = `<@${message.author.id}> deported ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length}) to ${countries[randomCountrie]}`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!kill') {
        if(args[1] == '@everyone') return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> killed ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!bet') {
        if(args[1] == '@everyone') return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> betted ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!bodyslam') {
        if(args[1] == '@everyone') return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> body slammed ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!dmca') {
        if(args[1] == '@everyone') return;

        const randomTouch = Math.floor(Math.random() * methods.length);

        const touchMessage = `<@${message.author.id}> dmca striked ${args[1]} ${(args[2]) ? ' and ' + args[2] : ''} ${(args[3]) ? ' and ' + args[3] : ''} in a(n) ${methods[randomTouch]} way (${randomTouch}/${methods.length})`;
        
        (message.channel as TextChannel).send(touchMessage);
    }

    if(args[0] == '!touching-cmds') {
        const embed = new EmbedBuilder()
            .addFields(
                {name: '!touch', value: 'Touches someone'},
                {name: '!kiss', value: 'Kisses someone'},
                {name: '!hug', value: 'Hugs someone'},
                {name: '!punch',value: 'Punch someone'},
                {name: '!kick',value: 'Kick someone'},
                {name: '!slap',value: 'Slap someone'},
                {name: '!slapAss',value: 'Slaps someones ass'},
                {name: '!feminize',value: 'Force feminizes someone'},
                {name: '!cuddle',value: 'Cuddle someone'},
                {name: '!pinch',value: 'Pinch someone'},
                {name: '!pat',value: 'Pat someone'},
                {name: '!marry',value: 'Marry someone'},
                {name: '!deport',value: 'Become ICE and deport someone to an unknown place'},
                {name: '!kill',value: 'Kill someone'},
                {name: '!bet',value: 'Bet on someone or something'},
                {name: '!bodyslam',value: 'Bodyslam someone like EL-Primo'},
                {name: '!dmca',value: 'DMCA strike someone'},
                {name: '!fuck',value: 'Fuck someone'},
                {name: '!scissor',value: 'Scissor someone'},
                {name: '!gangbang',value: 'gangbang with mutliple people'},
                {name: '!touchtips',value: 'touch tips with someone'},
                {name: '!touchclits',value: 'touch clits with someone'},
                {name: '!suck',value: 'suck someone off'},
                {name: '!lick',value: 'lick someone'},
            );

        (message.channel as TextChannel).send({ embeds: [embed] })
    }
}