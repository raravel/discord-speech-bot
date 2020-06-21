// native modules
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

// package modules
import { Lame } from 'node-lame';

// axios
import axios from 'axios';
import { AxiosRequestConfig } from 'axios';

// discord.js
import Discord from 'discord.js';
import { Message, VoiceConnection, VoiceReceiver, User } from 'discord.js';

// local modules
import Indent from './indent';
import { FSM_STATUS, FSM } from './fsm';

// API Key 를 global 객체에 선언하기 위한 타입 재정의.
declare global {
	namespace NodeJS {
		interface Global {
			apiKey: string;
			status: number;
			fsm: FSM;
			connection: VoiceConnection;
			naraId: string;
			naraKey: string;
		}
	}
}

const SILENCE_FRAME = Buffer.from([0xF8, 0xFF, 0xFE]);
class Slience extends Readable {
	_read() {
		this.push(SILENCE_FRAME);
		this.destroy();
	}
}


const client = new Discord.Client();
var connection: VoiceConnection;
var receiver: VoiceReceiver;
var isRecord: boolean = false;

client.on('message', async (msg: Message) => {
	if ( !msg.guild ) return;

	if ( msg.content === "!참가" ) {
		connection = await msg?.member?.voice?.channel?.join() as VoiceConnection;
		receiver = connection?.receiver as VoiceReceiver;

		global.connection = connection;
		global.fsm.change(FSM_STATUS.PENDING);
		connection.play(new Slience(), { type: 'opus' });
		connection.on('speaking', async (user: User, speaking: boolean) => {
			if ( speaking && !isRecord ) {
				isRecord = true;
				msg?.channel?.send('녹음 시작');

				const date = new Date().getTime();
				const audioStream = receiver.createStream(user, { mode: 'pcm' });

				const pcmBufferChunks: Buffer[] = [];
				audioStream.on('data', (d: Buffer) => {
					pcmBufferChunks.push(d);
				});
				audioStream.on('end', async () => {
					msg.channel.send('녹음 종료');
					isRecord = false;
					const pcmBuffer: Buffer = Buffer.concat(pcmBufferChunks);

					const encoder = new Lame({
						output: 'buffer',
						bitrate: 48,
					}).setBuffer(pcmBuffer);

					await encoder.encode();
					msg.channel.send('인코딩 완료');

					const mp3Buffer = encoder.getBuffer();

					const audio = {
						content: mp3Buffer.toString('base64'),
					};
					const config = {
						encoding: 'MP3',
						sampleRateHertz: 48000,
						languageCode: 'ko-KR',
					};

					const request: AxiosRequestConfig = {
						url: 'https://speech.googleapis.com/v1p1beta1/speech:recognize',
						method: 'post',
						params: {
							alt: 'json',
							key: global.apiKey,
						},
						data: {
							config,
							audio,
						}
					};

					msg.channel.send("분석 시작");
					try {
						const res = await axios(request);
						const { results } = res.data;
						const scriptArr: string[] = [];

						if ( results ) {
							for ( const result of results ) {
								scriptArr.push(result.alternatives[0].transcript);
							}
						}

						const transcription = scriptArr.join('\n');
						
						msg.channel.send('분석 결과: ' + transcription);

						if ( transcription.trim() ) {
							if ( transcription.match(/안녕\s*나라야/) ) {
								global.fsm.change(FSM_STATUS.CALLED);
							} else if ( global.fsm.now === FSM_STATUS.CALLED ) {
								const res = Indent(transcription);
								global.fsm.change(FSM_STATUS.COMMAND, res);
							}
						}
					} catch(err) {
						console.error(err);
					}
				});
			}
		});
	} else if ( msg.content === "!해제") {
		await msg?.member?.voice?.channel?.leave();
	}
});

client.login('YOUR BOT KEY');
global.apiKey = 'YOUR SPEECH API ID';
