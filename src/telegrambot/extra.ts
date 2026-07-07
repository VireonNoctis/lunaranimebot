import { Telegraf, Context } from "telegraf";
import {
  WebhookClient,
  TextChannel,
  type Message as DiscordMessage,
  type Attachment,
} from "discord.js";
import { promises as fs } from "fs";
import path from "path";
import { discordClient } from "..";

/**
 * =========================
 * CONFIG
 * =========================
 */
const TG_CHAT_ID = -1003860971024;

const DISCORD_GUILD_ID = "1330574273760465029";
const DISCORD_CHANNEL_ID = "1463041674501689502";

const STATE_FILE = path.resolve(process.cwd(), "telegram-bridge.state.json");
const WEBHOOK_NAME = "TG_BRIDGE";
const QUEUE_DELAY_MS = 250;

/**
 * =========================
 * TYPES
 * =========================
 */
type Job = () => Promise<void>;

type PersistentState = {
  tgToDiscord: Array<[number, string]>;
  discordToTg: Array<[string, number]>;
  replyMapTG: Array<[number, number]>;
  replyMapDC: Array<[string, string]>;
  webhookId: string | null;
};

/**
 * =========================
 * MEMORY STATE
 * =========================
 */
const tgToDiscord = new Map<number, string>();
const discordToTg = new Map<string, number>();
const replyMapTG = new Map<number, number>();
const replyMapDC = new Map<string, string>();

const avatarCache = new Map<number, string>();

let bridgeWebhook: WebhookClient | null = null;
let bridgeWebhookId: string | null = null;

/**
 * =========================
 * QUEUE
 * =========================
 */
const queue: Job[] = [];
let processing = false;
let saveTimer: NodeJS.Timeout | null = null;

async function enqueue(job: Job) {
  queue.push(job);
  if (!processing) void runQueue();
}

async function runQueue() {
  processing = true;

  while (queue.length) {
    const job = queue.shift();
    if (!job) continue;

    try {
      await job();
      await sleep(QUEUE_DELAY_MS);
    } catch {
      // swallow per-job failures so the bridge keeps running
    }
  }

  processing = false;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * =========================
 * PERSISTENCE
 * =========================
 */
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void saveState().catch(() => {});
  }, 1000);
}

async function saveState() {
  const state: PersistentState = {
    tgToDiscord: [...tgToDiscord.entries()],
    discordToTg: [...discordToTg.entries()],
    replyMapTG: [...replyMapTG.entries()],
    replyMapDC: [...replyMapDC.entries()],
    webhookId: bridgeWebhookId,
  };

  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

async function loadState() {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8");
    const state = JSON.parse(raw) as PersistentState;

    tgToDiscord.clear();
    discordToTg.clear();
    replyMapTG.clear();
    replyMapDC.clear();

    for (const [k, v] of state.tgToDiscord ?? []) tgToDiscord.set(Number(k), v);
    for (const [k, v] of state.discordToTg ?? []) discordToTg.set(String(k), Number(v));
    for (const [k, v] of state.replyMapTG ?? []) replyMapTG.set(Number(k), Number(v));
    for (const [k, v] of state.replyMapDC ?? []) replyMapDC.set(String(k), String(v));

    bridgeWebhookId = state.webhookId ?? null;
  } catch {
    // no saved state yet
  }
}

/**
 * =========================
 * TEXT HELPERS
 * =========================
 */
function sanitize(text: string) {
  return (text || "")
    .replace(/@everyone/g, "@\u200beveryone")
    .replace(/@here/g, "@\u200bhere");
}

/**
 * Best-effort Telegram -> Discord markdown normalization.
 * This is intentionally conservative and not a full Markdown parser.
 */
