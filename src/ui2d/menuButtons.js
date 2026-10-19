import {PALETTE,rgba} from '../data/palette.js';
import {time} from '../core/loop.js';
import {TUNING} from '../data/tuning.js';
import {EASE} from '../core/easing.js';
import {sketchRect,sketchCircle,sketchLine,drawShape} from './sketch.js';
import {fitText} from './uiKit.js';
import {drawWeaponIcon} from './menu.js';
import {settings} from '../core/settings.js';

function line(ctx,pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0],pts[0][1]);
    for (let i=1;i<pts.length;i++) {
        ctx.lineTo(pts[i][0],pts[i][1]);
    }
}

const ICONS={
    play(ctx,r,k,col) {
        const s=r*0.55;
        ctx.fillStyle=col;
        line(ctx,[[-s*0.6,-s],[s,0],[-s*0.6,s]]);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle=col;
        ctx.lineWidth=r*0.08;
        for (let i=0;i<3;i++) {
            const y=(i-1)*s*0.6;
            const off=((k*1.4+i*0.33)%1)*r*0.5;
            ctx.globalAlpha*=0.6;
            ctx.beginPath();
            ctx.moveTo(-s*1.25-off,y);
            ctx.lineTo(-s*0.85-off,y);
            ctx.stroke();
            ctx.globalAlpha/=0.6;
        }
    },
    weapon(ctx,r,k,col) {
        const s=r*0.6;
        ctx.save();
        ctx.rotate(Math.sin(k*2)*0.12);
        ctx.strokeStyle=col;
        ctx.lineWidth=r*0.09;
        ctx.lineJoin='round';
        line(ctx,[[0,-s],[s*0.85,-s*0.35],[s*0.55,s*0.75],[-s*0.55,s*0.75],[-s*0.85,-s*0.35]]);
        ctx.closePath();
        ctx.stroke();
        line(ctx,[[-s*0.85,-s*0.35],[0,-s*0.05],[s*0.85,-s*0.35]]);
        ctx.stroke();
        line(ctx,[[0,-s*0.05],[0,s*0.75]]);
        ctx.stroke();
        ctx.fillStyle=PALETTE.red;
        const tw=0.5+0.5*Math.sin(k*5);
        ctx.globalAlpha*=tw;
        ctx.beginPath();
        ctx.arc(s*0.9,-s*0.9,r*0.1,0,Math.PI*2);
        ctx.fill();
        ctx.restore();
    },
    training(ctx,r,k,col) {
        const s=r*0.62;
        ctx.strokeStyle=col;
        ctx.lineWidth=r*0.08;
        for (const f of [1,0.62]) {
            ctx.beginPath();
            ctx.arc(0,0,s*f,0,Math.PI*2);
            ctx.stroke();
        }
        ctx.fillStyle=PALETTE.red;
        ctx.beginPath();
        ctx.arc(0,0,s*0.22,0,Math.PI*2);
        ctx.fill();
        const a=-0.7;
        const d=s*(0.25+0.15*Math.abs(Math.sin(k*3)));
        ctx.save();
        ctx.translate(Math.cos(a)*d,Math.sin(a)*d);
        ctx.rotate(a);
        ctx.strokeStyle=col;
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.lineTo(s*0.9,0);
        ctx.stroke();
        line(ctx,[[s*0.7,-s*0.18],[s*0.9,0],[s*0.7,s*0.18]]);
        ctx.stroke();
        ctx.restore();
    },
    achieve(ctx,r,k,col) {
        const s=r*0.55;
        ctx.save();
        ctx.rotate(Math.sin(k*2.4)*0.08);
        ctx.strokeStyle=col;
        ctx.lineWidth=r*0.08;
        ctx.lineJoin='round';
        line(ctx,[[-s*0.7,-s],[s*0.7,-s],[s*0.55,-s*0.1],[0,s*0.25],[-s*0.55,-s*0.1]]);
        ctx.closePath();
        ctx.fillStyle=rgba('red',0.25);
        ctx.fill();
        ctx.stroke();
        for (const sx of [-1,1]) {
            ctx.beginPath();
            ctx.arc(sx*s*0.72,-s*0.62,s*0.3,sx<0?Math.PI*0.5:-Math.PI*0.5,sx<0?Math.PI*1.5:Math.PI*0.5,sx>0);
            ctx.stroke();
        }
        line(ctx,[[0,s*0.25],[0,s*0.65]]);
        ctx.stroke();
        line(ctx,[[-s*0.45,s*0.85],[s*0.45,s*0.85]]);
        ctx.stroke();
        ctx.fillStyle=PALETTE.red;
        const sp=(k*1.3)%1;
        ctx.globalAlpha*=1-sp;
        ctx.beginPath();
        ctx.arc(s*0.95,-s*1.05+sp*s*0.3,r*0.07,0,Math.PI*2);
        ctx.fill();
        ctx.restore();
    },
    arms(ctx,r,k) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0,0,r*0.94,0,Math.PI*2);
        ctx.clip();
        ctx.rotate(Math.sin(k*2)*0.08);
        drawWeaponIcon(ctx,settings.weapon||'pen',0,0,r*TUNING.menu.armsIcon,time.boilIndex,false);
        ctx.restore();
    },
    codex(ctx,r,k,col) {
        const s=r*0.6;
        const flap=Math.sin(k*2.2)*0.18;
        ctx.strokeStyle=col;
        ctx.lineWidth=r*0.08;
        ctx.lineJoin='round';
        line(ctx,[[0,-s*0.55],[-s,-s*0.75],[-s,s*0.6],[0,s*0.8],[s,s*0.6],[s,-s*0.75]]);
        ctx.closePath();
        ctx.stroke();
        line(ctx,[[0,-s*0.55],[0,s*0.8]]);
        ctx.stroke();
        ctx.lineWidth=r*0.05;
        for (let i=0;i<3;i++) {
            const y=-s*0.3+i*s*0.3;
            line(ctx,[[-s*0.8,y-s*0.1],[-s*0.2,y]]);
            ctx.stroke();
        }
        ctx.save();
        ctx.translate(0,-s*0.55);
        ctx.scale(Math.cos(flap*Math.PI),1);
        ctx.fillStyle=rgba('paper',0.9);
        line(ctx,[[0,0],[s*0.9,-s*0.2],[s*0.9,s*1.15],[0,s*1.35]]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle=PALETTE.red;
        ctx.fillRect(s*0.5,-s*0.95,s*0.18,s*0.5);
    }
};

