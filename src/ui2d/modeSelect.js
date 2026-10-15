import {PALETTE,rgba} from '../data/palette.js';
import {t} from '../data/strings.js';
import {time} from '../core/loop.js';
import {TUNING} from '../data/tuning.js';
import {EASE} from '../core/easing.js';
import {sketchRect,sketchLine,sketchCircle,drawShape} from './sketch.js';
import {FONT,inRect,drawButton,Panel,fitText} from './uiKit.js';
import {wrapText} from './cardView.js';
import {ENEMY_ICONS} from './enemyIcons.js';

export const MODE_LIST=['endless','story','bossrush'];

const RUSH_ICONS=['inkBottle','scissors','book','exam','bookFinal','alarm','calculator'];

function clamp01(v) {
    return Math.max(0,Math.min(1,v));
}

export class ModeSelect extends Panel {
    constructor(actions) {
        super();
        this.actions=actions;
        this.outFrom=0.5;
        this.sel=1;
        this.saves={};
        this.hx=-1;
        this.hy=-1;
        this.cards=[];
        this.infos=[];
        this.shake=[0,0,0];
        this.pick=[0,0,0];
        this.selPop=[0,0,0];
        this.lastSel=-1;
    }

    open2() {
        this.sel=1;
        this.saves=this.actions.saves?this.actions.saves():{};
        this.shake=[0,0,0];
        this.pick=[0,0,0];
        this.show();
    }

    hover(x,y) {
        this.hx=x;
        this.hy=y;
    }

    layout() {
        const U=TUNING.modeUi;
        const w=this.width;
        const h=this.height;
        const small=h<600;
        this.small=small;
        const pad=small?U.padSmall:U.pad;
        const gap=small?U.gapSmall:U.gap;
        const top=small?U.topSmall:U.top;
        const bh=small?U.btnHSmall:U.btnH;
        const below=small?U.belowSmall:U.below;
        const cw=Math.min(U.cardMaxW,(w-pad*2-gap*2)/3);
        const ch=Math.min(small?U.cardMaxHSmall:U.cardMaxH,h-top-below-bh-(small?14:24));
        const x0=w/2-(cw*3+gap*2)/2;
        this.cards=[];
        this.infos=[];
        for (let i=0;i<3;i++) {
            const r={x:x0+i*(cw+gap),y:top,w:cw,h:ch};
            this.cards.push(r);
            const ir=small?12:14;
            this.infos.push({x:r.x+r.w-ir*2-12,y:r.y+r.h-ir*2-12,w:ir*2,h:ir*2});
        }
        const bw=Math.min(U.btnW,w*0.5);
        this.startBtn={x:w/2-bw/2,y:top+ch+(small?14:24),w:bw,h:bh};
        const kb=small?U.backWSmall:U.backW;
        this.backBtn={x:small?14:24,y:small?12:20,w:kb,h:small?34:42};
        this.buttons=[this.backBtn,this.startBtn];
    }

    status() {
        return this.actions.status();
    }

    locked(i) {
        return MODE_LIST[i]==='bossrush'&&this.status().rushLocked;
    }

    start() {
        if (this.locked(this.sel)) {
            this.shake[this.sel]=1;
            if (this.actions.denied) {
                this.actions.denied();
            }
            return;
        }
        this.pick[this.sel]=1;
        this.actions.start(MODE_LIST[this.sel]);
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
        if (this.gradeHit&&this.status().rushGrade&&inRect(this.gradeHit,x,y)&&this.actions.grade) {
            this.actions.grade();
            return true;
        }
        for (let i=0;i<3;i++) {
            if (inRect(this.infos[i],x,y)) {
                this.actions.info(MODE_LIST[i]);
                return true;
            }
        }
        for (let i=0;i<3;i++) {
            if (inRect(this.cards[i],x,y)) {
                if (this.sel===i) {
                    this.start();
                    return true;
                }
                this.sel=i;
                if (this.locked(i)) {
                    this.shake[i]=1;
                }
                this.actions.select();
                return true;
            }
        }
        if (inRect(this.startBtn,x,y)) {
            this.start();
        }
        return true;
    }

