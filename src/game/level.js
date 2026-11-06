import {ENEMIES} from '../data/enemies.js';
import {actDef,LAYOUTS,NORMAL_LAYOUTS,ACTS,ENEMY_COST,ENEMY_ORDER,STORY_INTRO,ENDLESS,ROOM_TYPES,MUST_TYPES,BOSS_POOL,PAIRED,BIG_NORMAL,BIG_FROM} from '../data/levels.js';

export const MODS=['dark','elite','hurry'];

function weightedPick(pool,rng,maxCost) {
    let total=0;
    for (const k in pool) {
        if (ENEMY_COST[k]<=maxCost) {
            total+=pool[k];
        }
    }
    if (total<=0) {
        return null;
    }
    let r=rng.next()*total;
    for (const k in pool) {
        if (ENEMY_COST[k]>maxCost) {
            continue;
        }
        r-=pool[k];
        if (r<=0) {
            return k;
        }
    }
    return null;
}

function storyTypes(act,index) {
    let g=index;
    for (let a=0;a<act;a++) {
        g+=actDef(a).rooms;
    }
    return Math.max(1,STORY_INTRO.filter(r=>r<=g).length);
}

function endlessTypes(page) {
    return Math.min(ENEMY_ORDER.length,ENDLESS.typesStart+Math.floor(page/ENDLESS.pagesPerType));
}

export function pickBoss(rng,used=[]) {
    const all=BOSS_POOL.slice();
    const left=all.filter(b=>!used.includes(b));
    const list=left.length>0?left:all;
    return list[Math.floor(rng.next()*list.length)];
}

function roomTypes(act) {
    return ROOM_TYPES[Math.min(act,ROOM_TYPES.length-1)];
}

function mustAll(act,index) {
    return act>=MUST_TYPES[0]&&(act>MUST_TYPES[0]||index>=MUST_TYPES[1]);
}

function pickTypes(count,fresh,rng,last=[],cap=3) {
    const rest=ENEMY_ORDER.slice(0,count).filter(k=>k!==fresh);
    for (let i=rest.length-1;i>0;i--) {
        const j=Math.floor(rng.next()*(i+1));
        const q=rest[i];
        rest[i]=rest[j];
        rest[j]=q;
    }
    rest.sort((a,b)=>(last.includes(a)?1:0)-(last.includes(b)?1:0));
    const out=fresh?[fresh]:[];
    while (out.length<cap&&rest.length>0) {
        out.push(rest.shift());
    }
    return out;
}

function limitPool(pool,types) {
    const out={};
    for (const k of types) {
        out[k]=pool[k]||1;
    }
    return out;
}

function addFoe(wave,type) {
    wave.push({type});
    if (PAIRED.includes(type)) {
        wave.push({type});
    }
}

function openPool(pool,used) {
    const out={};
    for (const k in pool) {
        const cap=ENEMIES[k]&&ENEMIES[k].maxAlive;
        if (!cap||(used[k]||0)<cap) {
            out[k]=pool[k];
        }
    }
    return out;
}

function buildWaves(pool,budget,nw,rng,fresh,must=[]) {
    const waves=[];
    const used={};
    const queue=must.filter(k=>k!==fresh);
    let left=budget;
    for (let w=0;w<nw;w++) {
        let b=w===nw-1?left:Math.max(1,Math.round(budget/nw));
        left-=b;
        const wave=[];
        if (w===0&&fresh) {
            addFoe(wave,fresh);
            used[fresh]=(used[fresh]||0)+1;
            b-=ENEMY_COST[fresh];
        }
        for (let q=queue.length-1;q>=0;q--) {
            if (q%nw!==w%nw&&w<nw-1) {
                continue;
            }
            const t=queue[q];
            addFoe(wave,t);
            used[t]=(used[t]||0)+1;
            b-=ENEMY_COST[t];
            queue.splice(q,1);
        }
        while (b>0) {
            const t=weightedPick(openPool(pool,used),rng,b);
            if (!t) {
                break;
            }
            addFoe(wave,t);
            used[t]=(used[t]||0)+1;
            b-=ENEMY_COST[t];
        }
        if (wave.length===0) {
            wave.push({type:'doodle'});
        }
        waves.push(wave);
    }
    return waves;
}

