const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
let axios = require('axios');

const pingRole = false;
const safetyRole = process.env.SAFETY_ROLE;
const footerPNG = 'https://cdn.discordapp.com/app-icons/1040431026788384849/96844f028ccbd835eb3e01865480d9fc.png?size=256'

function disableHttpLink(url) {
	return url.replace(/:/g, '(:)');
}

const introEmbed = (url, detectionStatus) =>
	new EmbedBuilder()
		.setColor(0xffffff)
		//.setTitle('Website checker')
		.setDescription(
            'Scanning for Threats \n' + 
			'This message will be edited when the scanning finishes. \n' +
            'For new urls it may take 1-4 minutes to receive a result.',
		)
        .addFields(
            { name: '__URL__:', value: url},
            { name: '__Detection Status__:', value: `${detectionStatus}`},
        )
        .setFooter({
            text: 'Powered by the ScamSniffer Detector API',
            iconURL: footerPNG
        });

const safeEmbed = (url) =>
	new EmbedBuilder()
		.setColor(0x257722)
		//.setTitle('Website checker')
		.setDescription(
			`The url: ${url} looks safe**\n` +
				'** \n' +
				"Although ScamSniffer did not detect a threat doesn't mean it's totally safe. \n" +
				"- Do not reveal your mnemonic or private key to any one \n"+
                "- Always look closely at what is requested to sign. \n" +
				"- When in doubt ask fellow gm.embers for help.",
		)
        .addFields(
            { name: '__URL__:', value: url},
            { name: '__Detection Status__:', value: 'NO THREATS DETECTED'},
        )
        .setFooter({
            text: 'Powered by the ScamSniffer Detector API',
            iconURL: footerPNG
        });


// From the Exploits array creates an array with the embed fields
function createThreatFields(url, array) {
    let embedFields = [
        { name: '__URL__:', value: url},
        { name: '__Detection Status__:', value: '**__UNSAFE. DO NOT INTERACT__**'}
    ];

    array.forEach(function (exploit, i) {
        embedFields.push({name: `__exploit${i}__:`, value: exploit, inline: true});
    });

    return embedFields;
}

const threatEmbed = (url, res, fromLookupAPI) =>
	new EmbedBuilder()
		.setColor(0xff0000)
		.setTitle('THREAT DETECTED')
		.setDescription(
			`Link is not safe. **DO NOT INTERACT**`,
		)
        .addFields(
            createThreatFields(url, fromLookupAPI ? [] : res.data['details']['actions'])
        )
        .setFooter({
            text: 'Powered by the ScamSniffer Detector API',
            iconURL: footerPNG
        });

async function lookupCall(interaction, config, website, secondTry = false) {
	console.warn(config);
	console.log(`Calling the Lookup API on ${website}`);
	const promise = axios(config);
	const dataPromise = promise
	.then((res) => {
		console.log(res.data);
		if (res.data['status'] === 'BLOCKED') {
					// If Lookup API returns status = 'BLOCKED'
					// we edit the reply and finish. No need to call the Detector API.
					return {
						type: 'editReply',
						content: pingRole ? safetyRole : '',
						embed: threatEmbed(disableHttpLink(website), res, true),
						isSafe: false,
					};
				} else {
					// If the url isn't on the Lookup API then the call will return 'PASSED'
					// We need to call the Detector API.
					return { type: 'requestScan', embed: '', isSafe: true };
				}
			})
			.catch((err) => console.log(err));
		console.log(dataPromise);
		return dataPromise;
	}

async function request(interaction, config, website, secondTry = false) {
	console.warn(config);
	await axios(config)
		.then((res) => {
			console.log(res.data);
			if (res.data['status']) {
				!secondTry
					? interaction.reply({
							embeds: [introEmbed(disableHttpLink(website), res.data['status'])],
							ephemeral: false,
					  })
					: null;
				setTimeout(() => {
					request(interaction, config, website, true);
				}, 5000);
			} else {
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
								embeds: [threatEmbed(disableHttpLink(website), res, false)],
								ephemeral: false,
						  })
						: interaction.reply({
								content: pingRole ? safetyRole : '',
								embeds: [threatEmbed(disableHttpLink(website), res, false)],
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

		let goDetector = true;

		const configLookup = {
			method: 'get',
			url: 'https://lookup-api.scamsniffer.io/site/check',
			params: {
				'api_key': process.env.SCAMSNIFFER_API_KEY,
				'url': website
				},
			  headers: { Accept: 'application/json' }
		};

		await lookupCall(interaction, configLookup, website).then(async (res) => {
			if(!res.isSafe) {
				const contentLookup = {
					content: res.content,
					embeds: [res.embed],
					ephemeral: false,
				};
				goDetector = false;
				await interaction.reply(contentLookup);
				return; // Finish
			}
		});

		console.log(`goDetector: ${goDetector}`);

		if (goDetector){
			const config = {
				method: 'get',
				url: `https://detector.scamsniffer.io/api/detect?link=${website}&force=true`, // &force=true
				headers: {
					Accept: 'application/json',
					'X-API-KEY': process.env.SCAMSNIFFER_API_KEY,
				},
			};	
			const contentToSend = await request(interaction, config, website);
		}		
	},
};
