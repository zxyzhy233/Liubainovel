import type AbilityConstant from "@ohos:app.ability.AbilityConstant";
import type { Configuration as Configuration } from "@ohos:app.ability.Configuration";
import UIAbility from "@ohos:app.ability.UIAbility";
import type Want from "@ohos:app.ability.Want";
import hilog from "@ohos:hilog";
import window from "@ohos:window";
import { WindowAbility } from "@bundle:liubai.yuedu.hos/entry/ets/entryability/WindowAbility";
import deviceInfo from "@ohos:deviceInfo";
import { bookSourceManager } from "@bundle:liubai.yuedu.hos/entry/ets/managers/BookSourceManager";
const TAG: string = 'EntryAbility';
export default class EntryAbility extends UIAbility {
    private windowStage: window.WindowStage | null = null;
    onCreate(want: Want, launchParam: AbilityConstant.LaunchParam) {
        hilog.info(0x0000, TAG, '%{public}s', 'Ability onCreate');
        WindowAbility.getInstance().initContext(this.context);
        // 初始化书源管理器
        this.initializeBookSourceManager();
    }
    /**
     * 初始化书源管理器
     */
    private async initializeBookSourceManager(): Promise<void> {
        try {
            await bookSourceManager.initialize(this.context);
            hilog.info(0x0000, TAG, '书源管理器初始化成功');
        }
        catch (error) {
            hilog.error(0x0000, TAG, '书源管理器初始化失败: ' + JSON.stringify(error));
        }
    }
    onDestroy() {
        hilog.info(0x0000, TAG, '%{public}s', 'Ability onDestroy');
    }
    onWindowStageCreate(windowStage: window.WindowStage) {
        // Main window is created, set main page for this ability
        hilog.info(0x0000, TAG, '%{public}s', 'Ability onWindowStageCreate');
        WindowAbility.getInstance().setWindowStage(windowStage);
        this.initWindowProcess(windowStage);
        windowStage.loadContent('pages/MainPage', (err, data) => {
            if (err.code) {
                hilog.error(0x0000, TAG, 'Failed to load the content. Cause: %{public}s', JSON.stringify(err) ?? '');
                return;
            }
            hilog.info(0x0000, TAG, 'Succeeded in loading the content. Data: %{public}s', JSON.stringify(data) ?? '');
        });
    }
    onConfigurationUpdate(newConfig: Configuration): void {
        AppStorage.setOrCreate('colorMode', newConfig.colorMode);
    }
    initWindowProcess(windowStage: window.WindowStage): void {
        windowStage.getMainWindow((err, windowClass: window.Window) => {
            if (err.code) {
                hilog.error(0x0000, TAG, 'getMainWindow failed.');
                return;
            }
            WindowAbility.getInstance().initAvoidArea(windowClass);
            let systemBarProperties: window.SystemBarProperties = {
                statusBarContentColor: this.context.config.colorMode ? '#000000' : '#FFFFFF'
            };
            windowClass.setWindowSystemBarProperties(systemBarProperties);
        });
        WindowAbility.getInstance().setWindowLayoutFullScreen(true);
        if (deviceInfo.deviceType === 'tablet') {
            WindowAbility.getInstance().setOrientation(windowStage, window.Orientation.AUTO_ROTATION_RESTRICTED);
        }
        WindowAbility.getInstance().initWindowSize();
    }
    onWindowStageDestroy() {
        // Main window is destroyed, release UI related resources
        hilog.info(0x0000, TAG, '%{public}s', 'Ability onWindowStageDestroy');
    }
    onForeground() {
        // Ability has brought to foreground
        hilog.info(0x0000, TAG, '%{public}s', 'Ability onForeground');
        if (this.windowStage) {
            WindowAbility.getInstance().setWindowStage(this.windowStage);
        }
    }
    onBackground() {
        // Ability has back to background
        hilog.info(0x0000, TAG, '%{public}s', 'Ability onBackground');
    }
}
