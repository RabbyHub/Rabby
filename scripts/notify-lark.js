#!/usr/bin/env node

// curl -X POST -H "Content-Type: application/json" \
// 	-d '{"msg_type":"text","content":{"text":"request example"}}'
const { createHmac } = require('crypto');
const Axios = require('axios');

function makeSign(secret) {
    const timestamp = Date.now();
    const timeSec = Math.floor(timestamp / 1000);
    const stringToSign = `${timeSec}\n${secret}`;
    const hash = createHmac('sha256', stringToSign).digest();

    const Signature = hash.toString('base64');

    return {
        timeSec,
        Signature,
    };
}

const chatURL = process.env.RABBY_LARK_CHAT_URL;
const secret = process.env.RABBY_LARK_CHAT_SECRET;

if (!chatURL) {
    throw new Error('LARK_CHAT_URL is not set');
}

if (!secret) {
    throw new Error('LARK_CHAT_SECRET is not set');
}

// sendMessage with axios
async function sendMessage({
    downloadURL = '',
    actionsJobUrl = '',
    gitCommitURL = '',
    gitRefURL = '',
    triggers = [],
}) {
    const { timeSec, Signature } = makeSign(secret);

    // dedupe
    triggers = [...new Set(triggers)];

    const headers = {
        'Content-Type': 'application/json',
        'Signature': Signature,
    };

    const body = {
        timestamp: timeSec,
        sign: Signature,
        // msg_type: 'text',
        // content: {
        //     text: message,
        // },
        msg_type: 'post',
        content: {
            post: {
                "zh_cn": {
                    "title": "🚀 New Rabby Debug Package comes 🌟",
                    "content": [
                        [
                            { "tag": "text", "text": `Download URL: ` },
                            { "tag": "a", "href": downloadURL, "text": downloadURL }
                        ],
                        [
                            { "tag": "text", "text": `---------` },
                        ],
                        [
                            { "tag": "text", "text": `Actions Job: ` },
                            { "tag": "a", "href": actionsJobUrl, "text": actionsJobUrl }
                        ],
                        [
                            { "tag": "text", "text": `Git Commit: ` },
                            { "tag": "a", "href": gitCommitURL, "text": gitCommitURL }
                        ],
                        gitRefURL && [
                            { "tag": "text", "text": `Git Ref: ` },
                            { "tag": "text", "text": gitRefURL }
                        ],
                        triggers.length && [
                            { "tag": "text", "text": `Triggers: ` },
                            { "tag": "text", "text": triggers.join(', ') }
                        ],
                    ].filter(Boolean)
                }
            }
        }
    };

    const res = await Axios.post(chatURL, body, { headers });
    console.log(res.data);
}

const args = process.argv.slice(2);

if (args[0]) {
    sendMessage({
        downloadURL: args[0],
        actionsJobUrl: args[1] || process.env.ACTIONS_JOB_URL,
        gitCommitURL: args[2] || process.env.GIT_COMMIT_URL,
        gitRefURL: process.env.GIT_REF_URL,
        triggers: [
            process.env.GITHUB_TRIGGERING_ACTOR,
            process.env.GITHUB_ACTOR,
        ].filter(Boolean)
    })
} else {
    console.log('[notify-lark] no message');
}