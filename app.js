const Discord = require('discord.js-selfbot-v13');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

console.log('[STARTUP] Script starting...');

process.on('unhandledRejection', () => {});
process.on('uncaughtException', () => {});
process.on('uncaughtExceptionMonitor', () => {});
process.on('warning', () => {});
process.setMaxListeners(0);
require('events').defaultMaxListeners = 0;

const SESSION_FILE = './session.json';
let sessionData = {};

function loadSession() {
    try {
        if (fs.existsSync(SESSION_FILE)) {
            sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
            return sessionData;
        }
    } catch (e) {}
    sessionData = {
        session_id: crypto.randomBytes(16).toString('hex'),
        created_at: new Date().toISOString(),
        clones: {}
    };
    saveSession();
    return sessionData;
}

function saveSession() {
    try { fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2)); } catch (e) {}
}

loadSession();

const SCRIPT_NAME = 'GUNNAH X';
const SCRIPT_VERSION = 'v3.0';
const owners = ["1397005513186607177"];
const APP_ID = '1493725980487974983';
const PREFIX = '.';

let config = {};
try {
    config = require('./config2.json');
} catch (e) {
    console.log('[FATAL] config2.json not found!');
    process.exit(1);
}

const state = {
    startTime: Date.now(),
    startTimes: {},
    onelainactive: {},
    multimsga: {},
    channelactive: {},
    shanelmultia: {},
    onelainIndex: {},
    multiIndex: {},
    chanSpamIndex: {},
    shanelMultiIndex: {},
    spamDelays: {},
    packLoopActive: new Map(),
    changeGroupActive: new Map(),
    voiceClients: new Map(),
    tokens: [],
    tokenNames: {},
    tokenSessions: {},
    clients: {},
    mainToken: null,
    mainClient: null
};

let proxies = [];
let proxyIdx = 0;
let useProxy = false;

function loadProxies() {
    try {
        if (fs.existsSync('./proxies.txt')) {
            proxies = fs.readFileSync('./proxies.txt', 'utf-8').split(/\r?\n/).filter(l => l.trim());
            if (proxies.length > 0) useProxy = true;
            console.log('[PROXY] loaded', proxies.length);
        }
    } catch (e) {}
}

function getProxy() {
    if (!useProxy || proxies.length === 0) return null;
    const p = proxies[proxyIdx % proxies.length];
    proxyIdx++;
    try {
        const HttpsProxyAgent = require('https-proxy-agent');
        return new HttpsProxyAgent(`http://${p}`);
    } catch (e) { return null; }
}

function getHeaders(token) {
    const v = ['120','121','122','123','124','125','126'][Math.floor(Math.random()*7)];
    const build = Math.floor(Math.random() * 9999);
    const patch = Math.floor(Math.random() * 999);
    const locales = ["en-US", "en-GB", "ro-RO"];
    const timezones = ["America/New_York", "Europe/London", "Europe/Bucharest"];
    const locale = locales[Math.floor(Math.random() * locales.length)];
    const timezone = timezones[Math.floor(Math.random() * timezones.length)];
    const ua = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.${build}.${patch} Safari/537.36`;

    const superProps = Buffer.from(JSON.stringify({
        os: "Windows",
        browser: "Chrome",
        device: "",
        system_locale: locale,
        browser_user_agent: ua,
        browser_version: `${v}.0.0.0`,
        os_version: "10",
        referrer: "",
        referring_domain: "",
        referrer_current: "",
        referring_domain_current: "",
        release_channel: "stable",
        client_build_number: Math.floor(Math.random() * 200000 + 250000),
        client_event_source: null
    })).toString('base64');

    return {
        'Authorization': token,
        'Content-Type': 'application/json',
        'User-Agent': ua,
        'Accept': '*/*',
        'Accept-Language': `${locale},en;q=0.9`,
        'Accept-Encoding': 'gzip, deflate, br',
        'X-Super-Properties': superProps,
        'X-Discord-Locale': locale,
        'X-Discord-Timezone': timezone,
        'Sec-Ch-Ua': `"Chromium";v="${v}", "Google Chrome";v="${v}", "Not?A_Brand";v="99"`,
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'X-Fingerprint': crypto.randomBytes(16).toString('hex'),
        'DNT': '1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Origin': 'https://discord.com',
        'Referer': 'https://discord.com/channels/@me'
    };
}

function getAccountName(index) {
    if (index === 0) {
        return client.user ? client.user.username : 'main';
    }
    const idx = index - 1;
    if (idx >= 0 && idx < state.tokens.length) {
        return state.tokenNames[idx] || `token ${index}`;
    }
    return `token ${index}`;
}

function getChannelName(channelId) {
    try {
        const channel = client.channels.cache.get(channelId);
        return channel ? `#${channel.name}` : `<#${channelId}>`;
    } catch (e) {
        return `<#${channelId}>`;
    }
}

function formatUptime(ms) {
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    let result = '';
    if (d > 0) result += `${d}d `;
    if (h > 0 || d > 0) result += `${h}h `;
    if (m > 0 || h > 0 || d > 0) result += `${m}m `;
    result += `${s}s`;
    return result;
}

function getStatusMessage(type, accountName, channelName, uptime) {
    let mode = 'spam';
    if (type === 'normal') mode = 'spam';
    else if (type === 'shift') mode = 'multi-spam';
    else if (type === 'pack') mode = 'pack 24/7';
    else if (type === 'changegroup') mode = 'change group';
    return `-# ${accountName} ${mode} on ${channelName} ${uptime}`;
}

function randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getMessages() {
    try {
        const filePath = path.join(__dirname, 'dume.txt');
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, 'Mesaj 1\nMesaj 2\nMesaj 3');
            return ["Mesaj 1", "Mesaj 2", "Mesaj 3"];
        }
        const data = fs.readFileSync(filePath, 'utf8');
        const lines = data.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
        if (lines.length === 0) {
            fs.writeFileSync(filePath, 'Mesaj 1\nMesaj 2\nMesaj 3');
            return ["Mesaj 1", "Mesaj 2", "Mesaj 3"];
        }
        return lines;
    } catch (err) {
        return ["Eroare citire fisier"];
    }
}

