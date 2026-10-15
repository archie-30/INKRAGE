import*as THREE from 'three';
import {toonMaterial,iconMaterial} from '../render/materials.js';
import {makeCircle} from '../core/collision.js';
import {TUNING} from '../data/tuning.js';
import {EASE} from '../core/easing.js';
import {drawRelicIcon} from '../ui2d/relicIcons.js';
import {rgba} from '../data/palette.js';

const TONES={
    cover:{light:'farGray',mid:'midGray',dark:'nearGray'},
    light:{light:'paper',mid:'farGray',dark:'midGray'},
    dark:{light:'midGray',mid:'nearGray',dark:'ink'},
    ink:{light:'nearGray',mid:'ink',dark:'ink'},
    accent:{light:'red',mid:'red',dark:'darkRed'},
    marker:{light:'marker',mid:'marker',dark:'midGray'}
};

const geoCache=new Map();

function geo(key,make) {
    if (!geoCache.has(key)) {
        geoCache.set(key,make());
    }
    return geoCache.get(key);
}

function mesh(g,tone,x=0,y=0,z=0) {
    const m=new THREE.Mesh(g,toonMaterial(TONES[tone]));
    m.position.set(x,y,z);
    return m;
}

function bx(w,h,d,tone,x,y,z) {
    return mesh(geo('b|'+w+'|'+h+'|'+d,()=>new THREE.BoxGeometry(w,h,d)),tone,x,y,z);
}

function cyl(rt,rb,h,tone,x,y,z,seg=12) {
    return mesh(geo('c|'+rt+'|'+rb+'|'+h+'|'+seg,()=>new THREE.CylinderGeometry(rt,rb,h,seg)),tone,x,y,z);
}

function ball(r,tone,x,y,z) {
    return mesh(geo('s|'+r,()=>new THREE.SphereGeometry(r,12,10)),tone,x,y,z);
}

function eyes(g,y,z,spread,size,tone='ink') {
    g.add(ball(size,tone,-spread,y,z),ball(size,tone,spread,y,z));
}

function table(g,tone='cover') {
    g.add(bx(1.7,0.12,1.0,tone,0,0.86,0));
    for (const [x,z] of [[-0.75,-0.4],[0.75,-0.4],[-0.75,0.4],[0.75,0.4]]) {
        g.add(bx(0.1,0.8,0.1,'dark',x,0.4,z));
    }
}

function rot(m,x=0,y=0,z=0) {
    m.rotation.set(x,y,z);
    return m;
}

function rug(g,w,d,tone='light') {
    g.add(bx(w,0.02,d,tone,0,0.01,0));
    g.add(bx(w,0.03,0.08,'dark',0,0.02,-d/2),bx(w,0.03,0.08,'dark',0,0.02,d/2));
    g.add(bx(0.08,0.03,d,'dark',-w/2,0.02,0),bx(0.08,0.03,d,'dark',w/2,0.02,0));
}

function chair(g,x,z,ry=0,tone='cover') {
    const c=new THREE.Group();
    c.add(bx(0.5,0.06,0.5,tone,0,0.5,0));
    c.add(bx(0.5,0.55,0.06,tone,0,0.8,-0.22));
    for (const [lx,lz] of [[-0.21,-0.21],[0.21,-0.21],[-0.21,0.21],[0.21,0.21]]) {
        c.add(bx(0.05,0.5,0.05,'dark',lx,0.25,lz));
    }
    c.position.set(x,0,z);
    c.rotation.y=ry;
    g.add(c);
}

function jar(g,x,y,z,tone='light',h=0.3) {
    g.add(cyl(0.11,0.12,h,tone,x,y+h/2,z,8));
    g.add(cyl(0.12,0.12,0.06,'accent',x,y+h+0.03,z,8));
}

function papers(g,x,y,z,n=3,ry=0) {
    for (let i=0;i<n;i++) {
        g.add(rot(bx(0.42,0.02,0.56,'light',x+i*0.03,y+i*0.025,z-i*0.02),0,ry+i*0.18,0));
    }
}

function screen(g,x,z,ry=0) {
    const sc=new THREE.Group();
    for (let i=-1;i<=1;i++) {
        const pn=new THREE.Group();
        pn.add(bx(0.7,1.5,0.04,'light',0,1.0,0));
        pn.add(bx(0.06,1.8,0.06,'dark',-0.35,0.9,0),bx(0.06,1.8,0.06,'dark',0.35,0.9,0));
        pn.add(bx(0.7,0.05,0.05,'dark',0,1.76,0));
        pn.position.set(i*0.68,0,Math.abs(i)*0.2);
        pn.rotation.y=-i*0.35;
        sc.add(pn);
    }
    sc.add(bx(0.3,0.04,0.05,'accent',0,1.3,0.03),bx(0.08,0.3,0.05,'accent',0,1.3,0.03));
    sc.position.set(x,0,z);
    sc.rotation.y=ry;
    g.add(sc);
}

function shelf(g,x,z,w=1.4,h=1.6,ry=0) {
    const s=new THREE.Group();
    s.add(bx(w,h,0.06,'dark',0,h/2,-0.22));
    s.add(bx(0.06,h,0.5,'dark',-w/2,h/2,0),bx(0.06,h,0.5,'dark',w/2,h/2,0));
    for (let k=0;k<3;k++) {
        s.add(bx(w,0.05,0.5,'cover',0,0.1+k*h/3,0));
    }
    s.position.set(x,0,z);
    s.rotation.y=ry;
    g.add(s);
    return s;
}

function post(g,x,z) {
    g.add(cyl(0.18,0.22,0.08,'dark',x,0.04,z,10));
    g.add(cyl(0.04,0.04,0.95,'dark',x,0.5,z,6));
    g.add(ball(0.08,'accent',x,1.0,z));
}

