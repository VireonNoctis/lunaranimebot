import { EMOJI } from "../Utilities/emoji";
import {
    EmbedBuilder,
    Message
} from "discord.js";


// -----------------------------
// Command
// -----------------------------
export default {
    name: "search",

    async execute(message: Message, args: string[]) {

        // -----------------------------
        // Validation
        // -----------------------------
        if (!args.length) {
            return message.reply(
                `${EMOJI.question} Usage: \`!search <manga name>\``
            );
        }

        const query = args.join(" ");

        const loadingMsg = await message.reply(
            `${EMOJI.loading} Searching manga database...`
        );


        try {

            // -----------------------------
            // 1. SEARCH API
            // -----------------------------
            const searchRes = await fetch(
                `https://api.lunaranime.ru/api/manga/search?q=${encodeURIComponent(query)}`
            );

            const searchData = await searchRes.json();

            if (!searchData?.manga?.length) {
                return loadingMsg.edit(
                    `${EMOJI.denied} No results found for **${query}**`
                );
            }

            const manga = searchData.manga[0];

            // -----------------------------
            // 2. MANGA INFO API
            // -----------------------------
            const infoRes = await fetch(
                `https://api.lunaranime.ru/api/manga/${manga.slug}`
            );

            const info = await infoRes.json();

            const chapters = info?.data ?? [];
            const latest = chapters[0];

            const uploader = latest?.uploader_profile;

            const languages: string[] = [
                ...new Set(chapters.map((c: any) => c.language))
            ];

            // -----------------------------
            // EMBED 
            // -----------------------------
            const embed = new EmbedBuilder()
                .setColor(
                    manga.themecolor
                        ? parseInt(manga.themecolor.replace("#", "0x"))
                        : 0x8B5CF6
                )
                .setTitle(`${EMOJI.moon} ${manga.title}`)
                .setURL(`https://lunaranime.ru/manga/${manga.slug}`)
                .setThumbnail(manga.cover_url)
                .setImage(manga.banner_url ?? null)

                .setDescription(
                    manga.description?.length > 350
                        ? manga.description.slice(0, 347) + "..."
                        : manga.description || "No description available."
                )

                // -----------------------------
                // MAIN INFO BLOCK
                // -----------------------------
                .addFields({
                    name: `${EMOJI.question} Overview`,
                    value:
`**Author**
${manga.author || "Unknown"}

**Artist**
${manga.artist || "Unknown"}

**Status**
${manga.publication_status || "Unknown"}

**Rating**
${manga.rating || "Unknown"}

**Year**
${manga.publication_year || "Unknown"}`,
                    inline: false
                })

                // -----------------------------
                // RELEASE BLOCK
                // -----------------------------
                .addFields({
                    name: `${EMOJI.approved} Release`,
                    value:
`**Chapters**
${info?.count ?? 0}

**Languages**
${languages.length ? languages.join(", ") : "Unknown"}

**Latest Upload**
${
    latest?.uploaded_at
        ? `<t:${Math.floor(new Date(latest.uploaded_at).getTime() / 1000)}:R>`
        : "Unknown"
}`,
                    inline: true
                })

                // -----------------------------
                // UPLOADER BLOCK
                // -----------------------------
                .addFields({
                    name: `${EMOJI.staff} Uploader`,
                    value:
`**Username**
${uploader?.username ?? "Unknown"}

**Level**
${uploader?.level ?? "N/A"}

**Title**
${uploader?.title ?? "None"}`,
                    inline: true
                })


                // -----------------------------
                // FOOTER (CLEAN)
                // -----------------------------
                .setFooter({
                    text: `Lunar Search • ${manga.demographic?.toUpperCase() ?? "UNKNOWN"}`
                })
                .setTimestamp();

            // -----------------------------
            // EDIT RESPONSE
            // -----------------------------
            return loadingMsg.edit({
                content: `${EMOJI.approved} Result found`,
                embeds: [embed]
            });

        } catch (err) {
            console.error(err);

            return loadingMsg.edit(
                `${EMOJI.error} Failed to fetch manga data.`
            );
        }
    }
};
```