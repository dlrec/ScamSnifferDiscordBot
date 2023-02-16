# Information

https://discordjs.guide/#before-you-begin

# Instalation

-   install dependencies
    `yarn`

-   delete commands
    `yarn delete:commands:prod`

-   add/update commands
    `yarn deploy:commands:prod`

-   start bot
    `yarn start:prod`

# Add bot to server

1. Get your bot CLIENT ID
2. Replace `CLIENT_ID` in following link with your CLIENT ID
    1. To allow pings to a Safety Role:
        - https://discord.com/oauth2/authorize?client_id=`CLIENT_ID`&permissions=131072&scope=bot
        - Set `const pingRole = true;` on `scan.js`

    1. With no 'Ping Role' permission:
        - https://discord.com/oauth2/authorize?client_id=`CLIENT_ID`&permissions=0&scope=bot
