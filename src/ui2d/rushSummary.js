import {PALETTE,rgba} from '../data/palette.js';
import {t} from '../data/strings.js';
import {time} from '../core/loop.js';
import {TUNING} from '../data/tuning.js';
import {EASE} from '../core/easing.js';
import {sketchRect,sketchLine,drawShape} from './sketch.js';
import {FONT,inRect,drawButton,fitText} from './uiKit.js';
import {ENEMY_ICONS} from './enemyIcons.js';

function clamp01(v) {
    return Math.max(0,Math.min(1,v));
}

function clock(s) {
    const m=Math.floor(s/60);
    const r=Math.floor(s%60);
    return m+':'+(r<10?'0':'')+r;
}

function timeline(S) {
    const U=TUNING.rushSummaryUi;
    const n=S.stats.rushT?S.stats.rushT.rows.length:7;
    const rowsEnd=U.rowStart+n*U.rowGap+U.count;
    const scoreAt=rowsEnd+U.gap;
    const gradeAt=scoreAt+U.countTime+U.gap;
    return {rowsEnd,scoreAt,gradeAt,doneAt:gradeAt+U.gradeTime};
}

function drawTitle(S,ctx,T,w,ty,small,v) {
    const title=S.victory?t('rush.sum.victory'):(S.quit?t('rush.sum.quit'):t('rush.sum.dead'));
    const ta=EASE.easeOutBack(clamp01(T/0.4));
    ctx.save();
    ctx.translate(w/2,ty+(1-ta)*-30);
    ctx.scale(ta,ta);
    ctx.rotate(-0.02+Math.sin(time.real*1.3)*0.008);
    ctx.font='bold '+(small?26:38)+'px '+FONT;
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    const tw=ctx.measureText(title).width;
    const col=S.victory?PALETTE.red:PALETTE.ink;
    drawShape(ctx,sketchRect(-tw/2-18,-(small?20:28),tw+36,small?40:56,{width:3,seed:3801}),col,v);
    ctx.fillStyle=col;
    ctx.fillText(title,0,2);
    ctx.restore();
}

function drawRow(S,ctx,row,i,T,x0,y,pw,rh,small,v) {
    const U=TUNING.rushSummaryUi;
    const B=TUNING.bossRush.score;
    const at=U.rowStart+i*U.rowGap;
    const k=clamp01((T-at)/U.rowIn);
    if (k<=0) {
        return;
    }
    const parts=['time','dodge','skill','hurt'];
    const maxes={time:B.time,dodge:B.dodgeMax,skill:B.card+B.weak,hurt:B.hurt};
    const nameW=small?U.nameWSmall:U.nameW;
    const subW=small?U.subWSmall:U.subW;
    const partW=(pw-nameW-subW-rh)/4;
    const e=EASE.easeOutBack(k);
    const cp=clamp01((T-at-U.rowIn*0.5)/U.count);
    const ce=EASE.easeOutCubic(cp);
    ctx.save();
    ctx.globalAlpha=Math.min(1,k*1.6);
    ctx.translate((1-e)*-60,0);
    if (i%2===0) {
        ctx.fillStyle=rgba('farGray',0.45);
        ctx.fillRect(x0,y,pw,rh-2);
    }
    const cleared=!!(row.rec&&row.rec.cleared);
    const pop=clamp01((T-at)/0.3);
    ctx.save();
    ctx.translate(x0+rh/2,y+rh/2);
    const s=rh/90*(pop<1?0.4+0.6*EASE.easeOutBack(pop):1);
    ctx.scale(s,s);
    if (!cleared) {
        ctx.globalAlpha*=0.4;
    }
    ENEMY_ICONS[row.boss](ctx,v);
    ctx.restore();
    if (cleared) {
        const sk=clamp01((T-at-U.rowIn)/0.18);
        if (sk>0) {
            const r=rh*0.32;
            const cx=x0+rh/2;
            const cy=y+rh/2;
            drawShape(ctx,sketchLine(cx-r,cy-r,cx-r+r*2*sk,cy-r+r*2*sk,{width:2.6,seed:3900+i}),PALETTE.red,v);
        }
    }
    ctx.fillStyle=cleared?PALETTE.ink:PALETTE.midGray;
    ctx.textAlign='left';
    ctx.textBaseline='middle';
    fitText(ctx,(i+1)+'. '+t('enemy.'+row.boss),x0+rh+6,y+rh/2,nameW-8,small?13:16,'bold ');
    if (!cleared) {
        ctx.font=(small?12:14)+'px '+FONT;
        ctx.fillStyle=PALETTE.midGray;
        ctx.textAlign='center';
        ctx.fillText(t('rush.sum.notCleared'),x0+rh+nameW+partW*2,y+rh/2);
    }
    else {
        parts.forEach((p,j)=>{
            const pk=clamp01((cp-j*0.12)/0.6);
            const pe=EASE.easeOutCubic(pk);
            const cx=x0+rh+nameW+partW*j+partW/2;
            ctx.textAlign='center';
            ctx.font=(small?10:11)+'px '+FONT;
            ctx.fillStyle=PALETTE.nearGray;
            ctx.fillText(t('rush.part.'+p),cx,y+rh*0.24);
            ctx.font='bold '+(small?12:15)+'px '+FONT;
            ctx.fillStyle=PALETTE.ink;
            ctx.fillText(Math.round(row.part[p]*pe)+'／'+maxes[p],cx,y+rh*0.56);
            const bw=partW*0.7;
            const by=y+rh*0.8;
            ctx.fillStyle=rgba('midGray',0.35);
            ctx.fillRect(cx-bw/2,by,bw,3);
            const f=row.part[p]/maxes[p]*pe;
            ctx.fillStyle=f>=0.999?PALETTE.red:PALETTE.ink;
            ctx.fillRect(cx-bw/2,by,bw*f,3);
        });
    }
    const cnt=Math.round(row.part.total*ce);
    const bump=cp>=1?Math.max(0,1-(T-at-U.rowIn*0.5-U.count)*5):0;
    ctx.save();
    ctx.translate(x0+pw-10,y+rh/2-(small?3:5));
    ctx.scale(1+bump*0.25,1+bump*0.25);
    ctx.textAlign='right';
    ctx.font='bold '+(small?16:20)+'px '+FONT;
    ctx.fillStyle=cleared?PALETTE.red:PALETTE.midGray;
    ctx.fillText(cnt.toLocaleString('en-US'),0,0);
    ctx.restore();
    ctx.textAlign='right';
    ctx.font=(small?9:10)+'px '+FONT;
    ctx.fillStyle=PALETTE.nearGray;
    ctx.fillText('／'+B.boss.toLocaleString('en-US'),x0+pw-10,y+rh/2+(small?9:12));
    ctx.restore();
}

