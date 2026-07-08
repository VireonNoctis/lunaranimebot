export const BOT = Object.freeze({

    name: "Lunaranime Bot",

    version: "1.0.0",

    developer: [
        {
            name: "Vireon",

            discord:
            "https://discord.com/users/960946185768685618",

            telegram:
            "https://t.me/Theslopking"
        },

        {
            name: "Thanon",

            discord:
            "https://discord.com/users/1419744000977403994",

            telegram:
            "https://t.me/Thanontc"
        }
    ]

});


export function getDevelopers(
    platform: "discord" | "telegram"
){

    return BOT.developer

        .map(dev => {

            const url =
                platform === "discord"
                ? dev.discord
                : dev.telegram;


            return `[${dev.name}](${url})`;

        })

        .join("\n");

}



export function getUptime(){

    const seconds =
        Math.floor(process.uptime());


    const days =
        Math.floor(seconds / 86400);

    const hours =
        Math.floor(
            (seconds % 86400) / 3600
        );

    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );

    const secs =
        seconds % 60;


    return [

        days && `${days}d`,

        hours && `${hours}h`,

        minutes && `${minutes}m`,

        `${secs}s`

    ]

    .filter(Boolean)

    .join(" ");

}