function getMultiMessages() {
    try {
        const filePath = path.join(__dirname, 'mesaje.txt');
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, 'Paragraf 1\n\nParagraf 2\n\nParagraf 3');
            return ["Paragraf 1", "Paragraf 2", "Paragraf 3"];
        }
        const data = fs.readFileSync(filePath, 'utf8');
        const paragraphs = data.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
        if (paragraphs.length === 0) {
            fs.writeFileSync(filePath, 'Paragraf 1\n\nParagraf 2\n\nParagraf 3');
            return ["Paragraf 1", "Paragraf 2", "Paragraf 3"];
        }
        return paragraphs;
    } catch (err) {
        return ["Eroare citire fisier"];
    }
}

async function sendMessage(channelId, token, content, retries = 3) {
    if (!content || content.trim().length === 0) return false;
    if (!token) return false;

    const agent = getProxy();

    for (let i = 0; i < retries; i++) {
        try {
            const headers = getHeaders(token);
            await axios.post(
                `https://discord.com/api/v9/channels/${channelId}/messages`,
                { content: content },
                { headers: headers, httpsAgent: agent, timeout: 15000 }
            );
            return true;
        } catch (e) {
            if (e.response?.status === 429) {
                const ra = e.response.data?.retry_after || 5;
                await new Promise(r => setTimeout(r, ra * 1000 + 2000));
            }
            if (i < retries - 1) {
                await new Promise(r => setTimeout(r, randomDelay(2000, 4000)));
            }
        }
    }
    return false;
}

async function sendConfirm(msg, text, delay = 5000) {
    try {
        const m = await msg.channel.send(text);
        setTimeout(() => { m.delete().catch(() => {}); }, delay);
        return m;
    } catch (e) {
        try {
            const channel = msg.channel;
            const m = await channel.send(text);
            setTimeout(() => { m.delete().catch(() => {}); }, delay);
            return m;
        } catch (err) {}
    }
    return null;
}

async function uploadImage(token, imageUrl) {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('mp:')) return imageUrl;

    const cdn = imageUrl.match(/attachments\/(\d+)\/(\d+)\/(.+)/);
    if (cdn) return `mp:attachments/${cdn[1]}/${cdn[2]}/${cdn[3]}`;

    try {
        const imgData = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 10000 });
        const userId = Buffer.from(token.split('.')[0], 'base64').toString();

        const dm = await axios.post('https://discord.com/api/v9/users/@me/channels',
            { recipient_id: userId },
            { headers: getHeaders(token) }
        );

        const boundary = `----${Date.now()}`;
        const body = Buffer.concat([
            Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="rpc.png"\r\nContent-Type: image/png\r\n\r\n`),
            imgData.data,
            Buffer.from(`\r\n--${boundary}--\r\n`)
        ]);

        const upload = await axios.post(
            `https://discord.com/api/v9/channels/${dm.data.id}/messages`,
            body,
            { headers: { ...getHeaders(token), 'Content-Type': `multipart/form-data; boundary=${boundary}` } }
        );

        if (upload.data.attachments) {
            const att = upload.data.attachments[0].url;
            const m = att.match(/attachments\/(\d+)\/(\d+)\/(.+)/);
            if (m) return `mp:attachments/${m[1]}/${m[2]}/${m[3]}`;
        }
        return null;
    } catch (e) { return null; }
}

// ==================== TOKEN FUNCTIONS ====================
function getTokenByIndex(index) {
    const idx = index - 1;
    if (idx >= 0 && idx < state.tokens.length) {
        return state.tokens[idx];
    }
    return null;
}

function getClientByIndex(index) {
    const idx = index - 1;
    if (idx >= 0 && idx < state.tokens.length) {
        return state.clients[idx];
    }
    return null;
}

function getTokenNameByIndex(index) {
    const idx = index - 1;
    if (idx >= 0 && idx < state.tokens.length) {
        return state.tokenNames[idx] || `Token ${index}`;
    }
    return `Token ${index}`;
}

function isValidIndex(index) {
    const idx = index - 1;
    return idx >= 0 && idx < state.tokens.length;
}

async function validateToken(token) {
    try {
        const agent = getProxy();
        const res = await axios.get('https://discord.com/api/v9/users/@me', {
            headers: getHeaders(token),
            httpsAgent: agent,
            timeout: 10000
        });
        if (res.status === 200 && res.data && !res.data.bot) {
            return { valid: true, username: res.data.username, id: res.data.id };
        }
    } catch (e) {}
    return { valid: false };
}

async function loadTokens() {
    try {
        const tokenFile = './tokens2.txt';
        if (!fs.existsSync(tokenFile)) {
            fs.writeFileSync(tokenFile, '');
            console.log('[TOKENS] tokens2.txt created');
            return 0;
        }

        const data = fs.readFileSync(tokenFile, 'utf-8');
        let rawTokens = data.split(/\r?\n/).map(t => t.trim()).filter(t => t.length > 10);
        state.tokens = [];
        state.tokenNames = {};
        state.tokenSessions = {};
        let validTokens = [];

        console.log('[TOKENS] found', rawTokens.length, 'tokens');

        for (let i = 0; i < rawTokens.length; i++) {
            try {
                const result = await validateToken(rawTokens[i]);
                if (result.valid) {
                    state.tokens.push(rawTokens[i]);
                    state.tokenNames[state.tokens.length - 1] = result.username;
                    // Session ID pentru fiecare token
                    state.tokenSessions[state.tokens.length - 1] = crypto.randomBytes(16).toString('hex');
                    validTokens.push(rawTokens[i]);
                    console.log('[TOKEN', i+1, '] valid:', result.username, 'session:', state.tokenSessions[state.tokens.length - 1].slice(0, 8));
                }
            } catch (e) {}
            await new Promise(r => setTimeout(r, randomDelay(100, 300)));
        }

        fs.writeFileSync(tokenFile, validTokens.join('\n'), 'utf-8');
        console.log('[TOKENS] loaded', state.tokens.length, 'valid tokens');
        return state.tokens.length;
    } catch (err) {
        console.log('[TOKENS] error:', err.message);
        return 0;
    }
}