function drawScore(S,ctx,T,cx,sy,sc,TL) {
    const U=TUNING.rushSummaryUi;
    const s=S.stats;
    const sp=clamp01((T-TL.scoreAt)/U.countTime);
    if (T<TL.scoreAt) {
        return;
    }
    const shown=Math.round(s.score*EASE.easeOutCubic(sp));
    const bump=sp<1?0:Math.max(0,1-(T-TL.scoreAt-U.countTime)*4);
    ctx.save();
    ctx.globalAlpha=clamp01((T-TL.scoreAt)/0.2);
    ctx.translate(cx,sy);
    ctx.scale(sc*(1+bump*0.15),sc*(1+bump*0.15));
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.font='bold 13px '+FONT;
    ctx.fillStyle=PALETTE.nearGray;
    ctx.fillText(t('summary.score'),0,-44);
    ctx.font='900 64px '+FONT;
    ctx.fillStyle=rgba('ink',0.2);
    ctx.fillText(String(shown),4,6);
    ctx.lineWidth=8;
    ctx.lineJoin='round';
    ctx.strokeStyle=PALETTE.paper;
    ctx.strokeText(String(shown),0,2);
    ctx.fillStyle=PALETTE.ink;
    ctx.fillText(String(shown),0,2);
    ctx.font='14px '+FONT;
    ctx.fillStyle=PALETTE.nearGray;
    ctx.fillText(t('summary.best')+' '+(s.best??0)+t('ui.gap')+t('rush.sum.max',{n:s.rushT.max.toLocaleString('en-US')}),0,44);
    ctx.restore();
    if (s.newBest&&sp>=1&&!S.rushCelebrate) {
        const k=Math.min(1,(T-TL.scoreAt-U.countTime)/0.3);
        const e=k<1?2-EASE.easeOutBack(k):1;
        ctx.save();
        ctx.translate(cx+150*sc,sy-30*sc);
        ctx.rotate(0.22);
        ctx.scale(e*sc,e*sc);
        ctx.globalAlpha=Math.min(1,k*2);
        ctx.font='bold 20px '+FONT;
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        const nw=ctx.measureText(t('summary.newBest')).width+24;
        ctx.fillStyle=PALETTE.red;
        ctx.fillRect(-nw/2,-17,nw,34);
        ctx.fillStyle=PALETTE.paper;
        ctx.fillText(t('summary.newBest'),0,1);
        ctx.restore();
    }
}

