const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder().setName('ping').setDescription('Pong! 🏓'),
	async execute(interaction) {
		const timeTaken = Date.now() - interaction.createdTimestamp;
		await interaction.reply({ content: `Pong! ${timeTaken}ms`, ephemeral: true });
	},
};
