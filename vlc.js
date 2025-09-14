/**
 * Util for VLC media player's RC (remote control) interface.
 *
 * Usage:
 * const vlc = require('./vlc');
 * await vlc.connect();
 * await vlc.sendCommand('add /path/to/media/file');
 * await vlc.sendCommand('play');
 * await vlc.disconnect();
 * */
const net = require("net");

class VLC {
	constructor(host = "localhost", port = 4212) {
		this.host = host;
		this.port = port;
		this.client = new net.Socket();
		this.connected = false;
	}

	start() {
		const { exec } = require("child_process");
		exec(`vlc.exe --extraintf rc --rc-host ${this.host}:${this.port}`, async (error, stdout, stderr) => {
			if (error) {
				console.error(`Error starting VLC: ${error.message}`);
				return;
			}
			if (stderr) {
				console.error(`VLC stderr: ${stderr}`);
				process.exit();
				return;
			}
			console.log(`VLC stdout: ${stdout}`);

			await this.disconnect();
		});
	}

	connect() {
		return new Promise((resolve, reject) => {
			let attempts = 0;
			const interval = setInterval(() => {
				if (attempts >= 10) {
					clearInterval(interval);
					reject(new Error("Could not connect to VLC RC interface"));
					return;
				}
				console.log(`Attempting to connect to VLC RC interface... #${ attempts + 1 }`);
				attempts++;
				this.client.connect(this.port, this.host, () => {
					clearInterval(interval);
					this.connected = true;
					console.log("Connected to VLC RC interface");

					this.client.on("close", () => {
						this.connected = false;
						console.log("Connection to VLC closed");
					});
					resolve();
				});
				this.client.on("error", () => {
					// ignore errors, we'll retry
				});
			}, 1000);
		});
	}

	sendCommand(command) {
		return new Promise((resolve, reject) => {
			if (!this.connected) {
				return reject("Not connected to VLC");
			}
			this.client.write(command + "\n", (err) => {
				if (err) {
					return reject(`Error sending command to VLC: ${err.message}`);
				}
				resolve();
			});
		});
	}

	disconnect() {
		return new Promise((resolve) => {
			if (this.connected) {
				this.client.end(() => {
					this.connected = false;
					resolve();
				});
			} else {
				resolve();
			}
		});
	}

	// media controls
	play() {
		return this.sendCommand("play");
	}

	pause() {
		return this.sendCommand("pause");
	}

	stop() {
		return this.sendCommand("stop");
	}

	next() {
		return this.sendCommand("next");
	}

	previous() {
		return this.sendCommand("prev");
	}

	addToPlaylist(filePath) {
		return this.sendCommand(`add ${filePath}`);
	}

	removeFromPlaylist(index) {
		return this.sendCommand(`del ${index}`);
	}

	clearPlaylist() {
		return this.sendCommand("clear");
	}

	showPlaylist() {
		return this.sendCommand("playlist");
	}

	// volume controls
	volumeUp() {
		return this.sendCommand("volup 10");
	}

	volumeDown() {
		return this.sendCommand("voldown 10");
	}

	mute() {
		return this.sendCommand("mute");
	}

	unmute() {
		return this.sendCommand("unmute");
	}

	setVolume(level) {
		return this.sendCommand(`volume ${level}`);
	}

	fullscreen() {
		return this.sendCommand("fullscreen");
	}

	loop() {
		return this.sendCommand("loop");
	}
}

module.exports = new VLC();