function drawGrade(S,ctx,T,gx,gy,sc,TL,v) {
    const U=TUNING.rushSummaryUi;
    const gk=clamp01((T-TL.gradeAt)/U.gradeTime);
    if (gk<=0) {
        S.gradeRect=null;
        S.gradeInfo=null;
        return;
    }
    const R=40*sc;
    ctx.save();
    ctx.strokeStyle=PALETTE.red;
    ctx.lineWidth=4*sc;
    ctx.lineCap='round';
    ctx.beginPath();
    ctx.ellipse(gx,gy,R*1.08,R*0.92,-0.2,-1.2,-1.2+Math.PI*2.15*Math.min(1,gk*1.4));
    ctx.stroke();
    const lk=Math.max(0,(gk-0.35)/0.65);
    if (lk>0) {
        S.drawSplat(ctx,gx,gy,R*1.6,4100,'red',clamp01((lk-0.2)/0.4)*0.5);
        const e=2.2-1.2*EASE.easeOutBack(Math.min(1,lk));
        ctx.translate(gx,gy);
        ctx.rotate(-0.12);
        ctx.scale(e*sc,e*sc);
        ctx.globalAlpha=Math.min(1,lk*2);
        ctx.font='italic 900 '+(S.stats.rushT.grade.length>1?46:60)+'px Georgia,serif';
        ctx.fillStyle=PALETTE.red;
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        ctx.fillText(S.stats.rushT.grade,0,3,R*1.9);
    }
    ctx.restore();
    if (lk>=1&&!S.stamped) {
        S.stamped=true;
        if (S.onStamp) {
            S.onStamp();
        }
    }
    S.gradeRect={x:gx-R*1.2,y:gy-R*1.1,w:R*2.4,h:R*2.2};
    if (lk>=1&&(S.gradeOpen||inRect(S.gradeRect,S.hx??-1,S.hy??-1))) {
        S.gradeInfo={x:gx,y:gy+R*1.1};
    }
    else {
        S.gradeInfo=null;
    }
    if (lk>=1) {
        const hint=0.5+0.5*Math.sin(time.real*3);
        ctx.save();
        ctx.globalAlpha=0.35+hint*0.4;
        ctx.fillStyle=PALETTE.red;
        ctx.font='bold 11px '+FONT;
        ctx.textAlign='center';
        ctx.textBaseline='top';
        ctx.fillText(t('rush.sum.gradeTap'),gx,gy+R*1.05);
        ctx.restore();
    }
}

export function drawRushSummary(S,ctx) {
    const U=TUNING.rushSummaryUi;
    const w=S.width;
    const h=S.height;
    const v=time.boilIndex;
    const small=h<600;
    const R=S.stats.rushT;
    const TL=timeline(S);
    S.drawBackdrop(ctx,v);
    const T=S.t-0.2;
    const ty=small?24:40;
    drawTitle(S,ctx,T,w,ty,small,v);
    const sc=small?U.scoreScaleSmall:1;
    const sy=ty+(small?U.scoreYSmall:U.scoreY);
    const pw=Math.min(U.maxW,w-(small?24:60));
    const x0=w/2-pw/2;
    drawScore(S,ctx,T,w/2,sy,sc,TL);
    const metaY=sy+(small?U.metaYSmall:U.metaY);
    const mk=clamp01((T-TL.scoreAt-0.2)/0.4);
    if (mk>0) {
        ctx.save();
        ctx.globalAlpha=mk;
        ctx.font=(small?11:13)+'px '+FONT;
        ctx.fillStyle=PALETTE.nearGray;
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        ctx.fillText(t('rush.sum.meta',{time:clock(R.time),d:R.dodges,h:R.hurt,c:R.coins}),w/2,metaY);
        ctx.restore();
    }
    const top=metaY+(small?12:16);
    const foot=small?U.footSmall:U.foot;
    const n=R.rows.length;
    const rh=Math.min(small?U.rowHSmall:U.rowH,(h-top-foot)/n);
    ctx.strokeStyle=rgba('ink',0.5);
    ctx.lineWidth=1.4;
    const lk=clamp01((T-U.rowStart+0.2)/0.4);
    if (lk>0) {
        ctx.beginPath();
        ctx.moveTo(w/2-pw/2*lk,top-4);
        ctx.lineTo(w/2+pw/2*lk,top-4);
        ctx.stroke();
    }
    R.rows.forEach((row,i)=>drawRow(S,ctx,row,i,T,x0,top+i*rh,pw,rh,small,v));
    drawGrade(S,ctx,T,w/2-U.gradeX*sc,sy,sc,TL,v);
    const bw=small?140:180;
    const bh=small?40:50;
    const bg=14;
    const by=h-bh-(small?10:18);
    const cb=S.chest?bh+bg:0;
    const bx=w/2-(bw*2+bg+cb)/2;
    S.button={x:bx,y:by,w:bw,h:bh};
    S.menuButton={x:bx+bw+bg,y:by,w:bw,h:bh};
    const ba=(T-TL.doneAt)/0.35;
    drawButton(ctx,S.button,t('rush.sum.again'),v,ba,inRect(S.button,S.hx??-1,S.hy??-1),small?17:20);
    drawButton(ctx,S.menuButton,t('summary.menu'),v,ba-0.15,inRect(S.menuButton,S.hx??-1,S.hy??-1),small?17:20,true);
    if (S.chest) {
        S.chestBtn={x:bx+bw*2+bg*2,y:by,w:bh,h:bh};
        S.drawChestBtn(ctx,S.chestBtn,ba-0.3,v,small);
    }
    if (S.stats.newBest&&T>TL.doneAt) {
        S.rushCelebrate=true;
        S.drawCelebrate(ctx,T,v,{x:w/2+U.gradeX*sc,y:sy});
    }
    if (S.gradeInfo) {
        S.drawGradeInfo(ctx,S.gradeInfo.x,S.gradeInfo.y,v);
    }
}

export function rushReady(S) {
    return S.t-0.2>timeline(S).doneAt;
}
