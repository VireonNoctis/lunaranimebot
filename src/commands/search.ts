import { EMOJI } from "../Utilities/emoji";
import {
    EmbedBuilder,
    Message,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle
} from "discord.js";

/* --------------------------------------------------
   MEMORY STATE
-------------------------------------------------- */

const cache = new Map<string, any>();
const sessions = new Map<string, any>();

function setCache(key: string, value: any, ttl = 300000) {
    cache.set(key, { value, expires: Date.now() + ttl });
}

function getCache(key: string) {
    const v = cache.get(key);
    if (!v) return null;
    if (Date.now() > v.expires) return null;
    return v.value;
}

/* --------------------------------------------------
   API (LUNAR ONLY)
-------------------------------------------------- */

async function searchManga(query: string) {
    const cached = getCache(`s:${query}`);
    if (cached) return cached;

    const res = await fetch(
        `https://api.lunaranime.ru/api/manga/search?q=${encodeURIComponent(query)}`
    );

    const data = await res.json();
    const result = data?.manga ?? [];

    setCache(`s:${query}`, result);
    return result;
}

async function fetchManga(slug: string) {
    const cached = getCache(`m:${slug}`);
    if (cached) return cached;

    const res = await fetch(
        `https://api.lunaranime.ru/api/manga/${slug}`
    );

    const data = await res.json();

    setCache(`m:${slug}`, data);
    return data;
}

/* --------------------------------------------------
   COLOR ENGINE (THEME + GRADIENT FALLBACK)
-------------------------------------------------- */

function parseColor(hex: string) {
    if (!hex) return null;
    if (hex.startsWith("#")) return parseInt(hex.replace("#", "0x"));
    if (hex.length === 6) return parseInt("0x" + hex);
    return null;
}

function gradientFallback(title: string) {
    // deterministic pseudo-gradient → stable per title
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
        hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
    }

    const colors = [
        0x8B5CF6, // purple
        0x3B82F6, // blue
        0x10B981, // green
        0xF59E0B, // amber
        0xEF4444  // red
    ];

    return colors[hash % colors.length];
}

