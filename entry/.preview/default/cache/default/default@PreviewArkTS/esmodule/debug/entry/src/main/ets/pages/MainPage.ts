if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface MainPage_Params {
    currentIndex?: number;
    webViewController?: webview.WebviewController;
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
        this.webViewController = new webview.WebviewController();
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: MainPage_Params) {
        if (params.currentIndex !== undefined) {
            this.currentIndex = params.currentIndex;
        }
        if (params.webViewController !== undefined) {
            this.webViewController = params.webViewController;
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
    private webViewController: webview.WebviewController;
    aboutToAppear(): void {
        // 初始化WebView控制器
        webViewContentFetcher.setController(this.webViewController);
    }
    TabBuilder(title: string, targetIndex: number, icon: Resource, parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("entry/src/main/ets/pages/MainPage.ets(34:5)", "entry");
            Column.width('100%');
            Column.height('100%');
            Column.justifyContent(FlexAlign.Center);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create(icon);
            Image.debugLine("entry/src/main/ets/pages/MainPage.ets(35:7)", "entry");
            Image.width(24);
            Image.height(24);
            Image.fillColor(this.currentIndex === targetIndex ? '#243154' : { "id": 16777239, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(title);
            Text.debugLine("entry/src/main/ets/pages/MainPage.ets(39:7)", "entry");
            Text.fontColor(this.currentIndex === targetIndex ? '#243154' : { "id": 16777239, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Text.fontSize(12);
        }, Text);
        Text.pop();
        Column.pop();
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Stack.create();
            Stack.debugLine("entry/src/main/ets/pages/MainPage.ets(49:5)", "entry");
            Stack.width('100%');
            Stack.height('100%');
        }, Stack);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Tabs.create({ barPosition: BarPosition.End });
            Tabs.debugLine("entry/src/main/ets/pages/MainPage.ets(50:7)", "entry");
            Tabs.onChange((index: number) => {
                this.currentIndex = index;
            });
            Tabs.width('100%');
            Tabs.height('100%');
        }, Tabs);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TabContent.create(() => {
                {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        if (isInitialRender) {
                            let componentCall = new Index(this, {}, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/MainPage.ets", line: 52, col: 11 });
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
            TabContent.tabBar({ builder: () => {
                    this.TabBuilder.call(this, '书架', 0, { "id": 16777281, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                } });
            TabContent.debugLine("entry/src/main/ets/pages/MainPage.ets(51:9)", "entry");
        }, TabContent);
        TabContent.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TabContent.create(() => {
                {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        if (isInitialRender) {
                            let componentCall = new RecommendPage(this, {}, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/MainPage.ets", line: 57, col: 11 });
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
            TabContent.tabBar({ builder: () => {
                    this.TabBuilder.call(this, '推荐', 1, { "id": 16777302, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                } });
            TabContent.debugLine("entry/src/main/ets/pages/MainPage.ets(56:9)", "entry");
        }, TabContent);
        TabContent.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TabContent.create(() => {
                {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        if (isInitialRender) {
                            let componentCall = new MinePage(this, {}, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/MainPage.ets", line: 62, col: 11 });
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
            TabContent.tabBar({ builder: () => {
                    this.TabBuilder.call(this, '我的', 2, { "id": 16777283, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                } });
            TabContent.debugLine("entry/src/main/ets/pages/MainPage.ets(61:9)", "entry");
        }, TabContent);
        TabContent.pop();
        Tabs.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 隐藏的WebView组件，用于获取章节内容
            Web.create({ src: 'about:blank', controller: this.webViewController });
            Web.debugLine("entry/src/main/ets/pages/MainPage.ets(73:7)", "entry");
            // 隐藏的WebView组件，用于获取章节内容
            Web.width(1);
            // 隐藏的WebView组件，用于获取章节内容
            Web.height(1);
            // 隐藏的WebView组件，用于获取章节内容
            Web.position({ x: -1000, y: -1000 });
            // 隐藏的WebView组件，用于获取章节内容
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