function parseTelegramMarkdown(text: string) {
  if (!text) return "";

  return text
    // code blocks first
    .replace(/```([\s\S]*?)```/g, "```$1```")
    // inline code
    .replace(/`([^`]+)`/g, "`$1`")
    // bold
    .replace(/\*(\S(?:[\s\S]*?\S)?)\*/g, "**$1**")
    // italic
    .replace(/_(\S(?:[\s\S]*?\S)?)_/g, "*$1*")
    // underline
    .replace(/__(\S(?:[\s\S]*?\S)?)__/g, "__$1__")
    // strikethrough
    .replace(/~(\S(?:[\s\S]*?\S)?)~/g, "~~$1~~")
    // basic links
    .replace(/\[(.+?)\]\((.+?)\)/g, "[$1]($2)");
}

function safeTrim(text: string) {
  return (text || "").trim();
}

function summarizeDiscordEmbeds(message: DiscordMessage) {
  if (!message.embeds?.length) return "";

  const parts: string[] = [];
  for (const embed of message.embeds.slice(0, 3)) {
    const title = safeTrim(embed.title || "");
    const desc = safeTrim(embed.description || "");
    const url = safeTrim(embed.url || "");

    const chunk = [title, desc, url].filter(Boolean).join("\n");
    if (chunk) parts.push(chunk);
  }

  return parts.join("\n\n");
}

function buildDiscordText(message: DiscordMessage) {
  const segments: string[] = [];

  if (message.content) segments.push(message.content);

  const embedText = summarizeDiscordEmbeds(message);
  if (embedText) segments.push(`[Embed]\n${embedText}`);

  for (const attachment of message.attachments.values()) {
    segments.push(`[Attachment] ${attachment.name || "file"}${attachment.url ? `\n${attachment.url}` : ""}`);
  }

  return segments.join("\n\n").trim();
}

/**
 * =========================
 * ATTACHMENT HELPERS
 * =========================
 */
function isImage(att: Attachment) {
  const ct = att.contentType?.toLowerCase() || "";
  return ct.startsWith("image/");
}

function isVideo(att: Attachment) {
  const ct = att.contentType?.toLowerCase() || "";
  return ct.startsWith("video/");
}

function isAudio(att: Attachment) {
  const ct = att.contentType?.toLowerCase() || "";
  return ct.startsWith("audio/");
}

function isVoiceFile(att: Attachment) {
  const name = (att.name || "").toLowerCase();
  const ct = att.contentType?.toLowerCase() || "";
  return ct.startsWith("audio/ogg") || name.endsWith(".ogg") || name.endsWith(".oga");
}

function getDiscordAttachmentUrls(message: DiscordMessage) {
  return [...message.attachments.values()].map((a) => a.url);
}

function pickFirstAttachment(message: DiscordMessage) {
  return message.attachments.values().next().value as Attachment | undefined;
}

/**
 * =========================
 * DISCORD WEBHOOK
 * =========================
 */
async function getWebhook(channel: TextChannel) {
  if (bridgeWebhook) return bridgeWebhook;

  const hooks = await channel.fetchWebhooks();
  const existing = hooks.find((h) => h.name === WEBHOOK_NAME);

  if (existing?.token) {
    bridgeWebhookId = existing.id;
    bridgeWebhook = new WebhookClient({
      id: existing.id,
      token: existing.token,
    });
    return bridgeWebhook;
  }

  const created = await channel.createWebhook({
    name: WEBHOOK_NAME,
    avatar: null,
  });

  bridgeWebhookId = created.id;
  bridgeWebhook = new WebhookClient({
    id: created.id,
    token: created.token!,
  });

  scheduleSave();
  return bridgeWebhook;
}

async function resolveDiscordChannel() {
  const guild = discordClient.guilds.cache.get(DISCORD_GUILD_ID);
  const channel = guild?.channels.cache.get(DISCORD_CHANNEL_ID);

  if (!channel || !("send" in channel) && !("fetchWebhooks" in channel)) return null;
  return channel as TextChannel;
}

/**
 * =========================
 * TELEGRAM AVATAR
 * =========================
 */
async function getAvatar(ctx: Context, userId: number) {
  if (avatarCache.has(userId)) return avatarCache.get(userId) || null;

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

function tgDisplayName(msg: any) {
  return (
    msg.from?.username ||
    [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ").trim() ||
    "Telegram User"
  );
}

function tgAttachmentCaption(msg: any) {
  return safeTrim(msg.caption || msg.text || "");
}

async function tgFileUrl(ctx: Context, fileId: string) {
  const file = await ctx.telegram.getFile(fileId);
  if (!file.file_path) return null;
  return `https://api.telegram.org/file/bot${ctx.telegram.token}/${file.file_path}`;
}

/**
 * =========================
 * TELEGRAM -> DISCORD
 * =========================
 */
