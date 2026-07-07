import {
    Client,
    TextChannel,
    WebhookClient,
    Message,
    Attachment,
    GuildMember,
    ThreadChannel,
} from "discord.js";

import {
    Telegraf,
    Context
} from "telegraf";

import {
    promises as fs
} from "fs";

import path from "path";

import crypto from "crypto";


/**
 * ============================================================
 * CONFIGURATION
 * ============================================================
 */

export interface BridgeConfig {

    telegram: {
        chatId: number;

        /**
         * Telegram message split limit
         */
        maxMessageLength: number;
    };


    discord: {
        guildId: string;

        channelId: string;

        webhookName: string;

        /**
         * Discord message split limit
         */
        maxMessageLength: number;
    };


    storage: {
        file: string;

        /**
         * How often state is saved
         */
        saveInterval: number;
    };


    queue: {
        delay: number;

        maxRetries: number;
    };


    features: {

        replies: boolean;

        edits: boolean;

        deletes: boolean;

        threads: boolean;

        media: boolean;

        mentions: boolean;
    };


    debug: boolean;
}


export const CONFIG: BridgeConfig = {

    telegram: {
        chatId: -1003860971024,
        maxMessageLength: 4096,
    },


    discord: {
        guildId: "1330574273760465029",

        channelId: "1463041674501689502",

        webhookName: "TG_BRIDGE",

        maxMessageLength: 2000,
    },


    storage: {

        file: path.join(
            process.cwd(),
            "bridge-state.json"
        ),

        saveInterval: 60000,
    },


    queue: {

        delay: 250,

        maxRetries: 5,
    },


    features: {

        replies: true,

        edits: true,

        deletes: true,

        threads: true,

        media: true,

        mentions: true,
    },


    debug: false,
};



/**
 * ============================================================
 * TYPES
 * ============================================================
 */


export type BridgeJob = () => Promise<void>;



export interface MessageMapping {

    telegramId?: number;

    discordId?: string;


    /**
     * Timestamp created
     */
    createdAt: number;


    /**
     * Last update
     */
    updatedAt: number;
}



export interface BridgeState {


    /**
     * Telegram message id -> Discord message id
     */
    telegramToDiscord:
        Record<string, string>;



    /**
     * Discord message id -> Telegram message id
     */
    discordToTelegram:
        Record<string, number>;



    /**
     * Reply references
     */
    replies:
        Record<string, string>;



    /**
     * Known users
     */
    users:
        Record<string, CachedUser>;



    /**
     * Cached webhook
     */
    webhook?: {

        id: string;

        token: string;

    };

}



export interface CachedUser {

    id: string;

    username: string;

    avatar?: string;


    updatedAt: number;
}



export interface QueueItem {

    id: string;

    createdAt: number;

    retries: number;

    execute: BridgeJob;
}



export interface MediaItem {

    url: string;

    name?: string;

    type?:
        | "image"
        | "video"
        | "audio"
        | "document"
        | "voice";

}



export interface TelegramMessage {

    message_id: number;

    chat: {

        id: number;

    };


    from?: {

        id: number;

        username?: string;

        first_name?: string;

        last_name?: string;

    };


    text?: string;

    caption?: string;


    reply_to_message?: TelegramMessage;


    photo?: any[];

    video?: any;

    audio?: any;

    voice?: any;

    document?: any;

    sticker?: any;

}



/**
 * ============================================================
 * LOGGER
 * ============================================================
 */


export class Logger {


    private prefix = "[Bridge]";


    info(...args: unknown[]) {

        console.log(
            this.prefix,
            "[INFO]",
            ...args
        );

    }


    warn(...args: unknown[]) {

        console.warn(
            this.prefix,
            "[WARN]",
            ...args
        );

    }



    error(...args: unknown[]) {

        console.error(
            this.prefix,
            "[ERROR]",
            ...args
        );

    }



    debug(...args: unknown[]) {

        if (!CONFIG.debug)
            return;


        console.log(
            this.prefix,
            "[DEBUG]",
            ...args
        );

    }

}


export const logger = new Logger();




/**
 * ============================================================
 * UTILITIES
 * ============================================================
 */


export function sleep(
    ms:number
){

    return new Promise(
        resolve =>
            setTimeout(resolve, ms)
    );

}



export function generateId(){

    return crypto
        .randomBytes(8)
        .toString("hex");

}




export function truncate(
    text:string,
    length:number
){

    if(text.length <= length)
        return text;


    return (
        text.slice(
            0,
            length - 3
        )
        +
        "..."
    );

}





export function splitMessage(
    text:string,
    limit:number
):string[]{


    const chunks:string[] = [];


    let current = "";



    for(
        const line of text.split("\n")
    ){

        if(
            (
                current.length
                +
                line.length
            )
            >
            limit
        ){

            chunks.push(current);

            current = line;

        }

        else{

            current +=
                (
                    current
                        ? "\n"
                        : ""
                )
                +
                line;

        }

    }



    if(current)
        chunks.push(current);



    return chunks;

}





export function cleanMentions(
    text:string
){

    return text

        .replace(
            /@everyone/g,
            "@\u200beveryone"
        )

        .replace(
            /@here/g,
            "@\u200bhere"
        );

}





