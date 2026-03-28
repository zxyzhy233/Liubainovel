if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface MainPage_Params {
    currentIndex?: number;
    tabsController?: TabsController;
    webViewController1?: webview.WebviewController;
    webViewController2?: webview.WebviewController;
    webViewController3?: webview.WebviewController;
}
import { Index } from "@bundle:liubai.yuedu.hos/entry/ets/pages/Index";
import { RecommendPage } from "@bundle:liubai.yuedu.hos/entry/ets/pages/RecommendPage";
import { MinePage } from "@bundle:liubai.yuedu.hos/entry/ets/pages/Mine";
import webview from "@ohos:web.webview";
import { webViewContentFetcher } from "@bundle:liubai.yuedu.hos/entry/ets/utils/WebViewContentFetcher";
class MainPage extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__currentIndex = new ObservedPropertySimplePU(0, this, "currentIndex");
        this.tabsController = new TabsController();
        this.webViewController1 = new webview.WebviewController();
        this.webViewController2 = new webview.WebviewController();
        this.webViewController3 = new webview.WebviewController();
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: MainPage_Params) {
        if (params.currentIndex !== undefined) {
            this.currentIndex = params.currentIndex;
        }
        if (params.tabsController !== undefined) {
            this.tabsController = params.tabsController;
        }
        if (params.webViewController1 !== undefined) {
            this.webViewController1 = params.webViewController1;
        }
        if (params.webViewController2 !== undefined) {
            this.webViewController2 = params.webViewController2;
        }
        if (params.webViewController3 !== undefined) {
            this.webViewController3 = params.webViewController3;
        }
    }
    updateStateVars(params: MainPage_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__currentIndex.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__currentIndex.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __currentIndex: ObservedPropertySimplePU<number>;
    get currentIndex() {
        return this.__currentIndex.get();
    }
    set currentIndex(newValue: number) {
        this.__currentIndex.set(newValue);
    }
    private tabsController: TabsController;
    private webViewController1: webview.WebviewController;
    private webViewController2: webview.WebviewController;
    private webViewController3: webview.WebviewController;
    aboutToAppear(): void {
        // 初始化多个WebView控制器以支持并发下载
        webViewContentFetcher.setController(this.webViewController1);
        webViewContentFetcher.addController(this.webViewController2);
        webViewContentFetcher.addController(this.webViewController3);
    }
    private buildTabItem(title: string, targetIndex: number, icon: Resource, parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.layoutWeight(1);
            Column.height('100%');
            Column.justifyContent(FlexAlign.Center);
            Column.borderRadius(26);
            Column.backgroundColor(this.currentIndex === targetIndex ? '#3D8A5A' : Color.Transparent);
            Column.onClick(() => {
                this.currentIndex = targetIndex;
                this.tabsController.changeIndex(targetIndex);
            });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create(icon);
            Image.width(18);
            Image.height(18);
            Image.fillColor(this.currentIndex === targetIndex ? '#FFFFFF' : '#A8A7A5');
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(title);
            Text.fontColor(this.currentIndex === targetIndex ? '#FFFFFF' : '#A8A7A5');
            Text.fontSize(10);
            Text.fontWeight(this.currentIndex === targetIndex ? FontWeight.Bold : FontWeight.Medium);
            Text.margin({ top: 4 });
        }, Text);
        Text.pop();
        Column.pop();
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Stack.create({ alignContent: Alignment.Bottom });
            Stack.width('100%');
            Stack.height('100%');
        }, Stack);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 主内容区域 - 使用 Tabs 但隐藏自带 bar
            Tabs.create({ barPosition: BarPosition.End, controller: this.tabsController });
            // 主内容区域 - 使用 Tabs 但隐藏自带 bar
            Tabs.onChange((index: number) => {
                this.currentIndex = index;
            });
            // 主内容区域 - 使用 Tabs 但隐藏自带 bar
            Tabs.width('100%');
            // 主内容区域 - 使用 Tabs 但隐藏自带 bar
            Tabs.height('100%');
            // 主内容区域 - 使用 Tabs 但隐藏自带 bar
            Tabs.barHeight(0);
        }, Tabs);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TabContent.create(() => {
                {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        if (isInitialRender) {
                            let componentCall = new Index(this, {}, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/MainPage.ets", line: 67, col: 11 });
                            ViewPU.create(componentCall);
                            let paramsLambda = () => {
                                return {};
                            };
                            componentCall.paramsGenerator_ = paramsLambda;
                        }
                        else {
                            this.updateStateVarsOfChildByElmtId(elmtId, {});
                        }
                    }, { name: "Index" });
                }
            });
        }, TabContent);
        TabContent.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TabContent.create(() => {
                {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        if (isInitialRender) {
                            let componentCall = new RecommendPage(this, {}, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/MainPage.ets", line: 71, col: 11 });
                            ViewPU.create(componentCall);
                            let paramsLambda = () => {
                                return {};
                            };
                            componentCall.paramsGenerator_ = paramsLambda;
                        }
                        else {
                            this.updateStateVarsOfChildByElmtId(elmtId, {});
                        }
                    }, { name: "RecommendPage" });
                }
            });
        }, TabContent);
        TabContent.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TabContent.create(() => {
                {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        if (isInitialRender) {
                            let componentCall = new MinePage(this, {}, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/MainPage.ets", line: 75, col: 11 });
                            ViewPU.create(componentCall);
                            let paramsLambda = () => {
                                return {};
                            };
                            componentCall.paramsGenerator_ = paramsLambda;
                        }
                        else {
                            this.updateStateVarsOfChildByElmtId(elmtId, {});
                        }
                    }, { name: "MinePage" });
                }
            });
        }, TabContent);
        TabContent.pop();
        // 主内容区域 - 使用 Tabs 但隐藏自带 bar
        Tabs.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 悬浮胶囊 Tab Bar — 绝对定位在底部
            Row.create();
            // 悬浮胶囊 Tab Bar — 绝对定位在底部
            Row.width('calc(100% - 42vp)');
            // 悬浮胶囊 Tab Bar — 绝对定位在底部
            Row.height(54);
            // 悬浮胶囊 Tab Bar — 绝对定位在底部
            Row.borderRadius(36);
            // 悬浮胶囊 Tab Bar — 绝对定位在底部
            Row.padding(4);
            // 悬浮胶囊 Tab Bar — 绝对定位在底部
            Row.backgroundColor('#FFFFFF');
            // 悬浮胶囊 Tab Bar — 绝对定位在底部
            Row.shadow({ radius: 12, color: '#1A191815', offsetX: 0, offsetY: -2 });
            // 悬浮胶囊 Tab Bar — 绝对定位在底部
            Row.border({ width: 1, color: '#E5E4E1' });
            // 悬浮胶囊 Tab Bar — 绝对定位在底部
            Row.position({ x: 21, y: '100%' });
            // 悬浮胶囊 Tab Bar — 绝对定位在底部
            Row.translate({ y: -82 });
        }, Row);
        this.buildTabItem.bind(this)('书架', 0, { "id": 16777325, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        this.buildTabItem.bind(this)('推荐', 1, { "id": 16777329, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        this.buildTabItem.bind(this)('我的', 2, { "id": 16777358, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        // 悬浮胶囊 Tab Bar — 绝对定位在底部
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 隐藏的WebView组件，用于获取章节内容（3个实例支持并发）
            Web.create({ src: 'about:blank', controller: this.webViewController1 });
            // 隐藏的WebView组件，用于获取章节内容（3个实例支持并发）
            Web.width(1);
            // 隐藏的WebView组件，用于获取章节内容（3个实例支持并发）
            Web.height(1);
            // 隐藏的WebView组件，用于获取章节内容（3个实例支持并发）
            Web.position({ x: -1000, y: -1000 });
            // 隐藏的WebView组件，用于获取章节内容（3个实例支持并发）
            Web.visibility(Visibility.Hidden);
        }, Web);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Web.create({ src: 'about:blank', controller: this.webViewController2 });
            Web.width(1);
            Web.height(1);
            Web.position({ x: -1100, y: -1000 });
            Web.visibility(Visibility.Hidden);
        }, Web);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Web.create({ src: 'about:blank', controller: this.webViewController3 });
            Web.width(1);
            Web.height(1);
            Web.position({ x: -1200, y: -1000 });
            Web.visibility(Visibility.Hidden);
        }, Web);
        Stack.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "MainPage";
    }
}
registerNamedRoute(() => new MainPage(undefined, {}), "", { bundleName: "liubai.yuedu.hos", moduleName: "entry", pagePath: "pages/MainPage", pageFullPath: "entry/src/main/ets/pages/MainPage", integratedHsp: "false", moduleType: "followWithHap" });
