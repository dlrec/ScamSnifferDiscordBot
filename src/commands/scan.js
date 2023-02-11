const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
let axios = require('axios');

const pingRole = false;
const safetyRole = process.env.SAFETY_ROLE;

function disableHttpLink(url) {
	return url.replace(/:/g, '[:]');
}

const introEmbed = (url, detectionStatus) =>
	new EmbedBuilder()
		.setColor(0xffffff)
		.setTitle('Website checker')
		.setDescription(
            'Scanning for Threats \n' + 
			'This message will be edited when the scanning finishes. \n' +
            'For new urls it may take 1-4 minutes to receive a result.',
		)
        .addFields(
            { name: 'URL', value: url},
            { name: 'Detection Status', value: `${detectionStatus}`},
        )
        .setFooter({
            text: 'Powered by the ScamSniffer Detector API',
            iconURL: 'https://cdn.discordapp.com/attachments/1040295546352574504/1073957863971635210/scamSnifferLogo.png'
        });

const safeEmbed = (url) =>
	new EmbedBuilder()
		.setColor(0x257722)
		.setTitle('Website checker')
		.setDescription(
			`The url: ${url} looks safe**\n` +
				'** \n' +
				"Although ScamSniffer did not detect a threat doesn't mean it's totally safe. \n" +
                "Always look closely at what is requested to sign. \n" +
				"When in doubt ask fellow gm.embers for help.",
		)
        .addFields(
            { name: 'URL', value: url},
            { name: 'Detection Status', value: 'NO THREATS DETECTED'},
        )
        .setFooter({
            text: 'Powered by the ScamSniffer Detector API',
            iconURL: 'https://cdn.discordapp.com/attachments/1040295546352574504/1073957863971635210/scamSnifferLogo.png'
        });


// From the Exploits array creates an array with the embed fields
function createThreatFields(url, array) {
    let embedFields = [
        { name: 'URL', value: url},
        { name: 'Detection Status', value: 'UNSAFE. DO NOT INTERACT'}
    ];

    array.forEach(function (exploit, i) {
        embedFields.push({name: `exploit${i}`, value: exploit, inline: true});
    });

    return embedFields;
}

const threatEmbed = (url, res) =>
	new EmbedBuilder()
		.setColor(0xff0000)
		.setTitle('Website checker')
		.setDescription(
			`**THREAT DETECTED**\n\n` +
				`Link is not safe. **DO NOT INTERACT**`,
		)
        .addFields(
            createThreatFields(url, res.data['details']['actions'])
        )
        .setFooter({
            text: 'Powered by the ScamSniffer Detector API',
            iconURL: 'https://cdn.discordapp.com/attachments/1040295546352574504/1073957863971635210/scamSnifferLogo.png'
        });

async function request(interaction, config, website, secondTry = false) {
	console.warn(config);
	await axios(config)
		.then((res) => {
			console.log({ res });
			if (res.data['status']) {
				!secondTry
					? interaction.reply({
							embeds: [introEmbed(disableHttpLink(website), res.data['status'])],
							ephemeral: false,
					  })
					: null;
				console.log(res.data);
				setTimeout(() => {
					request(interaction, config, website, true);
				}, 5000);
			} else {
				console.log(res.data);
				if (res.data['isSafe']) {
					secondTry
						? interaction.editReply({
								embeds: [safeEmbed(disableHttpLink(website))],
								ephemeral: false,
						  })
						: interaction.reply({
								embeds: [safeEmbed(disableHttpLink(website))],
								ephemeral: false,
						  });
				} else {
					secondTry
						? interaction.editReply({
								content: pingRole ? safetyRole : '',
								embeds: [threatEmbed(disableHttpLink(website), res)],
								ephemeral: false,
						  })
						: interaction.reply({
								content: pingRole ? safetyRole : '',
								embeds: [threatEmbed(disableHttpLink(website), res)],
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
			url: `https://detector.scamsniffer.io/api/detect?link=${website}`, // &force=true
			headers: {
				Accept: 'application/json',
				'X-API-KEY': process.env.SCAMSNIFFER_API_KEY,
			},
		};

		const contentToSend = await request(interaction, config, website);
	},
};