export function escapeMarkdown(
    text:string
){

    return text.replace(
        /([_*[\]()~`>#+-=|{}.!])/g,
        "\\$1"
    );

}





export function normalizeUsername(
    name?:string
){

    if(!name)
        return "Unknown User";


    return name
        .replace(
            /[^a-zA-Z0-9_\- ]/g,
            ""
        )
        .slice(
            0,
            32
        );

}




/**
 * ============================================================
 * STATE MANAGER FOUNDATION
 * ============================================================
 */


export class StateManager {


    private state:BridgeState = {

        telegramToDiscord:{},

        discordToTelegram:{},

        replies:{},

        users:{},

    };



    private dirty = false;



    async load(){

        try{


            const raw =
                await fs.readFile(
                    CONFIG.storage.file,
                    "utf8"
                );


            this.state =
                JSON.parse(raw);


            logger.info(
                "State loaded"
            );


        }

        catch{


            logger.info(
                "No state file found, creating new state"
            );


            await this.save();

        }

    }





    async save(){

        await fs.writeFile(

            CONFIG.storage.file,

            JSON.stringify(
                this.state,
                null,
                4
            )

        );


        this.dirty = false;

    }





    markDirty(){

        this.dirty = true;

    }





    get(){

        return this.state;

    }





    setTelegramDiscord(
        telegram:number,
        discord:string
    ){

        this.state.telegramToDiscord[
            String(telegram)
        ]
            =
        discord;


        this.markDirty();

    }





    getDiscordFromTelegram(
        telegram:number
    ){

        return (
            this.state.telegramToDiscord[
                String(telegram)
            ]
        );

    }





    setDiscordTelegram(
        discord:string,
        telegram:number
    ){

        this.state.discordToTelegram[
            discord
        ]
            =
        telegram;


        this.markDirty();

    }





    getTelegramFromDiscord(
        discord:string
    ){

        return (
            this.state.discordToTelegram[
                discord
            ]
        );

    }


}



export const stateManager =
    new StateManager();



/**
 * ============================================================
 * ASYNC QUEUE
 * ============================================================
 */


export class TaskQueue {


    private queue: QueueItem[] = [];

    private running = false;



    add(
        execute: BridgeJob
    ){

        this.queue.push({

            id: generateId(),

            createdAt: Date.now(),

            retries: 0,

            execute,

        });



        this.process();

    }




    private async process(){

        if(this.running)
            return;


        this.running = true;



        while(
            this.queue.length
        ){

            const item =
                this.queue.shift();



            if(!item)
                continue;



            try{


                await item.execute();



            }

            catch(error){


                logger.error(
                    "Queue task failed",
                    error
                );



                if(
                    item.retries
                    <
                    CONFIG.queue.maxRetries
                ){


                    item.retries++;


                    this.queue.push(item);


                    await sleep(
                        1000 *
                        item.retries
                    );

                }


            }



            await sleep(
                CONFIG.queue.delay
            );


        }



        this.running = false;

    }




    size(){

        return this.queue.length;

    }


}



export const taskQueue =
    new TaskQueue();





/**
 * ============================================================
 * RATE LIMITER
 * ============================================================
 */


export class RateLimiter {


    private requests =
        new Map<string, number[]>();



    constructor(
        private limit:number,
        private window:number
    ){}



    async wait(
        key:string
    ){

        const now =
            Date.now();



        let entries =
            this.requests.get(key)
            ??
            [];



        entries =
            entries.filter(
                time =>
                    now - time
                    <
                    this.window
            );



        if(
            entries.length
            >=
            this.limit
        ){

            const delay =
                this.window -
                (
                    now -
                    entries[0]
                );


            await sleep(
                delay
            );

        }



        entries.push(
            Date.now()
        );


        this.requests.set(
            key,
            entries
        );

    }


}



export const telegramLimiter =
    new RateLimiter(
        25,
        1000
    );



export const discordLimiter =
    new RateLimiter(
        45,
        1000
    );





/**
 * ============================================================
 * GENERIC CACHE
 * ============================================================
 */


export class Cache<T>{


    private data =
        new Map<
            string,
            {
                value:T;
                expires:number;
            }
        >();



    constructor(
        private ttl:number
    ){}




    set(
        key:string,
        value:T
    ){

        this.data.set(
            key,
            {

                value,

                expires:
                    Date.now()
                    +
                    this.ttl,

            }
        );

    }




    get(
        key:string
    ):T|undefined{


        const item =
            this.data.get(key);



        if(!item)
            return undefined;



        if(
            Date.now()
            >
            item.expires
        ){

            this.data.delete(key);

            return undefined;

        }



        return item.value;

    }





    delete(
        key:string
    ){

        this.data.delete(key);

    }




    clear(){

        this.data.clear();

    }



}





/**
 * ============================================================
 * USER CACHE
 * ============================================================
 */


export interface UserProfile {

    id:string;

    username:string;

    avatar?:string;

}



export class UserCache {


    private cache =
        new Cache<UserProfile>(
            1000 *
            60 *
            60
        );




    set(
        user:UserProfile
    ){

        this.cache.set(
            user.id,
            user
        );

    }





    get(
        id:string
    ){

        return this.cache.get(id);

    }



}





export const userCache =
    new UserCache();







/**
 * ============================================================
 * MESSAGE CACHE
 * ============================================================
 */


export interface CachedMessage {


    id:string;


    platform:
        |
        "telegram"
        |
        "discord";



    mappedId:string|number;



    content:string;



    timestamp:number;



}





export class MessageCache {


    private cache =
        new Cache<CachedMessage>(
            1000 *
            60 *
            60 *
            24
        );





    set(
        message:CachedMessage
    ){

        this.cache.set(
            message.id,
            message
        );


    }





    get(
        id:string
    ){

        return this.cache.get(id);

    }





    remove(
        id:string
    ){

        this.cache.delete(id);

    }


}



export const messageCache =
    new MessageCache();






/**
 * ============================================================
 * MEDIA CACHE
 * ============================================================
 */


export interface CachedMedia {


    id:string;


    url:string;


    type:string;


    created:number;


}




export const mediaCache =
    new Cache<CachedMedia>(
        1000 *
        60 *
        30
    );







/**
 * ============================================================
 * DUPLICATE DETECTION
 * ============================================================
 */


export class DuplicateDetector {


    private hashes =
        new Set<string>();



    createHash(
        content:string
    ){

        return crypto
            .createHash("sha256")
            .update(content)
            .digest("hex");

    }




    exists(
        content:string
    ){

        const hash =
            this.createHash(
                content
            );


        return this.hashes.has(hash);

    }




    remember(
        content:string
    ){

        const hash =
            this.createHash(
                content
            );


        this.hashes.add(hash);



        /**
         * Cleanup old hashes
         */
        if(
            this.hashes.size
            >
            5000
        ){

            const first =
                this.hashes
                    .values()
                    .next()
                    .value;


            if(first)
                this.hashes.delete(first);

        }


    }


}




export const duplicateDetector =
    new DuplicateDetector();





/**
 * ============================================================
 * CLEANUP LOOP
 * ============================================================
 */


export function startCacheCleanup(){


    setInterval(
        ()=>{


            userCache["cache"].clear();



        },
        1000 *
        60 *
        60
    );


}



/**
 * ============================================================
 * CLIENT CONTEXT
 * ============================================================
 */


export interface BridgeClients {

    discord: Client;

    telegram: Telegraf;

}



export class BridgeContext {


    private clients:
        BridgeClients | null =
        null;



    setClients(
        clients:BridgeClients
    ){

        this.clients = clients;

    }



    get(){

        if(!this.clients)
            throw new Error(
                "Bridge clients not initialized"
            );


        return this.clients;

    }



}



export const bridgeContext =
    new BridgeContext();





/**
 * ============================================================
 * WEBHOOK MANAGER
 * ============================================================
 */


export class WebhookManager {


    private webhook:
        WebhookClient | null =
        null;



    async get(){

        if(this.webhook)
            return this.webhook;



        const {
            discord
        } =
        bridgeContext.get();



        const guild =
            discord.guilds.cache.get(
                CONFIG.discord.guildId
            );



        if(!guild)
            throw new Error(
                "Discord guild not found"
            );



        const channel =
            guild.channels.cache.get(
                CONFIG.discord.channelId
            );



        if(
            !channel
            ||
            !(channel instanceof TextChannel)
        ){

            throw new Error(
                "Discord channel invalid"
            );

        }





        const hooks =
            await channel.fetchWebhooks();



        const existing =
            hooks.find(
                hook =>
                    hook.name
                    ===
                    CONFIG.discord.webhookName
            );



        if(
            existing
            &&
            existing.token
        ){

            this.webhook =
                new WebhookClient({

                    id:
                        existing.id,

                    token:
                        existing.token,

                });



            stateManager
                .get()
                .webhook =
                {

                    id:
                        existing.id,

                    token:
                        existing.token,

                };



            return this.webhook;

        }





        const created =
            await channel.createWebhook({

                name:
                    CONFIG.discord.webhookName,

            });





        this.webhook =
            new WebhookClient({

                id:
                    created.id,

                token:
                    created.token!,

            });




        stateManager
            .get()
            .webhook =
            {

                id:
                    created.id,

                token:
                    created.token!,

            };



        await stateManager.save();



        return this.webhook;


    }





    async reset(){

        this.webhook = null;

        logger.warn(
            "Webhook cache cleared"
        );

    }


}



export const webhookManager =
    new WebhookManager();






/**
 * ============================================================
 * TELEGRAM MANAGER
 * ============================================================
 */


export class TelegramManager {



    get bot(){

        return bridgeContext
            .get()
            .telegram;

    }




    async sendMessage(
        text:string,
        options:any = {}
    ){


        await telegramLimiter.wait(
            "sendMessage"
        );



        const chunks =
            splitMessage(
                text,
                CONFIG.telegram.maxMessageLength
            );



        let last;



        for(
            const chunk of chunks
        ){


            last =
                await this.bot.telegram.sendMessage(

                    CONFIG.telegram.chatId,

                    chunk,

                    options

                );

        }



        return last;


    }





    async deleteMessage(
        messageId:number
    ){


        await telegramLimiter.wait(
            "deleteMessage"
        );



        return this.bot.telegram
            .deleteMessage(

                CONFIG.telegram.chatId,

                messageId

            )
            .catch(
                ()=>false
            );


    }





    async editMessage(
        messageId:number,
        text:string
    ){


        await telegramLimiter.wait(
            "editMessage"
        );



        return this.bot.telegram
            .editMessageText(

                CONFIG.telegram.chatId,

                messageId,

                undefined,

                text

            )
            .catch(
                ()=>false
            );


    }



}



export const telegramManager =
    new TelegramManager();







/**
 * ============================================================
 * DISCORD MANAGER
 * ============================================================
 */


export class DiscordManager {



    get client(){

        return bridgeContext
            .get()
            .discord;

    }




    async getChannel(){

        const guild =
            this.client.guilds.cache.get(
                CONFIG.discord.guildId
            );



        if(!guild)
            return null;



        const channel =
            guild.channels.cache.get(
                CONFIG.discord.channelId
            );



        if(
            !channel
            ||
            !(channel instanceof TextChannel)
        )
            return null;



        return channel;


    }





    async sendWebhook(
        username:string,
        content:string,
        avatar?:string,
        files?:string[]
    ){


        await discordLimiter.wait(
            "webhook"
        );



        const webhook =
            await webhookManager.get();



        return webhook.send({

            username,

            avatarURL:
                avatar,

            content:
                content ||

                "[media]",


            files:
                files || [],


            allowedMentions:{
                parse:[]
            }

        });


    }





    async fetchMessage(
        id:string
    ){

        const channel =
            await this.getChannel();



        if(!channel)
            return null;



        return channel.messages
            .fetch(id)
            .catch(
                ()=>null
            );

    }




}




export const discordManager =
    new DiscordManager();







/**
 * ============================================================
 * ERROR RECOVERY
 * ============================================================
 */


export class RecoveryManager {



    async execute<T>(
        name:string,
        action:()=>Promise<T>,
        retries = 3
    ):Promise<T|null>{


        for(
            let i = 0;
            i < retries;
            i++
        ){

            try{

                return await action();

            }

            catch(error){

                logger.warn(
                    name,
                    "failed attempt",
                    i + 1
                );


                await sleep(
                    1000 *
                    (i + 1)
                );


            }


        }



        logger.error(
            name,
            "failed permanently"
        );



        return null;


    }



}



export const recoveryManager =
    new RecoveryManager();







/**
 * ============================================================
 * INITIALIZATION
 * ============================================================
 */


export async function initializeBridge(
    discord:Client,
    telegram:Telegraf
){


    bridgeContext.setClients({

        discord,

        telegram,

    });



    await stateManager.load();



    startCacheCleanup();



    setInterval(

        async ()=>{

            try{

                await stateManager.save();

            }

            catch{}

        },

        CONFIG.storage.saveInterval

    );



    logger.info(
        "Bridge initialized"
    );

}

/**
 * ============================================================
 * MARKDOWN / FORMAT CONVERSION 
 * ============================================================
 */




export class MarkdownConverter {


    discordToTelegram(
        text:string
    ){


        if(!text)
            return "";



        let output =
            text;



        /**
         * Escape Telegram MarkdownV2
         */
        output =
            output.replace(
                /([_*\[\]()~`>#+\-=|{}.!])/g,
                "\\$1"
            );



        /**
         * Bold
         */
        output =
            output.replace(
                /\*\*(.*?)\*\*/g,
                "*$1*"
            );



        /**
         * Italic
         */
        output =
            output.replace(
                /\*(.*?)\*/g,
                "_$1_"
            );



        /**
         * Code blocks
         */
        output =
            output.replace(
                /```([\s\S]*?)```/g,
                "```\n$1\n```"
            );



        /**
         * Spoilers
         */
        output =
            output.replace(
                /\|\|(.*?)\|\|/g,
                "||$1||"
            );



        return output.trim();

    }





    telegramToDiscord(
        text:string
    ){


        if(!text)
            return "";



        let output =
            text;



        /**
         * Bold
         */
        output =
            output.replace(
                /\*(.*?)\*/g,
                "**$1**"
            );



        /**
         * Italic
         */
        output =
            output.replace(
                /_(.*?)_/g,
                "*$1*"
            );



        /**
         * Underline
         */
        output =
            output.replace(
                /__(.*?)__/g,
                "__$1__"
            );



        /**
         * Strike
         */
        output =
            output.replace(
                /~(.*?)~/g,
                "~~$1~~"
            );



        return output.trim();

    }




    htmlToDiscord(
        html:string
    ){


        if(!html)
            return "";



        return html

            .replace(
                /<b>(.*?)<\/b>/gi,
                "**$1**"
            )

            .replace(
                /<strong>(.*?)<\/strong>/gi,
                "**$1**"
            )

            .replace(
                /<i>(.*?)<\/i>/gi,
                "*$1*"
            )

            .replace(
                /<em>(.*?)<\/em>/gi,
                "*$1*"
            )

            .replace(
                /<code>(.*?)<\/code>/gi,
                "`$1`"
            )

            .replace(
                /<s>(.*?)<\/s>/gi,
                "~~$1~~"
            )

            .replace(
                /<del>(.*?)<\/del>/gi,
                "~~$1~~"
            )

            .replace(
                /<[^>]*>/g,
                ""
            );

    }


}



export const markdownConverter =
    new MarkdownConverter();







/**
 * ============================================================
 * MENTION CONVERTER
 * ============================================================
 */


export class MentionConverter {


    discordToTelegram(
        text:string
    ){


        return text.replace(
            /<@!?(\d+)>/g,
            (_, id)=>{

                return `@user_${id}`;

            }
        );

    }





    telegramToDiscord(
        text:string
    ){


        return text.replace(
            /@([a-zA-Z0-9_]+)/g,
            (_, username)=>{

                return `@${username}`;

            }
        );


    }


}



export const mentionConverter =
    new MentionConverter();








/**
 * ============================================================
 * EMOJI HANDLER
 * ============================================================
 */


export class EmojiConverter {



    private customEmoji =
        new Map<string,string>();




    register(
        discordEmoji:string,
        telegramEmoji:string
    ){

        this.customEmoji.set(
            discordEmoji,
            telegramEmoji
        );

    }




    discordToTelegram(
        text:string
    ){


        let result =
            text;



        for(
            const [
                discord,
                telegram
            ]
            of this.customEmoji
        ){

            result =
                result.replaceAll(
                    discord,
                    telegram
                );

        }



        return result;

    }




}



export const emojiConverter =
    new EmojiConverter();








/**
 * ============================================================
 * MESSAGE FORMATTER
 * ============================================================
 */


export interface FormattedMessage {


    content:string;


    username?:string;


    avatar?:string;


    replyId?:string|number;


}





export class MessageFormatter {


    discordMessage(
        message:Message
    ):FormattedMessage{


        let content =
            message.content;



        if(message.embeds.length){

            const embeds =
                message.embeds
                    .map(
                        embed =>
                        {

                            let value = "";

                            if(embed.title)
                                value +=
                                    `**${embed.title}**\n`;


                            if(embed.description)
                                value +=
                                    embed.description;



                            if(embed.url)
                                value +=
                                    `\n${embed.url}`;


                            return value;

                        }
                    )
                    .filter(Boolean)
                    .join("\n\n");



            if(embeds)
                content +=
                    `\n\n${embeds}`;

        }





        content =
            markdownConverter
                .discordToTelegram(
                    content
                );



        content =
            mentionConverter
                .discordToTelegram(
                    content
                );



        content =
            emojiConverter
                .discordToTelegram(
                    content
                );




        return {

            content:
                cleanMentions(content),


            username:
                normalizeUsername(
                    message.author.username
                ),


            avatar:
                message.author.displayAvatarURL(),

            replyId:
                message.reference
                    ?.messageId

        };


    }





    telegramMessage(
        message:TelegramMessage
    ):FormattedMessage{


        let content =
            message.text
            ??
            message.caption
            ??
            "";



        content =
            markdownConverter
                .telegramToDiscord(
                    content
                );



        content =
            mentionConverter
                .telegramToDiscord(
                    content
                );



        return {

            content:
                cleanMentions(content),


            username:
                normalizeUsername(

                    message.from?.username
                    ??
                    message.from?.first_name

                ),

            replyId:
                message.reply_to_message
                    ?.message_id

        };


    }



}



export const messageFormatter =
    new MessageFormatter();


/**
 * ============================================================
 * MEDIA HANDLER
 * ============================================================
 */


export interface MediaResult {

    urls:string[];

    type:
        |
        "image"
        |
        "video"
        |
        "audio"
        |
        "voice"
        |
        "document"
        |
        "unknown";

}





export class MediaManager {



    /**
     * Discord attachment detection
     */
    detectDiscordType(
        attachment:Attachment
    ):MediaResult["type"]{


        const contentType =
            attachment.contentType
            ??
            "";



        if(
            contentType.startsWith(
                "image/"
            )
        )
            return "image";



        if(
            contentType.startsWith(
                "video/"
            )
        )
            return "video";



        if(
            contentType.startsWith(
                "audio/"
            )
        )
            return "audio";



        if(
            attachment.name
                ?.endsWith(
                    ".ogg"
                )
        )
            return "voice";



        return "document";

    }







    /**
     * Discord -> Telegram
     */
    async discordAttachments(
        message:Message
    ):Promise<MediaResult>{


        const urls =
            [...message.attachments.values()]
                .map(
                    file =>
                        file.url
                );



        if(!urls.length){

            return {

                urls:[],

                type:"unknown"

            };

        }



        const first =
            message.attachments
                .first();



        return {

            urls,

            type:
                this.detectDiscordType(
                    first!

                )

        };


    }








    /**
     * Telegram -> Discord
     */
    async telegramAttachments(
        message:TelegramMessage,
        bot:Telegraf
    ):Promise<MediaResult>{


        const urls:string[] = [];



        let type:
            MediaResult["type"]
            =
            "unknown";




        async function resolve(
            fileId:string
        ){

            const file =
                await bot.telegram
                    .getFile(
                        fileId
                    );


            if(
                file.file_path
            ){

                urls.push(

                    `https://api.telegram.org/file/bot${bot.telegram.token}/${file.file_path}`

                );

            }

        }






        if(message.photo){

            type="image";


            const photo =
                message.photo[
                    message.photo.length - 1
                ];


            await resolve(
                photo.file_id
            );

        }




        else if(message.video){

            type="video";


            await resolve(
                message.video.file_id
            );

        }




        else if(message.audio){

            type="audio";


            await resolve(
                message.audio.file_id
            );

        }




        else if(message.voice){

            type="voice";


            await resolve(
                message.voice.file_id
            );

        }




        else if(message.document){

            type="document";


            await resolve(
                message.document.file_id
            );

        }





        return {

            urls,

            type

        };


    }



}





export const mediaManager =
    new MediaManager();









/**
 * ============================================================
 * MEDIA ALBUM MANAGER
 * ============================================================
 */


interface Album {

    id:string;

    items:string[];

    created:number;

    timer?:NodeJS.Timeout;

}




export class AlbumManager {



    private albums =
        new Map<
            string,
            Album
        >();




    add(
        id:string,
        url:string,
        callback:
            (urls:string[])=>Promise<void>
    ){



        let album =
            this.albums.get(id);



        if(!album){

            album = {

                id,

                items:[],

                created:
                    Date.now()

            };


            this.albums.set(
                id,
                album
            );



            album.timer =
                setTimeout(
                    async ()=>{

                        const current =
                            this.albums.get(
                                id
                            );


                        if(!current)
                            return;



                        await callback(
                            current.items
                        );



                        this.albums.delete(
                            id
                        );



                    },
                    1500
                );

        }




        album.items.push(
            url
        );


    }






    clear(
        id:string
    ){

        const album =
            this.albums.get(
                id
            );


        if(
            album?.timer
        ){

            clearTimeout(
                album.timer
            );

        }



        this.albums.delete(
            id
        );

    }



}





export const albumManager =
    new AlbumManager();









/**
 * ============================================================
 * STICKER HANDLER
 * ============================================================
 */


export class StickerManager {



    async handleTelegramSticker(
        message:TelegramMessage,
        bot:Telegraf
    ){


        if(
            !message.sticker
        )
            return null;



        const file =
            await bot.telegram
                .getFile(
                    message.sticker.file_id
                );



        if(
            !file.file_path
        )
            return null;




        return {

            url:
                `https://api.telegram.org/file/bot${bot.telegram.token}/${file.file_path}`,


            emoji:
                message.sticker.emoji
                ??
                "📝"

        };


    }



}




export const stickerManager =
    new StickerManager();









/**
 * ============================================================
 * MEDIA SENDING ROUTER
 * ============================================================
 */


export class MediaRouter {



    async sendToTelegram(
        media:MediaResult,
        caption:string
    ){


        const bot =
            bridgeContext
                .get()
                .telegram;



        for(
            const url of media.urls
        ){


            switch(media.type){


                case "image":

                    await bot.telegram
                        .sendPhoto(

                            CONFIG.telegram.chatId,

                            url,

                            {
                                caption
                            }

                        );

                    break;




                case "video":

                    await bot.telegram
                        .sendVideo(

                            CONFIG.telegram.chatId,

                            url,

                            {
                                caption
                            }

                        );

                    break;





                case "audio":

                    await bot.telegram
                        .sendAudio(

                            CONFIG.telegram.chatId,

                            url,

                            {
                                caption
                            }

                        );

                    break;





                case "voice":

                    await bot.telegram
                        .sendVoice(

                            CONFIG.telegram.chatId,

                            url,

                            {
                                caption
                            }

                        );

                    break;





                default:

                    await bot.telegram
                        .sendDocument(

                            CONFIG.telegram.chatId,

                            url,

                            {
                                caption
                            }

                        );

                    break;

            }


        }


    }







    async sendToDiscord(
        media:MediaResult,
        username:string,
        caption:string
    ){


        await discordManager
            .sendWebhook(

                username,

                caption,

                undefined,

                media.urls

            );


    }



}



export const mediaRouter =
    new MediaRouter();


/**
 * ============================================================
 * TELEGRAM -> DISCORD RELAY ENGINE
 * ============================================================
 */


export class TelegramRelay {



    async handle(
        ctx:Context
    ){


        const message:any =
            ctx.message;



        if(
            !message
            ||
            message.chat.id
            !==
            CONFIG.telegram.chatId
        )
            return;



        const formatted =
            messageFormatter
                .telegramMessage(
                    message
                );



        if(
            duplicateDetector
                .exists(
                    formatted.content
                )
        )
            return;



        duplicateDetector
            .remember(
                formatted.content
            );




        let content =
            formatted.content
            ||
            "[media]";




        /**
         * Reply handling
         */
        let replyId:string|undefined;



        if(
            formatted.replyId
        ){

            replyId =
                stateManager
                    .getDiscordFromTelegram(
                        formatted.replyId
                    );

        }




        if(
            replyId
        ){

            content =
                `↪ Replying to message\n\n${content}`;

        }






        const media =
            await mediaManager
                .telegramAttachments(
                    message,
                    ctx.telegram as any
                );




        const sent =
            await discordManager
                .sendWebhook(

                    formatted.username
                    ??
                    "Telegram User",


                    content,


                    await this.getAvatar(
                        ctx,
                        message.from?.id
                    ),


                    media.urls.length
                        ?
                        media.urls
                        :
                        undefined

                );





        stateManager
            .setTelegramDiscord(
                message.message_id,
                sent.id
            );



        stateManager
            .setDiscordTelegram(
                sent.id,
                message.message_id
            );





        messageCache.set({

            id:
                String(
                    message.message_id
                ),


            platform:
                "telegram",


            mappedId:
                sent.id,


            content,


            timestamp:
                Date.now()

        });



        await stateManager.save();


    }







    private async getAvatar(
        ctx:Context,
        id:number
    ){


        const cached =
            userCache.get(
                String(id)
            );



        if(
            cached?.avatar
        )
            return cached.avatar;





        try{


            const photos =
                await ctx.telegram
                    .getUserProfilePhotos(
                        id,
                        0,
                        1
                    );



            const fileId =
                photos.photos?.[0]?.[0]
                    ?.file_id;



            if(
                !fileId
            )
                return undefined;



            const file =
                await ctx.telegram
                    .getFile(
                        fileId
                    );



            if(
                !file.file_path
            )
                return undefined;




            const url =
                `https://api.telegram.org/file/bot${ctx.telegram.token}/${file.file_path}`;





            userCache.set({

                id:String(id),


                username:
                    "Telegram User",


                avatar:url

            });




            return url;


        }

        catch{

            return undefined;

        }


    }



}







export const telegramRelay =
    new TelegramRelay();










/**
 * ============================================================
 * DISCORD -> TELEGRAM RELAY ENGINE
 * ============================================================
 */


export class DiscordRelay {



    async handle(
        message:Message
    ){


        if(
            message.channel.id
            !==
            CONFIG.discord.channelId
        )
            return;




        /**
         * Ignore bridge messages
         */
        if(
            message.webhookId
        )
            return;



        if(
            message.author.bot
        )
            return;






        const formatted =
            messageFormatter
                .discordMessage(
                    message
                );




        if(
            duplicateDetector
                .exists(
                    formatted.content
                )
        )
            return;




        duplicateDetector
            .remember(
                formatted.content
            );






        let content =
            formatted.content
            ||
            "[media]";






        /**
         * Reply mapping
         */
        let replyTo:number|undefined;



        if(
            formatted.replyId
        ){

            replyTo =
                stateManager
                    .getTelegramFromDiscord(
                        String(
                            formatted.replyId
                        )
                    );

        }







        const bot =
            bridgeContext
                .get()
                .telegram;






        let sent;



        const media =
            await mediaManager
                .discordAttachments(
                    message
                );







        if(
            media.urls.length
        ){



            await mediaRouter
                .sendToTelegram(

                    media,

                    content

                );



            /**
             * Telegram API does not always
             * return grouped ids.
             * Save original relation.
             */

            sent =
                await bot.telegram
                    .sendMessage(

                        CONFIG.telegram.chatId,

                        content,

                        replyTo
                            ?
                            {
                                reply_to_message_id:
                                    replyTo
                            }
                            :
                            undefined

                    );



        }

        else{


            sent =
                await bot.telegram
                    .sendMessage(

                        CONFIG.telegram.chatId,

                        content,

                        replyTo
                            ?
                            {
                                reply_to_message_id:
                                    replyTo
                            }
                            :
                            undefined

                    );


        }








        stateManager
            .setDiscordTelegram(

                message.id,

                sent.message_id

            );



        stateManager
            .setTelegramDiscord(

                sent.message_id,

                message.id

            );






        messageCache.set({

            id:
                message.id,


            platform:
                "discord",


            mappedId:
                sent.message_id,


            content,


            timestamp:
                Date.now()

        });





        await stateManager.save();



    }



}





export const discordRelay =
    new DiscordRelay();









/**
 * ============================================================
 * EVENT BINDINGS
 * ============================================================
 */


export function registerRelayEvents(){



    const {
        discord,
        telegram
    } =
    bridgeContext.get();






    telegram.on(
        "message",
        async ctx => {


            await taskQueue.add(
                ()=>telegramRelay.handle(ctx)
            );


        }
    );






    discord.on(
        "messageCreate",
        async message=>{


            await taskQueue.add(
                ()=>discordRelay.handle(message)
            );


        }
    );





    logger.info(
        "Relay events registered"
    );


}


/**
 * ============================================================
 * MESSAGE UPDATE / DELETE SYNCHRONIZATION
 * ============================================================
 */



export class SyncManager {



    /**
     * ========================================================
     * DISCORD EDIT -> TELEGRAM EDIT
     * ========================================================
     */


    async discordEdit(
        oldMessage:Message,
        newMessage:Message
    ){


        if(
            !CONFIG.features.edits
        )
            return;



        if(
            newMessage.channel.id
            !==
            CONFIG.discord.channelId
        )
            return;




        const telegramId =
            stateManager
                .getTelegramFromDiscord(
                    newMessage.id
                );



        if(
            !telegramId
        )
            return;






        const formatted =
            messageFormatter
                .discordMessage(
                    newMessage
                );





        await telegramManager
            .editMessage(

                telegramId,

                formatted.content
                ||
                "[edited message]"

            );





        logger.debug(
            "Discord message edited",
            newMessage.id
        );


    }









    /**
     * ========================================================
     * TELEGRAM EDIT -> DISCORD EDIT
     * ========================================================
     */


    async telegramEdit(
        message:TelegramMessage
    ){



        if(
            !CONFIG.features.edits
        )
            return;





        const discordId =
            stateManager
                .getDiscordFromTelegram(
                    message.message_id
                );




        if(
            !discordId
        )
            return;






        const discordMessage =
            await discordManager
                .fetchMessage(
                    discordId
                );



        if(
            !discordMessage
        )
            return;





        const formatted =
            messageFormatter
                .telegramMessage(
                    message
                );






        await discordMessage
            .edit({

                content:
                    formatted.content
                    ||
                    "[edited message]"

            })
            .catch(
                ()=>{}
            );





    }











    /**
     * ========================================================
     * DISCORD DELETE -> TELEGRAM DELETE
     * ========================================================
     */


    async discordDelete(
        message:Message
    ){



        if(
            !CONFIG.features.deletes
        )
            return;




        const telegramId =
            stateManager
                .getTelegramFromDiscord(
                    message.id
                );



        if(
            !telegramId
        )
            return;





        await telegramManager
            .deleteMessage(
                telegramId
            );





        delete stateManager
            .get()
            .discordToTelegram[
                message.id
            ];



        await stateManager.save();



    }









    /**
     * ========================================================
     * TELEGRAM DELETE -> DISCORD DELETE
     * ========================================================
     *
     * Telegram bots normally cannot receive
     * delete events from ordinary chats.
     *
     * This is used when a Telegram admin
     * event source provides deleted messages.
     *
     */


    async telegramDelete(
        telegramId:number
    ){



        const discordId =
            stateManager
                .getDiscordFromTelegram(
                    telegramId
                );



        if(
            !discordId
        )
            return;






        const message =
            await discordManager
                .fetchMessage(
                    discordId
                );



        if(
            message
        ){

            await message
                .delete()
                .catch(
                    ()=>{}
                );

        }





        delete stateManager
            .get()
            .telegramToDiscord[
                String(
                    telegramId
                )
            ];



        await stateManager.save();


    }



}





export const syncManager =
    new SyncManager();









/**
 * ============================================================
 * SYNC EVENTS
 * ============================================================
 */



export function registerSyncEvents(){


    const {
        discord,
        telegram
    } =
    bridgeContext.get();







    discord.on(
        "messageUpdate",
        async(
            oldMessage,
            newMessage
        )=>{


            await taskQueue.add(

                ()=>syncManager
                    .discordEdit(
                        oldMessage as Message,
                        newMessage as Message
                    )

            );


        }
    );







    discord.on(
        "messageDelete",
        async message=>{


            await taskQueue.add(

                ()=>syncManager
                    .discordDelete(
                        message as Message
                    )

            );


        }
    );







    /**
     * Telegram edited messages
     */
    telegram.on(
        "edited_message",
        async ctx=>{


            const message =
                ctx.update
                    .edited_message as any;



            await taskQueue.add(

                ()=>syncManager
                    .telegramEdit(
                        message
                    )

            );


        }
    );







    logger.info(
        "Synchronization events registered"
    );


}









/**
 * ============================================================
 * REPLY THREAD MANAGER
 * ============================================================
 */



export class ReplyManager {



    /**
     * Creates reply mapping
     */


    create(
        source:string|number,
        target:string|number
    ){


        stateManager
            .get()
            .replies[
                String(source)
            ]
            =
            String(target);



        stateManager
            .markDirty();


    }






    resolve(
        id:string|number
    ){


        return stateManager
            .get()
            .replies[
                String(id)
            ];

    }







    remove(
        id:string|number
    ){


        delete stateManager
            .get()
            .replies[
                String(id)
            ];



        stateManager
            .markDirty();


    }



}





export const replyManager =
    new ReplyManager();


/**
 * ============================================================
 * THREAD / TOPIC BRIDGE SYSTEM
 * ============================================================
 */



export interface ThreadMapping {

    telegramTopicId:number;

    discordThreadId:string;

    created:number;

}





export class ThreadManager {



    private mappings =
        new Map<
            number,
            string
        >();





    register(
        telegramTopic:number,
        discordThread:string
    ){


        this.mappings.set(
            telegramTopic,
            discordThread
        );


    }






    getDiscordThread(
        telegramTopic:number
    ){


        return this.mappings.get(
            telegramTopic
        );

    }






    getTelegramTopic(
        discordThread:string
    ){


        for(
            const [
                telegram,
                discord
            ]
            of this.mappings
        ){

            if(
                discord
                ===
                discordThread
            )
                return telegram;

        }


        return undefined;

    }







    removeTelegram(
        id:number
    ){

        this.mappings.delete(id);

    }







    removeDiscord(
        id:string
    ){

        for(
            const [
                telegram,
                discord
            ]
            of this.mappings
        ){

            if(
                discord
                ===
                id
            ){

                this.mappings.delete(
                    telegram
                );

            }

        }

    }



}



export const threadManager =
    new ThreadManager();









/**
 * ============================================================
 * DISCORD THREAD CREATION
 * ============================================================
 */


export class DiscordThreadBridge {



    async createThread(
        message:Message,
        name:string
    ){



        if(
            !CONFIG.features.threads
        )
            return null;





        if(
            !message.channel
            ||
            !("threads" in message.channel)
        )
            return null;






        const thread =
            await message
                .startThread({

                    name:
                        name.slice(
                            0,
                            100
                        ),

                    autoArchiveDuration:
                        1440

                })
                .catch(
                    ()=>null
                );




        return thread;


    }





}



export const discordThreadBridge =
    new DiscordThreadBridge();









/**
 * ============================================================
 * TELEGRAM TOPIC SUPPORT
 * ============================================================
 */



export class TelegramTopicBridge {



    async sendToTopic(
        topicId:number,
        text:string
    ){


        const bot =
            bridgeContext
                .get()
                .telegram;



        return bot.telegram
            .sendMessage(

                CONFIG.telegram.chatId,

                text,

                {

                    message_thread_id:
                        topicId

                }

            );


    }



}



export const telegramTopicBridge =
    new TelegramTopicBridge();









/**
 * ============================================================
 * MESSAGE CHUNKING ENGINE
 * ============================================================
 */


export class ChunkManager {



    splitDiscord(
        text:string
    ){


        return splitMessage(

            text,

            CONFIG.discord.maxMessageLength

        );


    }






    splitTelegram(
        text:string
    ){


        return splitMessage(

            text,

            CONFIG.telegram.maxMessageLength

        );


    }








    async sendDiscordChunks(
        content:string,
        username:string,
        avatar?:string
    ){



        const chunks =
            this.splitDiscord(
                content
            );



        const results =
            [];




        for(
            const chunk of chunks
        ){


            const result =
                await discordManager
                    .sendWebhook(

                        username,

                        chunk,

                        avatar

                    );


            results.push(
                result
            );


        }



        return results;


    }







    async sendTelegramChunks(
        content:string
    ){



        return telegramManager
            .sendMessage(
                content
            );


    }




}



export const chunkManager =
    new ChunkManager();









/**
 * ============================================================
 * LOOP PREVENTION SYSTEM
 * ============================================================
 */



export class LoopGuard {



    private recent =
        new Map<
            string,
            number
        >();






    mark(
        id:string
    ){


        this.recent.set(
            id,
            Date.now()
        );


    }






    check(
        id:string
    ){


        const time =
            this.recent.get(
                id
            );



        if(
            !time
        )
            return false;





        if(
            Date.now()
            -
            time
            >
            30000
        ){

            this.recent.delete(
                id
            );

            return false;

        }




        return true;


    }




}




export const loopGuard =
    new LoopGuard();









/**
 * ============================================================
 * BRIDGE HEALTH MONITOR
 * ============================================================
 */


export class HealthMonitor {



    private stats = {

        telegramMessages:0,

        discordMessages:0,

        edits:0,

        deletes:0,

        failures:0

    };





    increment(
        key:keyof typeof this.stats
    ){

        this.stats[key]++;

    }







    get(){

        return {

            ...this.stats,

            queue:
                taskQueue.size(),

            timestamp:
                Date.now()

        };


    }




    reset(){

        for(
            const key
            of Object.keys(
                this.stats
            ) as Array<keyof typeof this.stats>
        ){

            this.stats[key]=0;

        }


    }



}




export const healthMonitor =
    new HealthMonitor();



/**
 * ============================================================
 * COMMAND / ADMIN CONTROL SYSTEM
 * ============================================================
 */



export class BridgeAdmin {



    /**
     * Get bridge statistics
     */
    stats(){

        return healthMonitor.get();

    }






    /**
     * Force state save
     */
    async save(){

        await stateManager.save();


        return true;

    }






    /**
     * Clear caches
     */
    clearCache(){


        userCache["cache"].clear();


        messageCache["cache"].clear();


        mediaCache.clear();



        return true;

    }







    /**
     * Reload webhook
     */
    async reloadWebhook(){


        await webhookManager.reset();


        await webhookManager.get();



        return true;

    }







}



export const bridgeAdmin =
    new BridgeAdmin();









/**
 * ============================================================
 * FILTER SYSTEM
 * ============================================================
 */



export interface BridgeFilter {


    ignoredUsers:string[];


    ignoredChannels:string[];


    ignoredRoles:string[];


}





export const bridgeFilter:BridgeFilter = {


    ignoredUsers:[],


    ignoredChannels:[],


    ignoredRoles:[]


};







export class FilterManager {



    userIgnored(
        id:string
    ){


        return bridgeFilter
            .ignoredUsers
            .includes(id);


    }






    channelIgnored(
        id:string
    ){


        return bridgeFilter
            .ignoredChannels
            .includes(id);


    }







    roleIgnored(
        roles:string[]
    ){


        return roles.some(
            role =>
                bridgeFilter
                    .ignoredRoles
                    .includes(role)
        );


    }






    shouldIgnore(
        user:string,
        channel:string,
        roles:string[]=[]
    ){


        return (

            this.userIgnored(user)

            ||

            this.channelIgnored(channel)

            ||

            this.roleIgnored(roles)

        );


    }



}



export const filterManager =
    new FilterManager();









/**
 * ============================================================
 * DISCORD USER PROFILE BUILDER
 * ============================================================
 */



export class DiscordUserManager {



    getProfile(
        member:GuildMember
    ){


        return {


            id:
                member.id,



            username:
                member.user.username,



            display:
                member.displayName,



            avatar:
                member.displayAvatarURL()



        };


    }





    cache(
        member:GuildMember
    ){


        const profile =
            this.getProfile(
                member
            );



        userCache.set({

            id:
                profile.id,


            username:
                profile.username,


            avatar:
                profile.avatar

        });



        return profile;


    }



}




export const discordUserManager =
    new DiscordUserManager();









/**
 * ============================================================
 * TELEGRAM USER PROFILE BUILDER
 * ============================================================
 */



export class TelegramUserManager {



    async getProfile(
        ctx:Context
    ){


        const message:any =
            ctx.message;



        if(
            !message?.from
        )
            return null;





        const user =
            message.from;



        return {


            id:
                String(
                    user.id
                ),



            username:
                user.username
                ??
                user.first_name
                ??
                "Unknown"



        };


    }



}




export const telegramUserManager =
    new TelegramUserManager();









/**
 * ============================================================
 * BRIDGE EVENTS INITIALIZER
 * ============================================================
 */



export function registerBridgeEvents(){



    registerRelayEvents();



    registerSyncEvents();



    logger.info(
        "All bridge events loaded"
    );


}









/**
 * ============================================================
 * GRACEFUL SHUTDOWN
 * ============================================================
 */



export async function shutdownBridge(){


    logger.warn(
        "Bridge shutting down..."
    );



    await stateManager.save();



    logger.info(
        "Bridge state saved"
    );



}









process.on(
    "SIGINT",
    async()=>{


        await shutdownBridge();


        process.exit(0);


    }
);





process.on(
    "SIGTERM",
    async()=>{


        await shutdownBridge();


        process.exit(0);


    }
);


/**
 * ============================================================
 * ATTACHMENT / FILE ADVANCED PROCESSOR
 * ============================================================
 */



export class AttachmentProcessor {



    /**
     * Creates a safe attachment list
     */
    normalize(
        attachments:Attachment[]
    ):MediaItem[]{


        return attachments.map(
            file=>({

                url:
                    file.url,


                name:
                    file.name
                    ??
                    "unknown",


                type:
                    mediaManager
                        .detectDiscordType(
                            file
                        )

            })
        );


    }







    /**
     * Remove duplicate attachments
     */
    removeDuplicates(
        files:MediaItem[]
    ){


        const seen =
            new Set<string>();


        return files.filter(
            file=>{


                if(
                    seen.has(
                        file.url
                    )
                )
                    return false;



                seen.add(
                    file.url
                );


                return true;


            }
        );


    }








    /**
     * Limit attachment amount
     */
    limit(
        files:MediaItem[],
        max:number = 10
    ){


        return files.slice(
            0,
            max
        );


    }




}




export const attachmentProcessor =
    new AttachmentProcessor();









/**
 * ============================================================
 * POLL BRIDGE
 * ============================================================
 */



export class PollManager {



    async discordPollToTelegram(
        message:Message
    ){


        if(
            !message.poll
        )
            return null;



        const poll =
            message.poll;



        const options =
            poll.answers
                .map(
                    answer =>
                        answer.text
                );



        const bot =
            bridgeContext
                .get()
                .telegram;



        return bot.telegram
            .sendPoll(

                CONFIG.telegram.chatId,

                poll.question,

                options,

                {

                    is_anonymous:
                        false

                }

            );



    }






    async telegramPollToDiscord(
        poll:any
    ){


        const options =
            poll.options
                ?.map(
                    (x:any)=>
                        x.text
                )
                .join(
                    "\n"
                );



        return discordManager
            .sendWebhook(

                "Telegram Poll",

                `**${poll.question}**\n\n${options}`

            );


    }



}




export const pollManager =
    new PollManager();









/**
 * ============================================================
 * LOCATION / CONTACT BRIDGE
 * ============================================================
 */



export class SpecialMessageHandler {



    async telegramSpecial(
        message:TelegramMessage
    ){



        const bot =
            bridgeContext
                .get()
                .telegram;



        if(
            (message as any).location
        ){


            const location =
                (message as any)
                    .location;



            await bot.telegram
                .sendMessage(

                    CONFIG.discord.channelId,

                    `Location: ${location.latitude}, ${location.longitude}`

                );


        }



    }





}







export const specialMessageHandler =
    new SpecialMessageHandler();









/**
 * ============================================================
 * ADVANCED LOGGING
 * ============================================================
 */



export class BridgeLogger {



    private logs:string[] = [];




    push(
        message:string
    ){


        this.logs.push(
            `[${new Date().toISOString()}] ${message}`
        );



        if(
            this.logs.length
            >
            1000
        ){

            this.logs.shift();

        }


    }







    get(){

        return [
            ...this.logs
        ];

    }






    clear(){

        this.logs = [];

    }



}




export const bridgeLogger =
    new BridgeLogger();









/**
 * ============================================================
 * ERROR TRACKER
 * ============================================================
 */



export class ErrorTracker {



    private errors =
        new Map<
            string,
            number
        >();





    record(
        name:string
    ){


        this.errors.set(

            name,

            (
                this.errors.get(name)
                ??
                0
            )
            +
            1

        );


        healthMonitor
            .increment(
                "failures"
            );


    }






    get(){

        return Object.fromEntries(
            this.errors
        );


    }





}



export const errorTracker =
    new ErrorTracker();









/**
 * ============================================================
 * FINAL BRIDGE BOOTSTRAP
 * ============================================================
 */



export async function startBridge(
    discord:Client,
    telegram:Telegraf
){


    await initializeBridge(
        discord,
        telegram
    );



    registerBridgeEvents();



    logger.info(
        "Discord <-> Telegram bridge started"
    );


}



/**
 * ============================================================
 * FINAL MESSAGE PIPELINE
 * ============================================================
 */



export class BridgePipeline {



    /**
     * Telegram incoming middleware
     */
    async processTelegram(
        ctx:Context
    ){


        try{


            const message:any =
                ctx.message;



            if(
                !message
                ||
                message.chat.id
                !==
                CONFIG.telegram.chatId
            )
                return;




            if(
                filterManager.userIgnored(
                    String(
                        message.from?.id
                    )
                )
            )
                return;





            healthMonitor
                .increment(
                    "telegramMessages"
                );




            await taskQueue.add(

                async()=>{

                    await telegramRelay
                        .handle(
                            ctx
                        );

                }

            );




        }

        catch(error){


            errorTracker.record(
                "telegram_pipeline"
            );


            logger.error(
                error
            );


        }


    }








    /**
     * Discord incoming middleware
     */
    async processDiscord(
        message:Message
    ){



        try{


            if(
                message.channel.id
                !==
                CONFIG.discord.channelId
            )
                return;





            if(
                filterManager.shouldIgnore(

                    message.author.id,

                    message.channel.id,

                    message.member?.roles
                        .cache
                        .map(
                            r=>r.id
                        )
                        ??
                        []

                )
            )
                return;






            healthMonitor
                .increment(
                    "discordMessages"
                );






            await taskQueue.add(

                async()=>{

                    await discordRelay
                        .handle(
                            message
                        );

                }

            );




        }

        catch(error){


            errorTracker.record(
                "discord_pipeline"
            );


            logger.error(
                error
            );


        }



    }




}



export const bridgePipeline =
    new BridgePipeline();









/**
 * ============================================================
 * FINAL EVENT REGISTRATION
 * ============================================================
 */



export function registerFinalEvents(){


    const {
        discord,
        telegram
    } =
    bridgeContext.get();






    telegram.on(
        "message",
        async ctx=>{

            await bridgePipeline
                .processTelegram(
                    ctx
                );

        }
    );






    telegram.on(
        "edited_message",
        async ctx=>{


            const message:any =
                ctx.update.edited_message;



            await taskQueue.add(

                ()=>syncManager
                    .telegramEdit(
                        message
                    )

            );


        }
    );






    discord.on(
        "messageCreate",
        async message=>{


            await bridgePipeline
                .processDiscord(
                    message
                );


        }
    );






    discord.on(
        "messageUpdate",
        async(
            oldMessage,
            newMessage
        )=>{


            await taskQueue.add(

                ()=>syncManager
                    .discordEdit(

                        oldMessage as Message,

                        newMessage as Message

                    )

            );


        }
    );







    discord.on(
        "messageDelete",
        async message=>{


            await taskQueue.add(

                ()=>syncManager
                    .discordDelete(

                        message as Message

                    )

            );


        }
    );





    logger.info(
        "Final events registered"
    );



}









/**
 * ============================================================
 * CONFIG VALIDATOR
 * ============================================================
 */



export class ConfigValidator {



    validate(){


        const errors:string[] = [];





        if(
            !CONFIG.telegram.chatId
        )
            errors.push(
                "Missing Telegram chat id"
            );





        if(
            !CONFIG.discord.guildId
        )
            errors.push(
                "Missing Discord guild id"
            );





        if(
            !CONFIG.discord.channelId
        )
            errors.push(
                "Missing Discord channel id"
            );






        if(
            CONFIG.queue.delay
            <
            0
        )
            errors.push(
                "Queue delay cannot be negative"
            );






        if(
            errors.length
        ){


            throw new Error(

                "Bridge configuration errors:\n"
                +
                errors.join(
                    "\n"
                )

            );

        }




        return true;


    }



}





export const configValidator =
    new ConfigValidator();









/**
 * ============================================================
 * PERMISSION CHECKER
 * ============================================================
 */



export class PermissionChecker {



    async verifyDiscord(){

        const channel =
            await discordManager
                .getChannel();



        if(!channel)
            throw new Error(
                "Discord channel unavailable"
            );



        return true;


    }






    async verifyTelegram(){


        const bot =
            bridgeContext
                .get()
                .telegram;



        await bot.telegram
            .getMe();



        return true;


    }




}





export const permissionChecker =
    new PermissionChecker();









/**
 * ============================================================
 * FINAL START FUNCTION
 * ============================================================
 */



export async function launchBridge(
    discord:Client,
    telegram:Telegraf
){


    logger.info(
        "Starting bridge..."
    );



    configValidator
        .validate();




    await initializeBridge(

        discord,

        telegram

    );





    await permissionChecker
        .verifyDiscord();





    await permissionChecker
        .verifyTelegram();







    registerFinalEvents();






    logger.info(
        "Bridge online"
    );



}



/**
 * ============================================================
 * FINAL RECOVERY / MAINTENANCE SYSTEM
 * ============================================================
 */



export class RecoveryService {



    private running = false;





    start(){


        if(
            this.running
        )
            return;



        this.running = true;



        /**
         * Periodic state backup
         */
        setInterval(

            async()=>{

                try{

                    await stateManager.save();

                }

                catch(error){

                    errorTracker.record(
                        "state_backup"
                    );

                }


            },

            CONFIG.storage.saveInterval

        );






        /**
         * Cache cleanup
         */
        setInterval(

            ()=>{


                try{


                    startCacheCleanup();



                }

                catch(error){


                    errorTracker.record(
                        "cache_cleanup"
                    );


                }


            },

            1000 *
            60 *
            30

        );





        /**
         * Memory cleanup
         */
        setInterval(

            ()=>{


                if(
                    taskQueue.size()
                    >
                    500
                ){

                    logger.warn(
                        "Queue size high:",
                        taskQueue.size()
                    );

                }


            },

            10000

        );



        logger.info(
            "Recovery service started"
        );

    }




}



export const recoveryService =
    new RecoveryService();









/**
 * ============================================================
 * BRIDGE API
 * ============================================================
 */



export class BridgeAPI {



    status(){


        return {


            online:true,


            health:
                healthMonitor.get(),



            errors:
                errorTracker.get(),



            queue:
                taskQueue.size(),



            timestamp:
                Date.now()


        };


    }






    async restartWebhook(){


        await webhookManager.reset();


        await webhookManager.get();


        return true;


    }





    async backup(){

        await stateManager.save();


        return {

            success:true,

            time:
                Date.now()

        };


    }






    clear(){

        userCache["cache"]
            .clear();


        mediaCache
            .clear();


        messageCache["cache"]
            .clear();



        return true;


    }





}



export const bridgeAPI =
    new BridgeAPI();









/**
 * ============================================================
 * MESSAGE CLEANUP SERVICE
 * ============================================================
 */



export class CleanupService {



    async removeOldMappings(){

        const state =
            stateManager.get();



        const expire =
            Date.now()
            -
            (
                1000 *
                60 *
                60 *
                24 *
                30
            );



        for(
            const key of Object.keys(
                state.discordToTelegram
            )
        ){


            /**
             * Mapping cleanup
             * is intentionally conservative.
             * Actual message timestamps are stored
             * in message cache.
             */


            const cached =
                messageCache.get(
                    key
                );



            if(
                cached
                &&
                cached.timestamp
                <
                expire
            ){


                delete state
                    .discordToTelegram[key];


            }


        }



        await stateManager.save();


    }




    start(){


        setInterval(

            ()=>{

                this.removeOldMappings()
                    .catch(
                        ()=>{}
                    );

            },

            1000 *
            60 *
            60 *
            24

        );


    }




}



export const cleanupService =
    new CleanupService();









/**
 * ============================================================
 * GLOBAL ERROR HANDLERS
 * ============================================================
 */



export function registerGlobalErrors(){



    process.on(
        "unhandledRejection",
        error=>{


            logger.error(
                "Unhandled rejection",
                error
            );


            errorTracker.record(
                "unhandled_rejection"
            );


        }
    );





    process.on(
        "uncaughtException",
        error=>{


            logger.error(
                "Fatal exception",
                error
            );


            errorTracker.record(
                "uncaught_exception"
            );


        }
    );



}









/**
 * ============================================================
 * COMPLETE BOOTSTRAP
 * ============================================================
 */



export async function startCompleteBridge(
    discord:Client,
    telegram:Telegraf
){


    registerGlobalErrors();



    await launchBridge(
        discord,
        telegram
    );



    recoveryService.start();



    cleanupService.start();




    logger.info(
        "================================"
    );


    logger.info(
        "Discord <-> Telegram Bridge Ready"
    );


    logger.info(
        "================================"
    );



}



/**
 * ============================================================
 * FINAL EXPORT WRAPPER
 * ============================================================
 *
 * This section exposes a clean integration API.
 *
 * Usage:
 *
 * import {
 *    createTelegramDiscordBridge
 * } from "./bridge";
 *
 * await createTelegramDiscordBridge(
 *    discordClient,
 *    telegramBot
 * );
 *
 * ============================================================
 */



export interface BridgeInstance {


    start():Promise<void>;


    stop():Promise<void>;


    status():unknown;


    api:BridgeAPI;


}









export function createTelegramDiscordBridge(
    discord:Client,
    telegram:Telegraf
):BridgeInstance {



    let started = false;






    return {


        async start(){



            if(
                started
            )
                return;



            await startCompleteBridge(

                discord,

                telegram

            );



            started = true;



        },







        async stop(){



            await shutdownBridge();



            started = false;



        },







        status(){


            return bridgeAPI.status();


        },





        api:
            bridgeAPI


    };



}









/**
 * ============================================================
 * OPTIONAL DIRECT REGISTER FUNCTION
 * ============================================================
 *
 * For projects that already have their own startup system.
 *
 * ============================================================
 */



export async function registerTelegramDiscordBridge(
    discord:Client,
    telegram:Telegraf
){


    const bridge =
        createTelegramDiscordBridge(
            discord,
            telegram
        );



    await bridge.start();



    return bridge;


}









/**
 * ============================================================
 * BRIDGE VERSION
 * ============================================================
 */


export const BRIDGE_VERSION = {

    name:
        "Advanced Discord Telegram Bridge",


    version:
        "1.0.0",


    features:[

        "Bidirectional Messaging",

        "Reply Synchronization",

        "Edit Synchronization",

        "Delete Synchronization",

        "Media Relay",

        "Webhook Relay",

        "Markdown Conversion",

        "Mention Conversion",

        "Thread Foundation",

        "Persistent Storage",

        "Rate Limiting",

        "Retry System",

        "Health Monitoring",

        "Automatic Recovery"

    ]

};






