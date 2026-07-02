import { Telegraf, Context } from "telegraf";
import {
    WebhookClient,
    TextChannel
} from "discord.js";
import { discordClient } from "..";

/**
 * IDS
 */
const TG_CHAT_ID = -1003860971024;

const DISCORD_GUILD_ID = "1330574273760465029";
const DISCORD_CHANNEL_ID = "1463041674501689502";

/**
 * MEMORY STATE
 */
const tgToDiscord = new Map<number, string>();
const discordToTg = new Map<string, number>();
const replyMapTG = new Map<number, number>();
const replyMapDC = new Map<string, string>();

const avatarCache = new Map<number, string>();

/**
 * SIMPLE QUEUE SYSTEM
 * (prevents rate limit / burst crash)
 */
type Job = () => Promise<void>;
const queue: Job[] = [];
let processing = false;

async function enqueue(job: Job) {
    queue.push(job);
    if (!processing) runQueue();
}

async function runQueue() {
    processing = true;

    while (queue.length) {
        const job = queue.shift();
        if (!job) continue;

        try {
            await job();
            await new Promise(r => setTimeout(r, 250)); // rate-limit buffer
        } catch {}
    }

    processing = false;
}

/**
 * WEBHOOK
 */
let webhook: WebhookClient | null = null;

async function getWebhook(channel: TextChannel) {
    if (webhook) return webhook;

    const hooks = await channel.fetchWebhooks();
    const existing = hooks.find(h => h.name === "TG_BRIDGE");

    if (existing) {
        webhook = new WebhookClient({
            id: existing.id,
            token: existing.token!
        });
        return webhook;
    }

    const created = await channel.createWebhook({
        name: "TG_BRIDGE",
        avatar: null
    });

    webhook = new WebhookClient({
        id: created.id,
        token: created.token!
    });

    return webhook;
}

/**
 * MARKDOWN PARSER
 * Telegram → Discord Markdown normalization
 */
function parseMarkdown(text: string) {
    if (!text) return "";

    return text
        // bold
        .replace(/\*(.*?)\*/g, "**$1**")
        // italic
        .replace(/_(.*?)_/g, "*$1*")
        // code
        .replace(/`([^`]+)`/g, "`$1`")
        // monospace block
        .replace(/```([\s\S]*?)```/g, "```$1```")
        // links (basic)
        .replace(/\[(.+?)\]\((.+?)\)/g, "[$1]($2)");
}

/**
 * SANITIZER
 */
function sanitize(text: string) {
    return text
        .replace(/@everyone/g, "@\u200beveryone")
        .replace(/@here/g, "@\u200bhere");
}

/**
 * AVATAR CACHE
 */
async function getAvatar(ctx: Context, userId: number) {
    if (avatarCache.has(userId)) return avatarCache.get(userId);

    try {
        const photos = await ctx.telegram.getUserProfilePhotos(userId, 0, 1);
        const fileId = photos.photos?.[0]?.[0]?.file_id;
        if (!fileId) return null;

        const file = await ctx.telegram.getFile(fileId);
        if (!file.file_path) return null;

        const url = `https://api.telegram.org/file/bot${ctx.telegram.token}/${file.file_path}`;
        avatarCache.set(userId, url);

        return url;
    } catch {
        return null;
    }
}

/**
 * MAIN EXPORT
 */
export function registerTelegramBridge(bot: Telegraf) {

    /**
     * TELEGRAM → DISCORD
     */
    bot.on("message", async (ctx) => enqueue(async () => {
        const msg: any = ctx.message;
        if (!msg || msg.chat.id !== TG_CHAT_ID) return;

        const channel = discordClient.guilds.cache
            .get(DISCORD_GUILD_ID)
            ?.channels.cache.get(DISCORD_CHANNEL_ID) as TextChannel;

        if (!channel) return;

        const hook = await getWebhook(channel);

        const username =
            msg.from?.username ||
            msg.from?.first_name ||
            "Telegram User";

        const avatarURL = await getAvatar(ctx, msg.from.id);

        let content = sanitize(parseMarkdown(msg.text || msg.caption || ""));

        /**
         * REPLY HANDLING (TG → DC)
         */
        if (msg.reply_to_message?.message_id) {
            const ref = tgToDiscord.get(msg.reply_to_message.message_id);
            if (ref) {
                content = `↪ Replying to message\n${content}`;
            }
        }

        const files: string[] = [];

        const pushFile = async (fileId: string) => {
            const file = await ctx.telegram.getFile(fileId);
            if (file.file_path) {
                files.push(
                    `https://api.telegram.org/file/bot${ctx.telegram.token}/${file.file_path}`
                );
            }
        };

        if (msg.photo) await pushFile(msg.photo[msg.photo.length - 1].file_id);
        if (msg.video) await pushFile(msg.video.file_id);
        if (msg.document) await pushFile(msg.document.file_id);
        if (msg.audio) await pushFile(msg.audio.file_id);
        if (msg.voice) await pushFile(msg.voice.file_id);

        if (msg.sticker) {
            content += ` [Sticker: ${msg.sticker.emoji || "unknown"}]`;
        }

        const sent = await hook.send({
            username,
            avatarURL: avatarURL || undefined,
            content: content || "[media]",
            files
        });

        tgToDiscord.set(msg.message_id, sent.id);
    }));

    /**
     * DISCORD → TELEGRAM
     */
    discordClient.on("messageCreate", async (message: any) => enqueue(async () => {
        if (message.channel.id !== DISCORD_CHANNEL_ID) return;
        if (message.author.bot) return;

        const tgMsg = await bot.telegram.sendMessage(
            TG_CHAT_ID,
            sanitize(parseMarkdown(
                `${message.author.username}: ${message.content || ""}`
            ))
        );

        discordToTg.set(message.id, tgMsg.message_id);
    }));

    /**
     * DISCORD EDIT
     */
    discordClient.on("messageUpdate", async (_, newMsg: any) => enqueue(async () => {
        const tgId = discordToTg.get(newMsg.id);
        if (!tgId) return;

        await bot.telegram.editMessageText(
            TG_CHAT_ID,
            tgId,
            undefined,
            sanitize(parseMarkdown(newMsg.content || ""))
        ).catch(() => {});
    }));

    /**
     * DISCORD DELETE
     */
    discordClient.on("messageDelete", async (msg: any) => enqueue(async () => {
        const tgId = discordToTg.get(msg.id);
        if (!tgId) return;

        await bot.telegram.deleteMessage(TG_CHAT_ID, tgId).catch(() => {});
    }));
}