import { EMOJI } from "../Utilities/emoji";
import {
    EmbedBuilder,
    Message,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} from "discord.js";

/* --------------------------------------------------
   CACHE + SESSIONS
-------------------------------------------------- */

const cache = new Map<string, any>();
const sessions = new Map<string, any>();
const timers = new Map<string, NodeJS.Timeout>();

function setCache(key: string, value: any, ttl = 300000) {
    cache.set(key, { value, expires: Date.now() + ttl });
}

function getCache(key: string) {
    const c = cache.get(key);
    if (!c) return null;
    if (Date.now() > c.expires) return null;
    return c.value;
}

/* --------------------------------------------------
   API LAYER (LUNAR ONLY)
-------------------------------------------------- */

async function searchManga(query: string) {
    const cached = getCache(`search:${query}`);
    if (cached) return cached;

    const res = await fetch(
        `https://api.lunaranime.ru/api/manga/search?q=${encodeURIComponent(query)}`
    );

    const data = await res.json();
    const results = data?.manga ?? [];

    setCache(`search:${query}`, results);
    return results;
}

async function fetchManga(slug: string) {
    const cached = getCache(`manga:${slug}`);
    if (cached) return cached;

    const res = await fetch(
        `https://api.lunaranime.ru/api/manga/${slug}`
    );

    const data = await res.json();

    setCache(`manga:${slug}`, data);
    return data;
}

/* --------------------------------------------------
   FUZZY RANKING
-------------------------------------------------- */

function similarity(a: string, b: string) {
    a = a.toLowerCase();
    b = b.toLowerCase();

    if (a === b) return 1;
    if (a.includes(b) || b.includes(a)) return 0.85;

    let m = 0;
    const len = Math.max(a.length, b.length);

    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        if (a[i] === b[i]) m++;
    }

    return m / len;
}

/* --------------------------------------------------
   PAGINATION
-------------------------------------------------- */

function paginate(arr: any[], page: number, perPage = 10) {
    return arr.slice(page * perPage, page * perPage + perPage);
}

/* --------------------------------------------------
   EMBEDS
-------------------------------------------------- */

function infoEmbed(manga: any, chapters: any[]) {
    const latest = chapters[0];
    const uploader = latest?.uploader_profile;
    const languages = [...new Set(chapters.map((c: any) => c.language))];

    return new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setTitle(`🌙 ${manga.title}`)
        .setURL(`https://lunaranime.ru/manga/${manga.slug}`)
        .setThumbnail(manga.cover_url)
        .setImage(manga.banner_url ?? null)
        .setDescription(manga.description?.slice(0, 350) || "No description")

        .addFields(
            {
                name: "📊 Info",
                value:
`Author: ${manga.author || "?"}
Artist: ${manga.artist || "?"}
Status: ${manga.publication_status || "?"}
Year: ${manga.publication_year || "?"}
Rating: ${manga.rating || "?"}`
            },
            {
                name: "📦 Release",
                value:
`Chapters: ${chapters.length}
Languages: ${languages.join(", ")}
Latest: ${latest?.uploaded_at ? `<t:${Math.floor(new Date(latest.uploaded_at).getTime()/1000)}:R>` : "?"}`
            },
            {
                name: "👤 Uploader",
                value:
`Username: ${uploader?.username || "?"}
Level: ${uploader?.level || "?"}
Title: ${uploader?.title || "?"}`
            }
        );
}

function chaptersEmbed(chapters: any[], page: number) {
    const per = 10;
    const slice = chapters.slice(page * per, page * per + per);

    return new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setTitle("📖 Chapters")
        .setDescription(
            slice.map((c: any) =>
                `Ch ${c.chapter_number} • <t:${Math.floor(new Date(c.uploaded_at).getTime()/1000)}:R>`
            ).join("\n")
        )
        .setFooter({ text: `Page ${page + 1}` });
}

function languagesEmbed(chapters: any[]) {
    const map = new Map<string, number>();

    for (const c of chapters) {
        map.set(c.language, (map.get(c.language) || 0) + 1);
    }

    return new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setTitle("🌐 Languages")
        .setDescription(
            [...map.entries()].map(([l, c]) => `${l} • ${c}`).join("\n")
        );
}

