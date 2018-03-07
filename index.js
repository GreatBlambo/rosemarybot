const discord = require("discord.js");
const client = new discord.Client();
const config = require("./config.json");

const fs = require("fs");

let queue = {
	is_playing: false	
}

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`);
});

fs.readdir("./events/", (err, files) => {
	if (err) return console.error(err);
	files.forEach(file => {
		let eventFunction = require(`./events/${file}`);
		let eventName = file.split(".")[0];
		client.on(eventName, (...args) => eventFunction.run(client, ...args));
	});
});

client.on('message', msg => {
	if (!msg.content.startsWith(config.prefix) || msg.author.bot) return;

	const args = msg.content.slice(config.prefix.length).trim().split(/ +/g);
	const command = args.shift().toLowerCase();

	try {
	  let commandFile = require(`./events/${command}.js`);
	  commandFile.run(client, msg, args);
	} catch (err) {
	  console.error(err);
	}
});

client.login(config.token);