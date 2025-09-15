if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface MinePage_Params {
    menuItems?: MenuItem[];
}
import hilog from "@ohos:hilog";
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
        this.menuItems = [
            {
                title: '书源管理',
                icon: '📚',
                action: () => {
                    this.navigateToBookSource();
                }
            },
            {
                title: '主题模式',
                icon: '🎨',
                action: () => {
                    hilog.info(0x0000, TAG, '点击主题模式');
                    // TODO: 实现主题模式功能
                }
            },
            {
                title: '备份与恢复',
                icon: '💾',
                action: () => {
                    hilog.info(0x0000, TAG, '点击备份与恢复');
                    // TODO: 实现备份与恢复功能
                }
            },
            {
                title: '捐赠',
                icon: '❤️',
                action: () => {
                    hilog.info(0x0000, TAG, '点击捐赠');
                    // TODO: 实现捐赠功能
                }
            },
            {
                title: '关于',
                icon: 'ℹ️',
                action: () => {
                    hilog.info(0x0000, TAG, '点击关于');
                    // TODO: 实现关于功能
                }
            }
        ];
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: MinePage_Params) {
        if (params.menuItems !== undefined) {
            this.menuItems = params.menuItems;
        }
    }
    updateStateVars(params: MinePage_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
    }
    aboutToBeDeleted() {
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    // 菜单项数据
    private menuItems: MenuItem[];
    /**
     * 跳转到书源管理页面
     */
    private navigateToBookSource(): void {
        try {
            this.getUIContext().getRouter().pushUrl({ url: 'pages/BookSourcePage' });
            hilog.info(0x0000, TAG, '跳转到书源管理页面');
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
            Row.debugLine("entry/src/main/ets/pages/Mine.ets(92:5)", "entry");
            Row.width('100%');
            Row.height(56);
            Row.padding({ left: 16, right: 16 });
            Row.backgroundColor(Color.White);
            Row.borderRadius(8);
            Row.shadow({
                radius: 2,
                color: '#10000000',
                offsetY: 1
            });
            Row.onClick(() => {
                item.action();
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 图标
            Text.create(item.icon);
            Text.debugLine("entry/src/main/ets/pages/Mine.ets(94:7)", "entry");
            // 图标
            Text.fontSize(24);
            // 图标
            Text.margin({ right: 16 });
        }, Text);
        // 图标
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 标题
            Text.create(item.title);
            Text.debugLine("entry/src/main/ets/pages/Mine.ets(99:7)", "entry");
            // 标题
            Text.fontSize(16);
            // 标题
            Text.fontColor('#2D3748');
            // 标题
            Text.layoutWeight(1);
        }, Text);
        // 标题
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 右箭头
            Text.create('>');
            Text.debugLine("entry/src/main/ets/pages/Mine.ets(105:7)", "entry");
            // 右箭头
            Text.fontSize(16);
            // 右箭头
            Text.fontColor('#A0AEC0');
        }, Text);
        // 右箭头
        Text.pop();
        Row.pop();
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("entry/src/main/ets/pages/Mine.ets(125:5)", "entry");
            Column.width('100%');
            Column.height('100%');
            Column.backgroundColor({ "id": 16777258, "type": 10001, params: [], "bundleName": "com.example.readerkitdemo", "moduleName": "entry" });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 顶部标题
            Row.create();
            Row.debugLine("entry/src/main/ets/pages/Mine.ets(127:7)", "entry");
            // 顶部标题
            Row.width('100%');
            // 顶部标题
            Row.height(56);
            // 顶部标题
            Row.padding({ left: 16, right: 16 });
            // 顶部标题
            Row.margin({ top: 44 });
            // 顶部标题
            Row.justifyContent(FlexAlign.Start);
            // 顶部标题
            Row.alignItems(VerticalAlign.Center);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('我的');
            Text.debugLine("entry/src/main/ets/pages/Mine.ets(128:9)", "entry");
            Text.fontSize(24);
            Text.fontWeight(FontWeight.Bold);
            Text.fontColor('#2D3748');
        }, Text);
        Text.pop();
        // 顶部标题
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 菜单列表
            Column.create({ space: 12 });
            Column.debugLine("entry/src/main/ets/pages/Mine.ets(141:7)", "entry");
            // 菜单列表
            Column.width('100%');
            // 菜单列表
            Column.padding({ left: 16, right: 16, top: 20 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            ForEach.create();
            const forEachItemGenFunction = (_item, index: number) => {
                const item = _item;
                this.buildMenuItem.bind(this)(item);
            };
            this.forEachUpdateFunction(elmtId, this.menuItems, forEachItemGenFunction, undefined, true, false);
        }, ForEach);
        ForEach.pop();
        // 菜单列表
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Blank.create();
            Blank.debugLine("entry/src/main/ets/pages/Mine.ets(149:7)", "entry");
        }, Blank);
        Blank.pop();
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
registerNamedRoute(() => new MinePage(undefined, {}), "", { bundleName: "com.example.readerkitdemo", moduleName: "entry", pagePath: "pages/Mine", pageFullPath: "entry/src/main/ets/pages/Mine", integratedHsp: "false", moduleType: "followWithHap" });
