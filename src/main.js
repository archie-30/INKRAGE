const RETRY='inkrage.bootRetry';

async function refreshCache() {
    const here=location.origin;
    const urls=new Set(performance.getEntriesByType('resource').map(e=>e.name).filter(u=>u.startsWith(here)&&/\.(js|css|json)(\?|$)/.test(u)));
    urls.add(new URL('./game.js',import.meta.url).href);
    urls.add(new URL('./main.js',import.meta.url).href);
    urls.add(location.href.split('#')[0]);
    await Promise.all([...urls].map(u=>fetch(u,{cache:'reload'}).catch(()=>null)));
}

async function showFailure(err) {
    console.error(err);
    let msg='Loading failed. Please refresh the page.';
    try {
        const S=await import('./data/strings.js');
        msg=S.t('boot.failed');
    }
    catch (e) {
        console.error(e);
    }
    const loader=document.getElementById('loader');
    const title=loader&&loader.querySelector('.ld-title');
    if (title) {
        title.textContent=msg;
        title.style.fontSize='16px';
    }
}

import('./game.js').then(()=>{
    try {
        sessionStorage.removeItem(RETRY);
    }
    catch (e) {
        console.warn(e);
    }
}).catch(async err=>{
    let tried=false;
    try {
        tried=sessionStorage.getItem(RETRY)==='1';
        sessionStorage.setItem(RETRY,'1');
    }
    catch (e) {
        console.warn(e);
    }
    if (tried) {
        showFailure(err);
        return;
    }
    console.warn('INKRAGE: startup failed, refreshing cached files',err);
    await refreshCache();
    location.reload();
});