function lampPole(g,x,z) {
    g.add(cyl(0.22,0.26,0.06,'dark',x,0.03,z,10));
    g.add(cyl(0.03,0.03,1.9,'dark',x,0.98,z,6));
    g.add(rot(cyl(0.12,0.3,0.28,'cover',x,1.95,z,10),0,0,0));
}

const STATIONS={
    bed(g) {
        rug(g,4.6,4.0,'cover');
        const bed=new THREE.Group();
        bed.add(bx(1.2,0.5,2.1,'dark',0,0.25,0));
        bed.add(bx(1.14,0.18,2.0,'light',0,0.58,0));
        bed.add(bx(0.8,0.16,0.42,'light',0,0.74,-0.72));
        bed.add(bx(1.16,0.1,1.2,'cover',0,0.7,0.35));
        bed.add(bx(0.5,0.04,0.14,'accent',0,0.76,0.35));
        bed.add(bx(0.14,0.04,0.5,'accent',0,0.76,0.35));
        bed.add(bx(1.2,0.7,0.1,'dark',0,0.6,-1.02),bx(1.2,0.45,0.1,'dark',0,0.48,1.02));
        g.add(bed);
        g.add(bx(0.55,0.65,0.5,'cover',1.15,0.33,-0.7),bx(0.58,0.05,0.53,'dark',1.15,0.67,-0.7));
        g.add(cyl(0.08,0.07,0.2,'light',1.05,0.8,-0.75,8));
        jar(g,1.28,0.7,-0.6,'light',0.22);
        g.add(cyl(0.18,0.22,0.06,'dark',-1.1,0.03,-0.6,10));
        g.add(cyl(0.025,0.025,1.9,'dark',-1.1,0.98,-0.6,6));
        g.add(bx(0.4,0.04,0.04,'dark',-1.1,1.9,-0.6));
        g.add(bx(0.24,0.36,0.12,'light',-1.24,1.66,-0.6));
        g.add(bx(0.1,0.06,0.13,'accent',-1.24,1.66,-0.53));
        screen(g,0,-1.9);
        g.add(bx(0.5,0.08,0.3,'light',-0.9,0.04,1.4),bx(0.5,0.08,0.3,'light',-0.35,0.04,1.55));
    },
    bench(g) {
        rug(g,4.6,4.0,'cover');
        table(g);
        g.add(cyl(0.05,0.05,0.7,'dark',-0.4,1.0,0.1,6));
        g.add(bx(0.32,0.16,0.16,'ink',-0.4,1.32,0.1));
        g.add(bx(0.5,0.1,0.34,'light',0.35,0.97,-0.1));
        g.add(bx(0.5,0.1,0.34,'accent',0.38,1.07,-0.08));
        g.add(bx(0.3,0.22,0.3,'dark',-0.6,1.03,-0.3),bx(0.08,0.12,0.4,'cover',-0.6,1.2,-0.3));
        papers(g,0.1,0.93,0.3,2,0.4);
        lampPole(g,1.3,-1.0);
        const sh=shelf(g,0,-1.9,2.0,1.7);
        for (let k=0;k<3;k++) {
            jar(sh,-0.6+k*0.55,0.62,0,k===1?'accent':'light',0.26);
            sh.add(bx(0.3,0.2,0.3,k===2?'accent':'cover',-0.5+k*0.5,1.29,0));
        }
        g.add(bx(0.9,0.4,0.45,'accent',-1.3,0.2,0.9),bx(0.92,0.06,0.47,'dark',-1.3,0.42,0.9),bx(0.3,0.08,0.06,'dark',-1.3,0.5,0.9));
        chair(g,0.2,1.15,Math.PI);
        g.add(rot(bx(0.3,0.02,0.4,'light',1.1,0.02,1.1),0,0.6,0),rot(bx(0.3,0.02,0.4,'light',1.45,0.02,0.85),0,-0.3,0));
    },
    swap(g) {
        rug(g,4.6,4.0,'cover');
        table(g);
        for (let i=0;i<3;i++) {
            g.add(bx(0.42,0.04,0.6,i===2?'accent':'light',-0.45,0.95+i*0.05,0));
            g.add(bx(0.42,0.04,0.6,'light',0.45,0.95+i*0.05,0));
        }
        g.add(bx(0.4,0.06,0.08,'accent',0,1.2,0));
        g.add(rot(cyl(0.0,0.1,0.18,'accent',0.24,1.2,0,6),0,0,-Math.PI/2));
        const rack=new THREE.Group();
        rack.add(bx(2.2,1.6,0.08,'dark',0,0.9,0));
        rack.add(bx(0.08,1.8,0.3,'dark',-1.1,0.9,0.1),bx(0.08,1.8,0.3,'dark',1.1,0.9,0.1));
        for (let k=0;k<5;k++) {
            const c=bx(0.32,0.46,0.03,k%2?'light':'cover',-0.8+k*0.4,1.05+Math.sin(k)*0.1,0.06);
            c.rotation.z=(k-2)*0.12;
            rack.add(c);
        }
        rack.position.set(0,0,-1.9);
        g.add(rack);
        g.add(cyl(0.28,0.22,0.6,'dark',1.4,0.3,0.6,10),cyl(0.3,0.3,0.04,'cover',1.4,0.6,0.6,10));
        g.add(rot(bx(0.3,0.02,0.4,'light',1.35,0.66,0.55),0.5,0.3,0.2));
        g.add(rot(bx(0.3,0.02,0.4,'light',1.7,0.02,1.0),0,0.8,0),rot(bx(0.3,0.02,0.4,'light',1.1,0.02,1.3),0,-0.4,0));
        chair(g,-1.4,0.4,Math.PI/2);
    },
    ults(g) {
        rug(g,4.6,4.0,'dark');
        g.add(bx(1.3,2.0,0.7,'dark',0,1.0,-0.4));
        g.add(bx(1.1,1.7,0.06,'cover',0,1.05,-0.04));
        for (let i=0;i<3;i++) {
            const b=bx(0.46,0.1,0.05,'accent',0,1.2,0);
            b.rotation.z=i*Math.PI/3;
            b.position.z=0;
            g.add(b);
        }
        g.add(bx(0.14,0.2,0.08,'marker',0.42,1.0,0.0));
        for (const sx of [-1,1]) {
            g.add(bx(0.7,1.3,0.6,'dark',sx*1.2,0.65,-0.6));
            g.add(bx(0.6,0.04,0.5,'cover',sx*1.2,0.85,-0.5),bx(0.6,0.04,0.5,'cover',sx*1.2,0.45,-0.5));
            const card=bx(0.34,0.46,0.03,'accent',sx*1.2,1.55,-0.5);
            card.rotation.z=sx*0.1;
            g.add(card);
            g.add(bx(0.06,0.25,0.06,'dark',sx*1.2,1.3,-0.5));
        }
        post(g,-1.6,1.1);
        post(g,0,1.4);
        post(g,1.6,1.1);
        for (const [x0,x1] of [[-1.6,0],[0,1.6]]) {
            const rope=cyl(0.025,0.025,Math.hypot(x1-x0,0.3),'accent',(x0+x1)/2,0.82,1.25,6);
            rope.rotation.z=Math.PI/2;
            rope.rotation.y=Math.atan2(0.3,x1-x0)*(x0<0?1:-1);
            g.add(rope);
        }
    },
    retest(g) {
        rug(g,4.6,4.0,'cover');
        table(g,'light');
        g.add(bx(0.8,0.02,1.0,'light',0,0.93,0));
        for (let i=0;i<4;i++) {
            g.add(bx(0.6,0.02,0.04,'dark',0,0.95,-0.3+i*0.18));
        }
        g.add(rot(cyl(0.04,0.04,0.7,'accent',0.55,0.98,0.2,6),0,0,Math.PI/2));
        g.add(bx(0.3,0.04,0.04,'accent',-0.25,0.96,0.25),bx(0.04,0.04,0.3,'accent',-0.25,0.96,0.25));
        chair(g,0,0.95,Math.PI);
        const board=new THREE.Group();
        board.add(bx(2.4,1.3,0.08,'ink',0,1.45,0));
        board.add(bx(2.5,0.08,0.14,'dark',0,0.8,0.04),bx(2.5,0.08,0.12,'dark',0,2.12,0));
        board.add(bx(0.08,2.1,0.08,'dark',-1.2,1.05,0.05),bx(0.08,2.1,0.08,'dark',1.2,1.05,0.05));
        for (let k=0;k<3;k++) {
            board.add(bx(0.9-k*0.2,0.03,0.02,'light',-0.4,1.75-k*0.25,0.05));
        }
        board.add(bx(0.3,0.03,0.02,'accent',0.6,1.6,0.05),bx(0.03,0.3,0.02,'accent',0.6,1.6,0.05));
        board.add(bx(0.18,0.06,0.08,'light',0.7,0.86,0.1));
        board.position.set(0,0,-1.9);
        g.add(board);
        g.add(cyl(0.03,0.03,1.6,'dark',1.6,0.8,-0.9,6));
        const clock=cyl(0.3,0.3,0.06,'light',1.6,1.75,-0.9,14);
        clock.rotation.x=Math.PI/2;
        g.add(clock);
        g.add(bx(0.03,0.2,0.02,'ink',1.6,1.82,-0.85),bx(0.15,0.03,0.02,'accent',1.66,1.75,-0.85));
        papers(g,-1.4,0.02,1.0,3,0.7);
        g.add(rot(bx(0.3,0.02,0.4,'light',1.4,0.02,1.2),0,-0.5,0));
    },
    challenge(g) {
        rug(g,4.6,4.0,'cover');
        g.add(cyl(0.6,0.7,0.5,'dark',0,0.25,0,10));
        g.add(cyl(0.12,0.12,0.4,'cover',0,0.7,0,8));
        g.add(cyl(0.38,0.18,0.5,'marker',0,1.15,0,12));
        g.add(cyl(0.4,0.4,0.05,'marker',0,1.4,0,12));
        for (const s of [-1,1]) {
            g.add(rot(cyl(0.04,0.04,0.3,'marker',s*0.42,1.2,0,6),0,0,Math.PI/2));
        }
        g.add(bx(0.9,0.5,0.8,'cover',-1.0,0.25,-1.3),bx(0.9,0.8,0.8,'light',0,0.4,-1.5),bx(0.9,0.3,0.8,'cover',1.0,0.15,-1.3));
        g.add(bx(0.2,0.3,0.02,'accent',0,0.5,-1.09),bx(0.2,0.2,0.02,'dark',-1.0,0.32,-0.89),bx(0.2,0.2,0.02,'dark',1.0,0.18,-0.89));
        for (const sx of [-1,1]) {
            g.add(cyl(0.03,0.03,2.2,'dark',sx*1.8,1.1,-1.2,6));
            const fl=bx(0.6,0.38,0.02,sx<0?'accent':'marker',sx*1.8+0.3,1.95,-1.2);
            g.add(fl);
        }
        const tg=new THREE.Group();
        for (const [r,tone] of [[0.5,'light'],[0.36,'accent'],[0.22,'light'],[0.1,'accent']]) {
            const d=cyl(r,r,0.04,tone,0,0,0,16);
            d.rotation.x=Math.PI/2;
            d.position.z=(0.5-r)*0.1;
            tg.add(d);
        }
        tg.position.set(1.5,1.0,0.6);
        tg.rotation.y=-0.7;
        g.add(tg);
        g.add(rot(bx(0.06,1.0,0.06,'dark',1.5,0.5,0.55),0,0,0));
        g.add(bx(0.9,0.06,0.5,'dark',-1.4,0.03,0.9));
        for (let k=0;k<3;k++) {
            g.add(cyl(0.1,0.12,0.3-k*0.06,'marker',-1.7+k*0.3,0.21-k*0.03,0.9,8));
        }
    }
};

