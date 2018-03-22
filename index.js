const discord = require("discord.js");
const client = new discord.Client();
const config = require("./config.json");
const ytdl = require("ytdl-core")

const fs = require("fs");

/* TODO
	1. Member permissions
	2. Separating queue functions from command interface
	3. Caching (LRU?) stream onto disk and grabbing it when needed.
	4. Database storage for configs and cached songs
	5. Multiple discord server usage
	6. Sharding?
	7. Pretty responses
		a. Now playing with thumbnail, link, requesting user, uploader
		b. Same information for search results
		c. Queue crosses out already played songs
	8. Paginated searching
	9. Paginated queue
	10. Seeking
	11. Volume
	12. Playlist export
	13. Smooth integration into user discord servers
		a. First time setup
		b. Setting permissions
		c. Link youtube account?
	14. Add songs by url
	15. Add playlist by url
	16. Soundcloud support
	17. Statistics
	18. Separate queue into its own file
*/

function Queue() {
	this.songs = [];
	this.current_song_id = 0;
	this.dispatcher = null;
	this.loop = false;

	this.join = function (msg) {
		return new Promise ((resolve, reject) => {
			if (!msg.member.voiceChannel || msg.member.voiceChannel.type != "voice")
				return msg.reply("You're not in a voice channel!");
			if (!msg.member.voiceChannel.joinable)
				return msg.reply("I can't join the voice channel you're in");

			msg.member.voiceChannel.join().then(connection => resolve(connection)).catch(err => reject(err));
		});
	};
	this.play = function (msg) {
		if (!msg.guild.voiceConnection)
			return this.join(msg).then(() => this.play(msg));

		if (this.is_playing())
			return msg.channel.send("I'm already playing!");

		if (this.songs.length == 0)
			return msg.channel.send("The playlist is empty!");

		this.dispatcher = msg.guild.voiceConnection.playStream(ytdl(this.songs[this.current_song_id].url, {audioonly: true}, {passes: config.passes}));
		this.dispatcher.on("end", (reason) => {
			next_song_id = (this.current_song_id + 1) % this.songs.length;

			if (next_song_id > this.current_song_id || this.loop) {
				this.current_song_id = next_song_id;
				this.play(msg);
			} else {
				msg.channel.send("The queue has finished playing. Thanks for listening!");
			}
		});
		this.dispatcher.on("error", (e) => {
			this.force_skip(msg);
			return console.log("Error: " + e);
		});
		msg.channel.send("Now playing " + this.songs[this.current_song_id].title);
	};
	this.force_skip = function (msg) {
		this.dispatcher.end("force_skip");
	};
	this.now_playing = function (msg) {
		return msg.channel.send("Now playing: " + this.songs[this.current_song_id].title)
	};
	this.pause = function (msg) {
		this.dispatcher.pause();
		msg.channel.send("Song paused");
	};
	this.resume = function (msg) {
		this.dispatcher.resume();
		msg.channel.send("Song resumed");
	};
	this.list_queue = function (msg) {
		if (this.songs.length == 0) {
			msg.channel.send("The queue is empty");
			return;
		}
		queue_string = "Current queue: \n"
		for (i = 0; i < this.songs.length; i++)
			queue_string += (1 + i) + ") " + this.songs[i].title + "\n";
		msg.channel.send(queue_string);
	};
	this.reset = function (msg) {
		this.songs = [];
		this.current_song_id = 0;
		if (this.dispatcher) 
			this.dispatcher.end("Queue reset");
		if (msg.guild.voiceConnection)
			msg.guild.voiceConnection.channel.leave();
		msg.channel.send("Queue cleared and music stopped");

	};
	this.is_playing = function (msg) {
		return this.dispatcher && !this.dispatcher.destroyed && !this.dispatcher.paused;
	}
	this.are_you_playing = function (msg) {
		return this.is_playing() ? msg.channel.send("Yup") : msg.channel.send("Nope");
	}
	this.loop = function (msg) {
		this.loop = true;
	}
	this.dontloop = function (msg) {
		this.loop = false;
	}
}

queue = new Queue();

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

client.on("disconnect", () => {
	queue.reset();	
});

client.on('message', msg => {
	if (!msg.content.startsWith(config.prefix) || msg.author.bot) return;

	const args = msg.content.slice(config.prefix.length).trim().split(/ +/g);
	const command = args.shift().toLowerCase();

	if (!queue[command]) {
		try {
			let commandFile = require(`./events/${command}.js`);
			commandFile.run(client, msg, args, queue);
		} catch (err) {
			console.error(err);
		}
	} else {
		queue[command](msg);
	}
});

client.login(config.token);