// ==================== KEEP ALIVE PENTRU CLONE ====================
function startCloneKeepAlive(clone, index) {
    const interval = setInterval(() => {
        if (clone && clone.ws) {
            try {
                clone.ws.send(JSON.stringify({ op: 1, d: null }));
            } catch (e) {}
        }
    }, 30000);
    return interval;
}

// ==================== SPAM FUNCTIONS ====================
async function packSpam(channelId, tokenIndex, mentions = '') {
    const token = getTokenByIndex(tokenIndex);
    if (!token) return;
    const key = `pack-${tokenIndex}-${channelId}`;
    state.packLoopActive.set(key, true);
    state.startTimes[`pack_${tokenIndex}`] = { time: Date.now(), channel: channelId };
    if (state.onelainIndex[tokenIndex] === undefined) state.onelainIndex[tokenIndex] = 0;
    const delay = state.spamDelays[tokenIndex] || 2500;

    const loop = async () => {
        if (!state.packLoopActive.get(key)) {
            state.packLoopActive.delete(key);
            delete state.startTimes[`pack_${tokenIndex}`];
            return;
        }
        try {
            const messages = getMessages();
            if (messages.length > 0) {
                if (state.onelainIndex[tokenIndex] >= messages.length) state.onelainIndex[tokenIndex] = 0;
                const msg = messages[state.onelainIndex[tokenIndex]];
                if (msg) {
                    await sendMessage(channelId, token, `${msg} ${mentions}`.trim());
                    state.onelainIndex[tokenIndex]++;
                }
            }
        } catch (e) {}
        setTimeout(loop, delay);
    };
    loop();
}

async function startSpam(channelId, tokenIndex, mentions = '') {
    const token = getTokenByIndex(tokenIndex);
    if (!token) return;
    state.onelainactive[tokenIndex] = true;
    state.startTimes[`normal_${tokenIndex}`] = { time: Date.now(), channel: channelId };
    if (state.onelainIndex[tokenIndex] === undefined) state.onelainIndex[tokenIndex] = 0;
    const delay = state.spamDelays[tokenIndex] || 2500;

    const loop = async () => {
        if (!state.onelainactive[tokenIndex]) {
            delete state.startTimes[`normal_${tokenIndex}`];
            return;
        }
        try {
            const messages = getMessages();
            if (messages.length > 0) {
                if (state.onelainIndex[tokenIndex] >= messages.length) state.onelainIndex[tokenIndex] = 0;
                const msg = messages[state.onelainIndex[tokenIndex]];
                if (msg) {
                    await sendMessage(channelId, token, `${msg} ${mentions}`.trim());
                    state.onelainIndex[tokenIndex]++;
                }
            }
        } catch (e) {}
        setTimeout(loop, delay);
    };
    loop();
}

async function startMultiSpam(channelId, tokenIndex, mentions = '') {
    const token = getTokenByIndex(tokenIndex);
    if (!token) return;
    state.multimsga[tokenIndex] = true;
    state.startTimes[`shift_${tokenIndex}`] = { time: Date.now(), channel: channelId };
    if (state.multiIndex[tokenIndex] === undefined) state.multiIndex[tokenIndex] = 0;
    const delay = state.spamDelays[tokenIndex] || 2500;

    const loop = async () => {
        if (!state.multimsga[tokenIndex]) {
            delete state.startTimes[`shift_${tokenIndex}`];
            return;
        }
        try {
            const messages = getMultiMessages();
            if (messages.length > 0) {
                if (state.multiIndex[tokenIndex] >= messages.length) state.multiIndex[tokenIndex] = 0;
                const msg = messages[state.multiIndex[tokenIndex]];
                if (msg) {
                    await sendMessage(channelId, token, `${msg} ${mentions}`.trim());
                    state.multiIndex[tokenIndex]++;
                }
            }
        } catch (e) {}
        setTimeout(loop, delay);
    };
    loop();
}

async function startChannelSpam(targetChannel, tokenIndex, mentions = '') {
    const token = getTokenByIndex(tokenIndex);
    if (!token) return;
    state.channelactive[tokenIndex] = true;
    if (state.chanSpamIndex[tokenIndex] === undefined) state.chanSpamIndex[tokenIndex] = 0;
    const delay = state.spamDelays[tokenIndex] || 2500;

    const loop = async () => {
        if (!state.channelactive[tokenIndex]) return;
        try {
            const messages = getMessages();
            if (messages.length > 0) {
                if (state.chanSpamIndex[tokenIndex] >= messages.length) state.chanSpamIndex[tokenIndex] = 0;
                const msg = messages[state.chanSpamIndex[tokenIndex]];
                if (msg) {
                    await sendMessage(targetChannel, token, `${msg} ${mentions}`.trim());
                    state.chanSpamIndex[tokenIndex]++;
                }
            }
        } catch (e) {}
        setTimeout(loop, delay);
    };
    loop();
}

async function startMultiChannelSpam(targetChannel, tokenIndex, mentions = '') {
    const token = getTokenByIndex(tokenIndex);
    if (!token) return;
    state.shanelmultia[tokenIndex] = true;
    if (state.shanelMultiIndex[tokenIndex] === undefined) state.shanelMultiIndex[tokenIndex] = 0;
    const delay = state.spamDelays[tokenIndex] || 2500;

    const loop = async () => {
        if (!state.shanelmultia[tokenIndex]) return;
        try {
            const messages = getMultiMessages();
            if (messages.length > 0) {
                if (state.shanelMultiIndex[tokenIndex] >= messages.length) state.shanelMultiIndex[tokenIndex] = 0;
                const msg = messages[state.shanelMultiIndex[tokenIndex]];
                if (msg) {
                    await sendMessage(targetChannel, token, `${msg} ${mentions}`.trim());
                    state.shanelMultiIndex[tokenIndex]++;
                }
            }
        } catch (e) {}
        setTimeout(loop, delay);
    };
    loop();
}

