import { EventEmitter } from 'events';
import Read from './speak';
import path from 'path';

export enum FSM_STATUS {
	NONE      = 0,
	PENDING   = 0x1,
	CALLED    = 0x2,
	COMMAND   = 0x4,
}

const psleep = async (msec: number) => {
	return new Promise((resolve, reject) => {
		setTimeout(resolve, msec);
	});
}

export class FSM extends EventEmitter {
	public before: FSM_STATUS = FSM_STATUS.NONE;
	public now: FSM_STATUS = FSM_STATUS.NONE;

	constructor() {
		super();
		this.before = FSM_STATUS.PENDING;
	}

	public change(status: FSM_STATUS, ...args) {
		this.before = this.now;
		this.now = status;
		this.emit('status-' + (status | this.before), ...args);
	}

	public status(now: FSM_STATUS, before: FSM_STATUS, callback: Function) {
		this.on('status-' + (now | before), callback as any);
	}
}

const fsm = new FSM();
global.fsm = fsm;
fsm.status(FSM_STATUS.CALLED, FSM_STATUS.PENDING, async () => {
	Read('부르셨나요?');
	console.log("CALLED");
});
fsm.status(FSM_STATUS.COMMAND, FSM_STATUS.CALLED, async (res) => {
	fsm.change(FSM_STATUS.PENDING);

	await Read(res.answer);
	switch ( res.cmd ) {
		case "music.play":
			global.connection.play(
				path.join(process.cwd(), 'music.mp3')
			);
			break;
	}
});
