if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface MinePage_Params {
    currentBookCount?: number;
    totalBookCount?: number;
    usageTimeText?: string;
    appStartTime?: number;
    prefs?: preferences.Preferences | null;
    menuItems?: MenuItem[];
}
import hilog from "@ohos:hilog";
import type common from "@ohos:app.ability.common";
import { bookDataManager } from "@bundle:liubai.yuedu.hos/entry/ets/utils/BookDataManager";
import { onlineBookDataManager } from "@bundle:liubai.yuedu.hos/entry/ets/utils/OnlineBookDataManager";
import preferences from "@ohos:data.preferences";
const TAG: string = 'MinePage';
/**
 * 菜单项接口
 */
interface MenuItem {
    title: string;
    icon: string;
    action: () => void;
}
class MinePage extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__currentBookCount = new ObservedPropertySimplePU(0, this, "currentBookCount");
        this.__totalBookCount = new ObservedPropertySimplePU(0, this, "totalBookCount");
        this.__usageTimeText = new ObservedPropertySimplePU('0h', this, "usageTimeText");
        this.appStartTime = 0;
        this.prefs = null;
        this.menuItems = [
            {
                title: '鹿析管理',
                icon: '🦌‌',
                action: () => {
                    this.navigateToBookSource();
                }
            },
            // {
            //   title: '主题模式',
            //   icon: '🎨',
            //   action: () => {
            //     hilog.info(0x0000, TAG, '点击主题模式');
            //     // TODO: 实现主题模式功能
            //   }
            // },
            // {
            //   title: '备份与恢复',
            //   icon: '💾',
            //   action: () => {
            //     hilog.info(0x0000, TAG, '点击备份与恢复');
            //     // TODO: 实现备份与恢复功能
            //   }
            // },
            {
                title: '捐赠',
                icon: '❤️',
                action: () => {
                    this.navigateToDonatePage();
                }
            },
            {
                title: '关于',
                icon: 'ℹ️',
                action: () => {
                    this.navigateToAboutPage();
                }
            }
        ];
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: MinePage_Params) {
        if (params.currentBookCount !== undefined) {
            this.currentBookCount = params.currentBookCount;
        }
        if (params.totalBookCount !== undefined) {
            this.totalBookCount = params.totalBookCount;
        }
        if (params.usageTimeText !== undefined) {
            this.usageTimeText = params.usageTimeText;
        }
        if (params.appStartTime !== undefined) {
            this.appStartTime = params.appStartTime;
        }
        if (params.prefs !== undefined) {
            this.prefs = params.prefs;
        }
        if (params.menuItems !== undefined) {
            this.menuItems = params.menuItems;
        }
    }
    updateStateVars(params: MinePage_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__currentBookCount.purgeDependencyOnElmtId(rmElmtId);
        this.__totalBookCount.purgeDependencyOnElmtId(rmElmtId);
        this.__usageTimeText.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__currentBookCount.aboutToBeDeleted();
        this.__totalBookCount.aboutToBeDeleted();
        this.__usageTimeText.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __currentBookCount: ObservedPropertySimplePU<number>; // 当前书架数量
    get currentBookCount() {
        return this.__currentBookCount.get();
    }
    set currentBookCount(newValue: number) {
        this.__currentBookCount.set(newValue);
    }
    private __totalBookCount: ObservedPropertySimplePU<number>; // 历史添加总数
    get totalBookCount() {
        return this.__totalBookCount.get();
    }
    set totalBookCount(newValue: number) {
        this.__totalBookCount.set(newValue);
    }
    private __usageTimeText: ObservedPropertySimplePU<string>; // 使用时长文本
    get usageTimeText() {
        return this.__usageTimeText.get();
    }
    set usageTimeText(newValue: string) {
        this.__usageTimeText.set(newValue);
    }
    private appStartTime: number;
    private prefs: preferences.Preferences | null;
    async aboutToAppear() {
        this.appStartTime = Date.now();
        const context = getContext(this) as common.UIAbilityContext;
        // 初始化 preferences
        this.prefs = await preferences.getPreferences(context, 'MinePageStats');
        await this.loadStats();
    }
    async aboutToDisappear() {
        await this.saveUsageTime();
    }
    private async loadStats(): Promise<void> {
        try {
            // 获取当前书架数量
            const localBooks = await bookDataManager.queryAllBooks();
            const onlineBooks = await onlineBookDataManager.queryAllOnlineBooks();
            this.currentBookCount = localBooks.length + onlineBooks.length;
            // 获取历史总添加数
            if (this.prefs) {
                const total = await this.prefs.get('totalBookCount', 0) as number;
                // 如果当前数量大于历史记录，更新历史记录
                if (this.currentBookCount > total) {
                    this.totalBookCount = this.currentBookCount;
                    await this.prefs.put('totalBookCount', this.totalBookCount);
                    await this.prefs.flush();
                }
                else {
                    this.totalBookCount = total;
                }
                // 获取累计使用时长（分钟）
                const totalMinutes = await this.prefs.get('totalUsageMinutes', 0) as number;
                this.usageTimeText = this.formatUsageTime(totalMinutes);
            }
        }
        catch (error) {
            hilog.error(0x0000, TAG, '加载统计数据失败: ' + JSON.stringify(error));
        }
    }
    private async saveUsageTime(): Promise<void> {
        if (!this.prefs || this.appStartTime === 0)
            return;
        try {
            const sessionMinutes = Math.floor((Date.now() - this.appStartTime) / 60000);
            if (sessionMinutes > 0) {
                const totalMinutes = await this.prefs.get('totalUsageMinutes', 0) as number;
                await this.prefs.put('totalUsageMinutes', totalMinutes + sessionMinutes);
                await this.prefs.flush();
            }
        }
        catch (error) {
            hilog.error(0x0000, TAG, '保存使用时长失败: ' + JSON.stringify(error));
        }
    }
    private formatUsageTime(minutes: number): string {
        if (minutes < 60) {
            return `${minutes}m`;
        }
        const hours = Math.floor(minutes / 60);
        return `${hours}h`;
    }
    // 菜单项数据
    private menuItems: MenuItem[];
    /**
     * 跳转到鹿析管理页面
     */
    private navigateToBookSource(): void {
        try {
            this.getUIContext().getRouter().pushUrl({ url: 'pages/BookSourcePage' });
            hilog.info(0x0000, TAG, '跳转到鹿析管理页面');
        }
        catch (error) {
            hilog.error(0x0000, TAG, '跳转失败: ' + JSON.stringify(error));
        }
    }
    /**
     * 跳转到捐赠页面
     */
    private navigateToDonatePage(): void {
        try {
            this.getUIContext().getRouter().pushUrl({ url: 'pages/DonatePage' });
            hilog.info(0x0000, TAG, '跳转到捐赠页面');
        }
        catch (error) {
            hilog.error(0x0000, TAG, '跳转失败: ' + JSON.stringify(error));
        }
    }
    /**
     * 跳转到关于页面
     */
    private navigateToAboutPage(): void {
        try {
            this.getUIContext().getRouter().pushUrl({ url: 'pages/AboutPage' });
            hilog.info(0x0000, TAG, '跳转到关于页面');
        }
        catch (error) {
            hilog.error(0x0000, TAG, '跳转失败: ' + JSON.stringify(error));
        }
    }
    /**
     * 构建菜单项
     */
    private buildMenuItem(item: MenuItem, parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
            Row.height(52);
            Row.padding({ left: 18, right: 18 });
            Row.onClick(() => {
                item.action();
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 图标
            Text.create(item.icon);
            // 图标
            Text.fontSize(22);
            // 图标
            Text.margin({ right: 14 });
        }, Text);
        // 图标
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 标题
            Text.create(item.title);
            // 标题
            Text.fontSize(15);
            // 标题
            Text.fontWeight(FontWeight.Medium);
            // 标题
            Text.fontColor({ "id": 16777307, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            // 标题
            Text.layoutWeight(1);
        }, Text);
        // 标题
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 右箭头
            Text.create('>');
            // 右箭头
            Text.fontSize(16);
            // 右箭头
            Text.fontColor({ "id": 16777309, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        }, Text);
        // 右箭头
        Text.pop();
        Row.pop();
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.height('100%');
            Column.backgroundColor({ "id": 16777296, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 顶部标题
            Row.create();
            // 顶部标题
            Row.width('100%');
            // 顶部标题
            Row.height(56);
            // 顶部标题
            Row.padding({ left: 16, right: 16 });
            // 顶部标题
            Row.margin({ top: 44 });
            // 顶部标题
            Row.justifyContent(FlexAlign.SpaceBetween);
            // 顶部标题
            Row.alignItems(VerticalAlign.Center);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('我的');
            Text.fontSize(26);
            Text.fontWeight(FontWeight.Bold);
            Text.fontColor({ "id": 16777307, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777351, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.width(22);
            Image.height(22);
            Image.fillColor({ "id": 16777308, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        }, Image);
        // 顶部标题
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 用户头像区
            Row.create();
            // 用户头像区
            Row.width('100%');
            // 用户头像区
            Row.padding({ left: 24, right: 24, top: 20, bottom: 20 });
            // 用户头像区
            Row.alignItems(VerticalAlign.Center);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 头像
            Column.create();
            // 头像
            Column.width(64);
            // 头像
            Column.height(64);
            // 头像
            Column.borderRadius(100);
            // 头像
            Column.linearGradient({
                angle: 135,
                colors: [[{ "id": 16777304, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" }, 0], [{ "id": 16777276, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" }, 1]]
            });
            // 头像
            Column.justifyContent(FlexAlign.Center);
            // 头像
            Column.alignItems(HorizontalAlign.Center);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('🌿');
            Text.fontSize(28);
        }, Text);
        Text.pop();
        // 头像
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.alignItems(HorizontalAlign.Start);
            Column.margin({ left: 16 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('书友');
            Text.fontSize(18);
            Text.fontWeight(FontWeight.Bold);
            Text.fontColor({ "id": 16777307, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('阅读让心灵自由');
            Text.fontSize(13);
            Text.fontColor({ "id": 16777309, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Text.margin({ top: 4 });
        }, Text);
        Text.pop();
        Column.pop();
        // 用户头像区
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 阅读统计
            Row.create();
            // 阅读统计
            Row.width('100%');
            // 阅读统计
            Row.padding({ left: 24, right: 24 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 在读
            Column.create();
            // 在读
            Column.layoutWeight(1);
            // 在读
            Column.padding(16);
            // 在读
            Column.backgroundColor({ "id": 16777274, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            // 在读
            Column.borderRadius(16);
            // 在读
            Column.alignItems(HorizontalAlign.Center);
            // 在读
            Column.shadow({ radius: 8, color: '#1A191808', offsetX: 0, offsetY: 2 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(`${this.currentBookCount}`);
            Text.fontSize(32);
            Text.fontWeight(FontWeight.Bold);
            Text.fontColor({ "id": 16777304, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('在读');
            Text.fontSize(12);
            Text.fontColor({ "id": 16777309, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Text.margin({ top: 4 });
        }, Text);
        Text.pop();
        // 在读
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 已读
            Column.create();
            // 已读
            Column.layoutWeight(1);
            // 已读
            Column.padding(16);
            // 已读
            Column.backgroundColor({ "id": 16777274, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            // 已读
            Column.borderRadius(16);
            // 已读
            Column.alignItems(HorizontalAlign.Center);
            // 已读
            Column.margin({ left: 12 });
            // 已读
            Column.shadow({ radius: 8, color: '#1A191808', offsetX: 0, offsetY: 2 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(`${this.totalBookCount}`);
            Text.fontSize(32);
            Text.fontWeight(FontWeight.Bold);
            Text.fontColor({ "id": 16777310, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('已读');
            Text.fontSize(12);
            Text.fontColor({ "id": 16777309, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Text.margin({ top: 4 });
        }, Text);
        Text.pop();
        // 已读
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 阅读时长
            Column.create();
            // 阅读时长
            Column.layoutWeight(1);
            // 阅读时长
            Column.padding(16);
            // 阅读时长
            Column.backgroundColor({ "id": 16777274, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            // 阅读时长
            Column.borderRadius(16);
            // 阅读时长
            Column.alignItems(HorizontalAlign.Center);
            // 阅读时长
            Column.margin({ left: 12 });
            // 阅读时长
            Column.shadow({ radius: 8, color: '#1A191808', offsetX: 0, offsetY: 2 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.usageTimeText);
            Text.fontSize(28);
            Text.fontWeight(FontWeight.Bold);
            Text.fontColor({ "id": 16777276, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('阅读时长');
            Text.fontSize(12);
            Text.fontColor({ "id": 16777309, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Text.margin({ top: 4 });
        }, Text);
        Text.pop();
        // 阅读时长
        Column.pop();
        // 阅读统计
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 菜单列表
            Column.create();
            // 菜单列表
            Column.width('100%');
            // 菜单列表
            Column.padding({ left: 24, right: 24, top: 16 });
            // 菜单列表
            Column.backgroundColor({ "id": 16777274, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            // 菜单列表
            Column.borderRadius(16);
            // 菜单列表
            Column.margin({ left: 24, right: 24, top: 16 });
            // 菜单列表
            Column.shadow({ radius: 8, color: '#1A191808', offsetX: 0, offsetY: 2 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            ForEach.create();
            const forEachItemGenFunction = (_item, index: number) => {
                const item = _item;
                this.buildMenuItem.bind(this)(item);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    If.create();
                    if (index < this.menuItems.length - 1) {
                        this.ifElseBranchUpdateFunction(0, () => {
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Divider.create();
                                Divider.color({ "id": 16777273, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                Divider.margin({ left: 18, right: 18 });
                            }, Divider);
                        });
                    }
                    else {
                        this.ifElseBranchUpdateFunction(1, () => {
                        });
                    }
                }, If);
                If.pop();
            };
            this.forEachUpdateFunction(elmtId, this.menuItems, forEachItemGenFunction, undefined, true, false);
        }, ForEach);
        ForEach.pop();
        // 菜单列表
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Blank.create();
        }, Blank);
        Blank.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 底部版本信息
            Column.create();
            // 底部版本信息
            Column.width('100%');
            // 底部版本信息
            Column.padding({ bottom: 100 });
            // 底部版本信息
            Column.alignItems(HorizontalAlign.Center);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('留白阅读 v2.0');
            Text.fontSize(12);
            Text.fontColor({ "id": 16777309, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('用留白，读好书 🌿');
            Text.fontSize(11);
            Text.fontColor({ "id": 16777309, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Text.margin({ top: 4 });
        }, Text);
        Text.pop();
        // 底部版本信息
        Column.pop();
        Column.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "MinePage";
    }
}
export { MinePage };
registerNamedRoute(() => new MinePage(undefined, {}), "", { bundleName: "liubai.yuedu.hos", moduleName: "entry", pagePath: "pages/Mine", pageFullPath: "entry/src/main/ets/pages/Mine", integratedHsp: "false", moduleType: "followWithHap" });
