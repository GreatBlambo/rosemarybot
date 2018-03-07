const fs = require("fs");
const config = require("../config.json");

exports.run = (client, msg, args) =>
{
	prefix = args[0];

	if (config.allowed_prefixes.indexOf(args[0]) == -1)
	{
		error = "Sorry, the only prefixes allowed are: "
		for (i = 0; i < config.allowed_prefixes.length; i++)
		{
			if (i < config.allowed_prefixes.length - 1 && i > 0)
				error += ", ";
			else if (i == config.allowed_prefixes.length - 1)
				error += " or ";
			error += "\"" + config.allowed_prefixes[i] + "\"";
		}
		msg.channel.send(error).catch(console.error);
		return;
	}

	config.prefix = prefix;
	fs.writeFile("../config.json", JSON.stringify(config), (err) => console.error)

	msg.channel.send("Set prefix to " + prefix).catch(console.error);
}