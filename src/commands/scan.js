const { SlashCommandBuilder } = require('discord.js');
let axios = require('axios');

function removeHttp(url) {
    return url.replace(/^https?:\/\//, '');
}

async function request(interaction, config, website, secondTry = false) {
    console.warn(config);
    await axios(config)
        .then((res) => {
            console.log({ res });
            if (res.data['status']) {
                !secondTry
                    ? interaction.reply({
                            content:
                                'API is working on scam detection in the url: ' +
                                removeHttp(website) +
                                ' \n This message will be edited when the detection finishes',
                            ephemeral: false,
                      })
                    : null;
                console.log(res.data);
                setTimeout(() => {
                    request(interaction, config, website, true);
                }, 5000);
            } else {
                console.log(res.data);
                console.log(res.data['details']['actions']);
                if (res.data['isSafe']) {
                    const contentToSend =
						removeHttp(website) +
                        '\n isSafe: **' +
                        res.data['isSafe'].toString().toUpperCase() +
                        '** \n' +
                        "Although ScamSniffer did not detect a threat doens't mean it's totally safe. \n" +
                        'Always thread carefully and use a burner';

                    secondTry
                        ? interaction.editReply({
                                content: contentToSend,
                                ephemeral: false,
                          })
                        : interaction.reply({
                                content: contentToSend,
                                ephemeral: false,
                          });
                } else {
                    const contentToSend =
						removeHttp(website) + 
                        '\n isSafe: **' +
                        res.data['isSafe'].toString().toUpperCase() +
                        '**' +
                        '\n Exploits: **' +
                        res.data['details']['actions'] +
                        '** \n Link is not safe. **DO NOT INTERACT**';

                    secondTry
                        ? interaction.editReply({
                                content: contentToSend,
                                ephemeral: false,
                          })
                        : interaction.reply({
                                content: contentToSend,
                                ephemeral: false,
                          });
                }
            }
        })
        .catch((err) => console.log(err));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('scan')
        .setDescription('Scam Sniffer 👃')
        .addStringOption((option) => option.setName('website').setDescription('The website to test').setRequired(true)),
    async execute(interaction) {
        const website = interaction.options.getString('website');

        const config = {
            method: 'get',
            url: `https://detector.scamsniffer.io/api/detect?link=${website}&force=0`,
            headers: {
                Accept: 'application/json',
                'X-API-KEY': process.env.SCAMSNIFFER_API_KEY,
            },
        };

        const contentToSend = await request(interaction, config, website);
    },
};