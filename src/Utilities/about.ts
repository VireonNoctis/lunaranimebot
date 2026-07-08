export const BOT = Object.freeze({

    name: "Lunaranime Bot",

    version: "1.0.0",

    developers: [

        {
            name: "Vireon",

            discord:
            "https://discord.com/users/960946185768685618",

            telegram:
            "tg://user?id=6497734480"
        },


        {
            name: "Thanon",

            discord:
            "https://discord.com/users/1419744000977403994",

            telegram:
            "tg://user?id=8533417360"
        }

    ]

});



export function getDevelopers(
    platform: "discord" | "telegram"
){

    return BOT.developers

        .map(dev => {

            const link =
                platform === "discord"
                ? dev.discord
                : dev.telegram;


            return `[${dev.name}](${link})`;

        })

        .join("\n");

}



export function getUptime(){

    const total =
        Math.floor(process.uptime());


    const days =
        Math.floor(total / 86400);


    const hours =
        Math.floor(
            (total % 86400) / 3600
        );


    const minutes =
        Math.floor(
            (total % 3600) / 60
        );


    const seconds =
        total % 60;


    return [

        days && `${days}d`,

        hours && `${hours}h`,

        minutes && `${minutes}m`,

        `${seconds}s`

    ]

    .filter(Boolean)

    .join(" ");

}