import axios from 'axios';
import e from 'express';

const app = e();

app.get('/api/callback/lunar', async (req, res, next) => {
    const { code } = req.query;
    try {
        const lunar = await axios.post('https://api.lunaranime.ru/api/oauth2/token', {
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

export function server() {
    app.listen(8925, () => {
        console.log('Running')
    })
}