async function changeGroupName(groupId, tokenIndex, names) {
    const token = getTokenByIndex(tokenIndex);
    if (!token) return;

    const key = `changegroup-${tokenIndex}-${groupId}`;
    state.changeGroupActive.set(key, true);
    state.startTimes[`changegroup_${tokenIndex}`] = { time: Date.now(), channel: groupId };
    if (state.onelainIndex[`changegroup_${tokenIndex}`] === undefined) state.onelainIndex[`changegroup_${tokenIndex}`] = 0;
    const delay = state.spamDelays[tokenIndex] || 3000;

    const loop = async () => {
        if (!state.changeGroupActive.get(key)) {
            state.changeGroupActive.delete(key);
            delete state.startTimes[`changegroup_${tokenIndex}`];
            return;
        }
        try {
            const nameList = names;
            if (nameList.length > 0) {
                if (state.onelainIndex[`changegroup_${tokenIndex}`] >= nameList.length) state.onelainIndex[`changegroup_${tokenIndex}`] = 0;
                const name = nameList[state.onelainIndex[`changegroup_${tokenIndex}`]];
                if (name) {
                    await axios.patch(
                        `https://discord.com/api/v9/channels/${groupId}`,
                        { name: name },
                        { headers: getHeaders(token) }
                    );
                    state.onelainIndex[`changegroup_${tokenIndex}`]++;
                }
            }
        } catch (e) {}
        setTimeout(loop, delay);
    };
    loop();
}

