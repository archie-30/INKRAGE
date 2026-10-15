import {PALETTE,rgba} from '../data/palette.js';
import {t} from '../data/strings.js';
import {time} from '../core/loop.js';
import {TUNING} from '../data/tuning.js';
import {EASE} from '../core/easing.js';
import {sketchRect,drawShape} from './sketch.js';
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

export function drawRushSummary(S,ctx) {
    const U=TUNING.rushSummaryUi;
    const B=TUNING.bossRush.score;
    const w=S.width;
    const h=S.height;
    const v=time.boilIndex;
    const small=h<600;
    const R=S.stats.rushT;
    S.drawBackdrop(ctx,v);
    const T=S.t-0.2;
    const title=S.victory?t('rush.sum.victory'):(S.quit?t('rush.sum.quit'):t('rush.sum.dead'));
    const ta=EASE.easeOutBack(clamp01(T/0.4));
    const ty=small?28:46;
    ctx.save();
    ctx.translate(w/2,ty);
    ctx.scale(ta,ta);
    ctx.rotate(-0.02);
    ctx.font='bold '+(small?28:40)+'px '+FONT;
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    const tw=ctx.measureText(title).width;
    const col=S.victory?PALETTE.red:PALETTE.ink;
    drawShape(ctx,sketchRect(-tw/2-18,-(small?22:30),tw+36,small?44:60,{width:3,seed:3801}),col,v);
    ctx.fillStyle=col;
    ctx.fillText(title,0,2);
    ctx.restore();
    const pw=Math.min(U.maxW,w-(small?24:60));
    const x0=w/2-pw/2;
    const headY=ty+(small?U.headGapSmall:U.headGap);
    const headH=small?U.headHSmall:U.headH;
    const top=headY+headH;
    const foot=small?U.footSmall:U.foot;
    const n=R.rows.length;
    const rh=Math.min(small?U.rowHSmall:U.rowH,(h-top-foot)/n);
    const parts=['time','dodge','skill','hurt'];
    const maxes={time:B.time,dodge:B.dodgeMax,skill:B.card+B.weak,hurt:B.hurt};
    const nameW=small?U.nameWSmall:U.nameW;
    const subW=small?U.subWSmall:U.subW;
    const partW=(pw-nameW-subW-rh)/4;
    let running=0;
    R.rows.forEach((row,i)=>{
        const at=U.rowStart+i*U.rowGap;
        const k=clamp01((T-at)/U.rowIn);
        const cnt=Math.round(row.part.total*clamp01((T-at-U.rowIn*0.5)/U.count));
        running+=cnt;
        if (k<=0) {
            return;
        }
        const e=EASE.easeOutCubic(k);
        const y=top+i*rh;
        ctx.save();
        ctx.globalAlpha=k;
        ctx.translate((1-e)*-40,0);
        if (i%2===0) {
            ctx.fillStyle=rgba('farGray',0.45);
            ctx.fillRect(x0,y,pw,rh-2);
        }
        const cleared=!!(row.rec&&row.rec.cleared);
        ctx.save();
        ctx.translate(x0+rh/2,y+rh/2);
        const s=rh/90;
        ctx.scale(s,s);
        if (!cleared) {
            ctx.globalAlpha*=0.4;
        }
        ENEMY_ICONS[row.boss](ctx,v);
        ctx.restore();
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
                const cx=x0+rh+nameW+partW*j+partW/2;
                ctx.textAlign='center';
                ctx.font=(small?10:11)+'px '+FONT;
                ctx.fillStyle=PALETTE.nearGray;
                ctx.fillText(t('rush.part.'+p),cx,y+rh*0.3);
                ctx.font='bold '+(small?12:15)+'px '+FONT;
                ctx.fillStyle=PALETTE.ink;
                ctx.fillText(row.part[p]+'／'+maxes[p],cx,y+rh*0.68);
            });
        }
        ctx.textAlign='right';
        ctx.font='bold '+(small?16:20)+'px '+FONT;
        ctx.fillStyle=cleared?PALETTE.red:PALETTE.midGray;
        ctx.fillText(cnt.toLocaleString('en-US'),x0+pw-10,y+rh/2-(small?3:5));
        ctx.font=(small?9:10)+'px '+FONT;
        ctx.fillStyle=PALETTE.nearGray;
        ctx.fillText('／'+B.boss.toLocaleString('en-US'),x0+pw-10,y+rh/2+(small?9:12));
        ctx.restore();
    });
    const endAt=U.rowStart+n*U.rowGap+U.count;
    const hk=clamp01((T-U.rowStart+0.2)/0.4);
    if (hk>0) {
        ctx.save();
        ctx.globalAlpha=hk;
        const cy=headY+headH*0.42;
        ctx.textBaseline='alphabetic';
        ctx.textAlign='left';
        ctx.fillStyle=PALETTE.nearGray;
        ctx.font=(small?12:14)+'px '+FONT;
        ctx.fillText(t('rush.sum.totalLabel'),x0+8,cy-(small?18:26));
        const big=running.toLocaleString('en-US');
        ctx.font='bold '+(small?U.bigSmall:U.big)+'px '+FONT;
        ctx.fillStyle=PALETTE.red;
        const pulse=T>endAt&&T<endAt+0.3?1+Math.sin((T-endAt)/0.3*Math.PI)*0.06:1;
        ctx.save();
        ctx.translate(x0+8,cy+(small?10:14));
        ctx.scale(pulse,pulse);
        ctx.fillText(big,0,0);
        const bw=ctx.measureText(big).width;
        ctx.font=(small?13:16)+'px '+FONT;
        ctx.fillStyle=PALETTE.nearGray;
        ctx.fillText('／'+R.max.toLocaleString('en-US'),bw+6,0);
        ctx.restore();
        ctx.font=(small?11:13)+'px '+FONT;
        ctx.fillStyle=PALETTE.nearGray;
        ctx.textAlign='left';
        ctx.fillText(t('rush.sum.meta',{time:clock(R.time),d:R.dodges,h:R.hurt,c:R.coins}),x0+8,cy+(small?28:38));
        ctx.strokeStyle=rgba('ink',0.5);
        ctx.lineWidth=1.4;
        ctx.beginPath();
        ctx.moveTo(x0,top-6);
        ctx.lineTo(x0+pw,top-6);
        ctx.stroke();
        ctx.restore();
    }
    const gk=clamp01((T-endAt)/U.stampTime);
    if (gk>0) {
        const e=gk<1?2.2-1.2*EASE.easeOutBack(gk):1;
        const r=small?26:36;
        const gx=x0+pw-r-8;
        const gy=headY+headH*0.45;
        ctx.save();
        ctx.translate(gx,gy);
        ctx.rotate(-0.18);
        ctx.scale(e,e);
        ctx.globalAlpha=Math.min(1,gk*2);
        ctx.fillStyle=rgba('paper',0.9);
        ctx.beginPath();
        ctx.arc(0,0,r,0,Math.PI*2);
        ctx.fill();
        ctx.strokeStyle=PALETTE.red;
        ctx.lineWidth=small?3:4;
        ctx.beginPath();
        ctx.arc(0,0,r,0,Math.PI*2);
        ctx.stroke();
        ctx.lineWidth=1.4;
        ctx.beginPath();
        ctx.arc(0,0,r-6,0,Math.PI*2);
        ctx.stroke();
        ctx.fillStyle=PALETTE.red;
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        ctx.font='bold '+(R.grade.length>1?(small?18:24):(small?28:38))+'px '+FONT;
        ctx.fillText(R.grade,0,2);
        ctx.restore();
        if (gk>=1&&!S.stamped) {
            S.stamped=true;
            if (S.onStamp) {
                S.onStamp();
            }
        }
    }
    const bw=small?140:180;
    const bh=small?40:50;
    const bg=14;
    const by=h-bh-(small?12:20);
    const cb=S.chest?bh+bg:0;
    const bx=w/2-(bw*2+bg+cb)/2;
    S.button={x:bx,y:by,w:bw,h:bh};
    S.menuButton={x:bx+bw+bg,y:by,w:bw,h:bh};
    const ba=(T-endAt-0.4)/0.35;
    drawButton(ctx,S.button,t('rush.sum.again'),v,ba,inRect(S.button,S.hx??-1,S.hy??-1),small?17:20);
    drawButton(ctx,S.menuButton,t('summary.menu'),v,ba-0.15,inRect(S.menuButton,S.hx??-1,S.hy??-1),small?17:20,true);
    if (S.chest) {
        S.chestBtn={x:bx+bw*2+bg*2,y:by,w:bh,h:bh};
        S.drawChestBtn(ctx,S.chestBtn,ba-0.3,v,small);
    }
    if (S.stats.newBest&&T>endAt+U.stampTime) {
        S.drawCelebrate(ctx,T,v,{x:x0+pw*0.62,y:headY+headH*0.42});
    }
}

export function rushReady(S) {
    const U=TUNING.rushSummaryUi;
    const n=S.stats.rushT?S.stats.rushT.rows.length:7;
    return S.t-0.2>U.rowStart+n*U.rowGap+U.count+U.stampTime;
}