async function relayTelegramMessageToDiscord(ctx: Context) {
  const msg: any = ctx.message;
  if (!msg || msg.chat?.id !== TG_CHAT_ID) return;

  const channel = await resolveDiscordChannel();
  if (!channel) return;

  const hook = await getWebhook(channel);

  const username = tgDisplayName(msg);
  const avatarURL = await getAvatar(ctx, msg.from.id);
  let content = sanitize(parseTelegramMarkdown(tgAttachmentCaption(msg)));

  if (!content) content = "[media]";

  /**
   * Reply handling:
   * We cannot create a real webhook reply reliably in every setup,
   * so we add a quote-style prefix when the target message is known.
   */
  if (msg.reply_to_message?.message_id) {
    const ref = tgToDiscord.get(msg.reply_to_message.message_id);
    if (ref) {
      content = `↪ Reply\n${content}`;
    }
  }

  const fileUrls: string[] = [];

  const addFile = async (fileId: string) => {
    const url = await tgFileUrl(ctx, fileId);
    if (url) fileUrls.push(url);
  };

  if (msg.photo?.length) {
    await addFile(msg.photo[msg.photo.length - 1].file_id);
  }
  if (msg.video?.file_id) await addFile(msg.video.file_id);
  if (msg.document?.file_id) await addFile(msg.document.file_id);
  if (msg.audio?.file_id) await addFile(msg.audio.file_id);
  if (msg.voice?.file_id) await addFile(msg.voice.file_id);

  if (msg.sticker) {
    const emoji = msg.sticker.emoji || "sticker";
    content = `${content}\n[Sticker: ${emoji}]`.trim();
  }

  const sent = await hook.send({
    username,
    avatarURL: avatarURL || undefined,
    content,
    files: fileUrls,
    allowedMentions: { parse: [] },
  });

  tgToDiscord.set(msg.message_id, sent.id);
  discordToTg.set(sent.id, msg.message_id);

  if (msg.reply_to_message?.message_id) {
    replyMapTG.set(msg.message_id, msg.reply_to_message.message_id);
  }

  scheduleSave();
}

/**
 * =========================
 * DISCORD -> TELEGRAM
 * =========================
 */
async function sendDiscordTextToTelegram(message: DiscordMessage, text: string) {
  const replyToDiscordId = message.reference?.messageId;
  const replyToTgId = replyToDiscordId ? discordToTg.get(replyToDiscordId) : undefined;

  const options: any = {
    disable_web_page_preview: false,
  };

  if (replyToTgId) {
    options.reply_to_message_id = replyToTgId;
  }

  const sent = await discordClientTelegram().sendMessage(TG_CHAT_ID, sanitize(text), options);
  discordToTg.set(message.id, sent.message_id);
  tgToDiscord.set(sent.message_id, message.id);

  if (replyToTgId) {
    replyMapDC.set(message.id, String(replyToTgId));
  }

  scheduleSave();
}

async function sendDiscordAttachmentToTelegram(message: DiscordMessage, attachment: Attachment, caption: string) {
  const replyToDiscordId = message.reference?.messageId;
  const replyToTgId = replyToDiscordId ? discordToTg.get(replyToDiscordId) : undefined;

  const options: any = {
    caption: caption ? sanitize(caption) : undefined,
    disable_web_page_preview: false,
  };

  if (replyToTgId) {
    options.reply_to_message_id = replyToTgId;
  }

  let sent: any;

  if (isImage(attachment)) {
    sent = await discordClientTelegram().sendPhoto(TG_CHAT_ID, attachment.url, options);
  } else if (isVideo(attachment)) {
    sent = await discordClientTelegram().sendVideo(TG_CHAT_ID, attachment.url, options);
  } else if (isVoiceFile(attachment)) {
    sent = await discordClientTelegram().sendVoice(TG_CHAT_ID, attachment.url, options);
  } else if (isAudio(attachment)) {
    sent = await discordClientTelegram().sendAudio(TG_CHAT_ID, attachment.url, options);
  } else {
    sent = await discordClientTelegram().sendDocument(TG_CHAT_ID, attachment.url, options);
  }

  discordToTg.set(message.id, sent.message_id);
  tgToDiscord.set(sent.message_id, message.id);

  if (replyToTgId) {
    replyMapDC.set(message.id, String(replyToTgId));
  }

  scheduleSave();
}

function discordClientTelegram() {
  const tg = (globalThis as any).__TG_BOT__ as Telegraf | undefined;
  if (!tg) throw new Error("Telegram bot is not registered yet");
  return tg.telegram;
}

async function relayDiscordMessageToTelegram(message: DiscordMessage) {
  if (message.channel.id !== DISCORD_CHANNEL_ID) return;

  /**
   * Ignore messages created by this bridge webhook to prevent loops.
   * We allow normal user messages and other non-bridge content.
   */
  if (message.webhookId && bridgeWebhookId && message.webhookId === bridgeWebhookId) return;
  if (message.author?.bot && !message.webhookId) return;

  const content = buildDiscordText(message).trim();
  const attachments = [...message.attachments.values()];

  /**
   * No content and no attachments means nothing to relay.
   */
  if (!content && attachments.length === 0) return;

  /**
   * If there is text and no attachments, send a text message.
   * If there are attachments, send the first one with caption, then any extras.
   */
  if (attachments.length === 0) {
    await sendDiscordTextToTelegram(message, content || "[message]");
    return;
  }

  const first = pickFirstAttachment(message);
  if (!first) {
    await sendDiscordTextToTelegram(message, content || "[media]");
    return;
  }

  await sendDiscordAttachmentToTelegram(message, first, content);

  if (attachments.length > 1) {
    for (const att of attachments.slice(1)) {
      await sendDiscordAttachmentToTelegram(message, att, "");
    }
  }
}