let fogTex=null;

function fogTexture() {
    if (fogTex) {
        return fogTex;
    }
    const c=document.createElement('canvas');
    c.width=128;
    c.height=128;
    const x=c.getContext('2d');
    const blobs=[[64,70,50],[42,62,30],[86,60,32],[60,44,28],[78,82,26],[46,84,24]];
    for (const [bx0,by0,r] of blobs) {
        const g=x.createRadialGradient(bx0,by0,r*0.15,bx0,by0,r);
        g.addColorStop(0,rgba('paper',0.95));
        g.addColorStop(0.55,rgba('farGray',0.75));
        g.addColorStop(1,rgba('farGray',0));
        x.fillStyle=g;
        x.beginPath();
        x.arc(bx0,by0,r,0,Math.PI*2);
        x.fill();
    }
    x.strokeStyle=rgba('midGray',0.35);
    x.lineWidth=2;
    x.beginPath();
    x.arc(64,70,40,Math.PI*1.05,Math.PI*1.6);
    x.stroke();
    x.beginPath();
    x.arc(86,60,24,Math.PI*1.4,Math.PI*1.95);
    x.stroke();
    fogTex=new THREE.CanvasTexture(c);
    fogTex.colorSpace=THREE.NoColorSpace;
    return fogTex;
}