function pickLayout(act,rng,lastLayout) {
    const list=act>=BIG_FROM?BIG_NORMAL:NORMAL_LAYOUTS;
    let key=list[Math.floor(rng.next()*list.length)];
    if (key===lastLayout) {
        key=list[(list.indexOf(key)+1)%list.length];
    }
    return key;
}

export function planRoom(act,index,rng,lastLayout,o={}) {
    const A=actDef(act);
    if (index>=A.rooms) {
        const type=pickBoss(rng,o.used);
        const arena=act>=BIG_FROM?'bigArena':'bossArena';
        return {act,index,boss:true,bossType:type,tier:act,layoutKey:arena,layout:LAYOUTS[arena],hpMult:A.bossMult,bossHp:A.bossHp,waves:[[{type,boss:true}]]};
    }
    const key=pickLayout(act,rng,lastLayout);
    const count=storyTypes(act,index);
    const fresh=count>1&&(index>0||act>0)&&count>storyTypes(act,index-1)?ENEMY_ORDER[count-1]:null;
    const types=pickTypes(count,fresh,rng,o.lastTypes,roomTypes(act));
    const waves=buildWaves(limitPool(A.pool,types),A.budget[index],A.waves[index],rng,fresh,mustAll(act,index)?types:[]);
    let mod=null;
    if (rng.next()<A.modChance[index]) {
        const mods=A.elite?MODS:MODS.filter(m=>m!=='elite');
        mod=mods[Math.floor(rng.next()*mods.length)];
    }
    return {act,index,boss:false,layoutKey:key,layout:LAYOUTS[key],hpMult:A.hpMult,waves,mod,fresh,types,barrels:1+Math.floor(rng.next()*2),crates:1+Math.floor(rng.next()*2)};
}

export function planEndless(page,rng,lastLayout,o={}) {
    const E=ENDLESS;
    const tier=Math.floor(page/E.bossEvery);
    const act=Math.min(ACTS.length-1,tier);
    const A=ACTS[act];
    const hpMult=1+page*E.hpPerPage;
    if (page%E.bossEvery===E.bossEvery-1) {
        const type=pickBoss(rng,o.used);
        const arena=act>=BIG_FROM?'bigArena':'bossArena';
        return {act,index:page,endless:true,boss:true,bossType:type,tier,layoutKey:arena,layout:LAYOUTS[arena],hpMult:1+page*E.bossHpPerPage,bossHp:0.75,waves:[[{type,boss:true}]]};
    }
    const key=pickLayout(act,rng,lastLayout);
    const budget=Math.min(E.budgetMax,Math.round(E.budgetBase+page*E.budgetPerPage));
    const nw=Math.min(4,2+Math.floor(page/4));
    const count=endlessTypes(page);
    let q=page-1;
    while (q>=0&&q%E.bossEvery===E.bossEvery-1) {
        q--;
    }
    const fresh=q>=0&&count>endlessTypes(q)?ENEMY_ORDER[count-1]:null;
    const types=pickTypes(count,fresh,rng,o.lastTypes,roomTypes(act));
    const waves=buildWaves(limitPool(A.pool,types),budget,nw,rng,fresh,act>=MUST_TYPES[0]?types:[]);
    let mod=null;
    if (page>=E.modFrom&&rng.next()<E.modChance) {
        const mods=page>=E.eliteFrom?MODS:MODS.filter(m=>m!=='elite');
        mod=mods[Math.floor(rng.next()*mods.length)];
    }
    return {act,index:page,endless:true,boss:false,layoutKey:key,layout:LAYOUTS[key],hpMult,waves,mod,fresh,types,course:o.course||null,barrels:1+Math.floor(rng.next()*2),crates:1+Math.floor(rng.next()*2)};
}
