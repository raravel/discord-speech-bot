/////////////////////////////////////////////////////////////////////
//                       의도 추론 (indent)                        //
////////////////////////////////////////////////////////////////////
    /*
    의도 추론이란, 입력 문장이 어떤 의도인지 분류하기 위한 기준입니다.
    key: 의도타입 입니다.
    indent: 의도를 가름하는 정규식입니다.
    sub-indent: 하위 의도를 가리키는 오브젝트입니다.
    각 배열의 아이템은 정규식이 될 수 있습니다.
    */

interface Indent {
	key: string;
	indent: string[];
	pos: string;
	"sub-indent"?: Indent[];
	finish?: boolean;
}

const indentList: Indent[] = [
    {
        "key": "music",
        "pos": "subject",
        "indent": ["노래", "음악", "뮤직"],
        "sub-indent": [
            {
                "key": "play",
                "pos": "doit",
                "indent": [ "틀어\\S*", "재생\\S*" ],
                "finish": true,
            },
        ],
    },
];

const searchIndent = (msg, indent = indentList, deep: Answer[] = []) => {
    for ( let id of indent ) {
        if ( deep[deep.length - 1] && deep[deep.length - 1].key === "." ) {
            break;
        }

        for ( let regxStr of id.indent ) {
            if ( deep[deep.length - 1] && deep[deep.length - 1].key === "." ) {
                break;
            }

            const regx = new RegExp(regxStr);
            const result = msg.match(regx);
            if ( result ) {
                if ( typeof id['sub-indent'] === "object" ) {
                    const len = deep.length;
                    const t_res = searchIndent(msg.substr(result.index), id['sub-indent'], deep);
                }

                if ( id.finish ) {
					const answer: Answer = { key: ".", val: "끝", pos: 'finish' } as Answer;
                    deep.push(answer);
                }

                if ( deep[deep.length - 1] && deep[deep.length - 1].key === "." ) {
                    deep.unshift({ key: id.key, val: result[0], pos: id.pos });
                }
            }
        }
    }
    return deep;
};
/////////////////////////////////////////////////////////////////////
//                       답변 추리 (answer)                        //
////////////////////////////////////////////////////////////////////
/*
	답변 추리란, 현재까지 주워진 데이터와 입력받은 문장 속의 의도를 취합하여 최종적인 대답을 도출해냅니다.
	의도 추론의 결과인 deep 배열에 있는 정보들을 기준으로 각 상황에 맞을법한 문장을 선택하여 조합합니다.
*/

interface Answer {
	key: string;
	answer?: string;
	"sub-answer"?: Answer[];
	val?: string;
	pos?: string;
	cmd?: string;
}

const answerList: Answer[] = [
	{
		"key": "music",
		"sub-answer": [
			{
				"key": "play",
				"answer": "네. 노래를 재생해 드릴게요",
				"cmd": "music.play",
			},
		],
	}, // save
];

const searchAnswer = (deep: Answer[], list = answerList, level = 0) => {
	let answer = "";
	let cmd = "" ;
	const fidx = deep.findIndex(d => d.pos === "finish");
	if ( fidx !== -1 ) {
		deep.splice(fidx, 1);
	}

	for ( const item of deep ) {
		const idx = list.findIndex((an) => an.key === item.key);
		if ( idx === -1 ) continue;

		const obj = list[idx];

		if ( obj['answer'] ) {
			answer += `${obj['answer']}`;
			cmd = obj?.cmd || "";
			break;
		} else if ( typeof obj['sub-answer'] === "object" ) {
			const deepDump: Answer[] = [];
			for ( const d of deep ) {
				if ( d !== item ) {
					deepDump.push(d);
				}
			}

			const res = searchAnswer(deepDump, obj['sub-answer'], level+1);
			const tempAnswer = res.answer;
			if ( tempAnswer.trim() !== "" ) {
				answer += tempAnswer;
				cmd = res?.cmd;
				break;
			}
		}
	}

	return { answer, cmd };
};


export default (txt: string) => {
	const deep = searchIndent(txt);
	const answer = searchAnswer(deep);

	return answer;
}
