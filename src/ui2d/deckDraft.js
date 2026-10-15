import {PALETTE,rgba} from '../data/palette.js';
import {t} from '../data/strings.js';
import {time} from '../core/loop.js';
import {TUNING} from '../data/tuning.js';
import {EASE} from '../core/easing.js';
import {sketchRect,drawShape} from './sketch.js';
import {FONT,inRect,drawButton,Panel,fitText} from './uiKit.js';
import {wrapText} from './cardView.js';
import {createCard,cardName,cardDesc,cardCost} from '../game/card.js';

function clamp01(v) {
    return Math.max(0,Math.min(1,v));
}

export class DeckDraft extends Panel {
    constructor(actions) {
        super();
        this.actions=actions;
        this.outFrom=0.45;
        this.decks=[];
        this.sel=-1;
        this.focus=null;
        this.hx=-1;
        this.hy=-1;
    }

    open2(decks) {
        this.decks=decks.map(ids=>ids.map(id=>createCard(id,false)));
        this.sel=-1;
        this.focus=null;
        this.picked=false;
        this.show();
    }

    hover(x,y) {
        this.hx=x;
        this.hy=y;
    }

    layout() {
        const D=TUNING.draftUi;
        const w=this.width;
        const h=this.height;
        const small=h<600;
        this.small=small;
        const top=small?D.topSmall:D.top;
        const foot=small?D.footSmall:D.foot;
        const gap=small?D.gapSmall:D.gap;
        const pw=Math.min(D.maxW,(w-gap-(small?28:56))/2);
        const ph=h-top-foot;
        this.panels=[0,1].map(k=>({x:w/2+(k===0?-gap/2-pw:gap/2),y:top,w:pw,h:ph}));
        this.cells=this.panels.map((P,k)=>{
            const n=this.decks[k]?this.decks[k].length:9;
            const cols=small?5:3;
            const rows=Math.ceil(n/cols);
            const head=small?D.headSmall:D.head;
            const cw=(P.w-24-(cols-1)*D.cellGap)/cols;
            const chh=Math.min(cw*1.12,(P.h-head-14-(rows-1)*D.cellGap)/rows);
            const out=[];
            for (let i=0;i<n;i++) {
                const c=i%cols;
                const r=Math.floor(i/cols);
                out.push({x:P.x+12+c*(cw+D.cellGap),y:P.y+head+r*(chh+D.cellGap),w:cw,h:chh});
            }
            return out;
        });
        const bw=Math.min(D.btnW,w*0.42);
        const bh=small?40:50;
        this.okBtn={x:w/2-bw/2,y:h-foot+(small?34:46),w:bw,h:bh};
        this.backBtn={x:small?14:24,y:small?12:20,w:small?96:120,h:small?34:42};
        this.buttons=[this.backBtn,this.okBtn];
    }

    down(x,y) {
        if (!this.open||this.picked) {
            return this.open;
        }
        this.layout();
        if (inRect(this.backBtn,x,y)) {
            this.actions.back();
            return true;
        }
        if (this.sel>=0&&inRect(this.okBtn,x,y)) {
            this.picked=true;
            this.actions.pick(this.sel);
            return true;
        }
        for (let k=0;k<2;k++) {
            for (let i=0;i<this.cells[k].length;i++) {
                if (inRect(this.cells[k][i],x,y)) {
                    this.focus={k,i};
                    if (this.sel!==k) {
                        this.sel=k;
                    }
                    this.actions.select();
                    return true;
                }
            }
            if (inRect(this.panels[k],x,y)) {
                this.sel=k;
                this.focus=null;
                this.actions.select();
                return true;
            }
        }
        return true;
    }

    drawCell(ctx,art,card,r,v,hv,sel) {
        const rare=card.def.rarity==='rare';
        ctx.save();
        ctx.translate(r.x+r.w/2,r.y+r.h/2-(hv?3:0));
        ctx.scale(hv?1.05:1,hv?1.05:1);
        ctx.translate(-r.w/2,-r.h/2);
        ctx.fillStyle=hv?rgba('farGray',1):PALETTE.paper;
        ctx.fillRect(0,0,r.w,r.h);
        drawShape(ctx,sketchRect(0,0,r.w,r.h,{width:sel?2:1.4,seed:3700+Math.round(r.x+r.y)}),rare?PALETTE.red:PALETTE.ink,v);
        const s=Math.min(r.w,r.h*0.72);
        if (art) {
            ctx.drawImage(art.icon(card,v),r.w/2-s/2,4,s,s);
        }
        ctx.fillStyle=rare?PALETTE.red:PALETTE.ink;
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        fitText(ctx,cardName(card),r.w/2,r.h-11,r.w-6,this.small?11:13,'bold ');
        ctx.fillStyle=PALETTE.ink;
        ctx.beginPath();
        ctx.arc(10,10,8,0,Math.PI*2);
        ctx.fill();
        ctx.fillStyle=PALETTE.paper;
        ctx.font='bold 10px '+FONT;
        ctx.fillText(String(cardCost(card)),10,10.5);
        ctx.restore();
    }

