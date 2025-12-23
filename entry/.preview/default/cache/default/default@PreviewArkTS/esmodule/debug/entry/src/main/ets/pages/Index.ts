if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface Index_Params {
    isShow?: boolean;
    books?: BookInfo[];
    onlineBooks?: OnlineBookInfo[];
    searchText?: string;
    isEditMode?: boolean;
    selectedBooks?: number[];
    selectedOnlineBooks?: number[];
    isGridView?: boolean;
    isRefreshing?: boolean;
    searchKeyword?: string;
    showSearchSheet?: boolean;
    onlineSearchResults?: NovelInfo[];
    isSearching?: boolean;
    searchErrorMessage?: string;
    showSearchResults?: boolean;
    showAddOnlineBookSheet?: boolean;
    bookUrlInput?: string;
    isParsingUrl?: boolean;
    isDensityChange?: boolean;
}
import picker from "@ohos:file.picker";
import { WindowAbility } from "@bundle:liubai.yuedu.hos/entry/ets/entryability/WindowAbility";
import { LocalBookImporter } from "@bundle:liubai.yuedu.hos/entry/ets/common/LocalBookImporter";
import { bookParser as bookParser } from "@hms:core.readerservice.bookParser";
import hilog from "@ohos:hilog";
import { BookUtils } from "@bundle:liubai.yuedu.hos/entry/ets/utils/BookUtils";
import type common from "@ohos:app.ability.common";
import { bookDataManager } from "@bundle:liubai.yuedu.hos/entry/ets/utils/BookDataManager";
import { BookInfo } from "@bundle:liubai.yuedu.hos/entry/ets/common/BookInfo";
import router from "@ohos:router";
import { bookSourceManager } from "@bundle:liubai.yuedu.hos/entry/ets/managers/BookSourceManager";
import type { NovelInfo } from '../models/BookSourceModel';
import { onlineBookDataManager } from "@bundle:liubai.yuedu.hos/entry/ets/utils/OnlineBookDataManager";
import type { OnlineBookInfo } from '../models/OnlineBookModel';
const TAG: string = 'IndexPage';
class Index extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__isShow = new ObservedPropertySimplePU(false, this, "isShow");
        this.__books = new ObservedPropertyObjectPU([], this, "books");
        this.__onlineBooks = new ObservedPropertyObjectPU([], this, "onlineBooks");
        this.__searchText = new ObservedPropertySimplePU('', this, "searchText");
        this.__isEditMode = new ObservedPropertySimplePU(false, this, "isEditMode");
        this.__selectedBooks = new ObservedPropertyObjectPU([], this, "selectedBooks");
        this.__selectedOnlineBooks = new ObservedPropertyObjectPU([], this, "selectedOnlineBooks");
        this.__isGridView = new ObservedPropertySimplePU(true, this, "isGridView");
        this.__isRefreshing = new ObservedPropertySimplePU(false, this, "isRefreshing");
        this.__searchKeyword = new ObservedPropertySimplePU('', this, "searchKeyword");
        this.__showSearchSheet = new ObservedPropertySimplePU(false, this, "showSearchSheet");
        this.__onlineSearchResults = new ObservedPropertyObjectPU([], this, "onlineSearchResults");
        this.__isSearching = new ObservedPropertySimplePU(false, this, "isSearching");
        this.__searchErrorMessage = new ObservedPropertySimplePU('', this, "searchErrorMessage");
        this.__showSearchResults = new ObservedPropertySimplePU(false, this, "showSearchResults");
        this.__showAddOnlineBookSheet = new ObservedPropertySimplePU(false, this, "showAddOnlineBookSheet");
        this.__bookUrlInput = new ObservedPropertySimplePU('', this, "bookUrlInput");
        this.__isParsingUrl = new ObservedPropertySimplePU(false, this, "isParsingUrl");
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
        if (params.onlineBooks !== undefined) {
            this.onlineBooks = params.onlineBooks;
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
        if (params.selectedOnlineBooks !== undefined) {
            this.selectedOnlineBooks = params.selectedOnlineBooks;
        }
        if (params.isGridView !== undefined) {
            this.isGridView = params.isGridView;
        }
        if (params.isRefreshing !== undefined) {
            this.isRefreshing = params.isRefreshing;
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
        if (params.showAddOnlineBookSheet !== undefined) {
            this.showAddOnlineBookSheet = params.showAddOnlineBookSheet;
        }
        if (params.bookUrlInput !== undefined) {
            this.bookUrlInput = params.bookUrlInput;
        }
        if (params.isParsingUrl !== undefined) {
            this.isParsingUrl = params.isParsingUrl;
        }
    }
    updateStateVars(params: Index_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__isShow.purgeDependencyOnElmtId(rmElmtId);
        this.__books.purgeDependencyOnElmtId(rmElmtId);
        this.__onlineBooks.purgeDependencyOnElmtId(rmElmtId);
        this.__searchText.purgeDependencyOnElmtId(rmElmtId);
        this.__isEditMode.purgeDependencyOnElmtId(rmElmtId);
        this.__selectedBooks.purgeDependencyOnElmtId(rmElmtId);
        this.__selectedOnlineBooks.purgeDependencyOnElmtId(rmElmtId);
        this.__isGridView.purgeDependencyOnElmtId(rmElmtId);
        this.__isRefreshing.purgeDependencyOnElmtId(rmElmtId);
        this.__searchKeyword.purgeDependencyOnElmtId(rmElmtId);
        this.__showSearchSheet.purgeDependencyOnElmtId(rmElmtId);
        this.__onlineSearchResults.purgeDependencyOnElmtId(rmElmtId);
        this.__isSearching.purgeDependencyOnElmtId(rmElmtId);
        this.__searchErrorMessage.purgeDependencyOnElmtId(rmElmtId);
        this.__showSearchResults.purgeDependencyOnElmtId(rmElmtId);
        this.__showAddOnlineBookSheet.purgeDependencyOnElmtId(rmElmtId);
        this.__bookUrlInput.purgeDependencyOnElmtId(rmElmtId);
        this.__isParsingUrl.purgeDependencyOnElmtId(rmElmtId);
        this.__isDensityChange.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__isShow.aboutToBeDeleted();
        this.__books.aboutToBeDeleted();
        this.__onlineBooks.aboutToBeDeleted();
        this.__searchText.aboutToBeDeleted();
        this.__isEditMode.aboutToBeDeleted();
        this.__selectedBooks.aboutToBeDeleted();
        this.__selectedOnlineBooks.aboutToBeDeleted();
        this.__isGridView.aboutToBeDeleted();
        this.__isRefreshing.aboutToBeDeleted();
        this.__searchKeyword.aboutToBeDeleted();
        this.__showSearchSheet.aboutToBeDeleted();
        this.__onlineSearchResults.aboutToBeDeleted();
        this.__isSearching.aboutToBeDeleted();
        this.__searchErrorMessage.aboutToBeDeleted();
        this.__showSearchResults.aboutToBeDeleted();
        this.__showAddOnlineBookSheet.aboutToBeDeleted();
        this.__bookUrlInput.aboutToBeDeleted();
        this.__isParsingUrl.aboutToBeDeleted();
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
    private __onlineBooks: ObservedPropertyObjectPU<OnlineBookInfo[]>;
    get onlineBooks() {
        return this.__onlineBooks.get();
    }
    set onlineBooks(newValue: OnlineBookInfo[]) {
        this.__onlineBooks.set(newValue);
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
    private __selectedOnlineBooks: ObservedPropertyObjectPU<number[]>;
    get selectedOnlineBooks() {
        return this.__selectedOnlineBooks.get();
    }
    set selectedOnlineBooks(newValue: number[]) {
        this.__selectedOnlineBooks.set(newValue);
    }
    private __isGridView: ObservedPropertySimplePU<boolean>;
    get isGridView() {
        return this.__isGridView.get();
    }
    set isGridView(newValue: boolean) {
        this.__isGridView.set(newValue);
    }
    private __isRefreshing: ObservedPropertySimplePU<boolean>; // 下拉刷新状态
    get isRefreshing() {
        return this.__isRefreshing.get();
    }
    set isRefreshing(newValue: boolean) {
        this.__isRefreshing.set(newValue);
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
    // 添加在线书籍相关状态
    private __showAddOnlineBookSheet: ObservedPropertySimplePU<boolean>; // 添加在线书籍弹窗显示状态
    get showAddOnlineBookSheet() {
        return this.__showAddOnlineBookSheet.get();
    }
    set showAddOnlineBookSheet(newValue: boolean) {
        this.__showAddOnlineBookSheet.set(newValue);
    }
    private __bookUrlInput: ObservedPropertySimplePU<string>; // 输入的书籍URL
    get bookUrlInput() {
        return this.__bookUrlInput.get();
    }
    set bookUrlInput(newValue: string) {
        this.__bookUrlInput.set(newValue);
    }
    private __isParsingUrl: ObservedPropertySimplePU<boolean>; // 是否正在解析URL
    get isParsingUrl() {
        return this.__isParsingUrl.get();
    }
    set isParsingUrl(newValue: boolean) {
        this.__isParsingUrl.set(newValue);
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
        const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
        await bookDataManager.init(context);
        await onlineBookDataManager.init(context);
        this.loadBooksFromDB();
    }
    async loadBooksFromDB() {
        this.books = await bookDataManager.queryAllBooks();
        this.onlineBooks = await onlineBookDataManager.queryAllOnlineBooks();
        hilog.info(0x0000, TAG, `加载书籍: 本地${this.books.length}本, 在线${this.onlineBooks.length}本`);
    }
    /**
     * 刷新书架数据
     */
    private async refreshBookshelf(): Promise<void> {
        this.isRefreshing = true;
        try {
            await this.loadBooksFromDB();
            hilog.info(0x0000, TAG, '书架刷新完成');
        }
        catch (error) {
            hilog.error(0x0000, TAG, '刷新书架失败: ' + JSON.stringify(error));
        }
        finally {
            this.isRefreshing = false;
        }
    }
    onPageShow(): void {
        this.refreshBookshelf(); // Refresh bookshelf data when returning to the page
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
                .showToast({ message: { "id": 16777228, "type": 10003, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" }, duration: 2000 });
        }
        catch (err) {
            hilog.error(0x0000, TAG, 'loadBook failed, error is: ' + err);
        }
    }
    /**
     * 构建小说卡片
     */
    private buildNovelCard(novel: NovelInfo, parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.debugLine("entry/src/main/ets/pages/Index.ets(154:5)", "entry");
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
            Image.debugLine("entry/src/main/ets/pages/Index.ets(156:7)", "entry");
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
            Column.debugLine("entry/src/main/ets/pages/Index.ets(168:7)", "entry");
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
            Text.debugLine("entry/src/main/ets/pages/Index.ets(170:9)", "entry");
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
            Text.debugLine("entry/src/main/ets/pages/Index.ets(180:9)", "entry");
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
            Text.debugLine("entry/src/main/ets/pages/Index.ets(188:9)", "entry");
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
            Row.debugLine("entry/src/main/ets/pages/Index.ets(198:9)", "entry");
            // 热度和分类
            Row.margin({ top: 6 });
            // 热度和分类
            Row.width('100%');
            // 热度和分类
            Row.justifyContent(FlexAlign.Start);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(novel.hotValue || '热度未知');
            Text.debugLine("entry/src/main/ets/pages/Index.ets(199:11)", "entry");
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
                        Text.debugLine("entry/src/main/ets/pages/Index.ets(207:13)", "entry");
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
            // 否则显示书架页面
            Column.create();
            Column.debugLine("entry/src/main/ets/pages/Index.ets(242:7)", "entry");
            // 否则显示书架页面
            Column.height('100%');
            // 否则显示书架页面
            Column.width('100%');
            // 否则显示书架页面
            Column.backgroundColor({ "id": 16777258, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            // 否则显示书架页面
            Column.padding({ left: 16, right: 16 });
            // 否则显示书架页面
            Column.bindSheet({ value: this.showAddOnlineBookSheet, changeEvent: newValue => { this.showAddOnlineBookSheet = newValue; } }, { builder: () => {
                    this.buildAddOnlineBookSheet.call(this);
                } }, {
                height: 300,
                dragBar: true,
                backgroundColor: Color.White
            });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.debugLine("entry/src/main/ets/pages/Index.ets(243:7)", "entry");
            Row.width('100%');
            Row.height(56);
            Row.padding({ left: 16, right: 16 });
            Row.margin({ top: 44 });
            Row.justifyContent(FlexAlign.End);
            Row.alignItems(VerticalAlign.Center);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 16 });
            Row.debugLine("entry/src/main/ets/pages/Index.ets(244:9)", "entry");
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777286, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.debugLine("entry/src/main/ets/pages/Index.ets(245:11)", "entry");
            Image.width(32);
            Image.height(32);
            Image.onClick(() => {
                this.getUIContext().getRouter().pushUrl({ url: 'pages/SearchPage' });
            });
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777301, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.debugLine("entry/src/main/ets/pages/Index.ets(252:11)", "entry");
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
                        Row.debugLine("entry/src/main/ets/pages/Index.ets(277:9)", "entry");
                        Row.width('100%');
                        Row.height(56);
                        Row.padding({ left: 16, right: 16 });
                        Row.justifyContent(FlexAlign.SpaceBetween);
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('删除');
                        Text.debugLine("entry/src/main/ets/pages/Index.ets(278:11)", "entry");
                        Text.fontColor(Color.Red);
                        Text.onClick(async () => {
                            // 删除本地书籍
                            await bookDataManager.deleteBooksByIds(ObservedObject.GetRawObject(this.selectedBooks));
                            // 删除在线书籍
                            for (const bookId of this.selectedOnlineBooks) {
                                await onlineBookDataManager.deleteOnlineBook(bookId);
                            }
                            this.selectedBooks = [];
                            this.selectedOnlineBooks = [];
                            this.isEditMode = false;
                            await this.loadBooksFromDB();
                        });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Blank.create();
                        Blank.debugLine("entry/src/main/ets/pages/Index.ets(292:11)", "entry");
                    }, Blank);
                    Blank.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('取消');
                        Text.debugLine("entry/src/main/ets/pages/Index.ets(293:11)", "entry");
                        Text.onClick(() => {
                            this.selectedBooks = [];
                            this.selectedOnlineBooks = [];
                            this.isEditMode = false;
                        });
                    }, Text);
                    Text.pop();
                    Row.pop();
                });
            }
            // 使用Refresh组件包裹内容区域
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 使用Refresh组件包裹内容区域
            Refresh.create({ refreshing: { value: this.isRefreshing, changeEvent: newValue => { this.isRefreshing = newValue; } } });
            Refresh.debugLine("entry/src/main/ets/pages/Index.ets(307:7)", "entry");
            // 使用Refresh组件包裹内容区域
            Refresh.onRefreshing(() => {
                this.refreshBookshelf();
            });
            // 使用Refresh组件包裹内容区域
            Refresh.layoutWeight(1);
        }, Refresh);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.isGridView) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Grid.create();
                        Grid.debugLine("entry/src/main/ets/pages/Index.ets(309:11)", "entry");
                        Grid.columnsTemplate('1fr 1fr 1fr');
                        Grid.columnsGap(16);
                        Grid.rowsGap(16);
                        Grid.layoutWeight(1);
                        Grid.padding({ top: 20 });
                    }, Grid);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 本地书籍
                        ForEach.create();
                        const forEachItemGenFunction = _item => {
                            const book = _item;
                            {
                                const itemCreation2 = (elmtId, isInitialRender) => {
                                    GridItem.create(() => { }, false);
                                    GridItem.debugLine("entry/src/main/ets/pages/Index.ets(312:13)", "entry");
                                };
                                const observedDeepRender = () => {
                                    this.observeComponentCreation2(itemCreation2, GridItem);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Column.create({ space: 8 });
                                        Column.debugLine("entry/src/main/ets/pages/Index.ets(313:15)", "entry");
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
                                        Stack.debugLine("entry/src/main/ets/pages/Index.ets(314:17)", "entry");
                                    }, Stack);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Image.create(book.coverPath || { "id": 16777291, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                        Image.debugLine("entry/src/main/ets/pages/Index.ets(315:19)", "entry");
                                        Image.width('100%');
                                        Image.aspectRatio(0.75);
                                        Image.borderRadius(8);
                                        Image.backgroundColor({ "id": 16777238, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                    }, Image);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        If.create();
                                        if (this.isEditMode) {
                                            this.ifElseBranchUpdateFunction(0, () => {
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Image.create(this.selectedBooks.includes(book.id) ? { "id": 16777277, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" } : { "id": 16777276, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                                    Image.debugLine("entry/src/main/ets/pages/Index.ets(321:21)", "entry");
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
                                        Text.debugLine("entry/src/main/ets/pages/Index.ets(327:17)", "entry");
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
                    // 本地书籍
                    ForEach.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 在线书籍
                        ForEach.create();
                        const forEachItemGenFunction = _item => {
                            const book = _item;
                            {
                                const itemCreation2 = (elmtId, isInitialRender) => {
                                    GridItem.create(() => { }, false);
                                    GridItem.debugLine("entry/src/main/ets/pages/Index.ets(350:13)", "entry");
                                };
                                const observedDeepRender = () => {
                                    this.observeComponentCreation2(itemCreation2, GridItem);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Column.create({ space: 8 });
                                        Column.debugLine("entry/src/main/ets/pages/Index.ets(351:15)", "entry");
                                        Column.padding(8);
                                        Column.onClick(() => {
                                            if (this.isEditMode) {
                                                const index = this.selectedOnlineBooks.indexOf(book.id);
                                                if (index > -1) {
                                                    this.selectedOnlineBooks.splice(index, 1);
                                                }
                                                else {
                                                    this.selectedOnlineBooks.push(book.id);
                                                }
                                            }
                                            else {
                                                this.openOnlineBook(book);
                                            }
                                        });
                                    }, Column);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Stack.create({ alignContent: Alignment.TopEnd });
                                        Stack.debugLine("entry/src/main/ets/pages/Index.ets(352:17)", "entry");
                                    }, Stack);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Image.create(book.cover || { "id": 16777291, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                        Image.debugLine("entry/src/main/ets/pages/Index.ets(353:19)", "entry");
                                        Image.width('100%');
                                        Image.aspectRatio(0.75);
                                        Image.borderRadius(8);
                                        Image.backgroundColor({ "id": 16777238, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                    }, Image);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        If.create();
                                        if (this.isEditMode) {
                                            this.ifElseBranchUpdateFunction(0, () => {
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Image.create(this.selectedOnlineBooks.includes(book.id) ? { "id": 16777277, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" } : { "id": 16777276, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                                    Image.debugLine("entry/src/main/ets/pages/Index.ets(359:21)", "entry");
                                                    Image.width(24);
                                                    Image.height(24);
                                                    Image.margin({ top: 4, right: 4 });
                                                }, Image);
                                            });
                                        }
                                        // 在线标识
                                        else {
                                            this.ifElseBranchUpdateFunction(1, () => {
                                            });
                                        }
                                    }, If);
                                    If.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        // 在线标识
                                        Text.create('在线');
                                        Text.debugLine("entry/src/main/ets/pages/Index.ets(365:19)", "entry");
                                        // 在线标识
                                        Text.fontSize(10);
                                        // 在线标识
                                        Text.fontColor(Color.White);
                                        // 在线标识
                                        Text.backgroundColor('#FF6B6B');
                                        // 在线标识
                                        Text.padding({ left: 4, right: 4, top: 2, bottom: 2 });
                                        // 在线标识
                                        Text.borderRadius(4);
                                        // 在线标识
                                        Text.position({ x: 4, y: 4 });
                                    }, Text);
                                    // 在线标识
                                    Text.pop();
                                    Stack.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(book.title);
                                        Text.debugLine("entry/src/main/ets/pages/Index.ets(373:17)", "entry");
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
                        this.forEachUpdateFunction(elmtId, this.onlineBooks, forEachItemGenFunction);
                    }, ForEach);
                    // 在线书籍
                    ForEach.pop();
                    Grid.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // List布局
                        List.create({ space: 12 });
                        List.debugLine("entry/src/main/ets/pages/Index.ets(401:9)", "entry");
                        // List布局
                        List.layoutWeight(1);
                        // List布局
                        List.padding({ top: 20 });
                    }, List);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 本地书籍
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
                                    ListItem.debugLine("entry/src/main/ets/pages/Index.ets(404:13)", "entry");
                                };
                                const deepRenderFunction = (elmtId, isInitialRender) => {
                                    itemCreation(elmtId, isInitialRender);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Row.create({ space: 12 });
                                        Row.debugLine("entry/src/main/ets/pages/Index.ets(405:15)", "entry");
                                        Row.padding({ top: 8, bottom: 8 });
                                        Row.onClick(() => {
                                            this.jumper(book);
                                        });
                                    }, Row);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Image.create(book.coverPath || { "id": 16777291, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                        Image.debugLine("entry/src/main/ets/pages/Index.ets(406:17)", "entry");
                                        Image.width(60);
                                        Image.aspectRatio(0.75);
                                        Image.borderRadius(4);
                                        Image.backgroundColor({ "id": 16777238, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                    }, Image);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Column.create({ space: 4 });
                                        Column.debugLine("entry/src/main/ets/pages/Index.ets(411:17)", "entry");
                                        Column.alignItems(HorizontalAlign.Start);
                                        Column.layoutWeight(1);
                                    }, Column);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(book.bookName);
                                        Text.debugLine("entry/src/main/ets/pages/Index.ets(412:19)", "entry");
                                        Text.fontSize(16);
                                        Text.fontWeight(FontWeight.Bold);
                                        Text.maxLines(1);
                                        Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                                    }, Text);
                                    Text.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(book.author || '未知');
                                        Text.debugLine("entry/src/main/ets/pages/Index.ets(417:19)", "entry");
                                        Text.fontSize(14);
                                        Text.fontColor({ "id": 16777239, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                        Text.maxLines(1);
                                        Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                                    }, Text);
                                    Text.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(`已读: ${book.currentChapter || book.progress || '未开始'}`);
                                        Text.debugLine("entry/src/main/ets/pages/Index.ets(422:19)", "entry");
                                        Text.fontSize(12);
                                        Text.fontColor({ "id": 16777239, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
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
                    // 本地书籍
                    ForEach.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 在线书籍
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
                                    ListItem.debugLine("entry/src/main/ets/pages/Index.ets(438:13)", "entry");
                                };
                                const deepRenderFunction = (elmtId, isInitialRender) => {
                                    itemCreation(elmtId, isInitialRender);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Row.create({ space: 12 });
                                        Row.debugLine("entry/src/main/ets/pages/Index.ets(439:15)", "entry");
                                        Row.padding({ top: 8, bottom: 8 });
                                        Row.onClick(() => {
                                            this.openOnlineBook(book);
                                        });
                                    }, Row);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Stack.create();
                                        Stack.debugLine("entry/src/main/ets/pages/Index.ets(440:17)", "entry");
                                        Stack.width(60);
                                    }, Stack);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Image.create(book.cover || { "id": 16777291, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                        Image.debugLine("entry/src/main/ets/pages/Index.ets(441:19)", "entry");
                                        Image.width(60);
                                        Image.aspectRatio(0.75);
                                        Image.borderRadius(4);
                                        Image.backgroundColor({ "id": 16777238, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                    }, Image);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create('在线');
                                        Text.debugLine("entry/src/main/ets/pages/Index.ets(446:19)", "entry");
                                        Text.fontSize(10);
                                        Text.fontColor(Color.White);
                                        Text.backgroundColor('#FF6B6B');
                                        Text.padding({ left: 4, right: 4, top: 2, bottom: 2 });
                                        Text.borderRadius(4);
                                        Text.position({ x: 2, y: 2 });
                                    }, Text);
                                    Text.pop();
                                    Stack.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Column.create({ space: 4 });
                                        Column.debugLine("entry/src/main/ets/pages/Index.ets(456:17)", "entry");
                                        Column.alignItems(HorizontalAlign.Start);
                                        Column.layoutWeight(1);
                                    }, Column);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(book.title);
                                        Text.debugLine("entry/src/main/ets/pages/Index.ets(457:19)", "entry");
                                        Text.fontSize(16);
                                        Text.fontWeight(FontWeight.Bold);
                                        Text.maxLines(1);
                                        Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                                    }, Text);
                                    Text.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(book.author || '未知');
                                        Text.debugLine("entry/src/main/ets/pages/Index.ets(462:19)", "entry");
                                        Text.fontSize(14);
                                        Text.fontColor({ "id": 16777239, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                        Text.maxLines(1);
                                        Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                                    }, Text);
                                    Text.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(`已读: ${book.currentChapter || book.progress || '未开始'}`);
                                        Text.debugLine("entry/src/main/ets/pages/Index.ets(467:19)", "entry");
                                        Text.fontSize(12);
                                        Text.fontColor({ "id": 16777239, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
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
                        this.forEachUpdateFunction(elmtId, this.onlineBooks, forEachItemGenFunction);
                    }, ForEach);
                    // 在线书籍
                    ForEach.pop();
                    // List布局
                    List.pop();
                });
            }
        }, If);
        If.pop();
        // 使用Refresh组件包裹内容区域
        Refresh.pop();
        // 否则显示书架页面
        Column.pop();
    }
    /**
     * 构建添加在线书籍弹窗
     */
    buildAddOnlineBookSheet(parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("entry/src/main/ets/pages/Index.ets(508:5)", "entry");
            Column.padding(20);
            Column.backgroundColor(Color.White);
            Column.borderRadius({ topLeft: 16, topRight: 16 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 标题
            Text.create('添加在线书籍');
            Text.debugLine("entry/src/main/ets/pages/Index.ets(510:7)", "entry");
            // 标题
            Text.fontSize(18);
            // 标题
            Text.fontWeight(FontWeight.Medium);
            // 标题
            Text.fontColor('#2D3748');
            // 标题
            Text.width('100%');
            // 标题
            Text.textAlign(TextAlign.Center);
            // 标题
            Text.margin({ bottom: 20 });
        }, Text);
        // 标题
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 输入框和解析按钮
            Row.create();
            Row.debugLine("entry/src/main/ets/pages/Index.ets(519:7)", "entry");
            // 输入框和解析按钮
            Row.width('100%');
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TextInput.create({ placeholder: '请输入书籍链接', text: this.bookUrlInput });
            TextInput.debugLine("entry/src/main/ets/pages/Index.ets(520:9)", "entry");
            TextInput.layoutWeight(1);
            TextInput.height(44);
            TextInput.fontSize(14);
            TextInput.borderRadius(8);
            TextInput.backgroundColor('#F7FAFC');
            TextInput.onChange((value: string) => {
                this.bookUrlInput = value;
            });
        }, TextInput);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('解析');
            Button.debugLine("entry/src/main/ets/pages/Index.ets(530:9)", "entry");
            Button.fontSize(14);
            Button.fontColor(Color.White);
            Button.backgroundColor('#9F6548');
            Button.borderRadius(8);
            Button.height(44);
            Button.width(80);
            Button.margin({ left: 12 });
            Button.enabled(!this.isParsingUrl);
            Button.onClick(() => {
                this.parseBookUrl();
            });
        }, Button);
        Button.pop();
        // 输入框和解析按钮
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 提示信息
            Text.create('支持笔趣阁等小说网站的书籍详情页链接');
            Text.debugLine("entry/src/main/ets/pages/Index.ets(546:7)", "entry");
            // 提示信息
            Text.fontSize(12);
            // 提示信息
            Text.fontColor('#718096');
            // 提示信息
            Text.width('100%');
            // 提示信息
            Text.textAlign(TextAlign.Start);
            // 提示信息
            Text.margin({ top: 12 });
        }, Text);
        // 提示信息
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 示例链接
            Text.create('示例: https://www.bqg128.cc/book/12345/');
            Text.debugLine("entry/src/main/ets/pages/Index.ets(554:7)", "entry");
            // 示例链接
            Text.fontSize(12);
            // 示例链接
            Text.fontColor('#A0AEC0');
            // 示例链接
            Text.width('100%');
            // 示例链接
            Text.textAlign(TextAlign.Start);
            // 示例链接
            Text.margin({ top: 4 });
        }, Text);
        // 示例链接
        Text.pop();
        Column.pop();
    }
    popupWithButtonBuilder(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("entry/src/main/ets/pages/Index.ets(568:5)", "entry");
            Column.width(160);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 16 });
            Row.debugLine("entry/src/main/ets/pages/Index.ets(569:7)", "entry");
            Row.height(50);
            Row.width('100%');
            Row.onClick(() => {
                this.isShow = false;
                this.showAddOnlineBookSheet = true;
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777309, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.debugLine("entry/src/main/ets/pages/Index.ets(570:9)", "entry");
            Image.width(20);
            Image.height(20);
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('添加在线书籍');
            Text.debugLine("entry/src/main/ets/pages/Index.ets(571:9)", "entry");
            Text.fontSize(18);
        }, Text);
        Text.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 16 });
            Row.debugLine("entry/src/main/ets/pages/Index.ets(576:7)", "entry");
            Row.height(50);
            Row.width('100%');
            Row.onClick(() => {
                this.isGridView = !this.isGridView;
                this.isShow = false;
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777288, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.debugLine("entry/src/main/ets/pages/Index.ets(577:9)", "entry");
            Image.width(20);
            Image.height(20);
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('切换显示模式');
            Text.debugLine("entry/src/main/ets/pages/Index.ets(578:9)", "entry");
            Text.fontSize(18);
        }, Text);
        Text.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 16 });
            Row.debugLine("entry/src/main/ets/pages/Index.ets(583:7)", "entry");
            Row.height(50);
            Row.width('100%');
            Row.onClick(() => {
                this.isShow = false;
                this.loadBook();
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777275, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.debugLine("entry/src/main/ets/pages/Index.ets(584:9)", "entry");
            Image.width(20);
            Image.height(20);
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('添加本地');
            Text.debugLine("entry/src/main/ets/pages/Index.ets(585:9)", "entry");
            Text.fontSize(18);
        }, Text);
        Text.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 16 });
            Row.debugLine("entry/src/main/ets/pages/Index.ets(590:7)", "entry");
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
            Image.create({ "id": 16777271, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.debugLine("entry/src/main/ets/pages/Index.ets(591:9)", "entry");
            Image.width(20);
            Image.height(20);
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('书架管理');
            Text.debugLine("entry/src/main/ets/pages/Index.ets(592:9)", "entry");
            Text.fontSize(18);
        }, Text);
        Text.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 16 });
            Row.debugLine("entry/src/main/ets/pages/Index.ets(601:7)", "entry");
            Row.height(50);
            Row.width('100%');
            Row.onClick(() => {
                this.isShow = false;
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777272, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.debugLine("entry/src/main/ets/pages/Index.ets(602:9)", "entry");
            Image.width(20);
            Image.height(20);
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('导出书单');
            Text.debugLine("entry/src/main/ets/pages/Index.ets(603:9)", "entry");
            Text.fontSize(18);
        }, Text);
        Text.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 16 });
            Row.debugLine("entry/src/main/ets/pages/Index.ets(607:7)", "entry");
            Row.height(50);
            Row.width('100%');
            Row.onClick(() => {
                this.isShow = false;
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777274, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.debugLine("entry/src/main/ets/pages/Index.ets(608:9)", "entry");
            Image.width(20);
            Image.height(20);
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('导入书单');
            Text.debugLine("entry/src/main/ets/pages/Index.ets(609:9)", "entry");
            Text.fontSize(18);
        }, Text);
        Text.pop();
        Row.pop();
        Column.pop();
    }
    /**
     * 打开小说详情
     * @param novel 小说信息
     */
    private openNovelDetail(novel: NovelInfo): void {
        hilog.info(0x0000, TAG, '打开小说详情: ' + novel.title);
        // 构建完整的书籍详情URL
        let fullBookUrl = novel.link;
        // 如果链接不是完整的URL，则需要拼接书源的基础URL
        if (!novel.link.startsWith('http')) {
            // 获取启用的书源列表
            const enabledSources = bookSourceManager.getEnabledBookSources();
            if (enabledSources.length > 0) {
                // 使用第一个启用的书源作为基础URL
                const baseUrl = enabledSources[0].bookSourceUrl;
                fullBookUrl = baseUrl + novel.link;
                hilog.info(0x0000, TAG, `使用书源 ${enabledSources[0].bookSourceName} 的基础URL: ${baseUrl}`);
            }
            else {
                // 如果没有启用的书源，使用默认的笔趣阁URL
                fullBookUrl = 'https://www.bqg128.cc' + novel.link;
                hilog.warn(0x0000, TAG, '没有启用的书源，使用默认URL');
            }
        }
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
     * 解析书籍URL并跳转到详情页
     */
    private async parseBookUrl(): Promise<void> {
        if (!this.bookUrlInput.trim()) {
            this.getUIContext()
                .getPromptAction()
                .showToast({ message: '请输入书籍链接', duration: 2000 });
            return;
        }
        this.isParsingUrl = true;
        hilog.info(0x0000, TAG, '开始解析书籍URL: ' + this.bookUrlInput);
        try {
            // 关闭弹窗
            this.showAddOnlineBookSheet = false;
            // 直接跳转到BookDetailPage，让详情页自己解析
            router.pushUrl({
                url: 'pages/BookDetailPage',
                params: {
                    bookUrl: this.bookUrlInput.trim()
                }
            }).then(() => {
                hilog.info(0x0000, TAG, '成功跳转到书籍详情页面');
                // 清空输入框
                this.bookUrlInput = '';
            }).catch((error: Error) => {
                hilog.error(0x0000, TAG, '跳转失败: ' + error.message);
                this.getUIContext()
                    .getPromptAction()
                    .showToast({ message: '跳转失败: ' + error.message, duration: 2000 });
            });
        }
        catch (error) {
            hilog.error(0x0000, TAG, '解析书籍URL失败: ' + JSON.stringify(error));
            this.getUIContext()
                .getPromptAction()
                .showToast({ message: '解析失败，请检查链接是否正确', duration: 2000 });
        }
        finally {
            this.isParsingUrl = false;
        }
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
    /**
     * 打开在线书籍
     */
    private openOnlineBook(book: OnlineBookInfo): void {
        hilog.info(0x0000, TAG, `打开在线书籍: ${book.title}`);
        // 跳转到书籍详情页
        router.pushUrl({
            url: 'pages/BookDetailPage',
            params: {
                bookUrl: book.bookUrl,
                bookTitle: book.title,
                bookAuthor: book.author,
                bookCover: book.cover
            }
        }).then(() => {
            hilog.info(0x0000, TAG, '成功跳转到书籍详情页面');
        }).catch((error: Error) => {
            hilog.error(0x0000, TAG, '跳转失败: ' + error.message);
        });
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
registerNamedRoute(() => new Index(undefined, {}), "", { bundleName: "liubai.yuedu.hos", moduleName: "entry", pagePath: "pages/Index", pageFullPath: "entry/src/main/ets/pages/Index", integratedHsp: "false", moduleType: "followWithHap" });
