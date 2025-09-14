const chokidar = require("chokidar");
const fs = require("fs");
const VLC = require("./vlc");

const state = {
	banner: null,
	videos: [],
};

async function main() {
	// get the path of the watchable folder through user input
	// ask the user to provide a folder path and wait till user provides it
	const folderPath = await question("Enter the path of the folder to watch: ");
	console.log(`Watching folder: ${folderPath}`);

	// start vlc with remote control interface
	VLC.host = "localhost";
	VLC.port = 4212;
	VLC.start();
	await VLC.connect();
	await VLC.loop();
	await VLC.fullscreen();

	// initialize watcher
	const watcher = chokidar.watch(folderPath, { persistent: true });

	// watch for changes in the current directory
	watcher.add("./*");
	// on file add, play the file in vlc
	watcher.on("add", (path) => {
		console.log(`File ${path} has been added`);
		if (!state.banner && isImageFile(path)) {
			state.banner = path;
			console.log(`Set banner to ${path}`);
			VLC.addToPlaylist(path);
			return;
		}

		if (isVideoFile(path)) {
			if (isRaceVideo(path)) {
				state.videos.push(path);
				VLC.addToPlaylist(path);
			} else {
				// rename file to "race XX.ext" where XX is the next available number
				const ext = path.substring(path.lastIndexOf("."));
				const raceNumber = state.videos.length + 1;
				const newPath = path.substring(0, path.lastIndexOf("\\")) + `\\race ${String(raceNumber).padStart(2, "0")}${ext}`;
				console.log(`ren "${path}" "${newPath}"`);
				fs.renameSync(path, newPath);
			}
		}
	});
	// on file unlink, remove file from playlist in vlc
	watcher.on("unlink", (path) => {
		console.log(`File ${path} has been removed`);
	});
}

main().then();

function isRaceVideo(filename) {
	return /[\\\/]race \d{2}\.(mp4|mkv|avi|mov|wmv|flv|webm|mpg|mpeg|3gp)$/i.test(filename);
}

function isVideoFile(filename) {
	return /[\\\/].+\.(mp4|mkv|avi|mov|wmv|flv|webm|mpg|mpeg|3gp)$/i.test(filename);
}

function isImageFile(filename) {
	return /[\\\/].+\.(jpg|jpeg|png|bmp|gif|tiff|webp)$/i.test(filename);
}

// helper function that returns a promise for readline question
async function question(query) {
	const readline = require("readline").createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	return new Promise((resolve) => {
		readline.question(query, (ans) => {
			resolve(ans);
			readline.close();
		});
	});
}
