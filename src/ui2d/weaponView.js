import {PALETTE,rgba} from '../data/palette.js';
import {TUNING} from '../data/tuning.js';
import {t} from '../data/strings.js';
import {time} from '../core/loop.js';
import {EASE} from '../core/easing.js';
import {sketchRect,sketchLine,drawShape} from './sketch.js';
import {FONT,inRect,drawButton,fitText,Panel} from './uiKit.js';
import {wrapText} from './cardView.js';
import {drawLock,drawWallet} from './meta.js';
import {drawWeaponIcon,weaponParams} from './menu.js';
import {WEAPON_ANIMS,drawStage} from './codexAnim.js';
import {WEAPONS,WEAPON_ORDER,RANDOM_WEAPON,weaponUnlocked,unlockedWeapons} from '../data/weapons.js';
import {settings} from '../core/settings.js';
import {effectiveLevel} from '../core/progress.js';

const U=()=>TUNING.armsUi;
const LIST=[RANDOM_WEAPON.id,...WEAPON_ORDER];
const STATS=['dmg','rate','range','mag'];

function roundRect(ctx,x,y,w,h,r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
}

export class WeaponView extends Panel {
    constructor(actions) {
        super();
        this.actions=actions;
        this.outFrom=0.35;
        this.sel='pen';
        this.selT=1;
        this.hx=-1;
        this.hy=-1;
        this.rows=[];
        this.sparks=[];
        this.pulse={};
        this.msg=null;
        this.walletK=0;
        this.stampT=1;
    }

    show() {
        super.show();
        this.sel=settings.weapon||'pen';
        this.selT=1;
        this.sparks=[];
        this.pulse={};
        this.msg=null;
        this.stampT=1;
        this.scroll=0;
        this.scrollTo=0;
        this.press=null;
        this.boxY=undefined;
        this.jump=true;
    }

    equipped() {
        return settings.weapon||'pen';
    }

    unlocked(id) {
        return weaponUnlocked(id,effectiveLevel());
    }

    layout() {
        const w=this.width;
        const h=this.height;
        const small=h<600;
        const pw=Math.min(1100,w-20);
        const ph=Math.min(h-16,small?h-16:680);
        this.P={x:w/2-pw/2,y:h/2-ph/2,w:pw,h:ph};
        const P=this.P;
        const pad=small?14:22;
        const hh=small?42:62;
        const bh=small?40:48;
        const lw=Math.max(small?190:240,Math.min(small?240:330,P.w*0.32));
        const by=P.y+P.h-pad-bh;
        this.backBtn={x:P.x+pad,y:by,w:lw,h:bh};
        this.V={x:P.x+pad,y:P.y+hh,w:lw,h:by-(small?8:12)-(P.y+hh)};
        const rx=this.V.x+lw+(small?16:28);
        this.R={x:rx,y:P.y+hh,w:P.x+P.w-pad-rx,h:P.y+P.h-pad-(P.y+hh)};
        const mw=Math.min(this.R.w*0.42,small?220:280);
        this.mainBtn={x:this.R.x+this.R.w-mw,y:by,w:mw,h:bh};
        this.buttons=[this.backBtn,this.mainBtn];
    }

    hover(x,y) {
        super.hover(x,y);
        this.hx=x;
        this.hy=y;
    }

    say(key,params) {
        this.msg={text:t(key,params),t:0};
    }

    choose(id) {
        if (id===this.sel) {
            return;
        }
        this.sel=id;
        this.selT=0;
        this.boxPop=1;
        this.reveal();
        this.pulse[id]=1;
        this.actions.select();
    }

    act() {
        const id=this.sel;
        if (this.unlocked(id)) {
            if (this.equipped()===id) {
                this.pulse[id]=1;
                this.actions.select();
                return;
            }
            this.actions.equip(id);
            this.celebrate(id);
            return;
        }
        if (id===RANDOM_WEAPON.id) {
            this.say('weapon.random.locked',{n:RANDOM_WEAPON.min});
            this.actions.fail();
            return;
        }
        this.actions.buy(id);
    }

