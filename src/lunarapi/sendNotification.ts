import axios from "axios";

export default async function sendNotification(message :string, identifier :string) {
    await axios.post('https://api.lunaranime.ru/api/notification/admin-send', {
        'user_identifier': identifier,
        'type_': 'custom',
        'content': message
    },{
        headers: {
            'X-Scraper-Guard-Bypass': `${process.env.bypass_token}`,
            'Authorization': `${process.env.lunar_token}`,
            'Content-Type': 'application/json'
        }
    });
}