/**
 * =========================
 * EDIT / DELETE SYNC
 * =========================
 */
async function editDiscordMessageInTelegram(oldMsg: DiscordMessage, newMsg: DiscordMessage) {
  const tgId = discordToTg.get(newMsg.id);
  if (!tgId) return;

  const text = buildDiscordText(newMsg).trim() || "[message]";

  await discordClientTelegram()
    .editMessageText(TG_CHAT_ID, tgId, undefined, sanitize(text))
    .catch(async () => {
      // fallback when Telegram refuses editMessageText (e.g. not text)
      await discordClientTelegram()
        .editMessageCaption(TG_CHAT_ID, tgId, undefined, sanitize(text))
        .catch(() => {});
    });
}

async function deleteDiscordMessageInTelegram(message: DiscordMessage) {
  const tgId = discordToTg.get(message.id);
  if (!tgId) return;

  await discordClientTelegram().deleteMessage(TG_CHAT_ID, tgId).catch(() => {});
}

async function editTelegramMessageInDiscord(msg: any) {
  const discordId = tgToDiscord.get(msg.message_id);
  if (!discordId) return;

  const channel = await resolveDiscordChannel();
  if (!channel) return;

  const hook = await getWebhook(channel);

  const content = sanitize(parseTelegramMarkdown(tgAttachmentCaption(msg))) || "[edited message]";

  /**
   * Webhook messages are not always editable by the bot across all contexts,
   * so we try via webhook message fetch/edit if possible.
   */
  try {
    const fetched = await hook.fetchMessage(discordId);
    if (fetched) {
      await fetched.edit({
        content,
        allowedMentions: { parse: [] },
      });
    }
  } catch {
    // ignore
  }
}

async function deleteTelegramMessageInDiscord(msg: any) {
  const discordId = tgToDiscord.get(msg.message_id);
  if (!discordId) return;

  const channel = await resolveDiscordChannel();
  if (!channel) return;

  const hook = await getWebhook(channel);

  try {
    const fetched = await hook.fetchMessage(discordId);
    if (fetched) await fetched.delete();
  } catch {
    // ignore
  }
}

/**
 * =========================
 * MAIN EXPORT
 * =========================
 */
export async function registerTelegramBridge(bot: Telegraf) {
  (globalThis as any).__TG_BOT__ = bot;

  await loadState();

  /**
   * Telegram -> Discord
   */
  bot.on("message", async (ctx) => {
    await enqueue(async () => {
      try {
        await relayTelegramMessageToDiscord(ctx);
      } catch {
        // ignore individual message errors
      }
    });
  });

  /**
   * Telegram edits
   */
  bot.on("edited_message", async (ctx) => {
    await enqueue(async () => {
      const msg: any = ctx.update.edited_message;
      if (!msg || msg.chat?.id !== TG_CHAT_ID) return;
      try {
        await editTelegramMessageInDiscord(msg);
      } catch {
        // ignore
      }
    });
  });

  /**
   * Telegram deletions are not available through standard Bot API
   * unless you are tracking them yourself or using additional admin update flows.
   * This handler is kept as a placeholder for future extension.
   */
  bot.on("deleted_message" as any, async () => {
    return;
  });

  /**
   * Discord -> Telegram
   */
  discordClient.on("messageCreate", async (message: DiscordMessage) => {
    await enqueue(async () => {
      try {
        await relayDiscordMessageToTelegram(message);
      } catch {
        // ignore individual message errors
      }
    });
  });

  discordClient.on("messageUpdate", async (oldMessage: DiscordMessage, newMessage: DiscordMessage) => {
    await enqueue(async () => {
      try {
        if (newMessage.channel.id !== DISCORD_CHANNEL_ID) return;
        if (newMessage.webhookId && bridgeWebhookId && newMessage.webhookId === bridgeWebhookId) return;

        await editDiscordMessageInTelegram(oldMessage, newMessage);
      } catch {
        // ignore
      }
    });
  });

  discordClient.on("messageDelete", async (message: DiscordMessage) => {
    await enqueue(async () => {
      try {
        await deleteDiscordMessageInTelegram(message);
      } catch {
        // ignore
      }
    });
  });

  /**
   * Periodic backup save
   */
  setInterval(() => {
    void saveState().catch(() => {});
  }, 60_000).unref();
}