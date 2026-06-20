// By Vireon

import { EmbedBuilder } from "@discordjs/builders";
import type { Message, TextChannel } from "discord.js";
import { cluster } from "..";
import axios from "axios";

const cooldown=new Map<string,number>();

const roleMap={
admin:{id:'1343141519283978260',icon:'👑'},
moderator:{id:'1343141581334511616',icon:'🛡'},
donor:{id:'1515063228223455442',icon:'💎'},
novel:{id:'1515331236825137152',icon:'📖'},
manga:{id:'1498726205937942598',icon:'📚'} // placeholder backend
};

export default async function roleSync(message:Message,args:string[]){

const make= (title:string,desc:string,color:[number,number,number]=[143,116,255])=>
new EmbedBuilder()
.setColor(color)
.setTitle(title)
.setDescription(desc)
.setFooter({text:'✨ Lunar Sync • Made by Vireon'});

if(['sync roles','syncroles'].includes(message.content.toLowerCase())){
const m=await message.reply({
embeds:[
make(
'❌ **INVALID USAGE**',
'Use:\n`!syncRoles`\n\n━━━━━━━━━━',
[255,107,168]
)
]
});
setTimeout(()=>m.delete().catch(()=>{}),6000);
return;
}

if(args[0]!=='!syncRoles')return;

try{

const now=Date.now();

if(cooldown.has(message.author.id)&&now-cooldown.get(message.author.id)!<30000)
return message.reply({
embeds:[
make(
'⌛ **COOLDOWN ACTIVE**',
`Sync again in:\n\`${Math.ceil((30000-(now-cooldown.get(message.author.id)!))/1000)}s\``,
[255,187,85]
)
]
});

cooldown.set(message.author.id,now);

const sync=await (message.channel as TextChannel).send({
embeds:[
make(
'🔄 **STARTING SYNC**',
'━━━━━━━━━━\n\n⏳ Fetching Account\n⬜ Checking Roles\n⬜ Applying Roles'
)
]
});

const user=(await cluster.execute(
`SELECT * FROM lunarbot.accountlinks WHERE snowflakeid=${message.author.id} ALLOW FILTERING`
)).rows[0];

if(!user?.verified)
return sync.edit({
embeds:[
make(
'❌ **ACCOUNT NOT LINKED**',
'Link first:\n`!link`'
)
]
});

await sync.edit({
embeds:[
make(
'⚡ **CHECKING ROLES**',
'━━━━━━━━━━\n\n✅ Fetching Account\n⏳ Checking Roles\n⬜ Applying Roles'
)
]
});

const account=await axios.get(
`https://api.lunaranime.ru/api/animes/profile?user_id=${user.lunaruuid}`,
{
headers:{
'X-Scraper-Guard-Bypass':process.env.bypass_token,
Authorization:process.env.lunar_token
}
}
);

const lunar=(account.data.data.role?.split('|')||[]) as string[];

await sync.edit({
embeds:[
make(
'⚡ **APPLYING ROLES**',
'━━━━━━━━━━\n\n✅ Fetching Account\n✅ Checking Roles\n⏳ Applying Roles'
)
]
});

let add:string[]=[],own:string[]=[],rem:string[]=[];

for(const[k,v]of Object.entries(roleMap)){

const has=message.member?.roles.cache.has(v.id);
const need=lunar.includes(k);

if(need&&!has){
await message.member?.roles.add(v.id);
add.push(`${v.icon} ${k}`);
}
else if(need){
own.push(`${v.icon} ${k}`);
}
else if(has){
await message.member?.roles.remove(v.id);
rem.push(`${v.icon} ${k}`);
}

}

const missing=lunar.filter(r=>!(r in roleMap));

await sync.edit({

embeds:[

make(
'✨ **SYNC COMPLETE**',

`━━━━━━━━━━

🌙 **LUNAR ACCOUNT**

> **User:** \`${account.data.data.username}\`
> **UUID:** \`${user.lunaruuid}\`

━━━━━━━━━━

➕ **Added**
${add.join('\n')||'> None'}

✔ **Owned**
${own.join('\n')||'> None'}

➖ **Removed**
${rem.join('\n')||'> None'}

${missing.length?`\n⚠ **Unmapped**\n${missing.map(x=>`> \`${x}\``).join('\n')}`:''}

━━━━━━━━━━

⚡ Updated:
\`${add.length+rem.length}\`

⏱ Time:
\`${((Date.now()-now)/1000).toFixed(2)}s\``,

[168,132,255]

)

.setThumbnail(
message.author.displayAvatarURL()
)

.setTimestamp()

]

});

    }catch{

    (message.channel as TextChannel).send({
        embeds:[
            make(
                '❌ **SYNC ERROR**',
                'Something went wrong.',
                [255,77,103]
            )
        ]
    });

    }

}