    key(code) {
        if (!this.open) {
            return false;
        }
        if (code==='ArrowLeft'||code==='KeyA') {
            this.sel=(this.sel+2)%3;
            this.actions.select();
            return true;
        }
        if (code==='ArrowRight'||code==='KeyD') {
            this.sel=(this.sel+1)%3;
            this.actions.select();
            return true;
        }
        if (code==='Enter'||code==='Space') {
            this.start();
            return true;
        }
        return false;
    }

    update(dt) {
        super.update(dt);
        for (let i=0;i<3;i++) {
            this.shake[i]=Math.max(0,this.shake[i]-dt*TUNING.modeUi.shakeDecay);
            this.pick[i]=Math.max(0,this.pick[i]-dt*2);
            this.selPop[i]=Math.max(0,this.selPop[i]-dt*TUNING.modeUi.fx.popDecay);
        }
        if (this.sel!==this.lastSel) {
            this.selPop[this.sel]=1;
            this.lastSel=this.sel;
        }
    }

    drawBackdrop(ctx,v,a) {
        const U=TUNING.modeUi;
        const w=this.width;
        const h=this.height;
        ctx.fillStyle=rgba('paper',0.97*a);
        ctx.fillRect(0,0,w,h);
        const draw=clamp01(this.t/U.ruleIn);
        ctx.strokeStyle=rgba('farGray',0.9*a);
        ctx.lineWidth=1;
        for (let y=U.rule,k=0;y<h;y+=U.rule,k++) {
            const f=clamp01(draw*1.6-k*0.03);
            if (f<=0) {
                continue;
            }
            ctx.beginPath();
            ctx.moveTo(0,y);
            ctx.lineTo(w*EASE.easeOutCubic(f),y);
            ctx.stroke();
        }
        this.drawDoodles(ctx,a);
        ctx.strokeStyle=rgba('red',0.45*a);
        ctx.lineWidth=1.6;
        ctx.beginPath();
        ctx.moveTo(U.margin,0);
        ctx.lineTo(U.margin,h*EASE.easeOutCubic(draw));
        ctx.stroke();
        const small=this.small;
        const ty=small?30:44;
        const ta=EASE.easeOutBack(clamp01((this.t-0.05)/0.4));
        ctx.save();
        ctx.translate(w/2,ty);
        ctx.scale(ta,ta);
        ctx.fillStyle=PALETTE.ink;
        ctx.font='bold '+(small?26:34)+'px '+FONT;
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        const title=t('modes.title');
        ctx.fillText(title,0,0);
        const tw=ctx.measureText(title).width;
        drawShape(ctx,sketchLine(-tw/2,small?17:22,-tw/2+tw*clamp01((this.t-0.2)/0.5),small?17:22,{width:2.6,seed:3601}),PALETTE.red,v);
        ctx.restore();
    }