// ==================== COMMANDS ====================
const commands = {
    async pack(msg, args) {
        await msg.delete().catch(() => {});
        const idx = parseInt(args[0]);
        if (isNaN(idx) || idx < 1 || !isValidIndex(idx)) {
            return sendConfirm(msg, "-# usage: .pack [token] [@]");
        }
        const mentions = args.slice(1).join(' ');
        const key = `pack-${idx}-${msg.channel.id}`;
        if (state.packLoopActive.get(key)) return sendConfirm(msg, "-# pack running");
        state.spamDelays[idx] = 2500;
        packSpam(msg.channel.id, idx, mentions);
        sendConfirm(msg, `-# pack started for ${getTokenNameByIndex(idx)}`);
    },

    async packstop(msg, args) {
        await msg.delete().catch(() => {});
        const idx = parseInt(args[0]);
        if (isNaN(idx) || idx < 1) return sendConfirm(msg, "-# usage: .packstop [token]");
        const key = `pack-${idx}-${msg.channel.id}`;
        state.packLoopActive.delete(key);
        delete state.startTimes[`pack_${idx}`];
        sendConfirm(msg, `-# pack stopped for ${getTokenNameByIndex(idx)}`);
    },

    async start(msg, args) {
        await msg.delete().catch(() => {});
        const idx = parseInt(args[0]);
        if (isNaN(idx) || idx < 1 || !isValidIndex(idx)) {
            return sendConfirm(msg, "-# usage: .start [token] [@]");
        }
        if (state.onelainactive[idx]) return sendConfirm(msg, "-# spam running");
        const mentions = args.slice(1).join(' ');
        state.spamDelays[idx] = 2500;
        startSpam(msg.channel.id, idx, mentions);
        sendConfirm(msg, `-# spam started for ${getTokenNameByIndex(idx)}`);
    },

    async stop(msg, args) {
        await msg.delete().catch(() => {});
        const idx = parseInt(args[0]);
        if (isNaN(idx) || idx < 1) return sendConfirm(msg, "-# usage: .stop [token]");
        state.onelainactive[idx] = false;
        delete state.startTimes[`normal_${idx}`];
        sendConfirm(msg, `-# spam stopped for ${getTokenNameByIndex(idx)}`);
    },

    async mstart(msg, args) {
        await msg.delete().catch(() => {});
        const idx = parseInt(args[0]);
        if (isNaN(idx) || idx < 1 || !isValidIndex(idx)) {
            return sendConfirm(msg, "-# usage: .mstart [token] [@]");
        }
        if (state.multimsga[idx]) return sendConfirm(msg, "-# multi-spam running");
        const mentions = args.slice(1).join(' ');
        state.spamDelays[idx] = 2500;
        startMultiSpam(msg.channel.id, idx, mentions);
        sendConfirm(msg, `-# multi-spam started for ${getTokenNameByIndex(idx)}`);
    },

    async mstop(msg, args) {
        await msg.delete().catch(() => {});
        const idx = parseInt(args[0]);
        if (isNaN(idx) || idx < 1) return sendConfirm(msg, "-# usage: .mstop [token]");
        state.multimsga[idx] = false;
        delete state.startTimes[`shift_${idx}`];
        sendConfirm(msg, `-# multi-spam stopped for ${getTokenNameByIndex(idx)}`);
    },

    async startchannel(msg, args) {
        await msg.delete().catch(() => {});
        const idx = parseInt(args[0]);
        const channelId = args[1];
        if (isNaN(idx) || idx < 1 || !isValidIndex(idx)) {
            return sendConfirm(msg, "-# usage: .startchannel [token] [channel_id] [@]");
        }
        if (!channelId) return sendConfirm(msg, "-# need channel id");
        if (state.channelactive[idx]) return sendConfirm(msg, "-# channel spam running");
        const mentions = args.slice(2).join(' ');
        const token = getTokenByIndex(idx);
        state.channelactive[idx] = true;
        state.startTimes[`normal_${idx}`] = { time: Date.now(), channel: channelId };
        if (state.chanSpamIndex[idx] === undefined) state.chanSpamIndex[idx] = 0;
        const delay = state.spamDelays[idx] || 2500;
        const loop = async () => {
            if (!state.channelactive[idx]) { delete state.startTimes[`normal_${idx}`]; return; }
            try {
                const messages = getMessages();
                if (messages.length > 0) {
                    if (state.chanSpamIndex[idx] >= messages.length) state.chanSpamIndex[idx] = 0;
                    const msg = messages[state.chanSpamIndex[idx]];
                    if (msg) {
                        await sendMessage(channelId, token, `${msg} ${mentions}`.trim());
                        state.chanSpamIndex[idx]++;
                    }
                }
            } catch (e) {}
            setTimeout(loop, delay);
        };
        loop();
        sendConfirm(msg, `-# channel spam started for ${getTokenNameByIndex(idx)} on ${getChannelName(channelId)}`);
    },

    async stopchannel(msg, args) {
        await msg.delete().catch(() => {});
        const idx = parseInt(args[0]);
        if (isNaN(idx) || idx < 1) return sendConfirm(msg, "-# usage: .stopchannel [token]");
        state.channelactive[idx] = false;
        delete state.startTimes[`normal_${idx}`];
        sendConfirm(msg, `-# channel spam stopped for ${getTokenNameByIndex(idx)}`);
    },

    async mstartchannel(msg, args) {
        await msg.delete().catch(() => {});
        const idx = parseInt(args[0]);
        const channelId = args[1];
        if (isNaN(idx) || idx < 1 || !isValidIndex(idx)) {
            return sendConfirm(msg, "-# usage: .mstartchannel [token] [channel_id] [@]");
        }
        if (!channelId) return sendConfirm(msg, "-# need channel id");
        if (state.shanelmultia[idx]) return sendConfirm(msg, "-# multi-channel spam running");
        const mentions = args.slice(2).join(' ');
        const token = getTokenByIndex(idx);
        state.shanelmultia[idx] = true;
        state.startTimes[`shift_${idx}`] = { time: Date.now(), channel: channelId };
        if (state.shanelMultiIndex[idx] === undefined) state.shanelMultiIndex[idx] = 0;
        const delay = state.spamDelays[idx] || 2500;
        const loop = async () => {
            if (!state.shanelmultia[idx]) { delete state.startTimes[`shift_${idx}`]; return; }
            try {
                const messages = getMultiMessages();
                if (messages.length > 0) {
                    if (state.shanelMultiIndex[idx] >= messages.length) state.shanelMultiIndex[idx] = 0;
                    const msg = messages[state.shanelMultiIndex[idx]];
                    if (msg) {
                        await sendMessage(channelId, token, `${msg} ${mentions}`.trim());
                        state.shanelMultiIndex[idx]++;
                    }
                }
            } catch (e) {}
            setTimeout(loop, delay);
        };
        loop();
        sendConfirm(msg, `-# multi-channel spam started for ${getTokenNameByIndex(idx)} on ${getChannelName(channelId)}`);
    },

    async mstopchannel(msg, args) {
        await msg.delete().catch(() => {});
        const idx = parseInt(args[0]);
        if (isNaN(idx) || idx < 1) return sendConfirm(msg, "-# usage: .mstopchannel [token]");
        state.shanelmultia[idx] = false;
        delete state.startTimes[`shift_${idx}`];
        sendConfirm(msg, `-# multi-channel spam stopped for ${getTokenNameByIndex(idx)}`);
    },

    async changegroup(msg, args) {
        await msg.delete().catch(() => {});
        const idx = parseInt(args[0]);
        const groupId = args[1];
        const names = args.slice(2);
        if (isNaN(idx) || idx < 1 || !isValidIndex(idx)) {
            return sendConfirm(msg, "-# usage: .changegroup [token] [group_id] [names]");
        }
        if (!groupId || names.length === 0) return sendConfirm(msg, "-# need group_id and names");
        const key = `changegroup-${idx}-${groupId}`;
        if (state.changeGroupActive.get(key)) return sendConfirm(msg, "-# change group running");
        state.spamDelays[idx] = 3000;
        changeGroupName(groupId, idx, names);
        sendConfirm(msg, `-# change group started for ${getTokenNameByIndex(idx)} on ${getChannelName(groupId)}`);
    },

    async changegroupstop(msg, args) {
        await msg.delete().catch(() => {});
        const idx = parseInt(args[0]);
        const groupId = args[1];
        if (isNaN(idx) || idx < 1) return sendConfirm(msg, "-# usage: .changegroupstop [token] [group_id]");
        if (!groupId) return sendConfirm(msg, "-# need group_id");
        const key = `changegroup-${idx}-${groupId}`;
        state.changeGroupActive.delete(key);
        delete state.startTimes[`changegroup_${idx}`];
        sendConfirm(msg, `-# change group stopped for ${getTokenNameByIndex(idx)}`);
    },

    async delay(msg, args) {
        await msg.delete().catch(() => {});
        const idx = parseInt(args[0]);
        const delay = parseInt(args[1]);
        if (isNaN(idx) || idx < 1 || !isValidIndex(idx)) {
            return sendConfirm(msg, "-# usage: .delay [token] [ms]");
        }
        if (isNaN(delay) || delay < 500) return sendConfirm(msg, "-# delay min 500ms");
        state.spamDelays[idx] = delay;
        sendConfirm(msg, `-# delay set to ${delay}ms for ${getTokenNameByIndex(idx)}`);
    },

    async status(msg, args) {
        await msg.delete().catch(() => {});
        let report = "";
        let found = false;
        if (!state.startTimes || Object.keys(state.startTimes).length === 0) {
            return sendConfirm(msg, "-# no spam running");
        }
        for (const [key, data] of Object.entries(state.startTimes)) {
            const parts = key.split('_');
            const type = parts[0];
            const idx = parseInt(parts[1]);
            if (isNaN(idx)) continue;
            const accountName = getAccountName(idx);
            const channelName = getChannelName(data.channel);
            const uptime = formatUptime(Date.now() - data.time);
            const line = getStatusMessage(type, accountName, channelName, uptime);
            report += line + "\n";
            found = true;
        }
        if (!found) return sendConfirm(msg, "-# no spam running");
        await msg.channel.send(report);
    },

    async tokens(msg) {
        await msg.delete().catch(() => {});
        let response = "-# **valid tokens:**\n";
        let found = 0;
        for (let i = 0; i < state.tokens.length; i++) {
            const name = state.tokenNames[i];
            if (!name) continue;
            found++;
            const session = state.tokenSessions[i] ? state.tokenSessions[i].slice(0, 8) : 'none';
            response += `-# ${i + 1}. \`${name}\` (${session})\n`;
        }
        if (found === 0) {
            return sendConfirm(msg, "-# no valid tokens. add to tokens2.txt");
        }
        await msg.channel.send(response);
    },

    async reloadtokens(msg, args) {
        await msg.delete().catch(() => {});
        const m = await msg.channel.send("-# verifying tokens...");
        const count = await loadTokens();
        await m.edit(`-# reloaded (${count} valid tokens)`);
        setTimeout(() => m.delete(), 3000);
    },

    async tokenadd(msg, args) {
        await msg.delete().catch(() => {});
        const tkn = args[0];
        if (!tkn) return sendConfirm(msg, "-# need token");
        if (state.tokens.includes(tkn)) return sendConfirm(msg, "-# token exists");
        try {
            const result = await validateToken(tkn);
            if (result.valid) {
                fs.appendFileSync('./tokens2.txt', `\n${tkn}`);
                state.tokens.push(tkn);
                state.tokenNames[state.tokens.length - 1] = result.username;
                state.tokenSessions[state.tokens.length - 1] = crypto.randomBytes(16).toString('hex');
                sendConfirm(msg, `-# validated: ${result.username} (${state.tokenSessions[state.tokens.length - 1].slice(0, 8)})`);
            } else {
                sendConfirm(msg, "-# invalid token");
            }
        } catch (e) {
            sendConfirm(msg, "-# error validating");
        }
    },

    async uptime(msg) {
        await msg.delete().catch(() => {});
        sendConfirm(msg, `-# uptime: ${formatUptime(Date.now() - state.startTime)}`);
    },

    async say(msg, args) {
        await msg.delete().catch(() => {});
        const idx = parseInt(args[0]);
        if (isNaN(idx) || idx < 1 || !isValidIndex(idx)) {
            return sendConfirm(msg, "-# usage: .say [token] [message]");
        }
        const message = args.slice(1).join(' ');
        if (!message) return sendConfirm(msg, "-# need message");
        const token = getTokenByIndex(idx);
        if (!token) return sendConfirm(msg, `-# token ${idx} invalid`);
        await sendMessage(msg.channel.id, token, message);
    },

    async sayid(msg, args) {
        await msg.delete().catch(() => {});
        const idx = parseInt(args[0]);
        const channelId = args[1];
        if (isNaN(idx) || idx < 1 || !isValidIndex(idx)) {
            return sendConfirm(msg, "-# usage: .sayid [token] [channel_id] [message]");
        }
        if (!channelId) return sendConfirm(msg, "-# need channel id");
        const message = args.slice(2).join(' ');
        if (!message) return sendConfirm(msg, "-# need message");
        const token = getTokenByIndex(idx);
        if (!token) return sendConfirm(msg, `-# token ${idx} invalid`);
        await sendMessage(channelId, token, message);
    },

    async purge(msg, args) {
        await msg.delete().catch(() => {});
        const idx = parseInt(args[0]);
        if (isNaN(idx) || idx < 1 || !isValidIndex(idx)) {
            return sendConfirm(msg, "-# usage: .purge [token] [amount]");
        }
        const amount = parseInt(args[1]) || 10;
        const target = getClientByIndex(idx);
        if (!target) return sendConfirm(msg, `-# client ${idx} not found`);
        const channel = target.channels.cache.get(msg.channel.id);
        if (!channel) return sendConfirm(msg, "-# channel not found");
        try {
            const messages = await channel.messages.fetch({ limit: 100 });
            const toDelete = messages.filter(m => m.author.id === target.user.id).first(amount);
            for (const m of toDelete) {
                await new Promise(r => setTimeout(r, randomDelay(800, 1200)));
                await m.delete().catch(() => {});
            }
            sendConfirm(msg, `-# deleted ${toDelete.length}`);
        } catch (e) {
            sendConfirm(msg, "-# error purging");
        }
    },

    async jvc(msg, args) {
        await msg.delete().catch(() => {});
        const idx = parseInt(args[0]);
        if (isNaN(idx) || idx < 1 || !isValidIndex(idx)) {
            return sendConfirm(msg, "-# usage: .jvc [token] [voice_id]");
        }
        const vcId = args[1] || msg.member?.voice?.channelId;
        if (!vcId) return sendConfirm(msg, "-# need voice id");
        const token = getTokenByIndex(idx);
        if (!token) return sendConfirm(msg, `-# token ${idx} invalid`);
        if (state.voiceClients.has(idx)) {
            try { state.voiceClients.get(idx).destroy(); state.voiceClients.delete(idx); } catch (e) {}
        }
        const clone = new Discord.Client({ checkUpdate: false, patchVoice: true });
        clone.setMaxListeners(0);
        clone.on('ready', async () => {
            try {
                await clone.voice.joinChannel(vcId, { selfMute: false, selfDeaf: false, selfVideo: false });
                state.voiceClients.set(idx, clone);
            } catch (err) {}
        });
        clone.on('voiceStateUpdate', (oldS, newS) => {
            if (newS.member.id === clone.user.id && !newS.channelId && state.voiceClients.has(idx)) {
                setTimeout(() => { if (state.voiceClients.has(idx)) clone.voice.joinChannel(vcId).catch(() => {}); }, randomDelay(2000, 4000));
            }
        });
        clone.login(token).catch(() => {});
        sendConfirm(msg, `-# joining voice for ${getTokenNameByIndex(idx)}`);
    },

    async lvc(msg, args) {
        await msg.delete().catch(() => {});
        const idx = parseInt(args[0]);
        if (isNaN(idx) || idx < 1) return sendConfirm(msg, "-# usage: .lvc [token]");
        if (state.voiceClients.has(idx)) {
            state.voiceClients.get(idx).destroy();
            state.voiceClients.delete(idx);
            sendConfirm(msg, `-# left voice for ${getTokenNameByIndex(idx)}`);
        } else {
            sendConfirm(msg, `-# no voice for ${getTokenNameByIndex(idx)}`);
        }
    },

    async stream(msg, args) {
        await msg.delete().catch(() => {});
        const idx = parseInt(args[0]);
        if (isNaN(idx) || idx < 1 || !isValidIndex(idx)) {
            return sendConfirm(msg, "-# usage: .stream [token] [name]");
        }
        const name = args.slice(1).join(' ') || '/beefro';
        const target = getClientByIndex(idx);
        if (!target) return sendConfirm(msg, `-# client ${idx} not found`);
        try {
            const rp = new Discord.RichPresence(target)
                .setApplicationId(APP_ID)
                .setType('STREAMING')
                .setName(name)
                .setURL('https://twitch.tv/discord');
            target.user.setActivity(rp);
            sendConfirm(msg, `-# streaming set for ${getTokenNameByIndex(idx)}`);
        } catch (e) {
            sendConfirm(msg, `-# error for ${getTokenNameByIndex(idx)}`);
        }
    },

    async stopstream(msg, args) {
        await msg.delete().catch(() => {});
        const idx = parseInt(args[0]);
        if (isNaN(idx) || idx < 1 || !isValidIndex(idx)) {
            return sendConfirm(msg, "-# usage: .stopstream [token]");
        }
        const target = getClientByIndex(idx);
        if (!target) return sendConfirm(msg, `-# client ${idx} not found`);
        try {
            await target.user.setPresence({ activities: [], status: 'online' });
            sendConfirm(msg, `-# streaming stopped for ${getTokenNameByIndex(idx)}`);
        } catch (e) {
            sendConfirm(msg, `-# error for ${getTokenNameByIndex(idx)}`);
        }
    },

    async rpc(msg, args) {
        await msg.delete().catch(() => {});
        const idx = parseInt(args[0]);
        if (isNaN(idx) || idx < 1 || !isValidIndex(idx)) {
            return sendConfirm(msg, "-# usage: .rpc [token] [type] ...");
        }
        const type = args[1]?.toLowerCase();
        const token = getTokenByIndex(idx);
        if (!token) return sendConfirm(msg, `-# token ${idx} invalid`);
        
        if (!type || type === 'stop') {
            await axios.patch('https://discord.com/api/v9/users/@me/settings',
                { status: 'online', activities: [] },
                { headers: getHeaders(token) }
            );
            return sendConfirm(msg, `-# rpc stopped for ${getTokenNameByIndex(idx)}`);
        }

        const rest = args.slice(2).join(' ');
        const parts = rest.split('|').map(p => p.trim());

        try {
            if (type === 'spotify' && parts.length >= 4) {
                const [song, artist, album, duration] = parts;
                const imgUrl = parts[4];
                const asset = imgUrl ? await uploadImage(token, imgUrl) : null;
                const now = Date.now();
                const activity = {
                    type: 2,
                    name: 'Spotify',
                    details: song,
                    state: artist,
                    timestamps: { start: now, end: now + parseFloat(duration) * 60000 },
                    application_id: '624312422355206145',
                    flags: 48
                };
                if (asset) activity.assets = { large_image: asset, large_text: album };
                await axios.patch('https://discord.com/api/v9/users/@me/settings',
                    { status: 'online', activities: [activity] },
                    { headers: getHeaders(token) }
                );
                sendConfirm(msg, `-# spotify: ${song} for ${getTokenNameByIndex(idx)}`);
            } else if (['playing', 'listening', 'streaming', 'watching', 'competing'].includes(type)) {
                const name = parts[0] || 'Unknown';
                const details = parts[1] || null;
                const state = parts[2] || null;
                const imgUrl = parts[3];
                const asset = imgUrl ? await uploadImage(token, imgUrl) : null;
                const typeMap = { playing: 0, listening: 2, streaming: 1, watching: 3, competing: 5 };
                const activity = { type: typeMap[type], name, details, state };
                if (asset) activity.assets = { large_image: asset, large_text: name };
                if (type === 'streaming') activity.url = 'https://twitch.tv/discord';
                await axios.patch('https://discord.com/api/v9/users/@me/settings',
                    { status: 'online', activities: [activity] },
                    { headers: getHeaders(token) }
                );
                sendConfirm(msg, `-# ${type}: ${name} for ${getTokenNameByIndex(idx)}`);
            } else {
                sendConfirm(msg, "-# .rpc [token] spotify <song> | <artist> | <album> | <duration> [| img]\n-# .rpc [token] playing/listening/streaming/watching/competing <name> [| details] [| state] [| img]\n-# .rpc [token] stop");
            }
        } catch (e) {
            sendConfirm(msg, "-# rpc error");
        }
    },

    async kill(msg, args) {
        await msg.delete().catch(() => {});
        sendConfirm(msg, "-# 24/7 mode - cannot kill");
    },

    async antigc(msg, args) {
        await msg.delete().catch(() => {});
        sendConfirm(msg, "-# anti-gc active");
    },

const SCRIPT_NAME = 'GUNNAH X';
const SCRIPT_VERSION = 'v3.0';

async help(msg, args) {
    await msg.delete().catch(() => {});
    const sub = args[0]?.toLowerCase();

    if (!sub) {
        return sendConfirm(msg, `-# ${SCRIPT_NAME} ${SCRIPT_VERSION}
-# ---------------------------------
-# .help spam - spam commands
-# .help pack - pack 24/7
-# .help group - change group
-# .help utils - utilities
-# .help voice - voice
-# .help rpc - rpc/stream
-# ---------------------------------
-# ${SCRIPT_NAME} - anti-ban 24/7`);
    }

    if (sub === 'spam') {
        return sendConfirm(msg, `-# ${SCRIPT_NAME} - spam
-# ---------------------------------
-# .start [token] [@] - normal spam
-# .stop [token] - stop
-# .startchannel [token] [channel_id] [@] - channel spam
-# .stopchannel [token] - stop channel
-# .mstart [token] [@] - multi-spam
-# .mstop [token] - stop multi
-# .mstartchannel [token] [channel_id] [@] - multi-channel
-# .mstopchannel [token] - stop multi-channel
-# .delay [token] [ms] - set delay
-# ---------------------------------`);
    }

    if (sub === 'pack') {
        return sendConfirm(msg, `-# ${SCRIPT_NAME} - pack
-# ---------------------------------
-# .pack [token] [@] - start pack 24/7
-# .packstop [token] - stop pack
-# ---------------------------------
-# anti-ban / 24/7 enabled`);
    }

    if (sub === 'group') {
        return sendConfirm(msg, `-# ${SCRIPT_NAME} - change group
-# ---------------------------------
-# .changegroup [token] [group_id] [names] - change group names
-# .changegroupstop [token] [group_id] - stop
-# ---------------------------------`);
    }

    if (sub === 'utils') {
        return sendConfirm(msg, `-# ${SCRIPT_NAME} - utilities
-# ---------------------------------
-# .say [token] [message] - send message
-# .sayid [token] [channel_id] [message] - send to channel
-# .purge [token] [amount] - delete messages
-# .tokens - list valid tokens
-# .reloadtokens - reload tokens
-# .tokenadd [token] - add token
-# .uptime - show uptime
-# .status - show running status
-# .kill - cannot kill (24/7)
-# ---------------------------------`);
    }

    if (sub === 'voice') {
        return sendConfirm(msg, `-# ${SCRIPT_NAME} - voice
-# ---------------------------------
-# .jvc [token] [voice_id] - join voice
-# .lvc [token] - leave voice
-# ---------------------------------`);
    }

    if (sub === 'rpc') {
        return sendConfirm(msg, `-# ${SCRIPT_NAME} - rpc/stream
-# ---------------------------------
-# .stream [token] [name] - set streaming
-# .stopstream [token] - stop streaming
-# .rpc [token] spotify <song> | <artist> | <album> | <duration> [| img]
-# .rpc [token] playing/listening/streaming/watching/competing <name> [| details] [| state] [| img]
-# .rpc [token] stop
-# ---------------------------------`);
    }

    return sendConfirm(msg, `-# ${SCRIPT_NAME}
-# ---------------------------------
-# .help spam - spam commands
-# .help pack - pack
-# .help group - change group
-# .help utils - utilities
-# .help voice - voice
-# .help rpc - rpc/stream
-# ---------------------------------`);
    }
};

