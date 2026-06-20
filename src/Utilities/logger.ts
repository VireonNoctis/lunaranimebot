export class Logger {
    public loggingName :string = '';
    public consoleLog :boolean = false;
    public discordLog :boolean = false;
    public loggingChannelId :number = 0;
    public time :number = new Date().getTime();
    public loggingLevel :loggingLevel = loggingLevel.normal;
    public color :string = '\e[0;37m'
    public text :string = '';

    public constructor(logChannelId :number) {
        this.loggingChannelId = logChannelId;
    }

    public message(logMessage :string) {
        this.text = logMessage;
    }

    public name(logInstanceName :string) {
        this.loggingName = logInstanceName;
    }

    public isBeingLoggedInConsole(consoleLog :boolean) {
        this.consoleLog = consoleLog;
    }

    public isBeingLoggedInDiscord(consoleLog :boolean) {
        this.consoleLog = consoleLog;
    }

    public setLoggingLevel(level :loggingLevel) {
        this.loggingLevel = level;
    }

    if(consoleLog = true) {
        console.log(`[${this.time} - ${this.loggingName}]` + this.color + this.text);
    }
}

export enum loggingLevel {
    normal,
    warning,
    info
}