const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
let axios = require('axios');

const safetyRole = '<@&1000172500656865401>';

function removeHttp(url) {
	return url.replace(/^https?:\/\//, '');
}

const introEmbed = (url) =>
	new EmbedBuilder()
		.setColor(0xffffff)
		.setTitle('Website checker')
		.setDescription(
			`The API is working on scam detection in the url: ${url} \n This message will be edited when the detection finishes`,
		);

const safeEmbed = (url) =>
	new EmbedBuilder()
		.setColor(0x00ff00)
		.setTitle('Website checker')
		.setDescription(
			`The url: ${url} is safe: **\n` +
				'No threats were detected' +
				'** \n' +
				"Although ScamSniffer did not detect a threat doesn't mean it's totally safe. \n" +
				'Always thread carefully and use a burner',
		);

const threatEmbed = (url, res) =>
	new EmbedBuilder()
		.setColor(0xff0000)
		.setTitle('Website checker')
		.setDescription(
			`**Threat detected**\n` +
				`The url: ${url} is **NOT SAFE**` +
				'\n Exploits: **' +
				res.data['details']['actions'] +
				'** \n Link is not safe. **DO NOT INTERACT**',
		);

async function request(interaction, config, website, secondTry = false) {
	console.warn(config);
	await axios(config)
		.then((res) => {
			console.log({ res });
			if (res.data['status']) {
				!secondTry
					? interaction.reply({
							embeds: [introEmbed(removeHttp(website))],
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
					secondTry
						? interaction.editReply({
								embeds: [safeEmbed(removeHttp(website))],
								ephemeral: false,
						  })
						: interaction.reply({
								embeds: [safeEmbed(removeHttp(website))],
								ephemeral: false,
						  });
				} else {
					secondTry
						? interaction.editReply({
								content: safetyRole,
								embeds: [threatEmbed(removeHttp(website), res)],
								ephemeral: false,
						  })
						: interaction.reply({
								content: safetyRole,
								embeds: [threatEmbed(removeHttp(website), res)],
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
