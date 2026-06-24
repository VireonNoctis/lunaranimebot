import axios from "axios";

export default async function grantXP(user :string, xp :number) {
    if(xp < 0) return;

    try { 
        const xpgranted = await axios.post('https://api.lunaranime.ru/api/admin/users/give-xp', {
            'user_id': `${user}`,
            'xp': xp
        },{
            headers: {
                'X-Scraper-Guard-Bypass': `${process.env.bypass_token}`,
                'Authorization': `${process.env.lunar_token}`,
                'Content-Type': 'application/json'
            }
        });
        return xpgranted.data;
    } catch (err) {
        console.log('XP giving error: ' + err)
        return;
    }
}