const FOG_PUFFS=(()=>{
    const out=[];
    const n=TUNING.npc.fogPuffs;
    for (let i=0;i<n;i++) {
        const a=i*2.399;
        const k=Math.sqrt((i+0.5)/n);
        const h=Math.abs(Math.sin(i*12.9898)*43758.5453)%1;
        out.push([Math.cos(a)*k*TUNING.npc.fogR,0.5+h*1.7,Math.sin(a)*k*TUNING.npc.fogR*0.9,TUNING.npc.fogSize*(0.8+(1-k)*0.5+h*0.3),i]);
    }
    return out;
})();

const MODELS={
    zone(body,root,s) {
        const st=new THREE.Group();
        (STATIONS[s.zone]||STATIONS.bed)(st);
        st.visible=false;
        st.scale.set(0.001,0.001,0.001);
        body.add(st);
        const fog=new THREE.Group();
        for (const [x,y,z,r,i] of FOG_PUFFS) {
            const pf=new THREE.Sprite(new THREE.SpriteMaterial({map:fogTexture(),transparent:true,depthWrite:false,depthTest:false,opacity:TUNING.npc.fogAlpha}));
            pf.position.set(x,y,z);
            pf.scale.set(r,r*0.8,1);
            pf.material.rotation=i*0.9;
            pf.userData.base=y;
            pf.userData.ph=i*1.7;
            fog.add(pf);
        }
        return {r:TUNING.npc.zoneR,h:2.8,still:true,fog,fogFx:true,station:st};
    },
    shop(body,root) {
        root.add(bx(2.6,0.9,1.0,'cover',0,0.45,0.75));
        root.add(bx(2.7,0.08,1.1,'dark',0,0.94,0.75));
        for (const sx of [-1.25,1.25]) {
            root.add(cyl(0.06,0.06,2.4,'dark',sx,1.2,0.2,6));
        }
        root.add(bx(3.0,0.12,1.5,'light',0,2.42,0.4));
        for (const sx of [-1,0,1]) {
            root.add(bx(0.45,0.14,1.52,'accent',sx,2.44,0.4));
        }
        body.add(cyl(0.42,0.5,1.2,'light',0,0.6,-0.2));
        body.add(ball(0.4,'light',0,1.5,-0.2));
        body.add(bx(0.5,0.25,0.5,'dark',0,1.9,-0.2));
        eyes(body,1.55,0.15,0.13,0.07);
        return {r:1.5,h:2.7};
    },
    rest(body) {
        body.add(cyl(0.5,0.55,1.4,'light',0,0.7,0));
        body.add(cyl(0.28,0.4,0.25,'light',0,1.52,0));
        body.add(cyl(0.22,0.22,0.5,'ink',0,1.85,0));
        body.add(bx(0.5,0.14,0.05,'accent',0,0.75,0.54));
        body.add(bx(0.14,0.5,0.05,'accent',0,0.75,0.54));
        eyes(body,1.15,0.48,0.16,0.07);
        return {r:0.8,h:2.2};
    },
    bottle(body,root) {
        body.add(cyl(0.7,0.75,0.9,'ink',0,0.45,0));
        body.add(cyl(0.35,0.45,0.35,'ink',0,1.07,0));
        body.add(cyl(0.4,0.4,0.12,'dark',0,1.3,0));
        eyes(body,0.6,0.7,0.22,0.09,'light');
        const puddle=cyl(1.3,1.3,0.03,'ink',0.6,0.02,0.7,16);
        puddle.scale.set(1,1,0.6);
        root.add(puddle);
        return {r:0.9,h:1.6};
    },
    eraser(body) {
        body.add(bx(0.9,1.3,0.7,'light',0,0.65,0));
        body.add(bx(0.94,0.5,0.74,'accent',0,1.1,0));
        eyes(body,0.75,0.37,0.18,0.08);
        body.add(bx(0.3,0.06,0.04,'ink',0,0.5,0.37));
        return {r:0.8,h:1.6};
    },
    board(body) {
        for (const sx of [-0.55,0.55]) {
            const leg=bx(0.1,2.0,0.1,'dark',sx,1.0,-0.1);
            leg.rotation.z=sx*0.12;
            body.add(leg);
        }
        body.add(bx(1.7,1.25,0.08,'light',0,1.45,0.05));
        body.add(bx(1.0,0.06,0.04,'ink',-0.1,1.7,0.1));
        body.add(bx(0.06,0.6,0.04,'accent',0.45,1.35,0.1));
        body.add(bx(0.5,0.06,0.04,'ink',-0.2,1.15,0.1));
        eyes(body,1.45,0.1,0.25,0.08);
        return {r:0.9,h:2.3};
    },
    notebook(body) {
        body.add(bx(1.0,1.4,0.22,'dark',0,0.75,0));
        body.add(bx(0.9,1.3,0.18,'light',0.04,0.75,0.04));
        body.add(bx(0.12,1.42,0.24,'accent',-0.46,0.75,0));
        eyes(body,0.95,0.15,0.18,0.07);
        return {r:0.7,h:1.8};
    },
    gacha(body) {
        body.add(bx(1.0,1.0,0.9,'accent',0,0.5,0));
        body.add(ball(0.6,'light',0,1.45,0));
        body.add(ball(0.16,'marker',-0.2,1.3,0.3));
        body.add(ball(0.15,'accent',0.22,1.42,0.28));
        body.add(ball(0.14,'dark',0,1.62,0.32));
        body.add(cyl(0.12,0.12,0.12,'ink',0,0.45,0.48));
        eyes(body,0.78,0.46,0.22,0.07,'light');
        return {r:0.8,h:2.2};
    },
    sharpener(body) {
        body.add(bx(1.0,0.8,0.8,'cover',0,0.4,0));
        const hole=cyl(0.22,0.22,0.1,'ink',0,0.45,0.41);
        hole.rotation.x=Math.PI/2;
        body.add(hole);
        body.add(bx(0.06,0.5,0.84,'dark',0.4,0.4,0));
        eyes(body,0.68,0.41,0.22,0.07);
        return {r:0.8,h:1.3};
    },
    mug(body) {
        body.add(cyl(0.55,0.5,0.95,'light',0,0.48,0));
        body.add(cyl(0.48,0.48,0.04,'ink',0,0.94,0));
        const handle=mesh(geo('torus',()=>new THREE.TorusGeometry(0.28,0.07,6,12)),'dark',0.62,0.5,0);
        body.add(handle);
        eyes(body,0.6,0.52,0.17,0.07);
        return {r:0.8,h:1.4};
    },
    ghost(body) {
        body.add(ball(0.62,'light',0,1.35,0));
        const tail=cyl(0.62,0.05,1.0,'light',0,0.65,0,12);
        body.add(tail);
        eyes(body,1.45,0.55,0.2,0.09);
        body.add(ball(0.12,'ink',0,1.15,0.56));
        return {r:0.8,h:2.2,float:true};
    },
    conductor(body) {
        body.add(cyl(0.05,0.05,1.3,'dark',0,0.65,0,6));
        body.add(cyl(0.35,0.4,0.06,'dark',0,0.03,0,10));
        const stand=bx(1.0,0.7,0.06,'light',0,1.45,0.05);
        stand.rotation.x=-0.35;
        body.add(stand);
        body.add(bx(0.6,0.04,0.02,'ink',0,1.55,0.11));
        body.add(bx(0.5,0.04,0.02,'ink',0,1.42,0.15));
        body.add(ball(0.07,'ink',0.2,1.36,0.17));
        eyes(body,1.75,0.02,0.18,0.07);
        return {r:0.7,h:2.1};
    },
    cloud(body) {
        body.add(cyl(0.05,0.05,1.2,'dark',0,0.6,0,6));
        body.add(cyl(0.35,0.4,0.12,'dark',0,0.06,0,10));
        for (const [x,y,r] of [[0,1.7,0.5],[-0.45,1.55,0.36],[0.45,1.55,0.38],[0.2,1.95,0.32],[-0.22,1.9,0.3]]) {
            body.add(ball(r,'light',x,y,0));
        }
        eyes(body,1.72,0.45,0.13,0.07);
        for (const x of [-0.3,0.05,0.35]) {
            body.add(ball(0.08,'ink',x,1.05+Math.abs(x)*0.4,0.05));
        }
        return {r:0.7,h:2.3};
    },
    dice(body) {
        body.add(bx(1.0,1.0,1.0,'light',0,0.55,0));
        for (const [x,y] of [[-0.25,0.8],[0.25,0.3],[0,0.55]]) {
            body.add(ball(0.08,'ink',x,y,0.5));
        }
        body.add(ball(0.08,'accent',0,1.06,0));
        eyes(body,0.8,0.52,0.2,0.05,'accent');
        return {r:0.75,h:1.4};
    },
    plane(body) {
        const wing=cyl(0.01,0.7,1.6,'light',0,1.1,0,3);
        wing.rotation.x=Math.PI/2;
        wing.scale.set(1,1,0.3);
        body.add(wing);
        body.add(cyl(0.05,0.05,0.9,'dark',0,0.45,0,6));
        eyes(body,1.15,0.35,0.15,0.06);
        return {r:0.7,h:1.6,float:true};
    },
    metronome(body) {
        body.add(cyl(0.2,0.6,1.5,'cover',0,0.75,0,4));
        const arm=bx(0.06,1.2,0.06,'ink',0,1.1,0.3);
        arm.rotation.z=0.3;
        body.add(arm);
        body.add(bx(0.18,0.14,0.1,'accent',0.16,1.45,0.3));
        eyes(body,0.6,0.42,0.16,0.06);
        return {r:0.7,h:1.8};
    },
    marble(body) {
        body.add(ball(0.55,'accent',0,0.6,0));
        body.add(bx(1.12,0.1,0.1,'light',0,0.6,0));
        eyes(body,0.8,0.48,0.17,0.07,'light');
        return {r:0.6,h:1.3};
    },
    ruler(body) {
        const r=bx(0.5,2.0,0.12,'light',0,1.0,0);
        body.add(r);
        for (let i=0;i<7;i++) {
            body.add(bx(i%2?0.12:0.22,0.03,0.04,'ink',-0.16,0.25+i*0.25,0.07));
        }
        eyes(body,1.55,0.08,0.12,0.06);
        return {r:0.6,h:2.2};
    },
    coach(body) {
        body.add(cyl(0.38,0.45,1.1,'cover',0,0.55,0));
        body.add(ball(0.36,'light',0,1.38,0));
        body.add(cyl(0.38,0.38,0.12,'accent',0,1.66,0,12));
        body.add(bx(0.45,0.05,0.3,'accent',0,1.64,0.28));
        body.add(cyl(0.02,0.02,0.4,'ink',0.18,1.05,0.4,4));
        body.add(bx(0.12,0.08,0.14,'dark',0.18,0.85,0.44));
        eyes(body,1.42,0.33,0.13,0.06);
        return {r:0.7,h:2.0};
    },
    teacher(body) {
        body.add(cyl(0.34,0.5,1.15,'dark',0,0.58,0));
        body.add(bx(0.2,0.3,0.04,'light',0,1.0,0.36));
        body.add(ball(0.35,'light',0,1.42,0));
        body.add(ball(0.2,'ink',0,1.66,-0.22));
        body.add(cyl(0.36,0.36,0.12,'ink',0,1.62,0,12));
        for (const s of [-1,1]) {
            const lens=cyl(0.1,0.1,0.03,'ink',s*0.13,1.45,0.32,12);
            lens.rotation.x=Math.PI/2;
            body.add(lens);
        }
        body.add(bx(0.08,0.02,0.02,'ink',0,1.46,0.34));
        const stick=cyl(0.02,0.025,0.95,'accent',0.42,1.0,0.25,6);
        stick.rotation.x=0.9;
        stick.rotation.z=-0.3;
        body.add(stick);
        eyes(body,1.4,0.33,0.13,0.05);
        return {r:0.7,h:2.0};
    },
    hourglass(body) {
        body.add(cyl(0.5,0.5,0.1,'dark',0,0.05,0,8));
        body.add(cyl(0.5,0.5,0.1,'dark',0,1.75,0,8));
        body.add(cyl(0.08,0.42,0.8,'light',0,0.5,0,10));
        body.add(cyl(0.42,0.08,0.8,'light',0,1.3,0,10));
        body.add(cyl(0.05,0.3,0.32,'ink',0,0.26,0,10));
        body.add(cyl(0.22,0.06,0.2,'ink',0,1.12,0,10));
        for (const [x,z] of [[0.42,0],[-0.42,0],[0,0.42],[0,-0.42]]) {
            body.add(cyl(0.035,0.035,1.7,'ink',x,0.9,z,4));
        }
        eyes(body,1.42,0.4,0.15,0.06);
        return {r:0.65,h:1.9};
    },
    item(body,root,s) {
        root.add(cyl(0.55,0.62,0.7,'cover',0,0.35,0,10));
        root.add(cyl(0.62,0.62,0.06,'dark',0,0.72,0,10));
        const k=s.item;
        const y=0.75;
        if (k==='buy'||k==='rare') {
            for (let i=0;i<3;i++) {
                const c=bx(0.42,0.04,0.58,i===2&&k==='rare'?'accent':'light',0.04*i,y+0.03+i*0.05,-0.02*i);
                c.rotation.y=0.25*i-0.25;
                body.add(c);
            }
            if (k==='rare') {
                body.add(ball(0.1,'accent',0,y+0.3,0));
            }
        }
        else if (k==='upgrade'||k==='upgrade2') {
            body.add(bx(0.42,0.04,0.58,'light',0,y+0.03,0));
            const n=k==='upgrade'?1:2;
            for (let i=0;i<n;i++) {
                const st=cyl(0.16,0.16,0.06,'accent',(i-(n-1)/2)*0.32,y+0.4,0,5);
                st.rotation.x=Math.PI/2;
                body.add(st);
            }
        }
        else if (k==='patch'||k==='bigPatch') {
            const sc=k==='patch'?1:1.4;
            body.add(bx(0.5*sc,0.12*sc,0.32*sc,'light',0,y+0.08*sc,0));
            body.add(bx(0.12*sc,0.13*sc,0.24*sc,'accent',0,y+0.09*sc,0));
            body.add(bx(0.3*sc,0.13*sc,0.08*sc,'accent',0,y+0.09*sc,0));
        }
        else if (k==='remove') {
            body.add(cyl(0.2,0.2,0.16,'light',0,y+0.25,0,14).rotateX(Math.PI/2));
            body.add(bx(0.36,0.2,0.18,'cover',0.12,y+0.12,0));
            body.add(bx(0.4,0.03,0.12,'light',0.32,y+0.03,0));
        }
        else if (k==='ink') {
            body.add(cyl(0.2,0.24,0.34,'ink',0,y+0.17,0));
            body.add(cyl(0.1,0.12,0.12,'ink',0,y+0.4,0));
        }
        else {
            for (const sx of [-1,1]) {
                const p=cyl(0.04,0.04,0.7,sx<0?'dark':'accent',0,y+0.3,0,6);
                p.rotation.z=sx*0.7;
                body.add(p);
            }
        }
        return {r:0.65,h:1.3,still:true};
    },
    cardKeeper(body) {
        body.add(cyl(0.48,0.56,1.3,'light',0,0.65,0));
        body.add(bx(1.05,0.1,0.6,'dark',0,1.32,0));
        for (let i=0;i<4;i++) {
            const c=bx(0.42,0.6,0.04,i===3?'cover':'light',-0.3+i*0.2,1.62,0.2-i*0.05);
            c.rotation.z=-0.35+i*0.23;
            body.add(c);
        }
        body.add(ball(0.36,'light',0,2.1,0));
        body.add(cyl(0.38,0.38,0.06,'dark',0,2.3,0,14));
        body.add(cyl(0.22,0.26,0.32,'dark',0,2.48,0,12));
        eyes(body,2.12,0.32,0.13,0.06);
        body.add(bx(0.08,0.4,0.05,'accent',0,0.85,0.55));
        return {r:0.85,h:2.8};
    },
    ultKeeper(body) {
        body.add(cyl(0.42,0.62,1.4,'dark',0,0.7,0));
        body.add(ball(0.38,'light',0,1.75,0));
        const hood=cyl(0.05,0.46,0.7,'dark',0,2.05,-0.04,12);
        body.add(hood);
        eyes(body,1.78,0.33,0.13,0.07,'accent');
        const star=new THREE.Group();
        star.position.set(0.55,1.4,0.35);
        for (let i=0;i<3;i++) {
            const b=bx(0.42,0.1,0.06,'accent',0,0,0);
            b.rotation.z=i*Math.PI/3;
            star.add(b);
        }
        body.add(star);
        body.add(cyl(0.04,0.04,1.8,'dark',-0.62,0.9,0.15,6));
        body.add(ball(0.13,'accent',-0.62,1.86,0.15));
        return {r:0.85,h:2.6};
    },
    librarian(body,root) {
        body.add(cyl(0.38,0.7,1.6,'dark',0,0.8,0));
        body.add(cyl(0.45,0.45,0.1,'cover',0,1.62,0,12));
        body.add(ball(0.36,'light',0,1.95,0));
        body.add(cyl(0.02,0.56,0.95,'ink',0,2.55,0,10));
        body.add(cyl(0.6,0.6,0.05,'ink',0,2.12,0,16));
        for (const sx of [-1,1]) {
            const lens=cyl(0.1,0.1,0.03,'light',sx*0.13,1.98,0.33,10);
            lens.rotation.x=Math.PI/2;
            body.add(lens);
        }
        body.add(bx(0.1,0.03,0.03,'ink',0,1.98,0.34));
        body.add(ball(0.04,'ink',-0.13,1.98,0.35),ball(0.04,'ink',0.13,1.98,0.35));
        body.add(bx(0.18,0.5,0.1,'light',0,1.62,0.4));
        const book=bx(0.6,0.08,0.44,'cover',0,1.2,0.62);
        book.rotation.x=0.35;
        body.add(book);
        body.add(bx(0.26,0.02,0.36,'light',-0.14,1.25,0.62));
        body.add(bx(0.26,0.02,0.36,'light',0.14,1.25,0.62));
        root.add(cyl(0.08,0.18,1.0,'dark',-1.0,0.5,0.7,8));
        root.add(bx(0.8,0.06,0.6,'dark',-1.0,1.03,0.7));
        const open=bx(0.66,0.06,0.46,'light',-1.0,1.09,0.7);
        open.rotation.x=-0.25;
        root.add(open);
        return {r:1.0,h:3.0};
    },
    relic(body,root,s) {
        root.add(cyl(0.38,0.48,0.75,'cover',0,0.375,0,8));
        root.add(cyl(0.5,0.5,0.08,'dark',0,0.78,0,8));
        root.add(cyl(0.48,0.5,0.06,'dark',0,0.03,0,8));
        const c=document.createElement('canvas');
        c.width=128;
        c.height=128;
        drawRelicIcon(c.getContext('2d'),s.relic,64,64,1.3,0);
        const tex=new THREE.CanvasTexture(c);
        tex.colorSpace=THREE.NoColorSpace;
        const icon=new THREE.Mesh(geo('relicIcon',()=>new THREE.PlaneGeometry(1.1,1.1)),iconMaterial(tex));
        icon.position.y=1.55;
        icon.rotation.x=-TUNING.npc.iconTilt;
        const spin=new THREE.Group();
        spin.add(icon);
        body.add(spin);
        return {r:0.65,h:1.9,float:true,still:true,icon:spin};
    },
    chest(body) {
        body.add(bx(1.2,0.65,0.85,'cover',0,0.33,0));
        body.add(bx(1.24,0.1,0.89,'dark',0,0.62,0));
        const lid=new THREE.Group();
        lid.position.set(0,0.66,-0.43);
        const top=bx(1.2,0.28,0.86,'dark',0,0.14,0.43);
        lid.add(top);
        lid.add(bx(0.18,0.2,0.06,'marker',0,0.0,0.88));
        body.add(lid);
        return {r:0.8,h:1.2,lid};
    }
};

