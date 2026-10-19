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
        this.tiles=[];
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
        this.boxX=undefined;
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
        const pw=Math.min(1060,w-20);
        const ph=Math.min(h-16,small?h-16:660);
        this.P={x:w/2-pw/2,y:h/2-ph/2,w:pw,h:ph};
        const P=this.P;
        const bh=small?40:48;
        const by=P.y+ph-(small?48:64);
        const hh=small?42:62;
        const rw=Math.min(P.w*0.36,small?260:340);
        const rx=P.x+P.w-20-rw;
        this.backBtn={x:P.x+20,y:by,w:small?120:150,h:bh};
        this.mainBtn={x:rx,y:by,w:rw,h:bh};
        this.R={x:rx,y:P.y+hh,w:rw,h:by-(small?8:12)-(P.y+hh)};
        this.G={x:P.x+20,y:P.y+hh,w:rx-(small?16:28)-(P.x+20),h:by-(small?10:14)-(P.y+hh)};
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
        const q=this.tiles.find(r=>r.id===id);
        const b=this.mainBtn;
        const pts=[[b.x+b.w/2,b.y+b.h/2]];
        if (q) {
            pts.push([q.x,q.y]);
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
        const L=this.gridLayout(this.height<600);
        if (inRect(L.V,x,y)) {
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
        for (const q of this.tiles) {
            if (Math.abs(p.x0-q.x)<=q.s/2+6&&p.y0>=q.y-q.s/2-6&&p.y0<=q.y+q.s/2+q.lab) {
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

    descLines(ctx,w,small) {
        ctx.font=(small?12:15)+'px '+FONT;
        return wrapText(ctx,t('weapon.'+this.sel+'.desc',weaponParams(this.sel)),w);
    }

    gridLayout(small,ctx) {
        if (!ctx) {
            return this.L||this.gridLayout(small,document.createElement('canvas').getContext('2d'));
        }
        const Gr=this.G;
        const ir=small?20:28;
        const tw=Gr.w-ir*2-38;
        const lh=small?15:20;
        const head=small?32:40;
        const lines=this.descLines(ctx,tw,small);
        const lab=small?16:20;
        const gapY=small?10:16;
        const gapX=small?14:24;
        const pad=small?14:22;
        const minGrid=(small?U().tileMinS:U().tileMin)+lab+gapY+pad;
        const dh=Math.max(small?72:110,Math.min(Gr.h-minGrid-(small?8:12),head+lines.length*lh+(small?8:14)));
        const V={x:Gr.x,y:Gr.y,w:Gr.w,h:Gr.h-dh-(small?8:12)};
        const fitCols=s=>Math.max(3,Math.floor((V.w-24+gapX)/(s+gapX)));
        let ts=small?U().tileMinS:U().tileMin;
        for (let s=small?U().tileS:U().tile;s>=ts;s-=2) {
            if (Math.ceil(LIST.length/fitCols(s))*(s+lab+gapY)+pad<=V.h) {
                ts=s;
                break;
            }
        }
        const rows=Math.ceil(LIST.length/fitCols(ts));
        const cols=Math.ceil(LIST.length/rows);
        const rowW=cols*ts+(cols-1)*gapX;
        const content=rows*(ts+lab+gapY)+pad;
        const y0=V.y+(small?10:16)+Math.max(0,(V.h-content)/2);
        this.L={V,dh,ts,gapX,gapY,lab,cols,lines,lh,head,ir,tw,x0:V.x+(V.w-12-rowW)/2,y0,content};
        return this.L;
    }

    clampScroll() {
        const L=this.gridLayout(this.height<600);
        const max=Math.max(0,L.content-L.V.h);
        this.scrollTo=Math.max(0,Math.min(max,this.scrollTo||0));
        return max;
    }

    drawTile(ctx,id,x,y,ts,v,small,i) {
        const ok=this.unlocked(id);
        const eq=this.equipped()===id;
        const sel=id===this.sel;
        const hv=Math.abs(this.hx-x)<ts/2&&Math.abs(this.hy-y)<ts/2;
        const pu=this.pulse[id]||0;
        ctx.save();
        ctx.translate(x,y);
        const sc=1+(hv?0.05:0)+Math.sin(pu*Math.PI)*0.14;
        ctx.scale(sc,sc);
        ctx.rotate(Math.sin(pu*Math.PI*3)*0.04);
        ctx.fillStyle=eq?rgba('red',0.08):(ok?PALETTE.paper:rgba('farGray',0.5));
        ctx.fillRect(-ts/2,-ts/2,ts,ts);
        drawShape(ctx,sketchRect(-ts/2,-ts/2,ts,ts,{width:eq?2.6:1.5,seed:5100+i}),eq?PALETTE.red:(ok?PALETTE.ink:PALETTE.midGray),v);
        const bob=sel&&ok?Math.sin(time.real*3+i)*2:0;
        drawWeaponIcon(ctx,id,0,bob-(ok?0:ts*0.06),ts/U().iconDiv,v,!ok);
        if (!ok) {
            drawLock(ctx,ts/2-10,-ts/2+11,0.8,PALETTE.nearGray);
            ctx.fillStyle=PALETTE.red;
            ctx.textAlign='center';
            ctx.textBaseline='bottom';
            fitText(ctx,id===RANDOM_WEAPON.id?t('arms.need',{n:RANDOM_WEAPON.min}):t('arms.lv',{n:WEAPONS[id].unlock}),0,ts/2-3,ts-8,small?9:11,'bold ');
        }
        if (eq) {
            const k=EASE.easeOutBack(Math.min(1,this.stampT));
            ctx.save();
            ctx.translate(ts/2-4,-ts/2+2);
            ctx.rotate(0.14);
            ctx.scale(k*(1+(1-Math.min(1,this.stampT*2))*0.6),k*(1+(1-Math.min(1,this.stampT*2))*0.6));
            ctx.font='bold '+(small?9:11)+'px '+FONT;
            const sw=ctx.measureText(t('weapon.equipped')).width+10;
            ctx.fillStyle=PALETTE.red;
            ctx.fillRect(-sw+6,-8,sw,small?14:17);
            ctx.fillStyle=PALETTE.paper;
            ctx.textAlign='center';
            ctx.textBaseline='middle';
            ctx.fillText(t('weapon.equipped'),-sw/2+6,small?-1:0.5);
            ctx.restore();
        }
        ctx.restore();
    }

    drawGrid(ctx,v,small) {
        const L=this.gridLayout(small,ctx);
        const V=L.V;
        const max=this.clampScroll();
        const ts=L.ts;
        const si=Math.max(0,LIST.indexOf(this.sel));
        const sx=L.x0+(si%L.cols)*(ts+L.gapX)+ts/2;
        const sy=L.y0+Math.floor(si/L.cols)*(ts+L.lab+L.gapY)+ts/2;
        if (this.jump) {
            this.jump=false;
            this.scrollTo=sy+L.lab/2-V.y-V.h/2;
            this.clampScroll();
            this.scroll=this.scrollTo;
        }
        ctx.save();
        ctx.beginPath();
        ctx.rect(V.x,V.y,V.w,V.h);
        ctx.clip();
        this.tiles=[];
        const now=time.real;
        const dt=Math.min(0.1,Math.max(0,now-(this.boxAt??now)));
        this.boxAt=now;
        if (this.boxX===undefined||this.t<0.05) {
            this.boxX=sx;
            this.boxY=sy;
        }
        const kk=1-Math.exp(-dt*U().boxFollow);
        this.boxX+=(sx-this.boxX)*kk;
        this.boxY+=(sy-this.boxY)*kk;
        this.boxPop=Math.max(0,(this.boxPop||0)-dt*3);
        const ap=EASE.easeOutBack(Math.max(0,Math.min(1,(this.t-0.1)/0.3)));
        if (ap>0) {
            const pop=1+Math.sin(Math.min(1,this.boxPop)*Math.PI)*0.1;
            const bw=(ts+L.gapX-6)*pop;
            const bh=(ts+L.lab+(small?10:14))*pop;
            const cy=this.boxY-(this.scroll||0)+L.lab/2;
            ctx.save();
            ctx.globalAlpha*=Math.min(1,ap);
            roundRect(ctx,this.boxX-bw/2,cy-bh/2,bw,bh,small?8:10);
            ctx.fillStyle=rgba('red',0.06+this.boxPop*0.08);
            ctx.fill();
            ctx.strokeStyle=PALETTE.red;
            ctx.lineWidth=2.2;
            ctx.setLineDash([6,4]);
            ctx.lineDashOffset=-now*16;
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.lineDashOffset=0;
            ctx.restore();
        }
        LIST.forEach((id,i)=>{
            const c=i%L.cols;
            const r=Math.floor(i/L.cols);
            const x=L.x0+c*(ts+L.gapX)+ts/2;
            const y=L.y0+r*(ts+L.lab+L.gapY)+ts/2-(this.scroll||0);
            if (y+ts/2+L.lab<V.y||y-ts/2>V.y+V.h) {
                return;
            }
            const k=EASE.easeOutBack(Math.max(0,Math.min(1,(this.t-0.1-i*0.03)/0.3)));
            if (k<=0) {
                return;
            }
            ctx.save();
            ctx.globalAlpha*=Math.min(1,k);
            ctx.translate(0,(1-k)*12);
            this.drawTile(ctx,id,x,y,ts,v,small,i);
            ctx.restore();
            const ok=this.unlocked(id);
            const sel=id===this.sel;
            ctx.fillStyle=ok?(sel?PALETTE.red:PALETTE.ink):PALETTE.midGray;
            ctx.textAlign='center';
            ctx.textBaseline='top';
            fitText(ctx,t('weapon.'+id+'.name'),x,y+ts/2+(small?4:6),ts+L.gapX-4,small?11:13,sel?'bold ':'');
            this.tiles.push({id,x,y,s:ts,lab:L.lab});
        });
        ctx.restore();
        if (max>0) {
            const th=Math.max(26,V.h*V.h/L.content);
            const ty=V.y+(V.h-th)*((this.scroll||0)/max);
            ctx.fillStyle=rgba('farGray',0.6);
            ctx.fillRect(V.x+V.w-6,V.y,4,V.h);
            ctx.fillStyle=PALETTE.ink;
            ctx.fillRect(V.x+V.w-7,ty,6,th);
        }
        this.drawDetail(ctx,v,small,L);
    }

    drawDetail(ctx,v,small,L) {
        const V=L.V;
        const gx=V.x;
        const gw=V.w;
        const dh=L.dh;
        const dy=V.y+V.h+(small?8:12);
        const id=this.sel;
        const ok=this.unlocked(id);
        const sk=EASE.easeOutCubic(Math.min(1,this.selT*1.5));
        ctx.fillStyle=rgba('paper',0.96);
        ctx.fillRect(gx,dy,gw,dh);
        drawShape(ctx,sketchRect(gx,dy,gw,dh,{width:1.6,seed:5140}),PALETTE.ink,v);
        ctx.save();
        ctx.beginPath();
        ctx.rect(gx,dy,gw,dh);
        ctx.clip();
        ctx.globalAlpha*=0.3+0.7*sk;
        ctx.translate((1-sk)*10,0);
        const ir=L.ir;
        drawWeaponIcon(ctx,id,gx+12+ir,dy+(small?18:24)+ir*0.6,ir/U().detailDiv,v,!ok);
        const tx=gx+26+ir*2;
        ctx.fillStyle=ok?PALETTE.ink:PALETTE.nearGray;
        ctx.textAlign='left';
        ctx.textBaseline='top';
        fitText(ctx,t('weapon.'+id+'.name')+t('ui.sep')+t('weapon.'+id+'.short'),tx,dy+(small?8:10),gx+gw-tx-12,small?15:20,'bold ');
        ctx.font=(small?12:15)+'px '+FONT;
        ctx.fillStyle=PALETTE.nearGray;
        const mx=Math.max(1,Math.floor((dh-L.head)/L.lh));
        L.lines.slice(0,mx).forEach((ln,q)=>ctx.fillText(ln,tx,dy+L.head+q*L.lh));
        ctx.restore();
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

    drawRight(ctx,v,small) {
        const R=this.R;
        const id=this.sel;
        const ok=this.unlocked(id);
        const sk=EASE.easeOutCubic(Math.min(1,this.selT*1.5));
        const rows=id===RANDOM_WEAPON.id?0:STATS.length;
        const rh=small?16:24;
        const statH=rows?rows*rh+(small?10:18):0;
        const sh=Math.min(R.w*9/16,R.h-statH-(small?8:12));
        const sw=sh*16/9;
        const sx=R.x+(R.w-sw)/2;
        const top=R.y+Math.max(0,(R.h-sh-statH-(small?8:12))/2*(small?1:0));
        ctx.save();
        ctx.globalAlpha*=0.4+0.6*sk;
        ctx.translate(0,(1-sk)*U().rise);
        const anim=WEAPON_ANIMS[id];
        if (anim) {
            drawStage(ctx,sx,top,sw,sh,anim,time.real,v);
        }
        else {
            this.drawRandomStage(ctx,sx,top,sw,sh,v);
        }
        if (!ok) {
            ctx.fillStyle=rgba('paper',0.55);
            ctx.fillRect(sx+2,top+2,sw-4,sh-4);
            drawLock(ctx,sx+sw/2,top+sh/2,small?1.6:2.2,PALETTE.nearGray);
        }
        ctx.restore();
        if (!rows) {
            return;
        }
        const W=WEAPONS[id];
        const by=top+sh+(small?8:12);
        const bx=R.x;
        const bw=R.w;
        ctx.fillStyle=rgba('paper',0.96);
        ctx.fillRect(bx,by,bw,statH);
        drawShape(ctx,sketchRect(bx,by,bw,statH,{width:1.6,seed:5160}),PALETTE.ink,v);
        const lw=small?44:62;
        const pip=Math.min(small?26:40,(bw-lw-24-4*6)/5);
        STATS.forEach((k,i)=>{
            const yy=by+(small?5:9)+i*rh+rh/2;
            ctx.fillStyle=PALETTE.ink;
            ctx.textAlign='left';
            ctx.textBaseline='middle';
            fitText(ctx,t('arms.stat.'+k),bx+12,yy,lw-6,small?11:14,'bold ');
            const n=W.stats[k];
            for (let q=0;q<5;q++) {
                const px=bx+12+lw+q*(pip+6);
                const fill=Math.max(0,Math.min(1,sk*5.5-q-i*0.3));
                ctx.fillStyle=rgba('farGray',0.7);
                ctx.fillRect(px,yy-(small?4:6),pip,small?8:12);
                if (q<n&&fill>0) {
                    ctx.fillStyle=ok?(n>=4?PALETTE.red:PALETTE.ink):PALETTE.midGray;
                    ctx.fillRect(px,yy-(small?4:6),pip*fill,small?8:12);
                }
            }
        });
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
        this.drawGrid(ctx,v,small);
        this.drawRight(ctx,v,small);
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