    celebrate(id) {
        this.pulse[id]=1;
        this.stampT=0;
        const q=this.rows.find(r=>r.id===id);
        const b=this.mainBtn;
        const pts=[[b.x+b.w/2,b.y+b.h/2]];
        if (q) {
            pts.push([q.x+q.h*0.6,q.y+q.h/2]);
        }
        const cols=[PALETTE.red,PALETTE.ink,PALETTE.gold,PALETTE.paper];
        for (const [x,y] of pts) {
            for (let i=0;i<U().sparks;i++) {
                const a=Math.random()*Math.PI*2;
                const sp=90+Math.random()*240;
                this.sparks.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-120,t:0,life:0.45+Math.random()*0.4,r:2+Math.random()*4,c:cols[i%cols.length]});
            }
        }
    }

    bought(id) {
        this.walletK=1;
        this.sel=id;
        this.reveal();
        this.celebrate(id);
    }

    down(x,y) {
        if (!this.open) {
            return false;
        }
        this.layout();
        if (inRect(this.backBtn,x,y)) {
            this.actions.back();
            return true;
        }
        if (inRect(this.mainBtn,x,y)) {
            this.act();
            return true;
        }
        if (inRect(this.V,x,y)) {
            this.press={x0:x,y0:y,s0:this.scrollTo||0,moved:false};
        }
        return true;
    }

    move(x,y) {
        const p=this.press;
        if (!p) {
            return;
        }
        if (Math.hypot(x-p.x0,y-p.y0)>8) {
            p.moved=true;
        }
        if (p.moved) {
            this.scrollTo=p.s0-(y-p.y0);
            this.clampScroll();
            this.scroll=this.scrollTo;
        }
    }

    up() {
        const p=this.press;
        this.press=null;
        if (!p||p.moved) {
            return;
        }
        for (const q of this.rows) {
            if (inRect(q,p.x0,p.y0)) {
                this.choose(q.id);
                return;
            }
        }
    }

    wheel(dy) {
        if (!this.open) {
            return;
        }
        this.scrollTo=(this.scrollTo||0)+dy;
        this.clampScroll();
    }

    update(dt) {
        super.update(dt);
        this.selT=Math.min(1,this.selT+dt/U().selTime);
        this.stampT=Math.min(1,this.stampT+dt/U().stampTime);
        this.walletK=Math.max(0,this.walletK-dt*2);
        this.scroll=(this.scroll||0)+((this.scrollTo||0)-(this.scroll||0))*Math.min(1,dt*14);
        for (const k in this.pulse) {
            this.pulse[k]=Math.max(0,this.pulse[k]-dt*2.5);
        }
        if (this.msg) {
            this.msg.t+=dt;
            if (this.msg.t>2.2) {
                this.msg=null;
            }
        }
        for (let i=this.sparks.length-1;i>=0;i--) {
            const q=this.sparks[i];
            q.t+=dt;
            q.x+=q.vx*dt;
            q.y+=q.vy*dt;
            q.vy+=520*dt;
            if (q.t>q.life) {
                this.sparks.splice(i,1);
            }
        }
    }

    reveal() {
        const rh=this.rowH();
        const y=LIST.indexOf(this.sel)*rh;
        const V=this.V||{h:0};
        if (y<(this.scrollTo||0)) {
            this.scrollTo=y;
        }
        else if (y+rh+8>(this.scrollTo||0)+V.h) {
            this.scrollTo=y+rh+8-V.h;
        }
        this.clampScroll();
    }

    rowH() {
        return this.height<600?U().rowS:U().row;
    }

    clampScroll() {
        const max=Math.max(0,LIST.length*this.rowH()+8-this.V.h);
        this.scrollTo=Math.max(0,Math.min(max,this.scrollTo||0));
        return max;
    }

    drawList(ctx,v,small) {
        const V=this.V;
        const rh=this.rowH();
        const max=this.clampScroll();
        if (this.jump) {
            this.jump=false;
            this.scrollTo=LIST.indexOf(this.sel)*rh+rh/2-V.h/2;
            this.clampScroll();
            this.scroll=this.scrollTo;
        }
        ctx.save();
        ctx.beginPath();
        ctx.rect(V.x-6,V.y,V.w+12,V.h);
        ctx.clip();
        this.rows=[];
        const now=time.real;
        const dt=Math.min(0.1,Math.max(0,now-(this.boxAt??now)));
        this.boxAt=now;
        const sy=LIST.indexOf(this.sel)*rh;
        if (this.boxY===undefined||this.t<0.05) {
            this.boxY=sy;
        }
        this.boxY+=(sy-this.boxY)*(1-Math.exp(-dt*U().boxFollow));
        this.boxPop=Math.max(0,(this.boxPop||0)-dt*3);
        const by=V.y+4+this.boxY-(this.scroll||0);
        const pop=Math.sin(Math.min(1,this.boxPop)*Math.PI)*3;
        roundRect(ctx,V.x-pop,by+2-pop,V.w-10+pop*2,rh-4+pop*2,small?8:10);
        ctx.fillStyle=rgba('red',0.08);
        ctx.fill();
        ctx.strokeStyle=PALETTE.red;
        ctx.lineWidth=2.2;
        ctx.setLineDash([6,4]);
        ctx.lineDashOffset=-now*16;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset=0;
        LIST.forEach((id,i)=>{
            const y=V.y+4+i*rh-(this.scroll||0);
            if (y+rh<V.y||y>V.y+V.h) {
                return;
            }
            const k=EASE.easeOutCubic(Math.max(0,Math.min(1,(this.t-0.08-i*0.035)/0.3)));
            const ok=this.unlocked(id);
            const eq=this.equipped()===id;
            const sel=id===this.sel;
            const r={x:V.x,y,w:V.w-10,h:rh,id};
            const hv=inRect(r,this.hx,this.hy)&&!sel;
            const pu=this.pulse[id]||0;
            ctx.save();
            ctx.globalAlpha*=k;
            ctx.translate(-(1-k)*24,0);
            if (hv) {
                ctx.fillStyle=rgba('farGray',0.45);
                ctx.fillRect(r.x+2,y+3,r.w-4,rh-6);
            }
            if (i>0) {
                drawShape(ctx,sketchLine(V.x+10,y,V.x+V.w-20,y,{width:1,seed:5200+i}),rgba('midGray',0.45),v);
            }
            const ix=V.x+rh*0.55;
            const iy=y+rh/2;
            ctx.save();
            ctx.translate(ix,iy);
            const sc=1+Math.sin(pu*Math.PI)*0.25+(sel?0.08:0);
            ctx.scale(sc,sc);
            ctx.rotate(sel?Math.sin(now*3)*0.08:0);
            drawWeaponIcon(ctx,id,0,0,rh/U().rowIcon,v,!ok);
            ctx.restore();
            const tx=V.x+rh*1.15;
            const right=V.x+V.w-18;
            const tagW=eq||!ok?(small?44:58):0;
            ctx.textAlign='left';
            ctx.textBaseline='middle';
            ctx.fillStyle=ok?(sel?PALETTE.red:PALETTE.ink):PALETTE.midGray;
            fitText(ctx,t('weapon.'+id+'.name'),tx,iy-(small?0:9),right-tx-tagW,small?15:18,'bold ');
            if (!small) {
                ctx.fillStyle=ok?PALETTE.nearGray:PALETTE.midGray;
                fitText(ctx,t('weapon.'+id+'.short'),tx,iy+12,right-tx-tagW,12,'');
            }
            if (eq) {
                const sk=EASE.easeOutBack(Math.min(1,this.stampT));
                ctx.save();
                ctx.translate(right-tagW/2,iy);
                ctx.rotate(-0.08);
                ctx.scale(sk,sk);
                ctx.fillStyle=PALETTE.red;
                ctx.fillRect(-tagW/2,-(small?9:11),tagW,small?18:22);
                ctx.fillStyle=PALETTE.paper;
                ctx.textAlign='center';
                fitText(ctx,t('weapon.equipped'),0,1,tagW-6,small?10:12,'bold ');
                ctx.restore();
            }
            else if (!ok) {
                drawLock(ctx,right-tagW+8,iy,0.7,PALETTE.midGray);
                ctx.fillStyle=PALETTE.red;
                ctx.textAlign='right';
                fitText(ctx,id===RANDOM_WEAPON.id?t('arms.need',{n:RANDOM_WEAPON.min}):t('arms.lv',{n:WEAPONS[id].unlock}),right,iy+1,tagW-18,small?10:12,'bold ');
            }
            ctx.restore();
            this.rows.push(r);
        });
        ctx.restore();
        if (max>0) {
            const fade=16;
            if ((this.scroll||0)<max-2) {
                const g=ctx.createLinearGradient(0,V.y+V.h-fade,0,V.y+V.h);
                g.addColorStop(0,rgba('paper',0));
                g.addColorStop(1,rgba('paper',1));
                ctx.fillStyle=g;
                ctx.fillRect(V.x-6,V.y+V.h-fade,V.w-4,fade);
            }
            if ((this.scroll||0)>2) {
                const g=ctx.createLinearGradient(0,V.y,0,V.y+fade);
                g.addColorStop(0,rgba('paper',1));
                g.addColorStop(1,rgba('paper',0));
                ctx.fillStyle=g;
                ctx.fillRect(V.x-6,V.y,V.w-4,fade);
            }
            const th=Math.max(26,V.h*V.h/(LIST.length*rh+8));
            const ty=V.y+(V.h-th)*((this.scroll||0)/max);
            ctx.fillStyle=rgba('farGray',0.5);
            ctx.fillRect(V.x+V.w-4,V.y,2,V.h);
            ctx.fillStyle=rgba('ink',0.55);
            ctx.fillRect(V.x+V.w-5,ty,4,th);
        }
    }

    drawRandomStage(ctx,x,y,w,h,v) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x,y,w,h);
        ctx.clip();
        ctx.fillStyle=PALETTE.paper;
        ctx.fillRect(x,y,w,h);
        const pool=unlockedWeapons(effectiveLevel());
        const list=pool.length?pool:WEAPON_ORDER;
        const step=U().randStep;
        const f=time.real/step;
        const gap=w*0.3;
        const cy=y+h*0.48;
        for (let k=-3;k<=3;k++) {
            const idx=Math.floor(f)+k;
            const id=list[((idx%list.length)+list.length)%list.length];
            const off=k-(f-Math.floor(f));
            const ease=off-Math.sin(off*Math.PI*2)*0.08;
            const cx=x+w/2+ease*gap;
            const near=Math.max(0,1-Math.abs(ease));
            ctx.save();
            ctx.globalAlpha*=0.25+0.75*near;
            drawWeaponIcon(ctx,id,cx,cy,(h/U().randDiv)*(0.6+0.6*near),v,false);
            ctx.restore();
        }
        ctx.fillStyle=PALETTE.red;
        ctx.font='bold '+Math.round(h*0.16)+'px '+FONT;
        ctx.textAlign='center';
        ctx.textBaseline='bottom';
        ctx.fillText('?',x+w/2,y+h-6);
        ctx.restore();
        drawShape(ctx,sketchRect(x,y,Math.round(w),Math.round(h),{width:1.8,seed:2101}),PALETTE.ink,v);
    }

    statValue(id,k) {
        const W=WEAPONS[id];
        const r1=n=>String(Math.round(n*10)/10);
        if (k==='dmg') {
            if (W.charge) {
                return W.charge.tap+'～'+W.charge.dmg[1];
            }
            if (W.bands) {
                return Math.min(...W.bands)+'～'+Math.max(...W.bands);
            }
            if (W.colors) {
                const d=W.colors.map(c=>c.damage);
                return Math.min(...d)+'～'+Math.max(...d);
            }
            return W.burst>1?W.damage+'×'+W.burst:String(W.damage);
        }
        if (k==='rate') {
            if (W.charge) {
                return t('arms.val.charge',{n:r1(W.charge.full)});
            }
            if (W.cooldown) {
                return t('arms.val.cool',{n:r1(W.cooldown)});
            }
            return t('arms.val.rate',{n:r1((W.burst||1)/W.fireInterval)});
        }
        if (k==='range') {
            return t('arms.val.range',{n:r1((W.beam?W.beam.range:W.bulletSpeed*W.bulletLife)/TUNING.grid.size)});
        }
        return W.charge?t('arms.val.none'):t('arms.val.mag',{n:W.magazine});
    }

    descFont(small) {
        return (small?13:17)+'px '+FONT;
    }

    statsBox(small,w) {
        const cols=small?2:1;
        const rh=small?22:30;
        return {cols,rh,w:small?w:w*0.44,h:Math.ceil(STATS.length/cols)*rh};
    }

    drawStats(ctx,id,x,y,w,small,sk,ok) {
        const W=WEAPONS[id];
        const B=this.statsBox(small,w);
        const cw=B.w/B.cols;
        const lw=small?34:46;
        const vw=small?66:84;
        const bw=Math.min(cw-lw-vw-(small?10:8),small?120:170);
        const gap=small?2:3;
        const bh=small?8:11;
        const rw=(bw-gap*4)/5;
        STATS.forEach((k,i)=>{
            const cx=x+(i%B.cols)*cw;
            const cy=y+Math.floor(i/B.cols)*B.rh+B.rh/2;
            ctx.textBaseline='middle';
            ctx.textAlign='left';
            ctx.fillStyle=PALETTE.ink;
            fitText(ctx,t('arms.stat.'+k),cx,cy+1,lw-4,small?12:14,'bold ');
            const n=W.stats[k];
            for (let q=0;q<5;q++) {
                const rx=cx+lw+q*(rw+gap);
                const fill=Math.max(0,Math.min(1,sk*6-q-i*0.4));
                ctx.fillStyle=rgba('farGray',0.8);
                ctx.fillRect(rx,cy-bh/2,rw,bh);
                if (q<n&&fill>0) {
                    ctx.fillStyle=ok?(n>=4?PALETTE.red:PALETTE.ink):PALETTE.midGray;
                    ctx.fillRect(rx,cy-bh/2,rw*fill,bh);
                }
            }
            ctx.fillStyle=ok?PALETTE.ink:PALETTE.nearGray;
            ctx.textAlign='left';
            fitText(ctx,this.statValue(id,k),cx+lw+bw+(small?8:10),cy+1,vw-6,small?11:13,'bold ');
        });
        return B;
    }

    drawPreview(ctx,v,small) {
        const R=this.R;
        const id=this.sel;
        const ok=this.unlocked(id);
        const sk=EASE.easeOutCubic(Math.min(1,this.selT*1.4));
        const gap=small?8:14;
        const bh=this.mainBtn.h;
        const rnd=id===RANDOM_WEAPON.id;
        const B=this.statsBox(small,R.w);
        const side=!small&&!rnd;
        const dx=side?B.w+(small?12:24):0;
        const dw=R.w-dx;
        const lh=small?18:24;
        ctx.font=this.descFont(small);
        const desc=t('weapon.'+id+'.desc',weaponParams(id));
        const nl=wrapText(ctx,desc,dw).length;
        const ns=small?19:26;
        const head=ns+(small?6:10);
        const body=side?Math.max(B.h,nl*lh):(rnd?0:B.h+(small?8:12))+nl*lh;
        const sh=Math.max(R.h*0.36,Math.min(R.w*9/16,R.h*0.62,R.h-head-body-gap*2-bh));
        const sw=sh*16/9;
        const sx=R.x+(R.w-sw)/2;
        ctx.save();
        ctx.globalAlpha*=0.35+0.65*sk;
        ctx.translate(0,(1-sk)*U().rise);
        const anim=WEAPON_ANIMS[id];
        if (anim) {
            drawStage(ctx,sx,R.y,sw,sh,anim,time.real,v);
        }
        else {
            this.drawRandomStage(ctx,sx,R.y,sw,sh,v);
        }
        if (!ok) {
            ctx.fillStyle=rgba('paper',0.6);
            ctx.fillRect(sx+2,R.y+2,sw-4,sh-4);
            drawLock(ctx,sx+sw/2,R.y+sh/2,small?1.8:2.6,PALETTE.nearGray);
        }
        ctx.restore();
        let y=R.y+sh+gap;
        const x=R.x;
        const w=R.w;
        ctx.save();
        ctx.globalAlpha*=0.3+0.7*sk;
        ctx.translate((1-sk)*12,0);
        ctx.textAlign='left';
        ctx.textBaseline='top';
        ctx.fillStyle=ok?PALETTE.ink:PALETTE.nearGray;
        fitText(ctx,t('weapon.'+id+'.name'),x,y,w*0.55,ns,'bold ');
        const nw=Math.min(w*0.55,ctx.measureText(t('weapon.'+id+'.name')).width);
        ctx.fillStyle=PALETTE.red;
        fitText(ctx,t('weapon.'+id+'.short'),x+nw+(small?10:14),y+ns*0.3,w-nw-(small?10:14),small?12:14,'bold ');
        y+=head;
        drawShape(ctx,sketchLine(x,y-(small?3:5),x+w,y-(small?3:5),{width:1,seed:5300}),rgba('midGray',0.5),v);
        let ty=y+(small?2:4);
        if (!rnd) {
            this.drawStats(ctx,id,x,y,w,small,sk,ok);
            if (side) {
                drawShape(ctx,sketchLine(x+B.w+12,y+2,x+B.w+12,Math.min(this.mainBtn.y-gap,y+Math.max(B.h,nl*lh)),{width:1,seed:5301}),rgba('midGray',0.5),v);
            }
            else {
                ty=y+B.h+(small?6:10);
            }
        }
        ctx.font=this.descFont(small);
        ctx.fillStyle=PALETTE.nearGray;
        ctx.textAlign='left';
        ctx.textBaseline='top';
        const room=this.mainBtn.y-gap-ty;
        let lines=wrapText(ctx,desc,dw);
        let lh2=lh;
        if (lines.length*lh>room) {
            ctx.font=(small?12:15)+'px '+FONT;
            lines=wrapText(ctx,desc,dw);
            lh2=small?16:21;
        }
        lines.slice(0,Math.max(1,Math.floor(room/lh2))).forEach((ln,q)=>ctx.fillText(ln,x+dx,ty+q*lh2));
        ctx.restore();
        if (!ok&&!rnd) {
            ctx.fillStyle=PALETTE.nearGray;
            ctx.textAlign='right';
            ctx.textBaseline='middle';
            fitText(ctx,t('codex.locked',{level:WEAPONS[id].unlock}),this.mainBtn.x-12,this.mainBtn.y+bh/2,this.mainBtn.x-R.x-12,small?12:14,'bold ');
        }
    }

    mainLabel() {
        const id=this.sel;
        if (this.unlocked(id)) {
            return this.equipped()===id?t('weapon.equipped'):t('weapon.equip');
        }
        if (id===RANDOM_WEAPON.id) {
            return t('weapon.random.locked',{n:RANDOM_WEAPON.min});
        }
        return t('weapon.early',{n:TUNING.meta.price.weapon});
    }

    draw(ctx) {
        if (!this.shown()) {
            return;
        }
        this.layout();
        const w=this.width;
        const h=this.height;
        const v=time.boilIndex;
        const P=this.P;
        const small=h<600;
        const a=EASE.easeOutBack(Math.min(1,this.t/0.4));
        ctx.save();
        ctx.fillStyle=rgba('paper',Math.min(0.85,this.t*4));
        ctx.fillRect(0,0,w,h);
        ctx.translate(w/2,h/2);
        ctx.scale(0.9+0.1*a,0.9+0.1*a);
        ctx.translate(-w/2,-h/2);
        ctx.globalAlpha=Math.min(1,this.t*4);
        ctx.fillStyle=PALETTE.paper;
        ctx.fillRect(P.x,P.y,P.w,P.h);
        drawShape(ctx,sketchRect(P.x,P.y,P.w,P.h,{width:2.2,seed:5101}),PALETTE.ink,v);
        ctx.fillStyle=PALETTE.ink;
        ctx.font='bold '+(small?20:28)+'px '+FONT;
        ctx.textAlign='left';
        ctx.textBaseline='middle';
        const ty=P.y+(small?20:32);
        ctx.fillText(t('arms.title'),P.x+20,ty);
        const ttw=ctx.measureText(t('arms.title')).width;
        const own=WEAPON_ORDER.filter(id=>this.unlocked(id)).length;
        ctx.fillStyle=PALETTE.nearGray;
        fitText(ctx,t('arms.count',{n:own,m:WEAPON_ORDER.length}),P.x+32+ttw,ty+1,small?140:200,small?12:15,'bold ');
        drawWallet(ctx,P.x+P.w-18,ty-(small?13:15),v,'right',small?12:14,this.walletK);
        drawShape(ctx,sketchLine(P.x+16,ty+(small?16:24),P.x+P.w-16,ty+(small?16:24),{width:1.2,seed:5105}),rgba('midGray',0.7),v);
        this.drawList(ctx,v,small);
        this.drawPreview(ctx,v,small);
        drawButton(ctx,this.backBtn,t('menu.back'),v,(this.t-0.1)/0.3,this.hoverIdx===0,small?16:18);
        const id=this.sel;
        const done=this.unlocked(id)&&this.equipped()===id;
        const lockedRnd=!this.unlocked(id)&&id===RANDOM_WEAPON.id;
        ctx.save();
        if (done||lockedRnd) {
            ctx.globalAlpha*=0.55;
        }
        drawButton(ctx,this.mainBtn,this.mainLabel(),v,(this.t-0.15)/0.3,this.hoverIdx===1&&!done,small?16:19);
        ctx.restore();
        if (this.msg) {
            const k=Math.min(1,this.msg.t/0.2,(2.2-this.msg.t)/0.3);
            const b=this.mainBtn;
            ctx.save();
            ctx.globalAlpha=Math.max(0,k);
            ctx.font='bold 13px '+FONT;
            const tw=ctx.measureText(this.msg.text).width+24;
            const mx=b.x+b.w/2;
            const my=b.y-20-(1-k)*8;
            ctx.fillStyle=PALETTE.red;
            ctx.fillRect(mx-tw/2,my-13,tw,26);
            ctx.fillStyle=PALETTE.paper;
            ctx.textAlign='center';
            ctx.textBaseline='middle';
            ctx.fillText(this.msg.text,mx,my+1);
            ctx.restore();
        }
        ctx.restore();
        for (const q of this.sparks) {
            const f=q.t/q.life;
            ctx.globalAlpha=1-f;
            ctx.fillStyle=q.c;
            ctx.beginPath();
            ctx.arc(q.x,q.y,q.r*(1-f*0.5),0,Math.PI*2);
            ctx.fill();
        }
        ctx.globalAlpha=1;
    }
}
