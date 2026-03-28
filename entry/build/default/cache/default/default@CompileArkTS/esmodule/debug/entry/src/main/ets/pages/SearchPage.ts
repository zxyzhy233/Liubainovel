if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface SearchPage_Params {
    searchText?: string;
    searchResult?: BookInfo[];
    onlineSearchResult?: OnlineBookInfo[];
}
import type { BookInfo } from '../common/BookInfo';
import { bookDataManager } from "@bundle:liubai.yuedu.hos/entry/ets/utils/BookDataManager";
import type { OnlineBookInfo } from '../models/OnlineBookModel';
import { onlineBookDataManager } from "@bundle:liubai.yuedu.hos/entry/ets/utils/OnlineBookDataManager";
import hilog from "@ohos:hilog";
import type common from "@ohos:app.ability.common";
const TAG: string = 'SearchPage';
class SearchPage extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__searchText = new ObservedPropertySimplePU('', this, "searchText");
        this.__searchResult = new ObservedPropertyObjectPU([], this, "searchResult");
        this.__onlineSearchResult = new ObservedPropertyObjectPU([], this, "onlineSearchResult");
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
        if (params.onlineSearchResult !== undefined) {
            this.onlineSearchResult = params.onlineSearchResult;
        }
    }
    updateStateVars(params: SearchPage_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__searchText.purgeDependencyOnElmtId(rmElmtId);
        this.__searchResult.purgeDependencyOnElmtId(rmElmtId);
        this.__onlineSearchResult.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__searchText.aboutToBeDeleted();
        this.__searchResult.aboutToBeDeleted();
        this.__onlineSearchResult.aboutToBeDeleted();
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
    private __onlineSearchResult: ObservedPropertyObjectPU<OnlineBookInfo[]>;
    get onlineSearchResult() {
        return this.__onlineSearchResult.get();
    }
    set onlineSearchResult(newValue: OnlineBookInfo[]) {
        this.__onlineSearchResult.set(newValue);
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.height('100%');
            Column.backgroundColor('#F7FAFC');
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 16 });
            Row.width('100%');
            Row.height(56);
            Row.padding({ left: 16, right: 16 });
            Row.margin({ top: 44 });
            Row.justifyContent(FlexAlign.SpaceBetween);
            Row.alignItems(VerticalAlign.Center);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TextInput.create({ placeholder: '请输入书名进行搜索', text: this.searchText });
            TextInput.layoutWeight(1);
            TextInput.onChange((value: string) => {
                this.searchText = value;
                this.searchBooks();
            });
        }, TextInput);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('取消');
            Text.fontSize(16);
            Text.fontColor({ "id": 16777272, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Text.onClick(() => {
                this.getUIContext().getRouter().back();
            });
        }, Text);
        Text.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.searchResult.length === 0 && this.onlineSearchResult.length === 0 && this.searchText) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.width('100%');
                        Column.layoutWeight(1);
                        Column.justifyContent(FlexAlign.Center);
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('📚');
                        Text.fontSize(48);
                        Text.margin({ bottom: 12 });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('未找到相关书籍');
                        Text.fontSize(14);
                        Text.fontColor('#718096');
                    }, Text);
                    Text.pop();
                    Column.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        List.create();
                        List.layoutWeight(1);
                        List.divider({
                            strokeWidth: 1,
                            color: '#F7FAFC'
                        });
                    }, List);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        If.create();
                        // 本地书籍搜索结果
                        if (this.searchResult.length > 0) {
                            this.ifElseBranchUpdateFunction(0, () => {
                                {
                                    const itemCreation = (elmtId, isInitialRender) => {
                                        ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                                        ListItem.create(deepRenderFunction, true);
                                        if (!isInitialRender) {
                                            ListItem.pop();
                                        }
                                        ViewStackProcessor.StopGetAccessRecording();
                                    };
                                    const itemCreation2 = (elmtId, isInitialRender) => {
                                        ListItem.create(deepRenderFunction, true);
                                    };
                                    const deepRenderFunction = (elmtId, isInitialRender) => {
                                        itemCreation(elmtId, isInitialRender);
                                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                                            Text.create('本地书籍');
                                            Text.fontSize(14);
                                            Text.fontColor('#718096');
                                            Text.fontWeight(FontWeight.Medium);
                                            Text.padding({ left: 16, top: 12, bottom: 8 });
                                        }, Text);
                                        Text.pop();
                                        ListItem.pop();
                                    };
                                    this.observeComponentCreation2(itemCreation2, ListItem);
                                    ListItem.pop();
                                }
                            });
                        }
                        else {
                            this.ifElseBranchUpdateFunction(1, () => {
                            });
                        }
                    }, If);
                    If.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        ForEach.create();
                        const forEachItemGenFunction = _item => {
                            const book = _item;
                            {
                                const itemCreation = (elmtId, isInitialRender) => {
                                    ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                                    ListItem.create(deepRenderFunction, true);
                                    if (!isInitialRender) {
                                        ListItem.pop();
                                    }
                                    ViewStackProcessor.StopGetAccessRecording();
                                };
                                const itemCreation2 = (elmtId, isInitialRender) => {
                                    ListItem.create(deepRenderFunction, true);
                                    ListItem.onClick(() => {
                                        // 跳转到自研阅读器
                                        this.getUIContext().getRouter().pushUrl({
                                            url: 'pages/UnifiedReaderPage',
                                            params: {
                                                source: 'local',
                                                filePath: book.filePath,
                                                bookTitle: book.bookName || ''
                                            }
                                        });
                                    });
                                };
                                const deepRenderFunction = (elmtId, isInitialRender) => {
                                    itemCreation(elmtId, isInitialRender);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Row.create();
                                        Row.width('100%');
                                        Row.padding(16);
                                        Row.backgroundColor('#FFFFFF');
                                    }, Row);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Column.create();
                                        Column.alignItems(HorizontalAlign.Start);
                                        Column.layoutWeight(1);
                                    }, Column);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(book.bookName);
                                        Text.fontSize(16);
                                        Text.fontWeight(FontWeight.Medium);
                                        Text.fontColor('#2D3748');
                                        Text.maxLines(1);
                                        Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                                    }, Text);
                                    Text.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        If.create();
                                        if (book.author) {
                                            this.ifElseBranchUpdateFunction(0, () => {
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Text.create(book.author);
                                                    Text.fontSize(12);
                                                    Text.fontColor('#A0AEC0');
                                                    Text.margin({ top: 4 });
                                                }, Text);
                                                Text.pop();
                                            });
                                        }
                                        else {
                                            this.ifElseBranchUpdateFunction(1, () => {
                                            });
                                        }
                                    }, If);
                                    If.pop();
                                    Column.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create('本地');
                                        Text.fontSize(12);
                                        Text.fontColor('#48BB78');
                                        Text.padding({ left: 8, right: 8, top: 4, bottom: 4 });
                                        Text.backgroundColor('#F0FFF4');
                                        Text.borderRadius(4);
                                    }, Text);
                                    Text.pop();
                                    Row.pop();
                                    ListItem.pop();
                                };
                                this.observeComponentCreation2(itemCreation2, ListItem);
                                ListItem.pop();
                            }
                        };
                        this.forEachUpdateFunction(elmtId, this.searchResult, forEachItemGenFunction);
                    }, ForEach);
                    ForEach.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        If.create();
                        // 在线书籍搜索结果
                        if (this.onlineSearchResult.length > 0) {
                            this.ifElseBranchUpdateFunction(0, () => {
                                {
                                    const itemCreation = (elmtId, isInitialRender) => {
                                        ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                                        ListItem.create(deepRenderFunction, true);
                                        if (!isInitialRender) {
                                            ListItem.pop();
                                        }
                                        ViewStackProcessor.StopGetAccessRecording();
                                    };
                                    const itemCreation2 = (elmtId, isInitialRender) => {
                                        ListItem.create(deepRenderFunction, true);
                                    };
                                    const deepRenderFunction = (elmtId, isInitialRender) => {
                                        itemCreation(elmtId, isInitialRender);
                                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                                            Text.create('在线书籍');
                                            Text.fontSize(14);
                                            Text.fontColor('#718096');
                                            Text.fontWeight(FontWeight.Medium);
                                            Text.padding({ left: 16, top: 16, bottom: 8 });
                                        }, Text);
                                        Text.pop();
                                        ListItem.pop();
                                    };
                                    this.observeComponentCreation2(itemCreation2, ListItem);
                                    ListItem.pop();
                                }
                            });
                        }
                        else {
                            this.ifElseBranchUpdateFunction(1, () => {
                            });
                        }
                    }, If);
                    If.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        ForEach.create();
                        const forEachItemGenFunction = _item => {
                            const book = _item;
                            {
                                const itemCreation = (elmtId, isInitialRender) => {
                                    ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                                    ListItem.create(deepRenderFunction, true);
                                    if (!isInitialRender) {
                                        ListItem.pop();
                                    }
                                    ViewStackProcessor.StopGetAccessRecording();
                                };
                                const itemCreation2 = (elmtId, isInitialRender) => {
                                    ListItem.create(deepRenderFunction, true);
                                    ListItem.onClick(() => {
                                        // 跳转到在线书籍详情页面，传递必要的参数
                                        this.getUIContext().getRouter().pushUrl({
                                            url: 'pages/BookDetailPage',
                                            params: {
                                                bookUrl: book.bookUrl,
                                                bookTitle: book.title,
                                                bookAuthor: book.author,
                                                bookCover: book.cover
                                            }
                                        });
                                    });
                                };
                                const deepRenderFunction = (elmtId, isInitialRender) => {
                                    itemCreation(elmtId, isInitialRender);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Row.create();
                                        Row.width('100%');
                                        Row.padding(16);
                                        Row.backgroundColor('#FFFFFF');
                                    }, Row);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Column.create();
                                        Column.alignItems(HorizontalAlign.Start);
                                        Column.layoutWeight(1);
                                    }, Column);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(book.title);
                                        Text.fontSize(16);
                                        Text.fontWeight(FontWeight.Medium);
                                        Text.fontColor('#2D3748');
                                        Text.maxLines(1);
                                        Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                                    }, Text);
                                    Text.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Row.create({ space: 8 });
                                        Row.margin({ top: 4 });
                                    }, Row);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        If.create();
                                        if (book.author) {
                                            this.ifElseBranchUpdateFunction(0, () => {
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Text.create(book.author);
                                                    Text.fontSize(12);
                                                    Text.fontColor('#A0AEC0');
                                                }, Text);
                                                Text.pop();
                                            });
                                        }
                                        else {
                                            this.ifElseBranchUpdateFunction(1, () => {
                                            });
                                        }
                                    }, If);
                                    If.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        If.create();
                                        if (book.currentChapter) {
                                            this.ifElseBranchUpdateFunction(0, () => {
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Text.create(`读至: ${book.currentChapter}`);
                                                    Text.fontSize(12);
                                                    Text.fontColor('#718096');
                                                }, Text);
                                                Text.pop();
                                            });
                                        }
                                        else {
                                            this.ifElseBranchUpdateFunction(1, () => {
                                            });
                                        }
                                    }, If);
                                    If.pop();
                                    Row.pop();
                                    Column.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create('在线');
                                        Text.fontSize(12);
                                        Text.fontColor('#4299E1');
                                        Text.padding({ left: 8, right: 8, top: 4, bottom: 4 });
                                        Text.backgroundColor('#EBF8FF');
                                        Text.borderRadius(4);
                                    }, Text);
                                    Text.pop();
                                    Row.pop();
                                    ListItem.pop();
                                };
                                this.observeComponentCreation2(itemCreation2, ListItem);
                                ListItem.pop();
                            }
                        };
                        this.forEachUpdateFunction(elmtId, this.onlineSearchResult, forEachItemGenFunction);
                    }, ForEach);
                    ForEach.pop();
                    List.pop();
                });
            }
        }, If);
        If.pop();
        Column.pop();
    }
    /**
     * 搜索书籍（包括本地书籍和在线书籍）
     */
    async searchBooks(): Promise<void> {
        if (this.searchText) {
            try {
                // 搜索本地书籍
                this.searchResult = await bookDataManager.queryBooksByName(this.searchText);
                // 搜索在线书籍
                await this.searchOnlineBooks();
            }
            catch (error) {
                hilog.error(0x0000, TAG, 'searchBooks failed, error is: ' + error);
            }
        }
        else {
            this.searchResult = [];
            this.onlineSearchResult = [];
        }
    }
    /**
     * 搜索在线书籍
     */
    async searchOnlineBooks(): Promise<void> {
        try {
            // 初始化在线书籍数据管理器
            const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
            await onlineBookDataManager.init(context);
            // 获取所有在线书籍
            const allOnlineBooks = await onlineBookDataManager.queryAllOnlineBooks();
            // 根据书名筛选
            const keyword = this.searchText.toLowerCase();
            this.onlineSearchResult = allOnlineBooks.filter((book: OnlineBookInfo) => {
                return book.title.toLowerCase().includes(keyword) ||
                    (book.author && book.author.toLowerCase().includes(keyword));
            });
            hilog.info(0x0000, TAG, `搜索到 ${this.onlineSearchResult.length} 本在线书籍`);
        }
        catch (error) {
            hilog.error(0x0000, TAG, 'searchOnlineBooks failed, error is: ' + error);
            this.onlineSearchResult = [];
        }
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "SearchPage";
    }
}
registerNamedRoute(() => new SearchPage(undefined, {}), "", { bundleName: "liubai.yuedu.hos", moduleName: "entry", pagePath: "pages/SearchPage", pageFullPath: "entry/src/main/ets/pages/SearchPage", integratedHsp: "false", moduleType: "followWithHap" });
