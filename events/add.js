const fs = require('fs');
const config = require("../config.json");

const youtube_search = require("youtube-search");
const youtube_stream = require('youtube-audio-stream')

youtube_options =
{
	maxResults: 10,
	key: config.youtube_api_token
}

exports.run = (client, msg, args) =>
{
	if (args.length <= 0)
	{
		msg.channel.send("Please enter a search term or url of a song to add");
		return;
	}

	// flatten args into string
	search_query = "";
	for (i = 0; i < args.length; i++)
	{
		search_query += args[i];
		search_query += " ";
	}

	youtube_search(search_query, youtube_options, function(err, results) {
		if(err) return console.log(err);

		msg.channel.send("Added " + results[0].title + " to the queue!").catch(console.error);
	})
}
