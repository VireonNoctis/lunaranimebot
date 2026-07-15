import {
    Message
} from "discord.js";

import {
    EMOJI
} from "../Utilities/emoji.js";


const OWNERS = [
    "1419744000977403994",
    "960946185768685618"
];


export default async function restartCommand(message: Message){

    if(!OWNERS.includes(message.author.id)){

        return message.reply(
            `${EMOJI.denied} You do not have permission to use this command.`
        );

    }


    await message.reply(
        `${EMOJI.loading} Restarting bot...`
    );


    process.exit(0);

}