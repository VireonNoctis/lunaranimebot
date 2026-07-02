import axios from "axios";
import { EmbedBuilder, type Message, type TextChannel } from "discord.js";

export default async function(message :Message, args :string[]) {
    if(args[0] == '!randomMeme' || args[0] == '!meme') {
        const subreddits = [
            'darkmemers',
            'memes',
            'dankmemes', 
            'me_irl',
            'funny',
            'Animemes',
            'AnarchyChess',
            'stonks',
            'GymMemes',
            'RelationshipMemes',
            'CoupleMemes',
            'CollegeMemes',
            'antimeme',
            'Random_Memes',
            'badmemes',
            'cursedmemes',
            'DeepFriedMemes',
            'ShitMemers',
            'MemeVideos',
            'depressionmemes',
            'PhilosophyMemes',
            'nukedmemes',
            'GenZHumor',
            'SipsTea',
            'perfectlycutscreams',
            'blursed_videos',
            'sadposting'
        ];

        var meme;

        let which = subreddits[Math.floor(Math.random() * subreddits.length)];

        const memeMsg = await (message.channel as TextChannel).send({ content: `Fetching Meme from ${which}` });

        try {
            meme = await axios.get(`https://meme-api.com/gimme/${which}/1`);
        } catch (err) {
            console.log(err);
            memeMsg.edit('Failed to fetch from ' + which);
        }

        if(!meme) return;

        const embed = new EmbedBuilder()
            .setImage(meme.data.memes[0].url)
            .setTitle(meme.data.memes[0].title)
            .setFooter({ text: `⬆ ${meme.data.memes[0].ups} | by ${meme.data.memes[0].author} | r/${meme.data.memes[0].subreddit}`});

        if(meme.data.memes[0].nsfw == true) {
            if((message.channel as TextChannel).nsfw) {
                memeMsg.edit({ embeds: [embed], content: '' });
            }
        } else {
            memeMsg.edit({ embeds: [embed], content: ''});
        }
    }
}