function statsEmbed(manga: any, chapters: any[]) {
    return new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setTitle("📊 Stats")
        .setDescription(
`Rating: ${manga.rating}
Status: ${manga.publication_status}
Year: ${manga.publication_year}
Chapters: ${chapters.length}`
        );
}

/* --------------------------------------------------
   NAVIGATION
-------------------------------------------------- */

function nav(sessionId: string) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`info_${sessionId}`).setLabel("Info").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`chap_${sessionId}`).setLabel("Chapters").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`lang_${sessionId}`).setLabel("Languages").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`stats_${sessionId}`).setLabel("Stats").setStyle(ButtonStyle.Secondary)
    );
}

/* --------------------------------------------------
   MAIN COMMAND
-------------------------------------------------- */

export default {
    name: "search",

    async execute(message: Message, args: string[]) {
        if (!args.length) {
            return message.reply(`${EMOJI.question} Usage: !search <query>`);
        }

        const query = args.join(" ");
        const loading = await message.reply(`${EMOJI.loading} Searching Lunar...`);

        let results = await searchManga(query);

        if (!results.length) {
            return loading.edit(`${EMOJI.denied} No results found`);
        }

        results = results.slice(0, 50);

        const sessionId = message.id;

        sessions.set(sessionId, {
            results,
            page: 0
        });

        const page = paginate(results, 0);

        const menu = new StringSelectMenuBuilder()
            .setCustomId(`select_${sessionId}`)
            .setPlaceholder("Select manga...")
            .addOptions(
                page.map((m: any) => ({
                    label: m.title.slice(0, 100),
                    value: m.slug
                }))
            );

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(menu);

        const msg = await loading.edit({
            content: `${EMOJI.approved} Found ${results.length} results`,
            embeds: [
                new EmbedBuilder()
                    .setColor(0x8B5CF6)
                    .setTitle("🌙 Lunar Search")
                    .setDescription("Select a manga below")
            ],
            components: [row]
        });

        /* --------------------------
           TIMEOUT CLEANUP
        -------------------------- */

        const timer = setTimeout(async () => {
            sessions.delete(sessionId);
            await msg.edit({ components: [] }).catch(() => {});
        }, 60000);

        timers.set(sessionId, timer);

        /* --------------------------
           COLLECTOR
        -------------------------- */

        const collector = msg.createMessageComponentCollector({
            time: 60000
        });

        collector.on("collect", async (i) => {

            /* --------------------------
               SELECT MENU
            -------------------------- */

            if (i.isStringSelectMenu()) {
                const slug = i.values[0];

                const manga = await fetchManga(slug);
                const chapters = manga?.data ?? [];

                sessions.set(sessionId, {
                    manga,
                    chapters,
                    page: 0
                });

                return i.update({
                    embeds: [infoEmbed(manga, chapters)],
                    components: [nav(sessionId)]
                });
            }

            const s = sessions.get(sessionId);
            if (!s?.manga) return i.deferUpdate();

            const { manga, chapters } = s;

            /* --------------------------
               NAVIGATION
            -------------------------- */

            if (i.customId === `info_${sessionId}`) {
                return i.update({
                    embeds: [infoEmbed(manga, chapters)],
                    components: [nav(sessionId)]
                });
            }

            if (i.customId === `chap_${sessionId}`) {
                s.page = 0;
                return i.update({
                    embeds: [chaptersEmbed(chapters, 0)],
                    components: [nav(sessionId)]
                });
            }

            if (i.customId === `lang_${sessionId}`) {
                return i.update({
                    embeds: [languagesEmbed(chapters)],
                    components: [nav(sessionId)]
                });
            }

            if (i.customId === `stats_${sessionId}`) {
                return i.update({
                    embeds: [statsEmbed(manga, chapters)],
                    components: [nav(sessionId)]
                });
            }
        });

        collector.on("end", async () => {
            sessions.delete(sessionId);
            const t = timers.get(sessionId);
            if (t) clearTimeout(t);

            await msg.edit({ components: [] }).catch(() => {});
        });
    }
};