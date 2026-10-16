import {ACTS,LAYOUTS,BOSS_POOL,INFIRMARY,PEACE_LAYOUTS} from '../data/levels.js';
import {CARDS,unlockedCards,cardUnlocked} from '../data/cards.js';
import {TUNING} from '../data/tuning.js';
import {NOTEBOOK} from '../data/notebook.js';
import {MINIGAMES} from '../data/minigames.js';
import {effectiveLevel} from '../core/progress.js';
import {relicPool,bump,reviveCount} from '../core/meta.js';
import {RoomDirector} from './room.js';
import {hasRelic} from './relic.js';
import {createCard} from './card.js';
import {RNG} from '../core/rng.js';
import {t} from '../data/strings.js';

const B=()=>TUNING.bossRush;

function shuffle(a,rng) {
    for (let i=a.length-1;i>0;i--) {
        const j=Math.floor(rng.next()*(i+1));
        [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
}

export function rushRelicPool() {
    return relicPool().filter(id=>!B().relicBan.includes(id));
}

export function draftDecks(seed) {
    const rng=new RNG(seed);
    const pool=unlockedCards(effectiveLevel());
    const normals=pool.filter(id=>CARDS[id].rarity!=='rare');
    const ults=pool.filter(id=>CARDS[id].rarity==='rare');
    const D=B().deck;
    const make=avoid=>{
        const def=shuffle(normals.filter(id=>B().defense.includes(id)),rng);
        const hit=shuffle(normals.filter(id=>B().single.includes(id)),rng);
        const out=[];
        const take=list=>{
            const pick=list.find(id=>!out.includes(id)&&!avoid.includes(id))||list.find(id=>!out.includes(id));
            if (pick) {
                out.push(pick);
            }
        };
        take(def);
        take(hit);
        const rest=shuffle(normals.filter(id=>!out.includes(id)),rng);
        rest.sort((a,b)=>(avoid.includes(a)?1:0)-(avoid.includes(b)?1:0));
        while (out.length<D.normal&&rest.length>0) {
            out.push(rest.shift());
        }
        const u=shuffle(ults.slice(),rng);
        u.sort((a,b)=>(avoid.includes(a)?1:0)-(avoid.includes(b)?1:0));
        return out.concat(u.slice(0,D.ult));
    };
    const a=make([]);
    const b=make(a);
    return [a,b];
}

export const RushMixin={
    initRush() {
        const order=shuffle(BOSS_POOL.slice(),this.rng);
        this.rush={order,idx:0,room:0,at:'boss',recs:[],last:[],fight:null,plan:null,armed:-1,games:[]};
        this.relicIds=rushRelicPool();
        this.stats.rush=this.rush.recs;
    },

    rushTier() {
        return Math.min(2,Math.floor(Math.max(0,this.rush.room-1)/2));
    },

    rushSave(ahead=false) {
        const R=this.rush;
        const rush={order:R.order,idx:R.idx,room:R.room+(ahead?1:0),at:'infirmary',recs:R.recs,last:R.last,games:R.games};
        this.hooks.saveRun({mode:'bossrush',rng:this.rng.s,seed:this.seed,act:0,index:R.idx,revived:reviveCount(),relicIds:this.relicIds,deck:this.deckList,stats:this.stats,rush,plan:ahead?{}:R.plan});
    },

    rushSnap() {
        const R=this.rush;
        if (!R) {
            return;
        }
        if (R.at==='boss') {
            if (this.state==='exit'&&R.idx<R.order.length) {
                this.rushSave(true);
            }
            return;
        }
        if (R.plan) {
            this.rushSave();
        }
    },

    restoreRush(s) {
        this.rush={...s.rush,fight:null,armed:-1,plan:null};
        this.stats.rush=this.rush.recs;
        this.rush.at='infirmary';
        if (!s.plan||!Array.isArray(s.plan.npcs)) {
            this.enterRush();
            return;
        }
        const plan={...s.plan,saved:true,healed:true};
        this.rush.plan=plan;
        this.enterRush(plan);
    },

    rushRamp(i=this.rush.idx) {
        const X=B().ramp;
        return {hp:Math.min(X.hpMax,1+i*X.hpPer),tier:X.tiers[Math.min(i,X.tiers.length-1)],tempo:Math.min(X.tempoMax,1+i*X.tempoPer)};
    },

    planRushBoss() {
        const R=this.rush;
        const A=ACTS[0];
        const type=R.order[R.idx];
        const last=R.idx>=R.order.length-1;
        const ramp=this.rushRamp();
        return {act:0,index:R.idx,rush:true,boss:true,bossType:type,tier:ramp.tier,ramp:ramp.hp,tempo:ramp.tempo,node:'boss',layoutKey:'bossArena',layout:LAYOUTS.bossArena,hpMult:A.bossMult*ramp.hp,bossHp:A.bossHp,waves:[[{type,boss:true}]],exits:last?[]:[{kind:'infirmary'}],barrels:0,crates:0};
    },

    pickCards(count,rareFn,exclude=[],upgraded=false) {
        const pool=unlockedCards(effectiveLevel()).filter(id=>!this.capped(id)&&!exclude.includes(id));
        const out=[];
        let guard=0;
        while (out.length<count&&guard<200) {
            guard++;
            const rare=rareFn(out);
            const list=pool.filter(id=>(CARDS[id].rarity==='rare')===rare&&!out.some(c=>c.id===id));
            if (list.length===0) {
                continue;
            }
            const id=list[Math.floor(this.rng.next()*list.length)];
            out.push({id,upgraded:upgraded&&!rare});
        }
        return out;
    },

    rushCardOffer() {
        const R=this.rush;
        const chance=B().cardUlt[Math.min(B().cardUlt.length-1,R.room-1)];
        return this.pickCards(B().cardOffer,out=>!out.some(c=>CARDS[c.id].rarity==='rare')&&this.rng.next()<chance);
    },

    rushRelicOffer() {
        if (this.rush.room>B().relicRooms) {
            return [];
        }
        const pool=(this.relicIds||rushRelicPool()).filter(id=>!hasRelic(id));
        return shuffle(pool,this.rng).slice(0,B().relicOffer);
    },

    relicNpcs(L,relics) {
        const spots=relics.length===2?[L.relics[0],L.relics[2]]:(relics.length===1?[L.relics[1]]:L.relics);
        return relics.map((id,i)=>({model:'relic',role:'relic',relic:id,label:t('relic.'+id+'.name'),x:spots[i][0],z:spots[i][1]}));
    },

    planInfirmary() {
        const R=this.rush;
        const L=INFIRMARY;
        const kinds=B().stations.filter(k=>!R.last.includes(k));
        shuffle(kinds,this.rng);
        const zones=kinds.slice(0,2);
        R.last=zones.slice();
        const cards=this.rushCardOffer();
        const relics=this.rushRelicOffer();
        const npcs=[{model:'cardKeeper',role:'cards',label:t('rush.zone.cards'),x:L.keeper[0],z:L.keeper[1]}];
        npcs.push(...this.relicNpcs(L,relics));
        zones.forEach((k,i)=>npcs.push({model:'zone',role:'zone',zone:k,label:t('rush.zone.'+k),x:L.zones[i][0],z:L.zones[i][1]}));
        const plan={act:this.rushTier(),index:R.room,rush:true,peace:true,node:'infirmary',boss:false,layoutKey:'infirmary',layout:L,hpMult:1,waves:[],barrels:0,crates:0,exits:[{kind:'next',label:'exit.rushNext'}],npcs,cards,relics,zones,zoneOpen:-1,used:npcs.map(()=>0),healed:false,saved:false};
        R.plan=plan;
        return plan;
    },

    enterRush(forced=null) {
        const R=this.rush;
        let plan=forced;
        if (!plan) {
            if (R.at==='game') {
                plan=R.gamePlan;
            }
            else if (R.at==='infirmary') {
                plan=R.plan&&R.plan.index===R.room?R.plan:this.planInfirmary();
            }
            else {
                plan=this.planRushBoss();
            }
        }
        this.plan=plan;
        this.lastLayout=plan.layoutKey;
        this.exitsOpen=false;
        this.ambushAfter=null;
        this.timer=0;
        this.director=null;
        this.course=null;
        this.room=this.hooks.enterRoom(plan,this.deckList);
        this.logPage(plan);
        if (this.hooks.pageStart) {
            this.hooks.pageStart(plan);
        }
        if (plan.peace) {
            this.state='peace';
            this.npcUsed=plan.npcs.map((n,i)=>!!(plan.used&&plan.used[i]));
            if (plan.used) {
                plan.used.forEach((u,i)=>{
                    if (u) {
                        this.hooks.npcUsed(i,u===2);
                    }
                });
            }
            if (plan.node==='infirmary') {
                if (!plan.healed) {
                    plan.healed=true;
                    const n=this.hooks.heal(B().heal);
                    if (n>0) {
                        this.note('rush.healed',{n});
                    }
                }
                if (!plan.saved) {
                    plan.saved=true;
                    this.rushSave();
                }
                if (this.infirmaryDone()) {
                    this.exitsOpen=true;
                    this.hooks.openDoors(true);
                }
            }
            this.hooks.banner('peace',this);
            return;
        }
        this.director=new RoomDirector(plan,this.hooks.enemies,this.room,this.rng);
        this.state='combat';
        this.roomTaken=this.stats.taken;
        R.fight={boss:plan.bossType,ramp:plan.ramp||1,t:0,dodges:0,card:0,weapon:0,weak:0,total:0,hurt:0,done:false};
        this.hooks.banner('boss',this);
        this.hooks.rushFight(plan);
    },

    rushTrack(dt) {
        const f=this.rush&&this.rush.fight;
        if (f&&!f.done) {
            f.t+=dt;
        }
    },

    rushDamage(dmg,src,weak) {
        const f=this.rush&&this.rush.fight;
        if (!f||f.done||this.state!=='combat') {
            return;
        }
        f.total+=dmg;
        if (src==='weapon') {
            f.weapon+=dmg;
        }
        else {
            f.card+=dmg;
        }
        if (weak) {
            f.weak+=dmg;
        }
    },

    rushDodge() {
        const f=this.rush&&this.rush.fight;
        if (f&&!f.done&&this.state==='combat') {
            f.dodges++;
        }
    },

    rushHurt(n) {
        const f=this.rush&&this.rush.fight;
        if (f&&!f.done&&(this.state==='combat'||this.state==='dead')) {
            f.hurt+=n;
        }
    },

    rushFinish() {
        const R=this.rush;
        const f=R.fight;
        if (!f||f.done) {
            return;
        }
        f.done=true;
        R.recs.push({boss:f.boss,ramp:f.ramp,time:f.t,dodges:f.dodges,card:f.card,weapon:f.weapon,weak:f.weak,total:f.total,hurt:f.hurt,cleared:true});
        this.stats.score=rushTotals(R.recs,R.order).total;
        bump('bossRush');
    },

    rushCleared() {
        const R=this.rush;
        R.idx++;
        R.fight=null;
        if (R.idx>=R.order.length) {
            this.stats.cleared=true;
            this.state='summary';
            this.hooks.showSummary(true,this.stats);
            return;
        }
        this.rushSave(true);
        this.openExits();
    },

    rushExit(ex,i) {
        const R=this.rush;
        this.exitsOpen=false;
        if (ex.kind==='infirmary') {
            R.at='infirmary';
            R.room++;
            R.plan=null;
            this.go(i);
            return true;
        }
        R.at='boss';
        R.plan=null;
        this.go(i);
        return true;
    },

    infirmaryDone() {
        const p=this.plan;
        if (!p||p.node!=='infirmary') {
            return true;
        }
        const ci=p.npcs.findIndex(q=>q.role==='cards');
        const cards=ci<0||!!p.used[ci];
        const relic=!!p.relicTaken||!p.npcs.some(q=>q.role==='relic');
        return cards&&relic&&p.zoneOpen>=0;
    },

    markNpc(i,sealed=false) {
        const p=this.plan;
        this.npcUsed[i]=true;
        if (p.used) {
            p.used[i]=sealed?2:1;
        }
        this.hooks.npcUsed(i,sealed);
    },

    rushInteract(i) {
        const p=this.plan;
        const n=p.npcs[i];
        const R=this.rush;
        const done=()=>this.backToPeace();
        if (n.role==='cards') {
            this.state='reward';
            const cards=p.cards.map(c=>createCard(c.id,c.upgraded));
            this.markNpc(i);
            this.hooks.openReward([{kind:cards.some(c=>c.def.rarity==='rare')?'mixed':'normal',cards}],this.deckCounts(),picked=>this.takeCards(picked,done),false,t('rush.cardsTitle'));
            return true;
        }
        if (n.role==='relic') {
            if (p.relicTaken) {
                this.state='peace';
                return false;
            }
            p.relicTaken=true;
            this.markNpc(i);
            this.state='node';
            this.hooks.takeRelic(n.relic,done);
            return true;
        }
        if (p.zoneOpen>=0&&p.zoneOpen!==i) {
            this.hooks.npcSay(i,t('rush.zoneLocked'));
            this.state='peace';
            return true;
        }
        this.state='node';
        const fin=()=>{
            this.lockZone(i);
            done();
        };
        this.station(n.zone,fin,i,done);
        return true;
    },

    lockZone(i) {
        const p=this.plan;
        p.zoneOpen=i;
        this.markNpc(i);
        p.npcs.forEach((q,k)=>{
            if (q.role==='zone'&&k!==i&&!p.used[k]) {
                this.markNpc(k,true);
            }
        });
    },

    station(kind,fin,i,cancel=fin) {
        const p=this.plan;
        if (kind==='bed') {
            const n=this.hooks.heal(B().bedHeal);
            this.note('note.healed',{n});
            fin();
            return;
        }
        if (kind==='bench') {
            const opts=[{id:'upgrade',disabled:this.upgradable().length===0},{id:'copy',disabled:this.deckList.every(c=>this.capped(c.id)||!cardUnlocked(c.id,effectiveLevel()))},{id:'remove',disabled:this.deckList.length<=NOTEBOOK.minDeck}];
            this.hooks.openChoice({kind:'bench',options:opts},k=>{
                if (k===0) {
                    this.pickUpgrade(fin);
                    return;
                }
                if (k===1) {
                    this.hooks.openDeckPick('copy',this.deckList,j=>{
                        const c=this.deckList[j];
                        this.note('rush.copied',{},c.id);
                        this.hooks.cardFx('gain',c.id,()=>this.takeCards([createCard(c.id,c.upgraded)],fin));
                    },null,c=>!this.capped(c.id)&&cardUnlocked(c.id,effectiveLevel()));
                    return;
                }
                this.hooks.openDeckPick('remove',this.deckList,j=>{
                    const cid=this.deckList[j].id;
                    this.deckList.splice(j,1);
                    this.note('note.removed',{},cid);
                    this.hooks.cardFx('remove',cid,fin);
                });
            });
            return;
        }
        if (kind==='swap') {
            this.hooks.openDeckPick('swap',this.deckList,j=>{
                this.lockZone(i);
                const c=this.deckList[j];
                const rare=CARDS[c.id].rarity==='rare';
                this.deckList.splice(j,1);
                this.note('note.removed',{},c.id);
                this.hooks.cardFx('remove',c.id,()=>{
                    const cands=this.pickCards(B().candidates,()=>rare,[c.id]).map(q=>createCard(q.id,q.upgraded));
                    this.state='reward';
                    this.hooks.openReward([{kind:rare?'rare':'normal',cards:cands}],this.deckCounts(),picked=>this.takeCards(picked,fin),false,t('rush.swapTitle'));
                });
            },{cb:cancel,confirm:true});
            return;
        }
        if (kind==='ults') {
            const cands=this.pickCards(B().ultOffer,()=>true).map(q=>createCard(q.id,false));
            this.state='reward';
            this.hooks.openReward([{kind:'rare',cards:cands}],this.deckCounts(),picked=>this.takeCards(picked,fin),false,t('rush.ultsTitle'));
            return;
        }
        if (kind==='retest') {
            const ci=p.npcs.findIndex(q=>q.role==='cards');
            if (ci>=0&&!p.used[ci]) {
                p.cards=this.rushCardOffer();
            }
            const ri=p.npcs.map((q,k)=>q.role==='relic'?k:-1).filter(k=>k>=0);
            if (ri.length>0&&!p.relicTaken) {
                const fresh=this.rushRelicOffer();
                const specs=this.relicNpcs(INFIRMARY,fresh);
                if (specs.length===ri.length) {
                    p.relics=fresh;
                    ri.forEach((k,j)=>{
                        p.npcs[k]=specs[j];
                        this.hooks.replaceNpc(k,specs[j]);
                    });
                }
            }
            this.note('rush.retested');
            fin();
            return;
        }
        if (kind==='challenge') {
            this.lockZone(i);
            this.rushGame();
            return;
        }
        fin();
    },

    rushGame() {
        const R=this.rush;
        const pool=B().games.filter(id=>!R.games.includes(id));
        const list=pool.length>0?pool:B().games;
        const id=list[Math.floor(this.rng.next()*list.length)];
        R.games.push(id);
        const base=PEACE_LAYOUTS.event[Math.floor(this.rng.next()*PEACE_LAYOUTS.event.length)];
        const plan=this.planGame(base,'rushGame',id);
        plan.act=this.rushTier();
        plan.rushGame=true;
        plan.exits=[];
        R.gamePlan=plan;
        R.at='game';
        this.state='transition';
        this.hooks.transition(()=>this.enterRush());
    },

    rushGameDone(ok) {
        const R=this.rush;
        const lines=ok?MINIGAMES.winLines:MINIGAMES.loseLines;
        this.hooks.npcSay(0,t(lines[Math.floor(this.rng.next()*lines.length)]));
        const back=()=>{
            R.at='infirmary';
            R.gamePlan=null;
            this.state='transition';
            this.hooks.transition(()=>this.enterRush());
        };
        if (!ok) {
            this.state='node';
            this.note('rush.gameLost');
            this.timer=0;
            this.hooks.later(1.4,back);
            return;
        }
        bump('games');
        const cands=this.pickCards(2,()=>false,[],true).map(q=>createCard(q.id,true));
        this.state='reward';
        this.hooks.openReward([{kind:'normal',cards:cands}],this.deckCounts(),picked=>this.takeCards(picked,back),false,t('rush.gameWon'));
    }
};

export function rushPart(rec) {
    const S=B().score;
    if (!rec||!rec.cleared) {
        return {time:0,dodge:0,skill:0,hurt:0,total:0};
    }
    const par=(B().par[rec.boss]||80)*(1+((rec.ramp||1)-1)*B().ramp.parScale);
    const fast=par*S.fast;
    const slow=par*S.slow;
    const tf=rec.time<=fast?1:(rec.time>=slow?0:1-(rec.time-fast)/(slow-fast));
    const time=Math.round(S.time*tf);
    const dodge=Math.min(S.dodgeMax,rec.dodges*S.dodge);
    const tot=Math.max(1,rec.total);
    const skill=Math.round(Math.min(1,rec.card/tot)*S.card+Math.min(1,rec.weak/tot)*S.weak);
    const hurt=Math.max(0,S.hurt-rec.hurt*S.hurtPer);
    return {time,dodge,skill,hurt,total:time+dodge+skill+hurt};
}

export function rushTotals(recs,order) {
    const rows=order.map(boss=>{
        const rec=recs.find(r=>r.boss===boss)||null;
        return {boss,rec,part:rushPart(rec)};
    });
    const total=rows.reduce((s,r)=>s+r.part.total,0);
    const max=B().score.boss*order.length;
    const frac=total/max;
    const grade=(B().grades.find(g=>frac>=g[1])||['D'])[0];
    return {rows,total,max,frac,grade,coins:B().coins[grade]||0,time:recs.reduce((s,r)=>s+r.time,0),dodges:recs.reduce((s,r)=>s+r.dodges,0),hurt:recs.reduce((s,r)=>s+r.hurt,0)};
}