// ==================== CLIENT ====================
const client = new Discord.Client({
    checkUpdate: false,
    makeCache: Discord.Options.cacheWithLimits({
        MessageManager: 0,
        GuildMemberManager: 0,
        UserManager: 0
    }),
    ws: {
        properties: {
            $os: 'Windows',
            $browser: 'Discord Client',
            $device: ''
        }
    }
});
client.setMaxListeners(0);

// ==================== KEEP ALIVE MAIN ====================
setInterval(() => {
    if (client && client.ws) {
        try { client.ws.send(JSON.stringify({ op: 1, d: null })); } catch(e) {}
    }
}, 25000);

let clonesStarted = false;
let cloneKeepAlives = [];

client.on('ready', async () => {
    console.clear();
    console.log('[READY] ==========================================');
    console.log('[READY] Logged as:', client.user.tag);
    console.log('[READY] User ID:', client.user.id);
    console.log('[READY] Session:', sessionData.session_id.slice(0, 16));
    console.log('[READY] ==========================================');
    console.log('[BYPASS] anti-suspend anti-ban anti-disable anti-rate-limit anti-logout');
    console.log('[PROXY]', useProxy ? proxies.length + ' proxies loaded' : 'disabled');

    state.mainToken = config.token;
    state.mainClient = client;

    if (clonesStarted) return;
    clonesStarted = true;

    await loadTokens();

    for (let i = 0; i < state.tokens.length; i++) {
        const token = state.tokens[i];
        try {
            const clone = new Discord.Client({
                checkUpdate: false,
                ws: {
                    properties: {
                        $os: 'Windows',
                        $browser: 'Discord Client',
                        $device: ''
                    }
                }
            });
            clone.setMaxListeners(0);
            
            clone.on('ready', () => {
                state.clients[i] = clone;
                // Keep alive pentru clone
                const keepAlive = setInterval(() => {
                    if (clone && clone.ws) {
                        try { clone.ws.send(JSON.stringify({ op: 1, d: null })); } catch(e) {}
                    }
                }, 30000);
                cloneKeepAlives.push(keepAlive);
                console.log('[CLONE', i+1, ']', clone.user.tag, 'online | session:', state.tokenSessions[i]?.slice(0, 8));
            });
            
            await clone.login(token).catch(() => {});
            await new Promise(r => setTimeout(r, randomDelay(1000, 3000)));
        } catch (e) {}
    }

    console.log('[FILES] dume.txt:', getMessages().length, 'lines');
    console.log('[FILES] mesaje.txt:', getMultiMessages().length, 'paragraphs');
    console.log('[SYSTEM] Ready!', state.tokens.length, 'clones + main');
    console.log('[SYSTEM] .help for commands');
    console.log('[READY] ==========================================');
});

client.on('messageCreate', async (msg) => {
    try {
        const isOwner = owners.includes(msg.author.id) || msg.author.id === client.user.id;
        if (!isOwner) return;

        if (msg.content.startsWith(PREFIX)) {
            const args = msg.content.slice(1).trim().split(/\s+/);
            const cmd = args.shift()?.toLowerCase();
            if (cmd && commands[cmd]) {
                await commands[cmd](msg, args);
            }
        }
    } catch (e) {}
});

(async () => {
    try {
        loadProxies();
        if (!config.token) {
            console.log('[FATAL] No token in config2.json!');
            process.exit(1);
        }
        await client.login(config.token);
        console.log('[SYSTEM] Started - 24/7 mode');
        console.log('[SYSTEM] Token indexes start from 1');
    } catch (err) {
        console.log('[FATAL] Login failed:', err.message);
        setTimeout(() => { process.exit(1); }, 5000);
    }
})();