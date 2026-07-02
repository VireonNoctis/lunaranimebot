
import { Telegraf, Context } from "telegraf";
import cassandra from "cassandra-driver";
import { cluster, client } from "..";
import grantXP from "../lunarapi/grantXP";
import { EmbedBuilder, TextChannel } from "discord.js";

type LastMsg = {
  content: string;
  userId: string;
  time: number;
};

// optional lightweight in-memory cache (NOT Redis)
const lastMessageCache = new Map<string, LastMsg>();

export function registerTelegramXP(bot: Telegraf) {

  bot.on("text", async (ctx: Context) => {
    try {
      const message = ctx.message;
      if (!message || !("text" in message)) return;

      const userId = message.from.id.toString();
      const chatId = message.chat.id.toString();
      const content = message.text;

      // -----------------------------
      // MEMORY CACHE
      // -----------------------------
      const last = lastMessageCache.get(chatId);

      const lastContent = last?.content ?? "";
      const lastUserId = last?.userId ?? "";


      // -----------------------------
      // Cassandra user
      // -----------------------------
      const userInfo = (
        await cluster.execute(
          `SELECT * FROM lunarbot.accountlinks WHERE snowflakeid=${userId} ALLOW FILTERING;`
        )
      ).rows[0];

      if (!userInfo || !userInfo.verified) return;

      // -----------------------------
      // Core variables
      // -----------------------------
      let penalty = 1;
      const chance = Math.random() * 100;

      // -----------------------------
      // Length penalties
      // -----------------------------
      if (content.length > 500) {
        penalty -= 0.2;
        console.log("[TELEGRAM XP] penalty 500");
      }

      if (content.length > 1000) {
        penalty -= 0.4;
        console.log("[TELEGRAM XP] penalty 1000");
      }

      // -----------------------------
      // Spam / repetition checks
      // -----------------------------
      if (content === lastContent) {
        penalty -= 0.9;
        console.log("[TELEGRAM XP] same message penalty");
      }

      if (lastContent && content.startsWith(lastContent)) {
        penalty -= 0.3;
        console.log("[TELEGRAM XP] similar start penalty");
      }

      if (lastUserId === userId) {
        penalty -= 0.1;
        console.log("[TELEGRAM XP] same sender penalty");
      }

      // -----------------------------
      // Time penalty
      // -----------------------------
      if (!userInfo.last_message_time) {
        userInfo.last_message_time = Date.now() - 10000;
      }

      const timeSinceLastMessage = Date.now() - userInfo.last_message_time;

      if (timeSinceLastMessage > 1000) penalty -= 0.1;
      else if (timeSinceLastMessage > 5000) penalty -= 0.2;
      else if (timeSinceLastMessage > 10000) penalty -= 0.3;

      // -----------------------------
      // XP calculation (FIXED)
      // -----------------------------
      let xpAmount = 0;

      if (chance > 75) {
        xpAmount = Math.floor(((content.length / 10) * 1.5) * penalty);
      } else if (chance > 50) {
        xpAmount = Math.floor(((content.length / 10) * 1.25) * penalty);
      } else {
        xpAmount = Math.floor((content.length / 10) * penalty);
      }

      if (xpAmount <= 0) return;

      // -----------------------------
      // Grant XP (IMPORTANT STEP)
      // -----------------------------
      const xpGive = await grantXP(userInfo.lunaruuid, xpAmount);

      // -----------------------------
      // Update DB + Redis AFTER XP
      // -----------------------------
      await cluster.execute(
        `UPDATE lunarbot.accountlinks
         SET last_message_time=${Date.now()}
         WHERE snowflakeid=${userId}
         AND lunaruuid=${userInfo.lunaruuid}`
      );

      await redis.set(redisKey, JSON.stringify({
        content,
        userId,
        time: Date.now()
      }));

      // -----------------------------
      // DISCORD BRIDGE LOGGING
      // -----------------------------
      if (xpGive) {

        const logChannel = (await client.channels.fetch(
          "1499281835757404250"
        )) as TextChannel;

        const embedChannel = (await client.channels.fetch(
          "1514345477188092024"
        )) as TextChannel;

        // RAW LOG
        await logChannel.send(
`📨 [TELEGRAM XP SYSTEM]

User: ${userInfo.lunaruuid}
Name: ${xpGive.username}
XP: +${xpGive.xp_granted}
Chance: ${chance.toFixed(2)}
Penalty: ${penalty.toFixed(2)}
Delta: ${timeSinceLastMessage}ms
Msg: ${content.slice(0, 120)}`
        );

        // EMBED LOG
        const embed = new EmbedBuilder()
          .setColor(0x7C5CFF)
          .setAuthor({
            name: "🌙 Lunar XP (Telegram)",
            iconURL: client.user?.displayAvatarURL()
          })
          .setDescription(
`╭─ ✦ **Experience Gained (Telegram)**
│
│ 📨 Source: Telegram
│ 👤 ${xpGive.username}
│
│ ✨ +${xpGive.xp_granted} XP
│ 🎲 Chance: ${chance.toFixed(1)}
│ ⚖️ Penalty: ${penalty.toFixed(2)}
│ ⏱ ${timeSinceLastMessage}ms
│
│ 📊 Level: ${xpGive.new_level}
│ 📈 XP: ${xpGive.new_xp}
│
${
  xpGive.leveled_up
    ? `│ 🔥 LEVEL UP
│ ${xpGive.previous_level} → ${xpGive.new_level}
│`
    : ""
}
╰────────────`
          )
          .setFooter({
            text: "☾ Lunar XP • Telegram → Discord Bridge"
          })
          .setTimestamp();

        await embedChannel.send({ embeds: [embed] });
      }

    } catch (err) {
      console.error("[TELEGRAM XP ERROR]", err);
    }
  });
}