export function drawMenuButton(ctx,b,kind,label,v,appear,hover,primary=false) {
    if (appear<=0) {
        return;
    }
    const M=TUNING.menu.btn;
    const e=EASE.easeOutBack(Math.min(1,appear));
    const k=time.real+b.y*0.01;
    ctx.save();
    ctx.globalAlpha=Math.min(1,appear*2);
    ctx.translate(b.x+b.w/2+(1-e)*M.slide,b.y+b.h/2);
    const sc=(hover?1.04:1)*(primary?1+Math.sin(time.real*M.pulse)*0.012:1);
    ctx.scale(sc,sc);
    ctx.rotate(hover?-0.012:0);
    const w=b.w;
    const h=b.h;
    ctx.fillStyle=rgba('ink',hover?0.16:0.1);
    ctx.fillRect(-w/2+4,-h/2+5,w,h);
    ctx.fillStyle=primary?(hover?rgba('red',0.16):rgba('red',0.08)):(hover?rgba('farGray',0.95):rgba('paper',0.94));
    ctx.fillRect(-w/2,-h/2,w,h);
    if (primary) {
        const sh=((time.real*M.shine)%1.6)-0.3;
        const g=ctx.createLinearGradient(-w/2+sh*w-30,0,-w/2+sh*w+30,0);
        g.addColorStop(0,rgba('paper',0));
        g.addColorStop(0.5,rgba('paper',0.55));
        g.addColorStop(1,rgba('paper',0));
        ctx.fillStyle=g;
        ctx.fillRect(-w/2,-h/2,w,h);
    }
    drawShape(ctx,sketchRect(-w/2,-h/2,w,h,{width:hover||primary?2.8:2,seed:Math.round(b.y)+label.length}),primary?PALETTE.red:PALETTE.ink,v);
    const r=h*0.36;
    const ix=-w/2+h*0.52;
    ctx.save();
    ctx.translate(ix,0);
    const bob=hover?Math.sin(time.real*10)*0.08:0;
    ctx.rotate(bob);
    ctx.fillStyle=primary?PALETTE.red:PALETTE.paper;
    ctx.beginPath();
    ctx.arc(0,0,r,0,Math.PI*2);
    ctx.fill();
    drawShape(ctx,sketchCircle(0,0,r,{width:1.8,seed:5100+label.length}),primary?PALETTE.darkRed:PALETTE.ink,v);
    const ICON=ICONS[kind];
    if (ICON) {
        ICON(ctx,r,hover?k*2:k,primary?PALETTE.paper:PALETTE.ink);
    }
    ctx.restore();
    ctx.fillStyle=primary?PALETTE.red:PALETTE.ink;
    ctx.textAlign='left';
    ctx.textBaseline='middle';
    const tx=ix+r+M.textGap;
    fitText(ctx,label,tx,1,w/2-tx-M.arrowW,primary?M.primarySize*(h<56?0.85:1):(h<46?19:22),'bold ');
    const ax=w/2-M.arrowW*0.6+(hover?Math.sin(time.real*8)*3:0);
    ctx.strokeStyle=primary?PALETTE.red:rgba('ink',hover?0.9:0.45);
    ctx.lineWidth=2.4;
    ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(ax-5,-7);
    ctx.lineTo(ax+3,0);
    ctx.lineTo(ax-5,7);
    ctx.stroke();
    if (hover) {
        drawShape(ctx,sketchLine(tx,h*0.32,w/2-M.arrowW,h*0.32,{width:2,seed:5200}),PALETTE.red,v);
    }
    ctx.restore();
}
