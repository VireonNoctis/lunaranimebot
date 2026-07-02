import axios from "axios";
import type { Message, TextChannel } from "discord.js";

export default async function(message :Message, args :string[]) {
    if(args[0] == '!dadJoke') {
        const joke = await axios.get('https://icanhazdadjoke.com/', { headers: {Accept: 'text/plain'}});

        (message.channel as TextChannel).send(joke.data);
    }
} 