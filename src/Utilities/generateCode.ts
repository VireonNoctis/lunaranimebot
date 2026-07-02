export default function generateCode(username :string, lunarname :string) {
    let randomNumber = Math.floor((Math.pow(((Math.random() * 9999) * (Math.random() * -5)), 2)));
    let time = new Date().getTime();
    let usernameLength = username.length;

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    const number = (((randomNumber + time) / usernameLength));

    let characters :string = '';

    for (let i = 0; i < 18; i++) {
        characters += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    let numberString = String(number);

    let outcome = 
        lunarname
        + '-'
        + numberString.substring(0, numberString.length /2)
        + '-'
        + characters.substring(6, 12)
        + '-'
        + numberString.substring(numberString.length /2, numberString.length)
        + '-' + characters.substring(12, 18);

    return outcome;
}