export class Npcs {
    constructor() {
        this.list=[];
        this.focus=-1;
        this.armed=-1;
    }

    dropFog(n) {
        if (n&&n.fog&&n.fog.parent) {
            n.fog.parent.remove(n.fog);
        }
    }

    clear() {
        for (const n of this.list) {
            this.dropFog(n);
        }
        this.list=[];
        this.focus=-1;
        this.armed=-1;
    }

    build(room,specs) {
        this.clear();
        this.build2(room,...specs);
    }

    build2(room,...specs) {
        for (const s of specs) {
            const root=new THREE.Group();
            root.position.set(s.x,0,s.z);
            const body=new THREE.Group();
            root.add(body);
            const info=MODELS[s.model](body,root,s);
            room.group.add(root);
            if (info.fogFx) {
                if (this.fx) {
                    info.fog.position.set(s.x,0,s.z);
                    this.fx.add(info.fog);
                }
                else {
                    root.add(info.fog);
                }
            }
            room.addPiece('npc',root,[makeCircle(s.x,s.z,info.r)],{x:s.x,z:s.z,radius:info.r,erasable:false});
            this.list.push({model:s.model,item:s.item||null,label:s.label||null,price:s.price||0,relic:s.relic||null,zone:s.zone||null,role:s.role||null,root,body,x:s.x,z:s.z,r:info.r,h:info.h,lid:info.lid||null,icon:info.icon||null,fog:info.fog||null,station:info.station||null,reveal:0,revealed:false,float:!!info.float,still:!!info.still,used:false,sealed:false,t:Math.random()*6,yaw:0,pop:0,open:0});
        }
    }