function resolveColor(manga: any) {
    const theme = manga?.theme_color || manga?.themecolor;
    const parsed = parseColor(theme);

    if (parsed) return parsed;

    return gradientFallback(manga?.title || "lunar");
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
   UI HELPERS
-------------------------------------------------- */

function paginate(arr: any[], page: number, per = 10) {
    return arr.slice(page * per, page * per + per);
}

/* --------------------------------------------------
   MINI APP STATE
-------------------------------------------------- */

function setSession(id: string, data: any) {
    sessions.set(id, data);
}

function getSession(id: string) {
    return sessions.get(id);
}

/* --------------------------------------------------
   EMBEDS (APP PAGES)
-------------------------------------------------- */

function buildHome(results: any[], query: string) {
    return new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setTitle("🌙 Lunar Catalog")
        .setDescription(
            `Search: **${query}**\nResults: **${results.length}**\n\nSelect a title below.`
        );
}

function buildInfo(manga: any, chapters: any[]) {
    const latest = chapters[0];
    const uploader = latest?.uploader_profile;

    return new EmbedBuilder()
        .setColor(resolveColor(manga))
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
Year: ${manga.publication_year || "?"}`
            },
            {
                name: "📦 Stats",
                value:
`Chapters: ${chapters.length}
Rating: ${manga.rating || "?"}`
            },
            {
                name: "👤 Uploader",
                value:
`User: ${uploader?.username || "?"}
Level: ${uploader?.level || "?"}`
            }
        );
}

/* --------------------------------------------------
   TABS (APP NAVIGATION)
-------------------------------------------------- */

function nav(sessionId: string) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`tab_info_${sessionId}`).setLabel("Info").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`tab_chapters_${sessionId}`).setLabel("Chapters").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`tab_lang_${sessionId}`).setLabel("Languages").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`tab_stats_${sessionId}`).setLabel("Stats").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`close_${sessionId}`).setLabel("Close").setStyle(ButtonStyle.Danger)
    );
}

/* --------------------------------------------------
   MAIN COMMAND
-------------------------------------------------- */

export default {
    name: "search",

    async execute(message: Message, args: string[]) {
        if (!args.length) {
            return message.reply(`${EMOJI.question} !search <query>`);
        }

        const query = args.join(" ");
        const loading = await message.reply(`${EMOJI.loading} Searching...`);

        let results = await searchManga(query);

        if (!results.length) {
            return loading.edit(`${EMOJI.denied} No results`);
        }

        results = results.slice(0, 50);

        const sessionId = message.id;

        setSession(sessionId, {
            results,
            page: 0,
            view: "home"
        });

        const page = paginate(results, 0);

        const select = new StringSelectMenuBuilder()
            .setCustomId(`select_${sessionId}`)
            .setPlaceholder("Choose a manga...")
            .addOptions(
                page.map((m: any) => ({
                    label: m.title.slice(0, 100),
                    value: m.slug
                }))
            );

        const msg = await loading.edit({
            content: `${EMOJI.approved} Ready`,
            embeds: [buildHome(results, query)],
            components: [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)
            ]
        });

        /* -----------------------------
           COLLECTOR (APP ENGINE)
        ----------------------------- */

        const collector = msg.createMessageComponentCollector({
            time: 60000
        });

        collector.on("collect", async (i) => {

            const session = getSession(sessionId);

            /* -----------------------------
               SELECT → OPEN APP
            ----------------------------- */

            if (i.isStringSelectMenu()) {
                const slug = i.values[0];

                const manga = await fetchManga(slug);
                const chapters = manga?.data ?? [];

                setSession(sessionId, {
                    manga,
                    chapters,
                    view: "info"
                });

                return i.update({
                    embeds: [buildInfo(manga, chapters)],
                    components: [nav(sessionId)]
                });
            }

            if (!session?.manga) return i.deferUpdate();

            const { manga, chapters } = session;

            /* -----------------------------
               TABS SYSTEM
            ----------------------------- */

            switch (i.customId) {

                case `tab_info_${sessionId}`:
                    return i.update({
                        embeds: [buildInfo(manga, chapters)],
                        components: [nav(sessionId)]
                    });

                case `tab_chapters_${sessionId}`:
                    return i.update({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(resolveColor(manga))
                                .setTitle("📖 Chapters")
                                .setDescription(
                                    chapters.slice(0, 10)
                                        .map((c: any) =>
                                            `Ch ${c.chapter_number} • <t:${Math.floor(new Date(c.uploaded_at).getTime()/1000)}:R>`
                                        )
                                        .join("\n")
                                )
                        ],
                        components: [nav(sessionId)]
                    });

                case `tab_lang_${sessionId}`:
                    return i.update({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(resolveColor(manga))
                                .setTitle("🌐 Languages")
                                .setDescription(
                                    [...new Set(chapters.map((c: any) => c.language))]
                                        .join(", ")
                                )
                        ],
                        components: [nav(sessionId)]
                    });

                case `tab_stats_${sessionId}`:
                    return i.update({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(resolveColor(manga))
                                .setTitle("📊 Stats")
                                .setDescription(
`Rating: ${manga.rating}
Status: ${manga.publication_status}
Year: ${manga.publication_year}
Chapters: ${chapters.length}`
                                )
                        ],
                        components: [nav(sessionId)]
                    });

                case `close_${sessionId}`:
                    sessions.delete(sessionId);
                    return i.update({
                        content: "Closed.",
                        embeds: [],
                        components: []
                    });
            }
        });

        collector.on("end", async () => {
            sessions.delete(sessionId);
            await msg.edit({ components: [] }).catch(() => {});
        });
    }
};