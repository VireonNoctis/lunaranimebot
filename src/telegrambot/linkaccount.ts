import { Telegraf, Context } from "telegraf";
import generateCode from "../Utilities/generateCode";
import { client, cluster } from "..";
import { getAccountInfoThroughUsername } from "../lunarapi/accountInfo";
import { log } from "../Utilities/logger";
import sendNotification from "../lunarapi/sendNotification";

export default function registerLinkAccount(bot: Telegraf) {

  /**
   * /link <username>
   */
  bot.command("link", async (ctx: Context) => {
    try {
      const args = ctx.message && "text" in ctx.message
        ? ctx.message.text.split(" ").slice(1)
        : [];

      const username = args[0];
      if (!username) {
        return ctx.reply("Please provide a username.");
      }

      const telegramId = ctx.from?.id.toString();
      if (!telegramId) return;

      const code = generateCode(ctx.from.username ?? "user", username);

      const accountInfo = await getAccountInfoThroughUsername(username);
      if (!accountInfo) {
        return ctx.reply("Failed to fetch account info.");
      }

      const uuid = accountInfo.data.data.user_id;

      const doesAccountExist = await cluster.execute(
        `SELECT * FROM lunarbot.accountlinks WHERE lunaruuid=${uuid} AND snowflakeid=${telegramId}`
      );

      if (doesAccountExist.rows.length > 0) {
        return ctx.reply("This account is already linked.");
      }

      const notificationSent = await sendNotification(
        `Please send this back: /link-code ${code}`,
        username
      );

      if (!notificationSent) {
        return ctx.reply("Failed to send notification to Lunar account.");
      }

      await cluster.execute(
        `INSERT INTO lunarbot.accountlinks (snowflakeid, lunaruuid, verification_code, verified)
         VALUES (${telegramId}, ${uuid}, '${code}', false)`
      );

      return ctx.reply("Check your Lunar Anime notifications and complete verification.");
    } catch (err) {
      console.error(err);
      return ctx.reply("An error occurred while linking your account.");
    }
  });

  /**
   * /link-code <username>-<code>
   */
  bot.command("link-code", async (ctx: Context) => {
    try {
      const args = ctx.message && "text" in ctx.message
        ? ctx.message.text.split(" ").slice(1)
        : [];

      const input = args[0];
      if (!input) return ctx.reply("Usage: /link-code <username>-<code>");

      const broken = input.split("-");
      const username = broken[0];
      const providedCode = broken.slice(1).join("-");

      if (!username || !providedCode) {
        return ctx.reply("Invalid format. Use: /link-code <username>-<code>");
      }

      const telegramId = ctx.from?.id.toString();
      if (!telegramId) return;

      const newInfo = await getAccountInfoThroughUsername(username);
      if (!newInfo) return ctx.reply("Failed to fetch account info.");

      const uuid = newInfo.data.data.user_id;

      const result = await cluster.execute(
        `SELECT * FROM lunarbot.accountlinks
         WHERE snowflakeid=${telegramId} AND lunaruuid=${uuid}`
      );

      const accountRow = result.rows[0];
      if (!accountRow) {
        return ctx.reply("No pending verification found.");
      }

      if (accountRow.verified === true) {
        return ctx.reply("This account is already linked.");
      }

      const correctCode = accountRow.verification_code;

      if (correctCode !== providedCode) {
        return ctx.reply("Verification failed. Incorrect code.");
      }

      await cluster.execute(
        `UPDATE lunarbot.accountlinks
         SET verified=true
         WHERE snowflakeid=${telegramId} AND lunaruuid=${uuid}`
      );

      try {
        const guild = await client.guilds.fetch("1330574273760465029");
        const member = await guild.members.fetch(telegramId);
        await member.roles.add("1403390546164187217");
      } catch (e) {
        console.warn("Role assignment failed:", e);
      }

      log(
        "Account Verification",
        `telegram user ${telegramId} successfully linked lunar uuid ${uuid}`
      );

      return ctx.reply("Linked successfully ✅");
    } catch (err) {
      console.error(err);
      return ctx.reply("An error occurred during verification.");
    }
  });
}