    drawDoodles(ctx,a) {
        const F=TUNING.modeUi.fx;
        const w=this.width;
        const h=this.height;
        const k=clamp01((this.t-0.2)/0.6)*a;
        if (k<=0) {
            return;
        }
        ctx.save();
        ctx.lineCap='round';
        for (let i=0;i<F.doodles;i++) {
            const hx=(Math.sin(i*91.7)*43758.5)%1;
            const hy=(Math.sin(i*37.3)*24634.6)%1;
            const sp=F.drift*(0.6+Math.abs(hx)*0.8);
            const x=Math.abs(hx)*w+Math.sin(time.real*0.4+i)*12;
            const y=(((Math.abs(hy)*h-time.real*sp)%h)+h)%h;
            const s=8+Math.abs(hx*hy)*14;
            const rot=time.real*0.5*(i%2?1:-1)+i;
            ctx.save();
            ctx.translate(x,y);
            ctx.rotate(rot);
            ctx.globalAlpha=k*F.alpha*(i%5===0?1.4:1);
            ctx.strokeStyle=i%5===0?PALETTE.red:PALETTE.midGray;
            ctx.lineWidth=1.6;
            ctx.beginPath();
            const kind=i%4;
            if (kind===0) {
                for (let j=0;j<5;j++) {
                    const an=j/5*Math.PI*2;
                    ctx.moveTo(0,0);
                    ctx.lineTo(Math.cos(an)*s*0.6,Math.sin(an)*s*0.6);
                }
            }
            else if (kind===1) {
                for (let j=0;j<=20;j++) {
                    const an=j/20*Math.PI*3;
                    const rr=j/20*s*0.6;
                    if (j===0) {
                        ctx.moveTo(0,0);
                    }
                    else {
                        ctx.lineTo(Math.cos(an)*rr,Math.sin(an)*rr);
                    }
                }
            }
            else if (kind===2) {
                ctx.moveTo(-s*0.6,0);
                ctx.quadraticCurveTo(-s*0.2,-s*0.5,0,0);
                ctx.quadraticCurveTo(s*0.2,s*0.5,s*0.6,0);
            }
            else {
                ctx.arc(0,0,s*0.35,0,Math.PI*2);
            }
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    }

    drawSelFx(ctx,r,v,i) {
        const F=TUNING.modeUi.fx;
        ctx.save();
        ctx.globalAlpha*=0.6+0.4*Math.sin(time.real*3);
        drawShape(ctx,sketchRect(-F.ring,-F.ring,r.w+F.ring*2,r.h+F.ring*2,{width:2.2,seed:3640+i}),PALETTE.red,v);
        ctx.globalAlpha=1;
        const per=2*(r.w+r.h+F.ring*4);
        for (let k=0;k<F.sparks;k++) {
            let d=((time.real*F.orbit+k/F.sparks)%1)*per;
            const W=r.w+F.ring*2;
            const H=r.h+F.ring*2;
            let x;
            let y;
            if (d<W) {
                x=d;
                y=0;
            }
            else if ((d-=W)<H) {
                x=W;
                y=d;
            }
            else if ((d-=H)<W) {
                x=W-d;
                y=H;
            }
            else {
                x=0;
                y=H-(d-W);
            }
            ctx.fillStyle=k%2?PALETTE.red:PALETTE.ink;
            ctx.beginPath();
            ctx.arc(x-F.ring,y-F.ring,2.6+Math.sin(time.real*6+k)*1,0,Math.PI*2);
            ctx.fill();
        }
        const p=this.selPop[i];
        if (p>0) {
            ctx.globalAlpha=p;
            ctx.strokeStyle=PALETTE.red;
            ctx.lineWidth=3*p;
            const g=(1-p)*F.burst;
            ctx.strokeRect(-g,-g,r.w+g*2,r.h+g*2);
        }
        ctx.restore();
    }

    drawLand(ctx,r,i) {
        const U=TUNING.modeUi;
        const F=U.fx;
        const lt=this.t-0.12-i*U.stagger-U.dropIn*0.55;
        if (lt<0||lt>F.landT) {
            return;
        }
        const k=lt/F.landT;
        ctx.save();
        ctx.globalAlpha=1-k;
        ctx.fillStyle=rgba('ink',0.5);
        for (let j=0;j<8;j++) {
            const an=j/8*Math.PI*2+i;
            const d=r.w*0.35+k*r.w*0.35;
            ctx.beginPath();
            ctx.arc(r.x+r.w/2+Math.cos(an)*d,r.y+r.h+Math.sin(an)*d*0.25,4*(1-k)+1,0,Math.PI*2);
            ctx.fill();
        }
        ctx.strokeStyle=rgba('ink',0.4);
        ctx.lineWidth=2;
        ctx.beginPath();
        ctx.ellipse(r.x+r.w/2,r.y+r.h,r.w*(0.4+k*0.4),10+k*14,0,0,Math.PI*2);
        ctx.stroke();
        ctx.restore();
    }

    drawBack(ctx,v) {
        const b=this.backBtn;
        const ap=clamp01((this.t-0.1)/0.35);
        if (ap<=0) {
            return;
        }
        const hv=inRect(b,this.hx,this.hy);
        ctx.save();
        ctx.globalAlpha=ap;
        ctx.translate(b.x+b.w/2-(1-EASE.easeOutCubic(ap))*30,b.y+b.h/2);
        ctx.scale(hv?1.05:1,hv?1.05:1);
        ctx.fillStyle=hv?rgba('farGray',0.95):rgba('paper',0.95);
        ctx.fillRect(-b.w/2,-b.h/2,b.w,b.h);
        drawShape(ctx,sketchRect(-b.w/2,-b.h/2,b.w,b.h,{width:hv?2.4:1.8,seed:3602}),PALETTE.ink,v);
        ctx.fillStyle=PALETTE.ink;
        ctx.font='bold '+(this.small?15:18)+'px '+FONT;
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        ctx.fillText('← '+t('menu.back'),0,1);
        ctx.restore();
    }

    drawNotebookArt(ctx,w,h,v,tt) {
        ctx.strokeStyle=rgba('farGray',1);
        ctx.lineWidth=1;
        for (let y=14;y<h;y+=12) {
            ctx.beginPath();
            ctx.moveTo(18,y);
            ctx.lineTo(w-6,y);
            ctx.stroke();
        }
        for (let y=10;y<h-4;y+=16) {
            ctx.strokeStyle=PALETTE.ink;
            ctx.lineWidth=1.6;
            ctx.beginPath();
            ctx.arc(8,y,4,0,Math.PI*2);
            ctx.stroke();
        }
        const gx=w*0.26;
        const gy=h*0.62;
        const bob=Math.sin(tt*4)*2;
        ctx.strokeStyle=PALETTE.ink;
        ctx.lineWidth=2.4;
        ctx.lineCap='round';
        ctx.beginPath();
        ctx.arc(gx,gy-28+bob,8,0,Math.PI*2);
        ctx.moveTo(gx,gy-20+bob);
        ctx.lineTo(gx,gy+4);
        ctx.moveTo(gx,gy+4);
        ctx.lineTo(gx-8,gy+20);
        ctx.moveTo(gx,gy+4);
        ctx.lineTo(gx+8,gy+20);
        ctx.moveTo(gx,gy-12+bob*0.5);
        ctx.lineTo(gx+16,gy-14);
        ctx.stroke();
        const ex=w*0.78;
        const ey=h*0.56;
        const wob=Math.sin(tt*3)*0.12;
        ctx.save();
        ctx.translate(ex,ey);
        ctx.rotate(wob);
        ctx.fillStyle=PALETTE.ink;
        ctx.beginPath();
        for (let i=0;i<=12;i++) {
            const a=i/12*Math.PI*2;
            const r=16+Math.sin(a*3+tt*2)*3;
            ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
        }
        ctx.fill();
        ctx.fillStyle=PALETTE.paper;
        ctx.beginPath();
        ctx.arc(-5,-3,3,0,Math.PI*2);
        ctx.arc(6,-3,3,0,Math.PI*2);
        ctx.fill();
        ctx.restore();
        for (let k=0;k<3;k++) {
            const f=(tt*0.9+k/3)%1;
            const x=gx+20+(ex-gx-40)*f;
            ctx.fillStyle=k===0?PALETTE.red:PALETTE.ink;
            ctx.beginPath();
            ctx.ellipse(x,gy-14-(ey-gy+14)*f*0.3,4,2.4,0,0,Math.PI*2);
            ctx.fill();
        }
    }

    drawCourseArt(ctx,w,h,v,tt) {
        const cols=4;
        const rows=3;
        const gx=14;
        const gy=24;
        const gw=w-28-30;
        const gh=h-34;
        const cw=gw/cols;
        const rh=gh/rows;
        const on=Math.floor(tt/0.7)%(cols*rows);
        for (let r=0;r<rows;r++) {
            for (let c=0;c<cols;c++) {
                const k=r*cols+c;
                if (k===on) {
                    ctx.fillStyle=rgba('red',0.22);
                    ctx.fillRect(gx+c*cw+2,gy+r*rh+2,cw-4,rh-4);
                }
                else if ((k*7)%5===0) {
                    ctx.fillStyle=rgba('farGray',0.9);
                    ctx.fillRect(gx+c*cw+3,gy+r*rh+3,cw-6,rh-6);
                }
            }
        }
        ctx.strokeStyle=PALETTE.ink;
        ctx.lineWidth=1.6;
        ctx.strokeRect(gx,gy,gw,gh);
        for (let c=1;c<cols;c++) {
            ctx.beginPath();
            ctx.moveTo(gx+c*cw,gy);
            ctx.lineTo(gx+c*cw,gy+gh);
            ctx.stroke();
        }
        for (let r=1;r<rows;r++) {
            ctx.beginPath();
            ctx.moveTo(gx,gy+r*rh);
            ctx.lineTo(gx+gw,gy+r*rh);
            ctx.stroke();
        }
        ctx.fillStyle=PALETTE.nearGray;
        ctx.font='bold 11px '+FONT;
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        const days=t('modes.days').split('|');
        for (let c=0;c<cols;c++) {
            ctx.fillText(days[c]||'',gx+c*cw+cw/2,gy-9);
        }
        const cx=w-22;
        const cy=14;
        ctx.fillStyle=PALETTE.paper;
        ctx.beginPath();
        ctx.arc(cx,cy,11,0,Math.PI*2);
        ctx.fill();
        ctx.strokeStyle=PALETTE.ink;
        ctx.lineWidth=1.8;
        ctx.stroke();
        const a=tt*2.4;
        ctx.strokeStyle=PALETTE.red;
        ctx.beginPath();
        ctx.moveTo(cx,cy);
        ctx.lineTo(cx+Math.sin(a)*8,cy-Math.cos(a)*8);
        ctx.stroke();
        ctx.strokeStyle=PALETTE.ink;
        ctx.beginPath();
        ctx.moveTo(cx,cy);
        ctx.lineTo(cx+Math.sin(a/12)*5,cy-Math.cos(a/12)*5);
        ctx.stroke();
    }

    drawRushArt(ctx,w,h,v,tt,locked) {
        ctx.fillStyle=locked?rgba('midGray',0.18):rgba('red',0.1);
        ctx.fillRect(0,0,w,h);
        ctx.strokeStyle=locked?rgba('midGray',0.3):rgba('red',0.25);
        ctx.lineWidth=1;
        for (let x=-h;x<w;x+=10) {
            ctx.beginPath();
            ctx.moveTo(x,h);
            ctx.lineTo(x+h,0);
            ctx.stroke();
        }
        const n=RUSH_ICONS.length;
        const cur=Math.floor(tt/0.55)%(n+3);
        const s=Math.min(w/150,h/90)*0.42;
        for (let i=0;i<n;i++) {
            const row=i<4?0:1;
            const col=row===0?i:i-4;
            const per=row===0?4:3;
            const x=w/2+(col-(per-1)/2)*w*0.22;
            const y=h*(row===0?0.33:0.72);
            ctx.save();
            ctx.translate(x,y+Math.sin(tt*2+i)*1.5);
            ctx.scale(s,s);
            if (locked) {
                ctx.globalAlpha*=0.45;
            }
            ENEMY_ICONS[RUSH_ICONS[i]](ctx,v);
            ctx.restore();
            if (!locked&&i<cur) {
                const f=i===cur-1?clamp01((tt%0.55)/0.25):1;
                ctx.strokeStyle=PALETTE.red;
                ctx.lineWidth=3;
                ctx.lineCap='round';
                const r=w*0.07;
                ctx.beginPath();
                ctx.moveTo(x-r,y-r);
                ctx.lineTo(x-r+2*r*f,y-r+2*r*f);
                ctx.stroke();
            }
        }
    }

    drawLock(ctx,x,y,s) {
        ctx.save();
        ctx.translate(x,y);
        ctx.scale(s,s);
        ctx.strokeStyle=PALETTE.ink;
        ctx.lineWidth=4;
        ctx.beginPath();
        ctx.arc(0,-8,10,Math.PI,0);
        ctx.lineTo(10,0);
        ctx.moveTo(-10,0);
        ctx.lineTo(-10,-8);
        ctx.stroke();
        ctx.fillStyle=PALETTE.ink;
        ctx.fillRect(-15,-2,30,22);
        ctx.fillStyle=PALETTE.paper;
        ctx.beginPath();
        ctx.arc(0,7,3.5,0,Math.PI*2);
        ctx.fill();
        ctx.fillRect(-1.5,8,3,7);
        ctx.restore();
    }

    drawCard(ctx,i,v) {
        const U=TUNING.modeUi;
        const r=this.cards[i];
        const mode=MODE_LIST[i];
        const st=this.status();
        const locked=this.locked(i);
        const small=this.small;
        const ap=clamp01((this.t-0.12-i*U.stagger)/U.dropIn);
        if (ap<=0) {
            return;
        }
        const e=EASE.easeOutBack(ap);
        const sel=this.sel===i;
        const hv=inRect(r,this.hx,this.hy);
        const tt=time.real+i*1.3;
        const lift=(sel?U.selLift:0)+(hv?U.hoverLift:0)+(sel?Math.sin(time.real*2.2)*2:Math.sin(time.real*1.6+i*2)*U.fx.idle);
        const tilt=(i-1)*U.tilt*(sel||hv?0.25:1);
        const sh=this.shake[i];
        const jig=sh>0?Math.sin(time.real*45)*sh*8:0;
        const sc=(sel?1.03:1)+this.pick[i]*0.06+Math.sin(this.selPop[i]*Math.PI)*0.05;
        const flip=Math.max(0.02,Math.abs(Math.cos((1-e)*Math.PI*0.5)));
        ctx.save();
        ctx.globalAlpha=Math.min(1,ap*2);
        ctx.translate(r.x+r.w/2+jig,r.y+r.h/2-lift+(1-e)*this.height*0.5);
        ctx.rotate(tilt+(1-e)*(i-1)*0.4);
        ctx.scale(sc*flip,sc);
        ctx.translate(-r.w/2,-r.h/2);
        if (sel&&ap>=1) {
            this.drawSelFx(ctx,r,v,i);
        }
        ctx.fillStyle=rgba('ink',0.12+(sel?0.06:0));
        ctx.fillRect(6,8+lift*0.3,r.w,r.h);
        ctx.fillStyle=mode==='bossrush'&&!locked?rgba('paper',1):PALETTE.paper;
        ctx.fillRect(0,0,r.w,r.h);
        if (mode==='bossrush') {
            ctx.fillStyle=locked?rgba('farGray',0.7):rgba('red',0.06);
            ctx.fillRect(0,0,r.w,r.h);
        }
        drawShape(ctx,sketchRect(0,0,r.w,r.h,{width:sel?3:2,seed:3610+i}),sel?PALETTE.red:PALETTE.ink,v);
        ctx.save();
        ctx.translate(r.w/2,0);
        ctx.rotate((i-1)*0.08-0.04);
        ctx.fillStyle=rgba('farGray',0.88);
        ctx.fillRect(-U.tapeW/2,-9,U.tapeW,18);
        ctx.restore();
        const ix=12;
        const iy=small?16:20;
        const iw=r.w-24;
        const ih=Math.round(r.h*(small?0.4:0.44));
        ctx.save();
        ctx.beginPath();
        ctx.rect(ix,iy,iw,ih);
        ctx.clip();
        ctx.translate(ix,iy);
        if (mode==='story') {
            this.drawNotebookArt(ctx,iw,ih,v,tt);
        }
        else if (mode==='endless') {
            this.drawCourseArt(ctx,iw,ih,v,tt);
        }
        else {
            this.drawRushArt(ctx,iw,ih,v,tt,locked);
        }
        ctx.restore();
        drawShape(ctx,sketchRect(ix,iy,iw,ih,{width:1.3,seed:3620+i}),rgba('ink',0.7),v);
        if (locked) {
            ctx.fillStyle=rgba('paper',0.55);
            ctx.fillRect(ix,iy,iw,ih);
            this.drawLock(ctx,r.w/2,iy+ih/2,small?1:1.25);
        }
        let y=iy+ih+(small?22:30);
        ctx.fillStyle=locked?PALETTE.midGray:(mode==='bossrush'?PALETTE.red:PALETTE.ink);
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        fitText(ctx,t('modeinfo.'+mode+'.title'),r.w/2,y,r.w-24,small?21:26,'bold ');
        y+=small?20:26;
        ctx.font=(small?12:14)+'px '+FONT;
        ctx.fillStyle=PALETTE.nearGray;
        const lines=wrapText(ctx,t('modes.'+mode+'.tag'),r.w-30).slice(0,2);
        for (const l of lines) {
            ctx.fillText(l,r.w/2,y);
            y+=small?15:18;
        }
        y+=small?2:6;
        drawShape(ctx,sketchLine(18,y,r.w-18,y,{width:1.2,seed:3650+i}),rgba('midGray',0.7),v);
        y=Math.max(y+(small?16:22),r.h-(small?74:96));
        if (locked) {
            ctx.font='bold '+(small?12:13)+'px '+FONT;
            ctx.fillStyle=PALETTE.ink;
            ctx.fillText(t('modes.lockHead'),r.w/2,y);
            y+=small?17:21;
            const conds=[[st.lvOk,t('modes.condLv',{need:st.needLv,lv:st.lv})],[st.clearOk,t('modes.condClear')]];
            ctx.textAlign='left';
            for (const [ok,label] of conds) {
                ctx.font=(small?12:13)+'px '+FONT;
                ctx.fillStyle=ok?PALETTE.red:PALETTE.nearGray;
                ctx.fillText((ok?'✔ ':'✘ ')+label,22,y);
                y+=small?16:20;
            }
            ctx.textAlign='center';
        }
        else {
            const best=st.best[mode]||0;
            ctx.font=(small?12:14)+'px '+FONT;
            ctx.fillStyle=PALETTE.nearGray;
            ctx.fillText(t('modes.best'),r.w/2,y);
            y+=small?24:32;
            ctx.font='bold '+(small?U.bestSmall:U.best)+'px '+FONT;
            ctx.fillStyle=PALETTE.ink;
            const txt=best>0?best.toLocaleString('en-US'):'—';
            ctx.fillText(txt,r.w/2,y);
            if (mode==='bossrush'&&st.rushGrade) {
                const gx=r.w/2+ctx.measureText(txt).width/2+(small?24:30);
                const gr=(small?15:18)+6;
                this.gradeHit={x:r.x+gx-gr,y:r.y+y-gr,w:gr*2,h:gr*2};
                ctx.save();
                ctx.translate(gx,y);
                ctx.rotate(-0.15);
                ctx.strokeStyle=PALETTE.red;
                ctx.lineWidth=2.2;
                ctx.beginPath();
                ctx.arc(0,0,small?15:18,0,Math.PI*2);
                ctx.stroke();
                ctx.fillStyle=PALETTE.red;
                ctx.font='bold '+(st.rushGrade.length>1?(small?11:13):(small?15:18))+'px '+FONT;
                ctx.fillText(st.rushGrade,0,1);
                ctx.restore();
            }
        }
        const ib=this.infos[i];
        const ihv=inRect(ib,this.hx,this.hy);
        const icx=ib.x-r.x+ib.w/2;
        const icy=ib.y-r.y+ib.h/2;
        ctx.fillStyle=ihv?rgba('farGray',1):PALETTE.paper;
        ctx.beginPath();
        ctx.arc(icx,icy,ib.w/2,0,Math.PI*2);
        ctx.fill();
        drawShape(ctx,sketchCircle(icx,icy,ib.w/2,{width:1.6,seed:3630+i}),PALETTE.ink,v);
        ctx.fillStyle=PALETTE.ink;
        ctx.font='bold '+(small?13:15)+'px '+FONT;
        ctx.fillText('i',icx,icy+1);
        if (this.saves[mode]) {
            this.drawSaveTag(ctx,small,i);
        }
        if (mode==='story') {
            const pulse=1+Math.sin(time.real*3)*0.04;
            ctx.save();
            ctx.translate(r.w-8,8);
            ctx.rotate(0.22);
            ctx.scale(pulse,pulse);
            const rw=small?46:56;
            const rh=small?22:26;
            ctx.fillStyle=PALETTE.red;
            ctx.fillRect(-rw/2,-rh/2,rw,rh);
            ctx.strokeStyle=PALETTE.paper;
            ctx.lineWidth=1.5;
            ctx.strokeRect(-rw/2+3,-rh/2+3,rw-6,rh-6);
            ctx.fillStyle=PALETTE.paper;
            ctx.font='bold '+(small?12:14)+'px '+FONT;
            ctx.fillText(t('modes.recommend'),0,1);
            ctx.restore();
        }
        ctx.restore();
    }

    drawSaveTag(ctx,small,i) {
        const U=TUNING.modeUi.save;
        const k=clamp01((this.t-0.5-i*0.08)/U.pop);
        if (k<=0) {
            return;
        }
        const e=EASE.easeOutBack(k);
        ctx.save();
        ctx.translate(small?14:18,small?10:12);
        ctx.rotate(U.rot+Math.sin(time.real*U.sway)*0.03);
        ctx.scale(e,e);
        ctx.font='bold '+(small?11:13)+'px '+FONT;
        const label=t('modes.saved');
        const tw=ctx.measureText(label).width+(small?24:30);
        const th=small?22:26;
        ctx.fillStyle=rgba('ink',0.15);
        ctx.fillRect(3,3,tw,th);
        ctx.fillStyle=PALETTE.paper;
        ctx.fillRect(0,0,tw,th);
        ctx.strokeStyle=PALETTE.red;
        ctx.lineWidth=1.6;
        ctx.strokeRect(2,2,tw-4,th-4);
        const pulse=0.55+0.45*Math.sin(time.real*U.blink);
        ctx.fillStyle=rgba('red',pulse);
        ctx.beginPath();
        ctx.arc(small?10:12,th/2,small?3.5:4.5,0,Math.PI*2);
        ctx.fill();
        ctx.fillStyle=PALETTE.red;
        ctx.textAlign='left';
        ctx.textBaseline='middle';
        ctx.fillText(label,small?17:21,th/2+1);
        ctx.restore();
    }

    draw(ctx) {
        if (!this.shown()) {
            return;
        }
        this.layout();
        const v=time.boilIndex;
        const a=clamp01(this.t/0.25);
        ctx.save();
        this.drawBackdrop(ctx,v,a);
        this.drawBack(ctx,v);
        const order=[0,1,2].filter(i=>i!==this.sel).concat([this.sel]);
        for (let i=0;i<3;i++) {
            this.drawLand(ctx,this.cards[i],i);
        }
        for (const i of order) {
            this.drawCard(ctx,i,v);
        }
        const mode=MODE_LIST[this.sel];
        const locked=this.locked(this.sel);
        const sb=this.startBtn;
        const lab=locked?t('modes.locked'):t('modes.start',{mode:t('modeinfo.'+mode+'.title')});
        drawButton(ctx,sb,lab,v,(this.t-0.45)/0.35,inRect(sb,this.hx,this.hy),this.small?18:21,locked);
        const ha=clamp01((this.t-0.7)/0.4);
        if (ha>0) {
            ctx.globalAlpha=ha;
            ctx.fillStyle=PALETTE.midGray;
            ctx.font=(this.small?11:13)+'px '+FONT;
            ctx.textAlign='center';
            ctx.textBaseline='top';
            ctx.fillText(t('modes.hint'),this.width/2,sb.y+sb.h+(this.small?6:10));
        }
        ctx.restore();
    }
}