    draw(ctx,art) {
        if (!this.shown()) {
            return;
        }
        this.layout();
        const D=TUNING.draftUi;
        const v=time.boilIndex;
        const w=this.width;
        const h=this.height;
        const a=clamp01(this.t/0.25);
        ctx.save();
        ctx.fillStyle=rgba('paper',0.97*a);
        ctx.fillRect(0,0,w,h);
        ctx.strokeStyle=rgba('farGray',0.8*a);
        ctx.lineWidth=1;
        for (let y=30;y<h;y+=30) {
            ctx.beginPath();
            ctx.moveTo(0,y);
            ctx.lineTo(w,y);
            ctx.stroke();
        }
        const small=this.small;
        const ta=EASE.easeOutBack(clamp01(this.t/0.4));
        ctx.save();
        ctx.translate(w/2,small?30:44);
        ctx.scale(ta,ta);
        ctx.fillStyle=PALETTE.ink;
        ctx.font='bold '+(small?24:32)+'px '+FONT;
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        ctx.fillText(t('draft.title'),0,0);
        ctx.font=(small?12:14)+'px '+FONT;
        ctx.fillStyle=PALETTE.nearGray;
        ctx.fillText(t('draft.sub'),0,small?22:30);
        ctx.restore();
        const b=this.backBtn;
        const bhv=inRect(b,this.hx,this.hy);
        drawButton(ctx,b,'← '+t('menu.back'),v,(this.t-0.1)/0.35,bhv,small?15:18);
        for (let k=0;k<2;k++) {
            const P=this.panels[k];
            const ap=clamp01((this.t-0.1-k*0.08)/D.slide);
            const e=EASE.easeOutBack(ap);
            const sel=this.sel===k;
            const lift=sel?6+Math.sin(time.real*2.4)*2:0;
            ctx.save();
            ctx.globalAlpha=Math.min(1,ap*2);
            ctx.translate((1-e)*(k===0?-w*0.4:w*0.4),-lift);
            ctx.fillStyle=rgba('ink',0.1);
            ctx.fillRect(P.x+6,P.y+8,P.w,P.h);
            ctx.fillStyle=PALETTE.paper;
            ctx.fillRect(P.x,P.y,P.w,P.h);
            drawShape(ctx,sketchRect(P.x,P.y,P.w,P.h,{width:sel?3:2,seed:3710+k}),sel?PALETTE.red:PALETTE.ink,v);
            ctx.fillStyle=sel?PALETTE.red:PALETTE.ink;
            ctx.font='bold '+(small?17:21)+'px '+FONT;
            ctx.textAlign='left';
            ctx.textBaseline='middle';
            ctx.fillText(t('draft.deck',{n:k+1}),P.x+16,P.y+(small?18:24));
            if (sel) {
                ctx.save();
                ctx.translate(P.x+P.w-40,P.y+(small?18:24));
                ctx.rotate(-0.12);
                ctx.strokeStyle=PALETTE.red;
                ctx.lineWidth=2;
                ctx.strokeRect(-30,-11,60,22);
                ctx.fillStyle=PALETTE.red;
                ctx.font='bold 13px '+FONT;
                ctx.textAlign='center';
                ctx.fillText(t('draft.chosen'),0,1);
                ctx.restore();
            }
            const deck=this.decks[k]||[];
            deck.forEach((card,i)=>{
                const r=this.cells[k][i];
                const hv=inRect(r,this.hx,this.hy+lift)||(this.focus&&this.focus.k===k&&this.focus.i===i);
                this.drawCell(ctx,art,card,r,v,hv,sel);
            });
            ctx.restore();
        }
        const f=this.focus;
        const footY=h-(small?D.footSmall:D.foot)+(small?14:18);
        if (f&&this.decks[f.k]&&this.decks[f.k][f.i]) {
            const card=this.decks[f.k][f.i];
            ctx.fillStyle=card.def.rarity==='rare'?PALETTE.red:PALETTE.ink;
            ctx.font=(small?12:14)+'px '+FONT;
            ctx.textAlign='center';
            ctx.textBaseline='middle';
            const line=cardName(card)+t('ui.colon')+cardDesc(card);
            const ls=wrapText(ctx,line,Math.min(w-40,760)).slice(0,1);
            ctx.fillText(ls[0]||'',w/2,footY);
        }
        else {
            ctx.fillStyle=PALETTE.midGray;
            ctx.font=(small?12:14)+'px '+FONT;
            ctx.textAlign='center';
            ctx.textBaseline='middle';
            ctx.fillText(t('draft.hint'),w/2,footY);
        }
        if (this.sel>=0) {
            drawButton(ctx,this.okBtn,t('draft.ok',{n:this.sel+1}),v,1,inRect(this.okBtn,this.hx,this.hy),small?17:20);
        }
        ctx.restore();
    }
}
