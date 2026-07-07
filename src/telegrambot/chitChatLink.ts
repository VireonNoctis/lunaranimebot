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




    async sendMess