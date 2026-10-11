// Google Play in-app update (flexible): checks once after launch in the Android app only.
// Play shows its own prompt; the download runs in the background and installs on the next launch,
// so a run in progress is never interrupted. Does nothing on the web version.
// Talks to the plugin through Capacitor's native bridge (nativePromise / addListener): the game does not
// bundle @capacitor/core, so Capacitor.registerPlugin does not exist inside the app.
const CHECK_DELAY=4000;
const AVAILABLE=2;
const DOWNLOADED=11;
const PLUGIN='AppUpdate';

export function checkForUpdate(notify) {
    const cap=window.Capacitor;
    if (!cap||!cap.isNativePlatform||!cap.isNativePlatform()||!cap.nativePromise||!cap.addListener) {
        return;
    }
    setTimeout(async()=>{
        try {
            const info=await cap.nativePromise(PLUGIN,'getAppUpdateInfo',{});
            if (info.updateAvailability!==AVAILABLE||!info.flexibleUpdateAllowed) {
                return;
            }
            cap.addListener(PLUGIN,'onFlexibleUpdateStateChange',state=>{
                if (state&&state.installStatus===DOWNLOADED) {
                    notify('update.ready');
                }
            });
            await cap.nativePromise(PLUGIN,'startFlexibleUpdate',{});
        }
        catch (e) {
            console.warn('AppUpdate:',(e&&e.message)||e);
        }
    },CHECK_DELAY);
}
