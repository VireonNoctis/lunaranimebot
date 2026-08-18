import axios from 'axios';
import e from 'express';
import { client } from '../index'

const app = e();

app.use(e.json());

app.get('/api/callback/lunar', async (req, res, next) => {
    const { code } = req.query;
    try {
        const lunar = await axios.post('https://api.lunarx.to/api/oauth2/token', {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": "http://arvionmmo.com/api/callback/lunar",
            "client_id": process.env.LUNAR_CLIENT_ID,
            "client_secret": process.env.LUNAR_CLIENT_SECRET
        });
        console.log(lunar);
    } catch (err) {
        console.log('Api error');
    }
});

app.post('/api/lunar/hooks/pat', async (req, res, next) => {
    (client.guilds.cache.get('1330574273760465029')?.channels.cache.get('1465799839873892548') as TextChannel).send(`<@${req.body.id}> has been praised`)
})

export function server() {
    app.listen(8925, () => {
        console.log('Running')
    })
}