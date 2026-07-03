import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    type ChatInputCommandInteraction,
    ComponentType,
} from "discord.js";

import { cluster } from "..";
import { EMOJI } from "../Utilities/emoji";

const PAGE_SIZE = 10;

/* ----------------------------- MARK AS READ ----------------------------- */

async function markAsRead(rows: any[]) {
    if (!rows.length) return;

    const ids = rows.map(r => r.id);

    await cluster.execute(
        `
        UPDATE lunarbot.mentions
        SET is_read = true
        WHERE id IN (${ids.map(() => "?").join(",")})
        `,
        ids
    );
}

/* ----------------------------- INBOX COMMAND ----------------------------- */

export async function inbox(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild()) return;

    let page = 0;

    const fetchPage = async () => {
        const offset = page * PAGE_SIZE;

        const [rows]: any = await cluster.execute(
            `
            SELECT *
            FROM lunarbot.mentions
            WHERE mentioned_id = ?
              AND archived = false
              AND is_read = false
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            `,
            [interaction.user.id, PAGE_SIZE, offset]
        );

        const [[count]]: any = await cluster.execute(
            `
            SELECT COUNT(*) as total
            FROM lunarbot.mentions
            WHERE mentioned_id = ?
              AND archived = false
              AND is_read = false
            `,
            [interaction.user.id]
        );

        return { rows, total: count.total };
    };

    const buildEmbed = (rows: any[], total: number) => {
        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setAuthor({
                name: `${interaction.user.username}'s Inbox`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTitle(`${EMOJI.moon} Inbox`)
            .setFooter({
                text: `Lunar • ${total} unread mentions`,
            })
            .setTimestamp();

        if (!rows.length) {
            embed.setDescription(`${EMOJI.approved} No unread mentions.`);
            return embed;
        }

        const content = rows.map((r) => {
            const time = `<t:${Math.floor(
                new Date(r.created_at).getTime() / 1000
            )}:R>`;

            return [
                `${EMOJI.staff} <@${r.message_author_id}>`,
                `<#${r.channel_id}>`,
                `> Message ID: ${r.message_id}`,
                `> ${time}`,
                "━━━━━━━━━━━━━━━━━━━━━━",
            ].join("\n");
        });

        embed.setDescription(content.join("\n"));

        return embed;
    };

    const buildButtons = (page: number, total: number) => {
        const maxPage = Math.ceil(total / PAGE_SIZE) - 1;

        return new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId("prev")
                .setLabel("⬅")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page <= 0),

            new ButtonBuilder()
                .setCustomId("next")
                .setLabel("➡")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= maxPage),

            new ButtonBuilder()
                .setCustomId("refresh")
                .setLabel("🔄")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("archive_all")
                .setLabel("🧹")
                .setStyle(ButtonStyle.Danger)
        );
    };

    const { rows, total } = await fetchPage();

    const msg = await interaction.reply({
        embeds: [buildEmbed(rows, total)],
        components: [buildButtons(page, total)],
        fetchReply: true,
    });

    await markAsRead(rows);

    const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120_000,
    });

    collector.on("collect", async (btn) => {
        if (btn.user.id !== interaction.user.id) {
            return btn.reply({
                content: `${EMOJI.denied} Not your inbox.`,
                ephemeral: true,
            });
        }

        await btn.deferUpdate();

        if (btn.customId === "prev") page--;
        if (btn.customId === "next") page++;
        if (btn.customId === "refresh") page = page;

        if (btn.customId === "archive_all") {
            await cluster.execute(
                `
                UPDATE lunarbot.mentions
                SET archived = true
                WHERE mentioned_id = ?
                `,
                [interaction.user.id]
            );

            page = 0;
        }

        const updated = await fetchPage();

        await interaction.editReply({
            embeds: [buildEmbed(updated.rows, updated.total)],
            components: [buildButtons(page, updated.total)],
        });

        await markAsRead(updated.rows);
    });

    collector.on("end", async () => {
        await interaction.editReply({
            components: [],
        }).catch(() => {});
    });
}