if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface Index_Params {
    isShow?: boolean;
    books?: BookInfo[];
    searchText?: string;
    isEditMode?: boolean;
    selectedBooks?: number[];
    isGridView?: boolean;
    searchKeyword?: string;
    showSearchSheet?: boolean;
    onlineSearchResults?: NovelInfo[];
    isSearching?: boolean;
    searchErrorMessage?: string;
    showSearchResults?: boolean;
    isDensityChange?: boolean;
}
import picker from "@ohos:file.picker";
import { WindowAbility } from "@bundle:com.example.readerkitdemo/entry/ets/entryability/WindowAbility";
import { LocalBookImporter } from "@bundle:com.example.readerkitdemo/entry/ets/common/LocalBookImporter";
import { bookParser as bookParser } from "@hms:core.readerservice.bookParser";
import hilog from "@ohos:hilog";
import { BookUtils } from "@bundle:com.example.readerkitdemo/entry/ets/utils/BookUtils";
import type common from "@ohos:app.ability.common";
import { bookDataManager } from "@bundle:com.example.readerkitdemo/entry/ets/utils/BookDataManager";
import { BookInfo } from "@bundle:com.example.readerkitdemo/entry/ets/common/BookInfo";
import router from "@ohos:router";
import { bookSourceManager } from "@bundle:com.example.readerkitdemo/entry/ets/managers/BookSourceManager";
import type { NovelInfo } from '../models/BookSourceModel';
const TAG: string = 'IndexPage';
class Index extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__isShow = new ObservedPropertySimplePU(false, this, "isShow");
        this.__books = new ObservedPropertyObjectPU([], this, "books");
        this.__searchText = new ObservedPropertySimplePU('', this, "searchText");
        this.__isEditMode = new ObservedPropertySimplePU(false, this, "isEditMode");
        this.__selectedBooks = new ObservedPropertyObjectPU([], this, "selectedBooks");
        this.__isGridView = new ObservedPropertySimplePU(true, this, "isGridView");
        this.__searchKeyword = new ObservedPropertySimplePU('', this, "searchKeyword");
        this.__showSearchSheet = new ObservedPropertySimplePU(false, this, "showSearchSheet");
        this.__onlineSearchResults = new ObservedPropertyObjectPU([], this, "onlineSearchResults");
        this.__isSearching = new ObservedPropertySimplePU(false, this, "isSearching");
        this.__searchErrorMessage = new ObservedPropertySimplePU('', this, "searchErrorMessage");
        this.__showSearchResults = new ObservedPropertySimplePU(false, this, "showSearchResults");
        this.__isDensityChange = this.createStorageLink('isDensityChange', false, "isDensityChange");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: Index_Params) {
        if (params.isShow !== undefined) {
            this.isShow = params.isShow;
        }
        if (params.books !== undefined) {
            this.books = params.books;
        }
        if (params.searchText !== undefined) {
            this.searchText = params.searchText;
        }
        if (params.isEditMode !== undefined) {
            this.isEditMode = params.isEditMode;
        }
        if (params.selectedBooks !== undefined) {
            this.selectedBooks = params.selectedBooks;
        }
        if (params.isGridView !== undefined) {
            this.isGridView = params.isGridView;
        }
        if (params.searchKeyword !== undefined) {
            this.searchKeyword = params.searchKeyword;
        }
        if (params.showSearchSheet !== undefined) {
            this.showSearchSheet = params.showSearchSheet;
        }
        if (params.onlineSearchResults !== undefined) {
            this.onlineSearchResults = params.onlineSearchResults;
        }
        if (params.isSearching !== undefined) {
            this.isSearching = params.isSearching;
        }
        if (params.searchErrorMessage !== undefined) {
            this.searchErrorMessage = params.searchErrorMessage;
        }
        if (params.showSearchResults !== undefined) {
            this.showSearchResults = params.showSearchResults;
        }
    }
    updateStateVars(params: Index_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__isShow.purgeDependencyOnElmtId(rmElmtId);
        this.__books.purgeDependencyOnElmtId(rmElmtId);
        this.__searchText.purgeDependencyOnElmtId(rmElmtId);
        this.__isEditMode.purgeDependencyOnElmtId(rmElmtId);
        this.__selectedBooks.purgeDependencyOnElmtId(rmElmtId);
        this.__isGridView.purgeDependencyOnElmtId(rmElmtId);
        this.__searchKeyword.purgeDependencyOnElmtId(rmElmtId);
        this.__showSearchSheet.purgeDependencyOnElmtId(rmElmtId);
        this.__onlineSearchResults.purgeDependencyOnElmtId(rmElmtId);
        this.__isSearching.purgeDependencyOnElmtId(rmElmtId);
        this.__searchErrorMessage.purgeDependencyOnElmtId(rmElmtId);
        this.__showSearchResults.purgeDependencyOnElmtId(rmElmtId);
        this.__isDensityChange.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__isShow.aboutToBeDeleted();
        this.__books.aboutToBeDeleted();
        this.__searchText.aboutToBeDeleted();
        this.__isEditMode.aboutToBeDeleted();
        this.__selectedBooks.aboutToBeDeleted();
        this.__isGridView.aboutToBeDeleted();
        this.__searchKeyword.aboutToBeDeleted();
        this.__showSearchSheet.aboutToBeDeleted();
        this.__onlineSearchResults.aboutToBeDeleted();
        this.__isSearching.aboutToBeDeleted();
        this.__searchErrorMessage.aboutToBeDeleted();
        this.__showSearchResults.aboutToBeDeleted();
        this.__isDensityChange.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __isShow: ObservedPropertySimplePU<boolean>;
    get isShow() {
        return this.__isShow.get();
    }
    set isShow(newValue: boolean) {
        this.__isShow.set(newValue);
    }
    private __books: ObservedPropertyObjectPU<BookInfo[]>;
    get books() {
        return this.__books.get();
    }
    set books(newValue: BookInfo[]) {
        this.__books.set(newValue);
    }
    private __searchText: ObservedPropertySimplePU<string>;
    get searchText() {
        return this.__searchText.get();
    }
    set searchText(newValue: string) {
        this.__searchText.set(newValue);
    }
    private __isEditMode: ObservedPropertySimplePU<boolean>;
    get isEditMode() {
        return this.__isEditMode.get();
    }
    set isEditMode(newValue: boolean) {
        this.__isEditMode.set(newValue);
    }
    private __selectedBooks: ObservedPropertyObjectPU<number[]>;
    get selectedBooks() {
        return this.__selectedBooks.get();
    }
    set selectedBooks(newValue: number[]) {
        this.__selectedBooks.set(newValue);
    }
    private __isGridView: ObservedPropertySimplePU<boolean>;
    get isGridView() {
        return this.__isGridView.get();
    }
    set isGridView(newValue: boolean) {
        this.__isGridView.set(newValue);
    }
    // 在线搜索相关状态
    private __searchKeyword: ObservedPropertySimplePU<string>; // 搜索关键词
    get searchKeyword() {
        return this.__searchKeyword.get();
    }
    set searchKeyword(newValue: string) {
        this.__searchKeyword.set(newValue);
    }
    private __showSearchSheet: ObservedPropertySimplePU<boolean>; // 搜索弹窗显示状态
    get showSearchSheet() {
        return this.__showSearchSheet.get();
    }
    set showSearchSheet(newValue: boolean) {
        this.__showSearchSheet.set(newValue);
    }
    private __onlineSearchResults: ObservedPropertyObjectPU<NovelInfo[]>; // 在线搜索结果
    get onlineSearchResults() {
        return this.__onlineSearchResults.get();
    }
    set onlineSearchResults(newValue: NovelInfo[]) {
        this.__onlineSearchResults.set(newValue);
    }
    private __isSearching: ObservedPropertySimplePU<boolean>; // 搜索加载状态
    get isSearching() {
        return this.__isSearching.get();
    }
    set isSearching(newValue: boolean) {
        this.__isSearching.set(newValue);
    }
    private __searchErrorMessage: ObservedPropertySimplePU<string>; // 搜索错误信息
    get searchErrorMessage() {
        return this.__searchErrorMessage.get();
    }
    set searchErrorMessage(newValue: string) {
        this.__searchErrorMessage.set(newValue);
    }
    private __showSearchResults: ObservedPropertySimplePU<boolean>; // 显示搜索结果页面
    get showSearchResults() {
        return this.__showSearchResults.get();
    }
    set showSearchResults(newValue: boolean) {
        this.__showSearchResults.set(newValue);
    }
    /**
     * System font scaled density is changed? If it has changed, the reader needs to be restarted.
     */
    private __isDensityChange: ObservedPropertyAbstractPU<boolean>;
    get isDensityChange() {
        return this.__isDensityChange.get();
    }
    set isDensityChange(newValue: boolean) {
        this.__isDensityChange.set(newValue);
    }
    async aboutToAppear() {
        hilog.info(0x0000, TAG, 'aboutToAppear');
        WindowAbility.getInstance().toggleWindowSystemBar(['status', 'navigation'], this.getUIContext().getHostContext());
        await bookDataManager.init(this.getUIContext().getHostContext() as common.UIAbilityContext);
        this.loadBooksFromDB();
    }
    async loadBooksFromDB() {
        this.books = await bookDataManager.queryAllBooks();
    }
    onPageShow(): void {
        this.loadBooksFromDB(); // Refresh bookshelf data when returning to the page
        WindowAbility.getInstance().toggleWindowSystemBar(['status', 'navigation'], this.getUIContext().getHostContext());
        if (this.isDensityChange) {
            // Restart the reader page
            if (this.books.length > 0) {
                this.jumper(this.books[0]);
            }
            AppStorage.setOrCreate('isDensityChange', false);
        }
    }
    private async loadBook() {
        try {
            // Initialize file selector
            let documentSelectOptions = new picker.DocumentSelectOptions();
            // Set file type selection
            documentSelectOptions.fileSuffixFilters = ['.epub', '.txt', '.mobi', '.azw', '.azw3'];
            let documentPicker = new picker.DocumentViewPicker();
            let documentSelectResult = await documentPicker.select(documentSelectOptions);
            if (!documentSelectResult || documentSelectResult.length <= 0) {
                hilog.error(0x0000, TAG, 'loadBook failed');
                return;
            }
            // get book file path
            let srcFile: string = decodeURI(documentSelectResult[0]);
            hilog.info(0x0000, TAG, 'loadBook decodeURI succeeded. ' + srcFile);
            let importer = new LocalBookImporter();
            let context = this.getUIContext().getHostContext() as common.UIAbilityContext;
            let bookParserInfo = await importer.importLocalBookToCache(srcFile, BookUtils.getBookFileLocalBookPath(context.filesDir));
            const newBook = new BookInfo();
            newBook.filePath = bookParserInfo.getFilePath();
            newBook.bookName = bookParserInfo.getBookName();
            try {
                let defaultHandler = await bookParser.getDefaultHandler(newBook.filePath);
                let bookInfo = defaultHandler.getBookInfo();
                newBook.author = bookInfo?.bookCreator || '未知';
            }
            catch (e) {
                hilog.error(0x0000, TAG, 'get book author failed', e);
            }
            newBook.coverPath = ''; // Temporarily empty
            newBook.lastReadTime = new Date().getTime();
            await bookDataManager.insertBook(newBook);
            await this.loadBooksFromDB(); // Refresh the bookshelf
            hilog.info(0x0000, TAG, 'loadBook bookParserInfo parse succeeded,dest path is: ' + newBook.filePath);
            this.getUIContext()
                .getPromptAction()
                .showToast({ message: { "id": 16777227, "type": 10003, params: [], "bundleName": "com.example.readerkitdemo", "moduleName": "entry" }, duration: 2000 });
        }
        catch (err) {
            hilog.error(0x0000, TAG, 'loadBook failed, error is: ' + err);
        }
    }
    /**
     * 构建搜索弹窗
     */
    private buildSearchSheet(parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.padding(20);
            Column.backgroundColor(Color.White);
            Column.borderRadius({ topLeft: 16, topRight: 16 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 弹窗标题
            Row.create();
            // 弹窗标题
            Row.width('100%');
            // 弹窗标题
            Row.margin({ bottom: 20 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('搜索小说');
            Text.fontSize(18);
            Text.fontWeight(FontWeight.Medium);
            Text.fontColor('#2D3748');
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Blank.create();
        }, Blank);
        Blank.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('×');
            Button.fontSize(20);
            Button.fontColor('#718096');
            Button.backgroundColor(Color.Transparent);
            Button.onClick(() => {
                this.showSearchSheet = false;
            });
        }, Button);
        Button.pop();
        // 弹窗标题
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 搜索输入框
            TextInput.create({ placeholder: '请输入书名、作者或主角名', text: { value: this.searchKeyword, changeEvent: newValue => { this.searchKeyword = newValue; } } });
            // 搜索输入框
            TextInput.fontSize(16);
            // 搜索输入框
            TextInput.backgroundColor('#F7FAFC');
            // 搜索输入框
            TextInput.borderRadius(8);
            // 搜索输入框
            TextInput.padding({ left: 12, right: 12, top: 12, bottom: 12 });
            // 搜索输入框
            TextInput.margin({ bottom: 20 });
            // 搜索输入框
            TextInput.onSubmit(() => {
                this.performOnlineSearch();
            });
        }, TextInput);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 搜索按钮
            Button.createWithLabel('搜索');
            // 搜索按钮
            Button.fontSize(16);
            // 搜索按钮
            Button.fontColor(Color.White);
            // 搜索按钮
            Button.backgroundColor('#E53E3E');
            // 搜索按钮
            Button.borderRadius(8);
            // 搜索按钮
            Button.width('100%');
            // 搜索按钮
            Button.height(44);
            // 搜索按钮
            Button.onClick(() => {
                this.performOnlineSearch();
            });
        }, Button);
        // 搜索按钮
        Button.pop();
        Column.pop();
    }
    /**
     * 构建搜索结果页面
     */
    private buildSearchResultsPage(parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.height('100%');
            Column.backgroundColor('#F7FAFC');
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 搜索结果页面标题栏
            Row.create();
            // 搜索结果页面标题栏
            Row.width('100%');
            // 搜索结果页面标题栏
            Row.height(56);
            // 搜索结果页面标题栏
            Row.padding({ left: 16, right: 16 });
            // 搜索结果页面标题栏
            Row.margin({ top: 44 });
            // 搜索结果页面标题栏
            Row.backgroundColor(Color.White);
            // 搜索结果页面标题栏
            Row.shadow({
                radius: 2,
                color: '#10000000',
                offsetY: 1
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithChild();
            Button.width(40);
            Button.height(40);
            Button.backgroundColor(Color.Transparent);
            Button.onClick(() => {
                this.backToBookshelf();
            });
        }, Button);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('‹');
            Text.fontSize(24);
            Text.fontColor('#2D3748');
            Text.fontWeight(FontWeight.Bold);
        }, Text);
        Text.pop();
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(`搜索结果: ${this.searchKeyword}`);
            Text.fontSize(18);
            Text.fontWeight(FontWeight.Medium);
            Text.fontColor('#2D3748');
            Text.layoutWeight(1);
            Text.textAlign(TextAlign.Center);
            Text.maxLines(1);
            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel();
            Button.width(40);
            Button.height(40);
            Button.backgroundColor(Color.Transparent);
        }, Button);
        Button.pop();
        // 搜索结果页面标题栏
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            // 搜索结果内容
            if (this.isSearching) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 搜索中状态
                        Column.create();
                        // 搜索中状态
                        Column.width('100%');
                        // 搜索中状态
                        Column.layoutWeight(1);
                        // 搜索中状态
                        Column.justifyContent(FlexAlign.Center);
                        // 搜索中状态
                        Column.backgroundColor('#F7FAFC');
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Progress.create({ type: ProgressType.Ring, value: 0 });
                        Progress.width(40);
                        Progress.height(40);
                        Progress.color('#E53E3E');
                    }, Progress);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('正在搜索小说...');
                        Text.fontSize(14);
                        Text.fontColor('#718096');
                        Text.margin({ top: 12 });
                    }, Text);
                    Text.pop();
                    // 搜索中状态
                    Column.pop();
                });
            }
            else if (this.searchErrorMessage) {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 搜索错误状态
                        Column.create();
                        // 搜索错误状态
                        Column.width('100%');
                        // 搜索错误状态
                        Column.layoutWeight(1);
                        // 搜索错误状态
                        Column.justifyContent(FlexAlign.Center);
                        // 搜索错误状态
                        Column.backgroundColor('#F7FAFC');
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('😔');
                        Text.fontSize(48);
                        Text.margin({ bottom: 12 });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(this.searchErrorMessage);
                        Text.fontSize(14);
                        Text.fontColor('#E53E3E');
                        Text.margin({ bottom: 16 });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithLabel('重新搜索');
                        Button.fontSize(14);
                        Button.fontColor(Color.White);
                        Button.backgroundColor('#E53E3E');
                        Button.borderRadius(20);
                        Button.padding({ left: 20, right: 20, top: 8, bottom: 8 });
                        Button.onClick(() => {
                            this.performOnlineSearch();
                        });
                    }, Button);
                    Button.pop();
                    // 搜索错误状态
                    Column.pop();
                });
            }
            else if (this.onlineSearchResults.length === 0) {
                this.ifElseBranchUpdateFunction(2, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 无搜索结果状态
                        Column.create();
                        // 无搜索结果状态
                        Column.width('100%');
                        // 无搜索结果状态
                        Column.layoutWeight(1);
                        // 无搜索结果状态
                        Column.justifyContent(FlexAlign.Center);
                        // 无搜索结果状态
                        Column.backgroundColor('#F7FAFC');
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('📚');
                        Text.fontSize(48);
                        Text.margin({ bottom: 12 });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('未找到相关小说');
                        Text.fontSize(14);
                        Text.fontColor('#718096');
                        Text.margin({ bottom: 16 });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithLabel('重新搜索');
                        Button.fontSize(14);
                        Button.fontColor('#3182CE');
                        Button.backgroundColor('#EBF8FF');
                        Button.borderRadius(20);
                        Button.padding({ left: 20, right: 20, top: 8, bottom: 8 });
                        Button.onClick(() => {
                            this.showSearchSheet = true;
                        });
                    }, Button);
                    Button.pop();
                    // 无搜索结果状态
                    Column.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(3, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 搜索结果列表
                        Scroll.create();
                        // 搜索结果列表
                        Scroll.layoutWeight(1);
                        // 搜索结果列表
                        Scroll.scrollBar(BarState.Off);
                        // 搜索结果列表
                        Scroll.backgroundColor('#F7FAFC');
                    }, Scroll);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 结果统计
                        Text.create(`找到 ${this.onlineSearchResults.length} 本相关小说`);
                        // 结果统计
                        Text.fontSize(14);
                        // 结果统计
                        Text.fontColor('#718096');
                        // 结果统计
                        Text.width('100%');
                        // 结果统计
                        Text.textAlign(TextAlign.Center);
                        // 结果统计
                        Text.margin({ top: 16, bottom: 16 });
                    }, Text);
                    // 结果统计
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 小说列表
                        ForEach.create();
                        const forEachItemGenFunction = (_item, index: number) => {
                            const novel = _item;
                            this.buildNovelCard.bind(this)(novel);
                        };
                        this.forEachUpdateFunction(elmtId, this.onlineSearchResults, forEachItemGenFunction, undefined, true, false);
                    }, ForEach);
                    // 小说列表
                    ForEach.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 底部提示
                        Text.create('已显示全部搜索结果');
                        // 底部提示
                        Text.fontSize(12);
                        // 底部提示
                        Text.fontColor('#A0AEC0');
                        // 底部提示
                        Text.margin({ top: 20, bottom: 20 });
                    }, Text);
                    // 底部提示
                    Text.pop();
                    Column.pop();
                    // 搜索结果列表
                    Scroll.pop();
                });
            }
        }, If);
        If.pop();
        Column.pop();
    }
    /**
     * 构建小说卡片
     */
    private buildNovelCard(novel: NovelInfo, parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
            Row.padding(12);
            Row.backgroundColor(Color.White);
            Row.borderRadius(8);
            Row.margin({ left: 16, right: 16, bottom: 12 });
            Row.shadow({
                radius: 2,
                color: '#10000000',
                offsetY: 1
            });
            Row.onClick(() => {
                this.openNovelDetail(novel);
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 小说封面
            Image.create(novel.cover);
            // 小说封面
            Image.width(60);
            // 小说封面
            Image.height(80);
            // 小说封面
            Image.objectFit(ImageFit.Cover);
            // 小说封面
            Image.borderRadius(6);
            // 小说封面
            Image.shadow({
                radius: 4,
                color: '#20000000',
                offsetY: 2
            });
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 小说信息
            Column.create();
            // 小说信息
            Column.layoutWeight(1);
            // 小说信息
            Column.margin({ left: 12 });
            // 小说信息
            Column.alignItems(HorizontalAlign.Start);
            // 小说信息
            Column.justifyContent(FlexAlign.SpaceBetween);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 标题
            Text.create(novel.title);
            // 标题
            Text.fontSize(16);
            // 标题
            Text.fontWeight(FontWeight.Medium);
            // 标题
            Text.fontColor('#2D3748');
            // 标题
            Text.maxLines(1);
            // 标题
            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
            // 标题
            Text.width('100%');
            // 标题
            Text.textAlign(TextAlign.Start);
        }, Text);
        // 标题
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 作者信息
            Text.create(novel.author);
            // 作者信息
            Text.fontSize(12);
            // 作者信息
            Text.fontColor('#718096');
            // 作者信息
            Text.margin({ top: 4, bottom: 6 });
            // 作者信息
            Text.width('100%');
            // 作者信息
            Text.textAlign(TextAlign.Start);
        }, Text);
        // 作者信息
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 简介
            Text.create(novel.description);
            // 简介
            Text.fontSize(13);
            // 简介
            Text.fontColor('#4A5568');
            // 简介
            Text.maxLines(2);
            // 简介
            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
            // 简介
            Text.lineHeight(18);
            // 简介
            Text.width('100%');
            // 简介
            Text.textAlign(TextAlign.Start);
        }, Text);
        // 简介
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 热度和分类
            Row.create();
            // 热度和分类
            Row.margin({ top: 6 });
            // 热度和分类
            Row.width('100%');
            // 热度和分类
            Row.justifyContent(FlexAlign.Start);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(novel.hotValue || '热度未知');
            Text.fontSize(11);
            Text.fontColor('#E53E3E');
            Text.backgroundColor('#FED7D7');
            Text.padding({ left: 6, right: 6, top: 2, bottom: 2 });
            Text.borderRadius(10);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (novel.category) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(novel.category);
                        Text.fontSize(11);
                        Text.fontColor('#3182CE');
                        Text.backgroundColor('#BEE3F8');
                        Text.padding({ left: 6, right: 6, top: 2, bottom: 2 });
                        Text.borderRadius(10);
                        Text.margin({ left: 8 });
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
        // 热度和分类
        Row.pop();
        // 小说信息
        Column.pop();
        Row.pop();
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            // 如果显示搜索结果页面，则显示搜索结果
            if (this.showSearchResults) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.buildSearchResultsPage.bind(this)();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 否则显示书架页面
                        Column.create();
                        // 否则显示书架页面
                        Column.height('100%');
                        // 否则显示书架页面
                        Column.width('100%');
                        // 否则显示书架页面
                        Column.backgroundColor({ "id": 16777258, "type": 10001, params: [], "bundleName": "com.example.readerkitdemo", "moduleName": "entry" });
                        // 否则显示书架页面
                        Column.padding({ left: 16, right: 16 });
                        // 否则显示书架页面
                        Column.bindSheet({ value: this.showSearchSheet, changeEvent: newValue => { this.showSearchSheet = newValue; } }, { builder: () => {
                                this.buildSearchSheet.call(this);
                            } }, {
                            height: 300,
                            dragBar: true,
                            backgroundColor: Color.White,
                            onAppear: () => {
                                hilog.info(0x0000, TAG, '搜索弹窗出现');
                            },
                            onDisappear: () => {
                                hilog.info(0x0000, TAG, '搜索弹窗消失');
                            }
                        });
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create();
                        Row.width('100%');
                        Row.height(56);
                        Row.padding({ left: 16, right: 16 });
                        Row.margin({ top: 44 });
                        Row.justifyContent(FlexAlign.End);
                        Row.alignItems(VerticalAlign.Center);
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create({ space: 16 });
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Image.create({ "id": 16777290, "type": 20000, params: [], "bundleName": "com.example.readerkitdemo", "moduleName": "entry" });
                        Image.width(32);
                        Image.height(32);
                        Image.onClick(() => {
                            this.getUIContext().getRouter().pushUrl({ url: 'pages/SearchPage' });
                        });
                    }, Image);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Image.create({ "id": 16777298, "type": 20000, params: [], "bundleName": "com.example.readerkitdemo", "moduleName": "entry" });
                        Image.width(32);
                        Image.height(32);
                        Image.onClick(() => {
                            this.isShow = !this.isShow;
                        });
                        Image.bindPopup(this.isShow, {
                            builder: { builder: () => {
                                    this.popupWithButtonBuilder.call(this);
                                } },
                            placement: Placement.Bottom,
                            onStateChange: (e) => {
                                if (!e.isVisible) {
                                    this.isShow = false;
                                }
                            }
                        });
                    }, Image);
                    Row.pop();
                    Row.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        If.create();
                        if (this.isEditMode) {
                            this.ifElseBranchUpdateFunction(0, () => {
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    Row.create();
                                    Row.width('100%');
                                    Row.height(56);
                                    Row.padding({ left: 16, right: 16 });
                                    Row.justifyContent(FlexAlign.SpaceBetween);
                                }, Row);
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    Text.create('删除');
                                    Text.fontColor(Color.Red);
                                    Text.onClick(async () => {
                                        await bookDataManager.deleteBooksByIds(ObservedObject.GetRawObject(this.selectedBooks));
                                        this.selectedBooks = [];
                                        this.isEditMode = false;
                                        await this.loadBooksFromDB();
                                    });
                                }, Text);
                                Text.pop();
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    Blank.create();
                                }, Blank);
                                Blank.pop();
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    Text.create('取消');
                                    Text.onClick(() => {
                                        this.selectedBooks = [];
                                        this.isEditMode = false;
                                    });
                                }, Text);
                                Text.pop();
                                Row.pop();
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
                        if (this.isGridView) {
                            this.ifElseBranchUpdateFunction(0, () => {
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    Grid.create();
                                    Grid.columnsTemplate('1fr 1fr 1fr');
                                    Grid.columnsGap(16);
                                    Grid.rowsGap(16);
                                    Grid.layoutWeight(1);
                                    Grid.padding({ top: 20 });
                                }, Grid);
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    ForEach.create();
                                    const forEachItemGenFunction = _item => {
                                        const book = _item;
                                        {
                                            const itemCreation2 = (elmtId, isInitialRender) => {
                                                GridItem.create(() => { }, false);
                                            };
                                            const observedDeepRender = () => {
                                                this.observeComponentCreation2(itemCreation2, GridItem);
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Column.create({ space: 8 });
                                                    Column.padding(8);
                                                    Column.onClick(() => {
                                                        if (this.isEditMode) {
                                                            const index = this.selectedBooks.indexOf(book.id);
                                                            if (index > -1) {
                                                                this.selectedBooks.splice(index, 1);
                                                            }
                                                            else {
                                                                this.selectedBooks.push(book.id);
                                                            }
                                                        }
                                                        else {
                                                            this.jumper(book);
                                                        }
                                                    });
                                                }, Column);
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Stack.create({ alignContent: Alignment.TopEnd });
                                                }, Stack);
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Image.create(book.coverPath || { "id": 16777299, "type": 20000, params: [], "bundleName": "com.example.readerkitdemo", "moduleName": "entry" });
                                                    Image.width('100%');
                                                    Image.aspectRatio(0.75);
                                                    Image.borderRadius(8);
                                                    Image.backgroundColor({ "id": 16777236, "type": 10001, params: [], "bundleName": "com.example.readerkitdemo", "moduleName": "entry" });
                                                }, Image);
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    If.create();
                                                    if (this.isEditMode) {
                                                        this.ifElseBranchUpdateFunction(0, () => {
                                                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                                Image.create(this.selectedBooks.includes(book.id) ? { "id": 16777262, "type": 20000, params: [], "bundleName": "com.example.readerkitdemo", "moduleName": "entry" } : { "id": 16777263, "type": 20000, params: [], "bundleName": "com.example.readerkitdemo", "moduleName": "entry" });
                                                                Image.width(24);
                                                                Image.height(24);
                                                                Image.margin({ top: 4, right: 4 });
                                                            }, Image);
                                                        });
                                                    }
                                                    else {
                                                        this.ifElseBranchUpdateFunction(1, () => {
                                                        });
                                                    }
                                                }, If);
                                                If.pop();
                                                Stack.pop();
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Text.create(book.bookName);
                                                    Text.fontSize(14);
                                                    Text.maxLines(2);
                                                    Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                                                }, Text);
                                                Text.pop();
                                                Column.pop();
                                                GridItem.pop();
                                            };
                                            observedDeepRender();
                                        }
                                    };
                                    this.forEachUpdateFunction(elmtId, this.books, forEachItemGenFunction);
                                }, ForEach);
                                ForEach.pop();
                                Grid.pop();
                            });
                        }
                        else {
                            this.ifElseBranchUpdateFunction(1, () => {
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    // List布局
                                    List.create({ space: 12 });
                                    // List布局
                                    List.layoutWeight(1);
                                    // List布局
                                    List.padding({ top: 20 });
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
                                            };
                                            const deepRenderFunction = (elmtId, isInitialRender) => {
                                                itemCreation(elmtId, isInitialRender);
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Row.create({ space: 12 });
                                                    Row.padding({ top: 8, bottom: 8 });
                                                    Row.onClick(() => {
                                                        this.jumper(book);
                                                    });
                                                }, Row);
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Image.create(book.coverPath || { "id": 16777299, "type": 20000, params: [], "bundleName": "com.example.readerkitdemo", "moduleName": "entry" });
                                                    Image.width(60);
                                                    Image.aspectRatio(0.75);
                                                    Image.borderRadius(4);
                                                    Image.backgroundColor({ "id": 16777236, "type": 10001, params: [], "bundleName": "com.example.readerkitdemo", "moduleName": "entry" });
                                                }, Image);
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Column.create({ space: 4 });
                                                    Column.alignItems(HorizontalAlign.Start);
                                                    Column.layoutWeight(1);
                                                }, Column);
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Text.create(book.bookName);
                                                    Text.fontSize(16);
                                                    Text.fontWeight(FontWeight.Bold);
                                                    Text.maxLines(1);
                                                    Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                                                }, Text);
                                                Text.pop();
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Text.create(book.author || '未知');
                                                    Text.fontSize(14);
                                                    Text.fontColor({ "id": 16777237, "type": 10001, params: [], "bundleName": "com.example.readerkitdemo", "moduleName": "entry" });
                                                    Text.maxLines(1);
                                                    Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                                                }, Text);
                                                Text.pop();
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Text.create(`已读: ${book.progress}`);
                                                    Text.fontSize(12);
                                                    Text.fontColor({ "id": 16777237, "type": 10001, params: [], "bundleName": "com.example.readerkitdemo", "moduleName": "entry" });
                                                }, Text);
                                                Text.pop();
                                                Column.pop();
                                                Row.pop();
                                                ListItem.pop();
                                            };
                                            this.observeComponentCreation2(itemCreation2, ListItem);
                                            ListItem.pop();
                                        }
                                    };
                                    this.forEachUpdateFunction(elmtId, this.books, forEachItemGenFunction);
                                }, ForEach);
                                ForEach.pop();
                                // List布局
                                List.pop();
                            });
                        }
                    }, If);
                    If.pop();
                    // 否则显示书架页面
                    Column.pop();
                });
            }
        }, If);
        If.pop();
    }
    popupWithButtonBuilder(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width(160);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 16 });
            Row.height(50);
            Row.width('100%');
            Row.onClick(() => {
                this.isShow = false;
                this.showSearchSheet = true;
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777290, "type": 20000, params: [], "bundleName": "com.example.readerkitdemo", "moduleName": "entry" });
            Image.width(20);
            Image.height(20);
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('在线搜索');
            Text.fontSize(18);
        }, Text);
        Text.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 16 });
            Row.height(50);
            Row.width('100%');
            Row.onClick(() => {
                this.isGridView = !this.isGridView;
                this.isShow = false;
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777277, "type": 20000, params: [], "bundleName": "com.example.readerkitdemo", "moduleName": "entry" });
            Image.width(20);
            Image.height(20);
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('切换显示模式');
            Text.fontSize(18);
        }, Text);
        Text.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 16 });
            Row.height(50);
            Row.width('100%');
            Row.onClick(() => {
                this.isShow = false;
                this.loadBook();
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777264, "type": 20000, params: [], "bundleName": "com.example.readerkitdemo", "moduleName": "entry" });
            Image.width(20);
            Image.height(20);
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('添加本地');
            Text.fontSize(18);
        }, Text);
        Text.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 16 });
            Row.height(50);
            Row.width('100%');
            Row.onClick(() => {
                this.isShow = false;
                this.isEditMode = true;
                // 自动切换到图片列表框模式以便显示选择框
                if (!this.isGridView) {
                    this.isGridView = true;
                }
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777268, "type": 20000, params: [], "bundleName": "com.example.readerkitdemo", "moduleName": "entry" });
            Image.width(20);
            Image.height(20);
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('书架管理');
            Text.fontSize(18);
        }, Text);
        Text.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 16 });
            Row.height(50);
            Row.width('100%');
            Row.onClick(() => {
                this.isShow = false;
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777267, "type": 20000, params: [], "bundleName": "com.example.readerkitdemo", "moduleName": "entry" });
            Image.width(20);
            Image.height(20);
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('导出书单');
            Text.fontSize(18);
        }, Text);
        Text.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 16 });
            Row.height(50);
            Row.width('100%');
            Row.onClick(() => {
                this.isShow = false;
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777266, "type": 20000, params: [], "bundleName": "com.example.readerkitdemo", "moduleName": "entry" });
            Image.width(20);
            Image.height(20);
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('导入书单');
            Text.fontSize(18);
        }, Text);
        Text.pop();
        Row.pop();
        Column.pop();
    }
    /**
     * 执行在线搜索
     */
    private async performOnlineSearch(): Promise<void> {
        if (this.searchKeyword.trim()) {
            hilog.info(0x0000, TAG, '在线搜索关键词: ' + this.searchKeyword);
            this.showSearchSheet = false;
            try {
                this.isSearching = true;
                this.searchErrorMessage = '';
                // 使用书源管理器搜索小说
                const result = await bookSourceManager.searchNovels(this.searchKeyword.trim());
                if (result.success && result.data) {
                    this.onlineSearchResults = result.data;
                    this.showSearchResults = true;
                    hilog.info(0x0000, TAG, `在线搜索成功，找到 ${result.data.length} 本小说`);
                }
                else {
                    this.searchErrorMessage = result.error || '搜索失败';
                    hilog.error(0x0000, TAG, '在线搜索失败: ' + this.searchErrorMessage);
                }
            }
            catch (error) {
                hilog.error(0x0000, TAG, '在线搜索出错: ' + JSON.stringify(error));
                this.searchErrorMessage = '搜索出错，请重试';
            }
            finally {
                this.isSearching = false;
            }
        }
    }
    /**
     * 打开小说详情
     * @param novel 小说信息
     */
    private openNovelDetail(novel: NovelInfo): void {
        hilog.info(0x0000, TAG, '打开小说详情: ' + novel.title);
        // 构建完整的书籍详情URL
        const fullBookUrl = novel.link.startsWith('http') ?
            novel.link :
            'https://www.bqg128.com' + novel.link;
        hilog.info(0x0000, TAG, '书籍详情链接: ' + fullBookUrl);
        // 跳转到书籍详情页面
        router.pushUrl({
            url: 'pages/BookDetailPage',
            params: {
                bookUrl: fullBookUrl,
                bookTitle: novel.title,
                bookAuthor: novel.author,
                bookCover: novel.cover
            }
        }).then(() => {
            hilog.info(0x0000, TAG, '成功跳转到书籍详情页面');
        }).catch((error: Error) => {
            hilog.error(0x0000, TAG, '跳转失败: ' + error.message);
        });
    }
    /**
     * 返回书架
     */
    private backToBookshelf(): void {
        this.showSearchResults = false;
        this.onlineSearchResults = [];
        this.searchKeyword = '';
        this.searchErrorMessage = '';
    }
    private jumper(book: BookInfo) {
        if (!book.filePath) {
            return;
        }
        this.getUIContext().getRouter().pushUrl({
            url: "pages/Reader", params: {
                filePath: book.filePath,
                resourceIndex: book.resourceIndex,
                domPos: book.domPos || ''
            }
        });
        // Router addObserver 方法已移除，因为Router类型没有这个属性
    }
    /**
     * Remove the page transition animation to speed up the page access speed of the reader
     */
    pageTransition() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            PageTransition.create();
        }, null);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            PageTransitionEnter.create({ duration: 0, curve: Curve.Sharp });
        }, null);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            PageTransitionExit.create({ duration: 0, curve: Curve.Sharp });
        }, null);
        PageTransition.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "Index";
    }
}
export { Index };
registerNamedRoute(() => new Index(undefined, {}), "", { bundleName: "com.example.readerkitdemo", moduleName: "entry", pagePath: "pages/Index", pageFullPath: "entry/src/main/ets/pages/Index", integratedHsp: "false", moduleType: "followWithHap" });
