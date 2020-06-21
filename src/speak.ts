// native modules
import fs from 'fs';
import path from 'path';

// package modules
import httpReq from 'request';

const getPath = (p: string) => path.join(process.cwd(), p);

const tts = require(getPath('./tts.json'));

const ttsRequest = (txt: string) => {
	return new Promise((resolve, reject) => {
		const options = {
			url: 'https://naveropenapi.apigw.ntruss.com/voice-premium/v1/tts',
			method: 'post',
			form: {
				speaker: "nara",
				speed: 0,
				text: txt,
			},
			headers: {
				'X-NCP-APIGW-API-KEY-ID': global.naraId,
				'X-NCP-APIGW-API-KEY': global.naraKey,
			},
		};

		const date = Date.now();
		const fname = getPath('audio-files/' + date + '.mp3');
		const writeable = fs.createWriteStream(fname);

		try {
			const req = httpReq(options, (err) => {
				if ( err ) {
					reject(err);
				}
			});
			req.pipe(writeable);
		} catch(err) {
			reject(err);
		}

		writeable.on('close', () => {
			resolve(fname);
		});
	});
}

const say = (fname: string) => {
	return new Promise((resolve, reject) => {
		try {
			const dispatcher = global.connection.play(fname);
			dispatcher.on('finish', () => {
				resolve();
			});
		} catch(err) {
			reject(err);
		}
	});
}

export default async (txt: string) => {
	let fname = "";
	if ( tts[txt] ) {
		fname = tts[txt];
	} else {
		// 새로운 요청
		fname = await ttsRequest(txt) as string;
		tts[txt] = fname;
		fs.writeFile(getPath('./tts.json'), JSON.stringify(tts, null, '\t'), { encoding: 'utf8' }, () => {});
	}

	return say(fname);
}

global.naraId = "YOUR CPV ID";
global.naraKey = "YOUR CPV KEY";