    reveal(i,instant=false) {
        const n=this.list[i];
        if (!n||!n.fog) {
            return;
        }
        n.revealed=true;
        n.station.visible=true;
        if (instant) {
            n.reveal=1;
        }
        n.pop=1;
    }

    replace(room,i,s) {
        const old=this.list[i];
        if (!old) {
            return;
        }
        old.root.parent&&old.root.parent.remove(old.root);
        this.dropFog(old);
        const keep=this.list;
        this.list=[];
        this.build2(room,s);
        const fresh=this.list[0];
        this.list=keep;
        this.list[i]=fresh;
    }

    say(i,text,dur) {
        const n=this.list[i];
        if (n) {
            n.say={text,t:0,dur};
            n.pop=1;
        }
    }

    markUsed(i,sealed=false) {
        const n=this.list[i];
        if (!n) {
            return;
        }
        n.used=true;
        n.sealed=sealed;
        n.pop=1;
    }

    update(dt,player,can) {
        const N=TUNING.npc;
        let best=-1;
        let bd=1e9;
        for (let i=0;i<this.list.length;i++) {
            const n=this.list[i];
            n.t+=dt;
            const dx=player.pos.x-n.x;
            const dz=player.pos.z-n.z;
            const d=Math.hypot(dx,dz);
            const still=n.still||n.model==='shop'||n.model==='chest';
            const want=still?0:Math.atan2(dx,dz);
            let dy=want-n.yaw;
            dy=Math.atan2(Math.sin(dy),Math.cos(dy));
            n.yaw+=dy*Math.min(1,dt*N.turn);
            n.body.rotation.y=n.yaw;
            n.pop=Math.max(0,n.pop-dt*N.popDecay);
            if (n.say) {
                n.say.t+=dt;
                if (n.say.t>=n.say.dur) {
                    n.say=null;
                }
            }
            const bob=n.float?N.floatAmp*(1+Math.sin(n.t*N.floatRate))+N.floatBase:Math.abs(Math.sin(n.t*N.bobRate))*N.bobAmp;
            n.body.position.y=n.sealed||still?0:bob;
            const sq=1+(still?0:Math.sin(n.t*N.bobRate*2)*N.squash)+Math.sin(n.pop*Math.PI)*N.popScale;
            n.body.scale.set(1/Math.sqrt(sq),n.sealed?N.sealedScale:sq,1/Math.sqrt(sq));
            if ((n.model==='item'||n.model==='relic')&&n.used) {
                n.gone=Math.min(1,(n.gone||0)+dt*N.goneRate);
                const g=Math.max(0.001,1-EASE.easeInCubic(n.gone));
                n.body.scale.set(g,g,g);
                n.body.position.y=n.gone*N.goneLift;
                n.body.visible=n.gone<1;
            }
            if (n.icon) {
                n.icon.rotation.y=Math.sin(n.t*N.iconSway)*0.35;
            }
            if (n.fog) {
                if (n.revealed) {
                    n.reveal=Math.min(1,n.reveal+dt*N.fogRate);
                }
                const e=EASE.easeOutCubic(n.reveal);
                const f=Math.max(0.001,1-e);
                const sealed=n.sealed?N.fogSealed:1;
                n.fog.scale.set(f*(1+e*0.6),f*sealed,f*(1+e*0.6));
                n.fog.position.y=e*N.fogLift;
                for (const pf of n.fog.children) {
                    pf.material.opacity=N.fogAlpha*(n.sealed?N.fogSealedAlpha:1)*Math.min(1,f*1.5);
                }
                n.fog.rotation.y=Math.sin(n.t*N.fogSpin)*0.12;
                n.fog.visible=f>0.01;
                if (n.fog.visible) {
                    for (const pf of n.fog.children) {
                        pf.position.y=pf.userData.base+Math.sin(n.t*N.fogBob+pf.userData.ph)*N.fogBobAmp;
                    }
                }
                const g=Math.max(0.001,EASE.easeOutBack(n.reveal))*N.stationScale;
                n.station.scale.set(g,g,g);
                n.body.scale.set(1,1,1);
                n.body.position.y=0;
            }
            if (n.lid) {
                n.open+=((n.used&&!n.sealed?1:0)-n.open)*Math.min(1,dt*N.lidRate);
                n.lid.rotation.x=-N.lidOpen*EASE.easeOutBack(Math.min(1,n.open));
            }
            if (!n.used&&can(i)&&d<n.r+N.range&&d<bd) {
                bd=d;
                best=i;
            }
        }
        this.focus=best;
    }
}
