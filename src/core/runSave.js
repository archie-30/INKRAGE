import {storage} from './settings.js';

const LEGACY='inkfall.run.v1';
const KEY='inkfall.run.v1.';

export const RUN_SAVE_VERSION=1;
export const SAVE_MODES=['story','endless','bossrush'];

function valid(s) {
    return !!s&&s.v===RUN_SAVE_VERSION&&SAVE_MODES.includes(s.mode)&&Array.isArray(s.deck)&&!!s.stats&&!!s.plan&&(s.mode==='bossrush'||!!s.plan.layout);
}

function migrate() {
    try {
        const raw=localStorage.getItem(LEGACY);
        if (!raw) {
            return;
        }
        const s=JSON.parse(raw);
        if (valid(s)&&!localStorage.getItem(KEY+s.mode)) {
            localStorage.setItem(KEY+s.mode,raw);
        }
        localStorage.removeItem(LEGACY);
    }
    catch (e) {
    }
}

export function saveRunSnap(data) {
    if (storage.locked||!SAVE_MODES.includes(data.mode)) {
        return;
    }
    try {
        localStorage.setItem(KEY+data.mode,JSON.stringify({...data,v:RUN_SAVE_VERSION}));
    }
    catch (e) {
    }
}

export function loadRunSnap(mode) {
    if (!SAVE_MODES.includes(mode)) {
        return null;
    }
    migrate();
    try {
        const s=JSON.parse(localStorage.getItem(KEY+mode));
        if (valid(s)&&s.mode===mode) {
            return s;
        }
    }
    catch (e) {
    }
    clearRunSnap(mode);
    return null;
}

export function clearRunSnap(mode) {
    if (storage.locked||!SAVE_MODES.includes(mode)) {
        return;
    }
    try {
        localStorage.removeItem(KEY+mode);
    }
    catch (e) {
    }
}
