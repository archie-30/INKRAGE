export const ACHIEVEMENTS=[
    {id:'kill100',stat:'kills',goals:[250,700,1500],icon:'battle'},
    {id:'elite10',stat:'elites',goals:[25,65,130],icon:'elite'},
    {id:'boss1',stat:'bosses',goals:[1],icon:'boss'},
    {id:'boss10',stat:'bosses',goals:[8,18,35],icon:'boss'},
    {id:'bossAll',stat:'bossKinds',goals:[6],icon:'boss'},
    {id:'boss_inkBottle',stat:'boss.inkBottle',goals:[6,15,28],icon:'boss'},
    {id:'boss_scissors',stat:'boss.scissors',goals:[6,15,28],icon:'boss'},
    {id:'boss_book',stat:'boss.book',goals:[6,15,28],icon:'boss'},
    {id:'boss_exam',stat:'boss.exam',goals:[6,15,28],icon:'boss'},
    {id:'boss_bookFinal',stat:'boss.bookFinal',goals:[6,15,28],icon:'boss'},
    {id:'boss_alarm',stat:'boss.alarm',goals:[6,15,28],icon:'boss'},
    {id:'boss_calculator',stat:'boss.calculator',goals:[6,15,28],icon:'boss'},
    {id:'cleanBoss',stat:'cleanBoss',goals:[1],icon:'heal'},
    {id:'clean10',stat:'cleanPages',goals:[20,50,90],icon:'heal'},
    {id:'clutch',stat:'clutch',goals:[1],icon:'rest'},
    {id:'dodge10',stat:'dodges',goals:[50,140,300],icon:'leave'},
    {id:'dodgeChain',stat:'dodgeChain',goals:[4],icon:'leave'},
    {id:'pierce3',stat:'pierceBest',goals:[3],icon:'card'},
    {id:'barrels100',stat:'barrels',goals:[60,140,250],icon:'battle'},
    {id:'crates100',stat:'crates',goals:[60,140,250],icon:'treasure'},
    {id:'barrelDeath',stat:'barrelDeaths',goals:[1],icon:'rest'},
    {id:'dizzy',stat:'spinTurns',goals:[10],icon:'challenge'},
    {id:'cards200',stat:'cards',goals:[400,1000,2000],icon:'card'},
    {id:'merge5',stat:'merges',goals:[35,80,160],icon:'upgrade'},
    {id:'ult25',stat:'ults',goals:[90,200,380],icon:'treasure'},
    {id:'firstRun',stat:'runs',goals:[1],icon:'flag'},
    {id:'pages30',stat:'pages',goals:[60,140,250],icon:'book'},
    {id:'clear1',stat:'clears',goals:[1,5,10],icon:'flag'},
    {id:'endless10',stat:'endlessPage',goals:[12,25,40],icon:'next'},
    {id:'games10',stat:'games',goals:[18,40,70],icon:'challenge'},
    {id:'shop10',stat:'buys',goals:[20,50,90],icon:'shop'},
    {id:'level5',stat:'level',goals:[5],icon:'next'},
    {id:'level10',stat:'level',goals:[10],icon:'next'},
    {id:'revive',stat:'revives',goals:[1],icon:'heal'},
    {id:'outfit',stat:'outfits',goals:[2],icon:'pen'},
    {id:'dress10',stat:'owned',goals:[10,25,50],icon:'treasure'},
    {id:'weapons4',stat:'weaponKinds',goals:[4,5,7],icon:'pen'},
    {id:'gacha',stat:'pulls',goals:[1,6,12],icon:'capsule'},
    {id:'gachaBroke',stat:'gachaBroke',goals:[1],icon:'capsule'},
    {id:'relicAll',stat:'relicsOwned',goals:[8,15,22],icon:'book'},
    {id:'codexAll',stat:'seen',goals:[14],icon:'book'}
];

export const ACH_LEGACY={kill1000:'kill100#3',dodge100:'dodge10#3',cards1000:'cards200#3',clear3:'clear1#2',endless25:'endless10#2'};

export const ROMAN=['Ⅰ','Ⅱ','Ⅲ'];

export function achKey(a,k) {
    return k===0?a.id:a.id+'#'+(k+1);
}

export function achUnits() {
    return ACHIEVEMENTS.reduce((n,a)=>n+a.goals.length,0);
}
