if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface SearchPage_Params {
    searchText?: string;
    searchResult?: BookInfo[];
}
import type { BookInfo } from '../common/BookInfo';
import { bookDataManager } from "@bundle:com.example.readerkitdemo/entry/ets/utils/BookDataManager";
import hilog from "@ohos:hilog";
const TAG: string = 'SearchPage';
class SearchPage extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__searchText = new ObservedPropertySimplePU('', this, "searchText");
        this.__searchResult = new ObservedPropertyObjectPU([], this, "searchResult");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: SearchPage_Params) {
        if (params.searchText !== undefined) {
            this.searchText = params.searchText;
        }
        if (params.searchResult !== undefined) {
            this.searchResult = params.searchResult;
        }
    }
    updateStateVars(params: SearchPage_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__searchText.purgeDependencyOnElmtId(rmElmtId);
        this.__searchResult.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__searchText.aboutToBeDeleted();
        this.__searchResult.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __searchText: ObservedPropertySimplePU<string>;
    get searchText() {
        return this.__searchText.get();
    }
    set searchText(newValue: string) {
        this.__searchText.set(newValue);
    }
    private __searchResult: ObservedPropertyObjectPU<BookInfo[]>;
    get searchResult() {
        return this.__searchResult.get();
    }
    set searchResult(newValue: BookInfo[]) {
        this.__searchResult.set(newValue);
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("entry/src/main/ets/pages/SearchPage.ets(29:5)", "entry");
            Column.width('100%');
            Column.height('100%');
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 16 });
            Row.debugLine("entry/src/main/ets/pages/SearchPage.ets(30:7)", "entry");
            Row.width('100%');
            Row.height(56);
            Row.padding({ left: 16, right: 16 });
            Row.margin({ top: 44 });
            Row.justifyContent(FlexAlign.SpaceBetween);
            Row.alignItems(VerticalAlign.Center);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TextInput.create({ placeholder: '请输入书名进行搜索', text: this.searchText });
            TextInput.debugLine("entry/src/main/ets/pages/SearchPage.ets(31:9)", "entry");
            TextInput.layoutWeight(1);
            TextInput.onChange((value: string) => {
                this.searchText = value;
                this.searchBooks();
            });
        }, TextInput);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('取消');
            Text.debugLine("entry/src/main/ets/pages/SearchPage.ets(38:9)", "entry");
            Text.fontSize(16);
            Text.fontColor({ "id": 16777241, "type": 10001, params: [], "bundleName": "com.example.readerkitdemo", "moduleName": "entry" });
            Text.onClick(() => {
                this.getUIContext().getRouter().back();
            });
        }, Text);
        Text.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            List.create();
            List.debugLine("entry/src/main/ets/pages/SearchPage.ets(52:7)", "entry");
            List.layoutWeight(1);
        }, List);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            ForEach.create();
            const forEachItemGenFunction = _item => {
                const book = _item;
                {
                    const itemCreation = (elmtId, isInitialRender) => {
                        ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                        itemCreation2(elmtId, isInitialRender);
                        if (!isInitialRender) {
                            ListItem.pop();
                        }
                        ViewStackProcessor.StopGetAccessRecording();
                    };
                    const itemCreation2 = (elmtId, isInitialRender) => {
                        ListItem.create(deepRenderFunction, true);
                        ListItem.debugLine("entry/src/main/ets/pages/SearchPage.ets(54:11)", "entry");
                    };
                    const deepRenderFunction = (elmtId, isInitialRender) => {
                        itemCreation(elmtId, isInitialRender);
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            Text.create(book.bookName);
                            Text.debugLine("entry/src/main/ets/pages/SearchPage.ets(55:13)", "entry");
                            Text.fontSize(16);
                            Text.padding(16);
                        }, Text);
                        Text.pop();
                        ListItem.pop();
                    };
                    this.observeComponentCreation2(itemCreation2, ListItem);
                    ListItem.pop();
                }
            };
            this.forEachUpdateFunction(elmtId, this.searchResult, forEachItemGenFunction);
        }, ForEach);
        ForEach.pop();
        List.pop();
        Column.pop();
    }
    async searchBooks() {
        if (this.searchText) {
            try {
                this.searchResult = await bookDataManager.queryBooksByName(this.searchText);
            }
            catch (error) {
                hilog.error(0x0000, TAG, 'searchBooks failed, error is: ' + error);
            }
        }
        else {
            this.searchResult = [];
        }
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "SearchPage";
    }
}
registerNamedRoute(() => new SearchPage(undefined, {}), "", { bundleName: "com.example.readerkitdemo", moduleName: "entry", pagePath: "pages/SearchPage", pageFullPath: "entry/src/main/ets/pages/SearchPage", integratedHsp: "false", moduleType: "followWithHap" });
