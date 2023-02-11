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
		.addFields({ name: 'URL', value: url }, { name: 'Detection Status', value: `${detectionStatus}` })
		.setFooter({
			text: 'Powered by the ScamSniffer Detector API',
			iconURL:
				'https://cdn.discordapp.com/attachments/1040295546352574504/1073957863971635210/scamSnifferLogo.png',
		});

const safeEmbed = (url) =>
	new EmbedBuilder()
		.setColor(0x257722)
		.setTitle('Website checker')
		.setDescription(
			`The url: ${url} looks safe**\n` +
				'** \n' +
				"Although ScamSniffer did not detect a threat doesn't mean it's totally safe. \n" +
				'Always look closely at what is requested to sign. \n' +
				'When in doubt ask fellow gm.embers for help.',
		)
		.addFields({ name: 'URL', value: url }, { name: 'Detection Status', value: 'NO THREATS DETECTED' })
		.setFooter({
			text: 'Powered by the ScamSniffer Detector API',
			iconURL:
				'https://cdn.discordapp.com/attachments/1040295546352574504/1073957863971635210/scamSnifferLogo.png',
		});

// From the Exploits array creates an array with the embed fields
function createThreatFields(url, array) {
	let embedFields = [
		{ name: 'URL', value: url },
		{ name: 'Detection Status', value: 'UNSAFE. DO NOT INTERACT' },
	];

	array.forEach(function (exploit, i) {
		embedFields.push({ name: `exploit${i}`, value: exploit, inline: true });
	});

	return embedFields;
}

const threatEmbed = (url, res) =>
	new EmbedBuilder()
		.setColor(0xff0000)
		.setTitle('Website checker')
		.setDescription(`**THREAT DETECTED**\n\n` + `Link is not safe. **DO NOT INTERACT**`)
		.addFields(createThreatFields(url, res.data['details']['actions']))
		.setFooter({
			text: 'Powered by the ScamSniffer Detector API',
			iconURL:
				'https://cdn.discordapp.com/attachments/1040295546352574504/1073957863971635210/scamSnifferLogo.png',
		});

async function request(interaction, config, website, secondTry = false) {
	console.warn(config);
	const promise = axios(config);
	const dataPromise = promise
		.then((res) => {
			if (res.data['status']) {
				setTimeout(() => {
					request(interaction, config, website, true);
				}, 5000);
			} else {
				if (res.data['isSafe']) {
					return { type: 'editReply', embed: safeEmbed(disableHttpLink(website)), isSafe: true };
				} else {
					return {
						type: 'editReply',
						content: pingRole ? safetyRole : '',
						embed: threatEmbed(disableHttpLink(website), res),
						isSafe: false,
					};
				}
			}
		})
		.catch((err) => console.log(err));
	return dataPromise;
}

let isSafe = true;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('scan')
		.setDescription('Scam Sniffer 👃')
		.addStringOption((option) => option.setName('website').setDescription('The website to test').setRequired(true)),
	async execute(interaction) {
		const website = interaction.options.getString('website');
		const websites = [`https://${website}`, `http://${website}`];

		await interaction.reply({
			embeds: [introEmbed(disableHttpLink(website), 'CREATED')],
			ephemeral: false,
		});

		websites.forEach(async (website, key, arr) => {
			const config = {
				method: 'get',
				url: `https://detector.scamsniffer.io/api/detect?link=${website}&force=0`,
				headers: {
					Accept: 'application/json',
					'X-API-KEY': process.env.SCAMSNIFFER_API_KEY,
				},
			};

			await request(interaction, config, website).then(async (res) => {
				const resType = res.type;
				const resContent = res.content;
				const resEmbed = res.embed;
				const resIsSafe = res.isSafe;

				isSafe = resIsSafe;

				const content = {
					content: resContent,
					embeds: [resEmbed],
					ephemeral: false,
				};

				if (!isSafe) {
					// As soon as isSafe is false reply and finish
					if (resType === 'reply') {
						await interaction.reply(content);
					} else if (resType === 'editReply') {
						await interaction.editReply(content);
					}
					return; // Finish
				} else {
					if (Object.is(arr.length - 1, key)) {
						// Only send on the last element
						if (resType === 'reply') {
							await interaction.reply(content);
						} else if (resType === 'editReply') {
							await interaction.editReply(content);
						}
					}
				}
			});
		});
	},
};
