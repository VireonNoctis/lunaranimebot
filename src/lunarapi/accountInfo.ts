import axios from "axios";

export async function getAccountInfoThroughUsername(username :string) {
    var accountInfo = await axios.get(`https://api.lunaranime.ru/api/animes/profile?username=${username}`,
        {
            headers: {
                'X-Scraper-Guard-Bypass': `${process.env.bypass_token}`
            }
        }
    );

    return accountInfo;
}