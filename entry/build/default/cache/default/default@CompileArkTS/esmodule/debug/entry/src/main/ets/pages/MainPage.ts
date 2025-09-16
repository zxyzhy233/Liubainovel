if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface MainPage_Params {
    currentIndex?: number;
}
import { Index } from "@bundle:liubai.yuedu.hos/entry/ets/pages/Index";
import { MinePage } from "@bundle:liubai.yuedu.hos/entry/ets/pages/Mine";
import { RecommendPage } from "@bundle:liubai.yuedu.hos/entry/ets/pages/RecommendPage";
class MainPage extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__currentIndex = new ObservedPropertySimplePU(0, this, "currentIndex");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: MainPage_Params) {
        if (params.currentIndex !== undefined) {
            this.currentIndex = params.currentIndex;
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
    TabBuilder(title: string, targetIndex: number, icon: Resource, parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.height('100%');
            Column.justifyContent(FlexAlign.Center);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create(icon);
            Image.width(24);
            Image.height(24);
            Image.fillColor(this.currentIndex === targetIndex ? '#243154' : { "id": 16777237, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(title);
            Text.fontColor(this.currentIndex === targetIndex ? '#243154' : { "id": 16777237, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Text.fontSize(12);
        }, Text);
        Text.pop();
        Column.pop();
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Tabs.create({ barPosition: BarPosition.End });
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
                            let componentCall = new Index(this, {}, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/MainPage.ets", line: 43, col: 9 });
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
                    this.TabBuilder.call(this, '书架', 0, { "id": 16777272, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                } });
        }, TabContent);
        TabContent.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TabContent.create(() => {
                {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        if (isInitialRender) {
                            let componentCall = new RecommendPage(this, {}, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/MainPage.ets", line: 48, col: 9 });
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
                    this.TabBuilder.call(this, '推荐', 1, { "id": 16777276, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                } });
        }, TabContent);
        TabContent.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TabContent.create(() => {
                {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        if (isInitialRender) {
                            let componentCall = new MinePage(this, {}, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/MainPage.ets", line: 53, col: 9 });
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
                    this.TabBuilder.call(this, '我的', 2, { "id": 16777294, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                } });
        }, TabContent);
        TabContent.pop();
        Tabs.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "MainPage";
    }
}
registerNamedRoute(() => new MainPage(undefined, {}), "", { bundleName: "liubai.yuedu.hos", moduleName: "entry", pagePath: "pages/MainPage", pageFullPath: "entry/src/main/ets/pages/MainPage", integratedHsp: "false", moduleType: "followWithHap" });
