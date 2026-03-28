if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface Index_Params {
    isShow?: boolean;
    books?: BookInfo[];
    greetingText?: string;
    onlineBooks?: OnlineBookInfo[];
    searchText?: string;
    isEditMode?: boolean;
    selectedBooks?: number[];
    selectedOnlineBooks?: number[];
    isGridView?: boolean;
    isRefreshing?: boolean;
    isExportMode?: boolean;
    selectedExportBooks?: number[];
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
import { bookParser } from "@hms:core.readerservice.bookParser";
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
import { bookListManager } from "@bundle:liubai.yuedu.hos/entry/ets/utils/BookListManager";
import fs from "@ohos:file.fs";
import { downloadManager } from "@bundle:liubai.yuedu.hos/entry/ets/managers/DownloadManager";
const TAG: string = 'IndexPage';
class Index extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__isShow = new ObservedPropertySimplePU(false, this, "isShow");
        this.__books = new ObservedPropertyObjectPU([], this, "books");
        this.__greetingText = new ObservedPropertySimplePU('', this, "greetingText");
        this.__onlineBooks = new ObservedPropertyObjectPU([], this, "onlineBooks");
        this.__searchText = new ObservedPropertySimplePU('', this, "searchText");
        this.__isEditMode = new ObservedPropertySimplePU(false, this, "isEditMode");
        this.__selectedBooks = new ObservedPropertyObjectPU([], this, "selectedBooks");
        this.__selectedOnlineBooks = new ObservedPropertyObjectPU([], this, "selectedOnlineBooks");
        this.__isGridView = new ObservedPropertySimplePU(true, this, "isGridView");
        this.__isRefreshing = new ObservedPropertySimplePU(false, this, "isRefreshing");
        this.__isExportMode = new ObservedPropertySimplePU(false, this, "isExportMode");
        this.__selectedExportBooks = new ObservedPropertyObjectPU([], this, "selectedExportBooks");
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
        if (params.greetingText !== undefined) {
            this.greetingText = params.greetingText;
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
        if (params.isExportMode !== undefined) {
            this.isExportMode = params.isExportMode;
        }
        if (params.selectedExportBooks !== undefined) {
            this.selectedExportBooks = params.selectedExportBooks;
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
        this.__greetingText.purgeDependencyOnElmtId(rmElmtId);
        this.__onlineBooks.purgeDependencyOnElmtId(rmElmtId);
        this.__searchText.purgeDependencyOnElmtId(rmElmtId);
        this.__isEditMode.purgeDependencyOnElmtId(rmElmtId);
        this.__selectedBooks.purgeDependencyOnElmtId(rmElmtId);
        this.__selectedOnlineBooks.purgeDependencyOnElmtId(rmElmtId);
        this.__isGridView.purgeDependencyOnElmtId(rmElmtId);
        this.__isRefreshing.purgeDependencyOnElmtId(rmElmtId);
        this.__isExportMode.purgeDependencyOnElmtId(rmElmtId);
        this.__selectedExportBooks.purgeDependencyOnElmtId(rmElmtId);
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
        this.__greetingText.aboutToBeDeleted();
        this.__onlineBooks.aboutToBeDeleted();
        this.__searchText.aboutToBeDeleted();
        this.__isEditMode.aboutToBeDeleted();
        this.__selectedBooks.aboutToBeDeleted();
        this.__selectedOnlineBooks.aboutToBeDeleted();
        this.__isGridView.aboutToBeDeleted();
        this.__isRefreshing.aboutToBeDeleted();
        this.__isExportMode.aboutToBeDeleted();
        this.__selectedExportBooks.aboutToBeDeleted();
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
    private __greetingText: ObservedPropertySimplePU<string>;
    get greetingText() {
        return this.__greetingText.get();
    }
    set greetingText(newValue: string) {
        this.__greetingText.set(newValue);
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
    private __isExportMode: ObservedPropertySimplePU<boolean>; // 导出模式
    get isExportMode() {
        return this.__isExportMode.get();
    }
    set isExportMode(newValue: boolean) {
        this.__isExportMode.set(newValue);
    }
    private __selectedExportBooks: ObservedPropertyObjectPU<number[]>; // 导出模式下选中的在线书籍ID
    get selectedExportBooks() {
        return this.__selectedExportBooks.get();
    }
    set selectedExportBooks(newValue: number[]) {
        this.__selectedExportBooks.set(newValue);
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
    private getGreeting(): string {
        const hour = new Date().getHours();
        if (hour >= 0 && hour < 5) {
            return '夜深了，早点休息 🌙';
        }
        else if (hour >= 5 && hour < 9) {
            return '早上好，书友 🌿';
        }
        else if (hour >= 9 && hour < 12) {
            return '上午好，书友 ☀️';
        }
        else if (hour >= 12 && hour < 14) {
            return '中午好，书友 🍃';
        }
        else if (hour >= 14 && hour < 18) {
            return '下午好，书友 🌿';
        }
        else {
            return '晚上好，书友 🌙';
        }
    }
    async aboutToAppear() {
        hilog.info(0x0000, TAG, 'aboutToAppear');
        this.greetingText = this.getGreeting();
        WindowAbility.getInstance().toggleWindowSystemBar(['status', 'navigation'], this.getUIContext().getHostContext());
        const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
        await bookDataManager.init(context);
        await onlineBookDataManager.init(context);
        await bookListManager.init(context);
        this.loadBooksFromDB();
    }
    async loadBooksFromDB() {
        this.books = await bookDataManager.queryAllBooks();
        this.onlineBooks = await onlineBookDataManager.queryAllOnlineBooks();
        hilog.info(0x0000, TAG, `加载书籍: 本地${this.books.length}本, 在线${this.onlineBooks.length}本`);
    }
    /**
     * 根据书名生成稳定的随机颜色（同一本书每次显示颜色一致）
     */
    private getBookColor(bookName: string): string[] {
        const colorPairs: string[][] = [
            ['#5B9A76', '#3D7A5A'],
            ['#D89575', '#C07A5A'],
            ['#7BA68E', '#5A8A6E'],
            ['#A8C5B8', '#8AAF9C'],
            ['#C4A882', '#A89068'],
            ['#6B9E82', '#4D8066'],
            ['#B8A090', '#9A8272'],
            ['#8DB4A0', '#6E9A84'],
        ];
        let hash = 0;
        for (let i = 0; i < bookName.length; i++) {
            hash = ((hash << 5) - hash) + bookName.charCodeAt(i);
            hash = hash & hash;
        }
        return colorPairs[Math.abs(hash) % colorPairs.length];
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
        this.greetingText = this.getGreeting();
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
            documentSelectOptions.maxSelectNumber = 15;
            let documentPicker = new picker.DocumentViewPicker();
            let documentSelectResult = await documentPicker.select(documentSelectOptions);
            if (!documentSelectResult || documentSelectResult.length <= 0) {
                hilog.error(0x0000, TAG, 'loadBook failed');
                return;
            }
            let importer = new LocalBookImporter();
            let context = this.getUIContext().getHostContext() as common.UIAbilityContext;
            let successCount = 0;
            let failCount = 0;
            const totalCount = documentSelectResult.length;
            for (let i = 0; i < totalCount; i++) {
                let srcFile: string = decodeURI(documentSelectResult[i]);
                hilog.info(0x0000, TAG, `loadBook [${i + 1}/${totalCount}] decodeURI succeeded. ` + srcFile);
                try {
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
                    successCount++;
                    hilog.info(0x0000, TAG, `loadBook [${i + 1}/${totalCount}] succeeded: ` + newBook.filePath);
                }
                catch (innerErr) {
                    failCount++;
                    hilog.error(0x0000, TAG, `loadBook [${i + 1}/${totalCount}] failed: ` + innerErr);
                }
            }
            await this.loadBooksFromDB(); // Refresh the bookshelf
            // Show result toast
            if (failCount === 0) {
                this.getUIContext()
                    .getPromptAction()
                    .showToast({ message: `成功导入${successCount}本书籍`, duration: 2000 });
            }
            else {
                this.getUIContext()
                    .getPromptAction()
                    .showToast({ message: `导入完成：成功${successCount}本，失败${failCount}本`, duration: 3000 });
            }
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
            // 否则显示书架页面
            Column.create();
            // 否则显示书架页面
            Column.height('100%');
            // 否则显示书架页面
            Column.width('100%');
            // 否则显示书架页面
            Column.backgroundColor({ "id": 16777296, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
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
            // 问候语
            Column.create();
            // 问候语
            Column.width('100%');
            // 问候语
            Column.padding({ left: 16, right: 16 });
            // 问候语
            Column.margin({ top: 44 });
            // 问候语
            Column.alignItems(HorizontalAlign.Start);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('书架');
            Text.fontSize(26);
            Text.fontWeight(FontWeight.Bold);
            Text.fontColor({ "id": 16777307, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.greetingText);
            Text.fontSize(15);
            Text.fontWeight(FontWeight.Medium);
            Text.fontColor({ "id": 16777308, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Text.margin({ top: 4 });
        }, Text);
        Text.pop();
        // 问候语
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
            Row.padding({ left: 16, right: 16 });
            Row.justifyContent(FlexAlign.End);
            Row.alignItems(VerticalAlign.Center);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 16 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777354, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.width(28);
            Image.height(28);
            Image.fillColor({ "id": 16777308, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.onClick(() => {
                this.getUIContext().getRouter().pushUrl({ url: 'pages/SearchPage' });
            });
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777362, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.width(28);
            Image.height(28);
            Image.fillColor({ "id": 16777308, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
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
                            // 删除本地书籍
                            await bookDataManager.deleteBooksByIds(ObservedObject.GetRawObject(this.selectedBooks));
                            // 删除在线书籍（包括缓存文件）
                            for (const bookId of this.selectedOnlineBooks) {
                                // 先查询书籍信息获取书名
                                const book = await onlineBookDataManager.queryOnlineBookById(bookId);
                                if (book) {
                                    // 删除缓存文件
                                    await downloadManager.clearDownloads(bookId, book.title);
                                    hilog.info(0x0000, TAG, `已删除书籍缓存: ${book.title}`);
                                }
                                // 删除数据库记录
                                await onlineBookDataManager.deleteOnlineBook(bookId);
                            }
                            this.selectedBooks = [];
                            this.selectedOnlineBooks = [];
                            this.isEditMode = false;
                            await this.loadBooksFromDB();
                            // 提示用户
                            const totalDeleted = this.selectedBooks.length + this.selectedOnlineBooks.length;
                            if (totalDeleted > 0) {
                                this.getUIContext()
                                    .getPromptAction()
                                    .showToast({ message: `已删除${totalDeleted}本书籍及其缓存`, duration: 2000 });
                            }
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
                            this.selectedOnlineBooks = [];
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
            if (this.isExportMode) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create();
                        Row.width('100%');
                        Row.height(56);
                        Row.padding({ left: 16, right: 16 });
                        Row.justifyContent(FlexAlign.SpaceBetween);
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('导出');
                        Text.fontColor('#9F6548');
                        Text.onClick(async () => {
                            await this.exportSelectedBooks();
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
                            this.selectedExportBooks = [];
                            this.isExportMode = false;
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
                                        If.create();
                                        if (book.coverPath) {
                                            this.ifElseBranchUpdateFunction(0, () => {
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Image.create(book.coverPath);
                                                    Image.width('100%');
                                                    Image.aspectRatio(0.75);
                                                    Image.borderRadius(12);
                                                    Image.shadow({ radius: 8, color: '#1A191810', offsetX: 0, offsetY: 2 });
                                                }, Image);
                                            });
                                        }
                                        else {
                                            this.ifElseBranchUpdateFunction(1, () => {
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Column.create();
                                                    Column.width('100%');
                                                    Column.aspectRatio(0.75);
                                                    Column.borderRadius(12);
                                                    Column.linearGradient({
                                                        angle: 180,
                                                        colors: [[this.getBookColor(book.bookName)[0], 0], [this.getBookColor(book.bookName)[1], 1]]
                                                    });
                                                    Column.justifyContent(FlexAlign.Center);
                                                    Column.alignItems(HorizontalAlign.Center);
                                                    Column.shadow({ radius: 8, color: '#1A191810', offsetX: 0, offsetY: 2 });
                                                }, Column);
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Text.create(book.bookName.length > 4 ? book.bookName.substring(0, 4) : book.bookName);
                                                    Text.fontSize(16);
                                                    Text.fontWeight(FontWeight.Bold);
                                                    Text.fontColor('#FFFFFF');
                                                    Text.textAlign(TextAlign.Center);
                                                    Text.maxLines(2);
                                                    Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                                                }, Text);
                                                Text.pop();
                                                Column.pop();
                                            });
                                        }
                                    }, If);
                                    If.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        If.create();
                                        if (this.isEditMode) {
                                            this.ifElseBranchUpdateFunction(0, () => {
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Image.create(this.selectedBooks.includes(book.id) ? { "id": 16777313, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" } : { "id": 16777314, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
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
                                        Text.fontSize(13);
                                        Text.fontWeight(FontWeight.Medium);
                                        Text.fontColor({ "id": 16777307, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                        Text.maxLines(2);
                                        Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                                        Text.textAlign(TextAlign.Center);
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
                                };
                                const observedDeepRender = () => {
                                    this.observeComponentCreation2(itemCreation2, GridItem);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Column.create({ space: 8 });
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
                                            else if (this.isExportMode) {
                                                const index = this.selectedExportBooks.indexOf(book.id);
                                                if (index > -1) {
                                                    this.selectedExportBooks.splice(index, 1);
                                                }
                                                else {
                                                    this.selectedExportBooks.push(book.id);
                                                }
                                            }
                                            else {
                                                this.openOnlineBook(book);
                                            }
                                        });
                                    }, Column);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Stack.create({ alignContent: Alignment.TopEnd });
                                    }, Stack);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        If.create();
                                        if (book.cover) {
                                            this.ifElseBranchUpdateFunction(0, () => {
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Image.create(book.cover);
                                                    Image.width('100%');
                                                    Image.aspectRatio(0.75);
                                                    Image.borderRadius(12);
                                                    Image.shadow({ radius: 8, color: '#1A191810', offsetX: 0, offsetY: 2 });
                                                }, Image);
                                            });
                                        }
                                        else {
                                            this.ifElseBranchUpdateFunction(1, () => {
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Column.create();
                                                    Column.width('100%');
                                                    Column.aspectRatio(0.75);
                                                    Column.borderRadius(12);
                                                    Column.linearGradient({
                                                        angle: 180,
                                                        colors: [[this.getBookColor(book.title)[0], 0], [this.getBookColor(book.title)[1], 1]]
                                                    });
                                                    Column.justifyContent(FlexAlign.Center);
                                                    Column.alignItems(HorizontalAlign.Center);
                                                    Column.shadow({ radius: 8, color: '#1A191810', offsetX: 0, offsetY: 2 });
                                                }, Column);
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Text.create(book.title.length > 4 ? book.title.substring(0, 4) : book.title);
                                                    Text.fontSize(16);
                                                    Text.fontWeight(FontWeight.Bold);
                                                    Text.fontColor('#FFFFFF');
                                                    Text.textAlign(TextAlign.Center);
                                                    Text.maxLines(2);
                                                    Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                                                }, Text);
                                                Text.pop();
                                                Column.pop();
                                            });
                                        }
                                    }, If);
                                    If.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        If.create();
                                        if (this.isEditMode) {
                                            this.ifElseBranchUpdateFunction(0, () => {
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Image.create(this.selectedOnlineBooks.includes(book.id) ? { "id": 16777313, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" } : { "id": 16777314, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
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
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        If.create();
                                        if (this.isExportMode) {
                                            this.ifElseBranchUpdateFunction(0, () => {
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Image.create(this.selectedExportBooks.includes(book.id) ? { "id": 16777313, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" } : { "id": 16777314, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
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
                                        // 在线标识
                                        Text.fontSize(10);
                                        // 在线标识
                                        Text.fontColor(Color.White);
                                        // 在线标识
                                        Text.backgroundColor({ "id": 16777304, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                        // 在线标识
                                        Text.padding({ left: 6, right: 6, top: 2, bottom: 2 });
                                        // 在线标识
                                        Text.borderRadius(100);
                                        // 在线标识
                                        Text.position({ x: 4, y: 4 });
                                    }, Text);
                                    // 在线标识
                                    Text.pop();
                                    Stack.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(book.title);
                                        Text.fontSize(13);
                                        Text.fontWeight(FontWeight.Medium);
                                        Text.fontColor({ "id": 16777307, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                        Text.maxLines(2);
                                        Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                                        Text.textAlign(TextAlign.Center);
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
                                        Row.create({ space: 12 });
                                        Row.padding({ top: 8, bottom: 8 });
                                        Row.onClick(() => {
                                            this.jumper(book);
                                        });
                                    }, Row);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        If.create();
                                        if (book.coverPath) {
                                            this.ifElseBranchUpdateFunction(0, () => {
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Image.create(book.coverPath);
                                                    Image.width(60);
                                                    Image.aspectRatio(0.75);
                                                    Image.borderRadius(4);
                                                }, Image);
                                            });
                                        }
                                        else {
                                            this.ifElseBranchUpdateFunction(1, () => {
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Column.create();
                                                    Column.width(60);
                                                    Column.aspectRatio(0.75);
                                                    Column.borderRadius(4);
                                                    Column.linearGradient({
                                                        angle: 180,
                                                        colors: [[this.getBookColor(book.bookName)[0], 0], [this.getBookColor(book.bookName)[1], 1]]
                                                    });
                                                    Column.justifyContent(FlexAlign.Center);
                                                    Column.alignItems(HorizontalAlign.Center);
                                                }, Column);
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Text.create(book.bookName.length > 4 ? book.bookName.substring(0, 4) : book.bookName);
                                                    Text.fontSize(12);
                                                    Text.fontWeight(FontWeight.Bold);
                                                    Text.fontColor('#FFFFFF');
                                                    Text.textAlign(TextAlign.Center);
                                                    Text.maxLines(2);
                                                    Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                                                }, Text);
                                                Text.pop();
                                                Column.pop();
                                            });
                                        }
                                    }, If);
                                    If.pop();
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
                                        Text.fontColor({ "id": 16777270, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                        Text.maxLines(1);
                                        Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                                    }, Text);
                                    Text.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(`已读: ${book.currentChapter || book.progress || '未开始'}`);
                                        Text.fontSize(12);
                                        Text.fontColor({ "id": 16777270, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
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
                                        Row.create({ space: 12 });
                                        Row.padding({ top: 8, bottom: 8 });
                                        Row.onClick(() => {
                                            this.openOnlineBook(book);
                                        });
                                    }, Row);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Stack.create();
                                        Stack.width(60);
                                    }, Stack);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        If.create();
                                        if (book.cover) {
                                            this.ifElseBranchUpdateFunction(0, () => {
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Image.create(book.cover);
                                                    Image.width(60);
                                                    Image.aspectRatio(0.75);
                                                    Image.borderRadius(8);
                                                }, Image);
                                            });
                                        }
                                        else {
                                            this.ifElseBranchUpdateFunction(1, () => {
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Column.create();
                                                    Column.width(60);
                                                    Column.aspectRatio(0.75);
                                                    Column.borderRadius(8);
                                                    Column.linearGradient({
                                                        angle: 180,
                                                        colors: [[this.getBookColor(book.title)[0], 0], [this.getBookColor(book.title)[1], 1]]
                                                    });
                                                    Column.justifyContent(FlexAlign.Center);
                                                    Column.alignItems(HorizontalAlign.Center);
                                                }, Column);
                                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                    Text.create(book.title.length > 4 ? book.title.substring(0, 4) : book.title);
                                                    Text.fontSize(12);
                                                    Text.fontWeight(FontWeight.Bold);
                                                    Text.fontColor('#FFFFFF');
                                                    Text.textAlign(TextAlign.Center);
                                                    Text.maxLines(2);
                                                    Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                                                }, Text);
                                                Text.pop();
                                                Column.pop();
                                            });
                                        }
                                    }, If);
                                    If.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create('在线');
                                        Text.fontSize(10);
                                        Text.fontColor(Color.White);
                                        Text.backgroundColor({ "id": 16777304, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                        Text.padding({ left: 6, right: 6, top: 2, bottom: 2 });
                                        Text.borderRadius(100);
                                        Text.position({ x: 2, y: 2 });
                                    }, Text);
                                    Text.pop();
                                    Stack.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Column.create({ space: 4 });
                                        Column.alignItems(HorizontalAlign.Start);
                                        Column.layoutWeight(1);
                                    }, Column);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(book.title);
                                        Text.fontSize(16);
                                        Text.fontWeight(FontWeight.Bold);
                                        Text.maxLines(1);
                                        Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                                    }, Text);
                                    Text.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(book.author || '未知');
                                        Text.fontSize(14);
                                        Text.fontColor({ "id": 16777270, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                        Text.maxLines(1);
                                        Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                                    }, Text);
                                    Text.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(`已读: ${book.currentChapter || book.progress || '未开始'}`);
                                        Text.fontSize(12);
                                        Text.fontColor({ "id": 16777270, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
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
            Column.padding(20);
            Column.backgroundColor(Color.White);
            Column.borderRadius({ topLeft: 16, topRight: 16 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 标题
            Text.create('添加在线书籍');
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
            // 输入框和解析按钮
            Row.width('100%');
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TextInput.create({ placeholder: '请输入书籍链接', text: this.bookUrlInput });
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
            Button.fontSize(14);
            Button.fontColor(Color.White);
            Button.backgroundColor({ "id": 16777304, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Button.borderRadius(12);
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
            Column.width(160);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 16 });
            Row.height(50);
            Row.width('100%');
            Row.onClick(() => {
                this.isShow = false;
                this.showAddOnlineBookSheet = true;
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777315, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.width(20);
            Image.height(20);
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('添加在线书籍');
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
            Image.create({ "id": 16777330, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
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
            Image.create({ "id": 16777316, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
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
            Image.create({ "id": 16777320, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
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
                this.startExportMode();
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777319, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
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
                this.importBookList();
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777318, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
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
        // 直接跳转到阅读器（阅读进度由 UnifiedReaderPage 自动恢复）
        router.pushUrl({
            url: 'pages/UnifiedReaderPage',
            params: {
                source: 'online',
                bookId: book.id,
                bookTitle: book.title,
                bookUrl: book.bookUrl
            }
        }).then(() => {
            hilog.info(0x0000, TAG, '成功跳转到阅读器');
        }).catch((error: Error) => {
            hilog.error(0x0000, TAG, '跳转失败: ' + error.message);
        });
    }
    private jumper(book: BookInfo) {
        if (!book.filePath) {
            return;
        }
        // 直接打开自研阅读器
        this.getUIContext().getRouter().pushUrl({
            url: 'pages/UnifiedReaderPage',
            params: {
                source: 'local',
                filePath: book.filePath,
                bookTitle: book.bookName || ''
            }
        });
    }
    /**
     * 开始导出模式
     */
    private startExportMode(): void {
        if (this.onlineBooks.length === 0) {
            this.getUIContext()
                .getPromptAction()
                .showToast({ message: '没有可导出的在线书籍', duration: 2000 });
            return;
        }
        this.isExportMode = true;
        this.selectedExportBooks = [];
        // 自动切换到网格视图以便显示选择框
        if (!this.isGridView) {
            this.isGridView = true;
        }
    }
    /**
     * 导出选中的书籍
     */
    private async exportSelectedBooks(): Promise<void> {
        if (this.selectedExportBooks.length === 0) {
            this.getUIContext()
                .getPromptAction()
                .showToast({ message: '请至少选择一本书籍', duration: 2000 });
            return;
        }
        try {
            // 获取选中的书籍信息
            const selectedBooks = this.onlineBooks.filter((book: OnlineBookInfo): boolean => {
                return this.selectedExportBooks.includes(book.id);
            });
            hilog.info(0x0000, TAG, `准备导出${selectedBooks.length}本书籍`);
            // 导出书单到JSON文件
            const filePath = await bookListManager.exportBookList(selectedBooks);
            // 使用Share Kit分享文件
            await this.shareBookListFile(filePath);
            // 重置状态
            this.selectedExportBooks = [];
            this.isExportMode = false;
            this.getUIContext()
                .getPromptAction()
                .showToast({ message: `成功导出${selectedBooks.length}本书籍`, duration: 2000 });
        }
        catch (error) {
            hilog.error(0x0000, TAG, `导出书单失败: ${JSON.stringify(error)}`);
            this.getUIContext()
                .getPromptAction()
                .showToast({ message: '导出失败: ' + error, duration: 2000 });
        }
    }
    /**
     * 分享书单文件
     * @param filePath 文件路径
     */
    private async shareBookListFile(filePath: string): Promise<void> {
        try {
            hilog.info(0x0000, TAG, `准备分享文件: ${filePath}`);
            // 使用文件选择器保存文件
            const documentSaveOptions = new picker.DocumentSaveOptions();
            documentSaveOptions.newFileNames = [`booklist_${Date.now()}.json`];
            const documentPicker = new picker.DocumentViewPicker();
            const documentSaveResult = await documentPicker.save(documentSaveOptions);
            if (documentSaveResult && documentSaveResult.length > 0) {
                const destPath = decodeURI(documentSaveResult[0]);
                hilog.info(0x0000, TAG, `用户选择保存路径: ${destPath}`);
                // 读取源文件
                const srcFile = fs.openSync(filePath, fs.OpenMode.READ_ONLY);
                const stat = fs.statSync(filePath);
                const buffer = new ArrayBuffer(stat.size);
                fs.readSync(srcFile.fd, buffer);
                fs.closeSync(srcFile);
                // 写入目标文件
                const destFile = fs.openSync(destPath, fs.OpenMode.CREATE | fs.OpenMode.WRITE_ONLY);
                fs.writeSync(destFile.fd, buffer);
                fs.closeSync(destFile);
                hilog.info(0x0000, TAG, '文件保存成功');
            }
            else {
                hilog.info(0x0000, TAG, '用户取消保存');
            }
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            hilog.error(0x0000, TAG, `分享文件失败: ${errorMsg}`);
            throw new Error('分享文件失败: ' + errorMsg);
        }
    }
    /**
     * 导入书单
     */
    private async importBookList(): Promise<void> {
        try {
            // 初始化文件选择器
            let documentSelectOptions = new picker.DocumentSelectOptions();
            // 设置文件类型为JSON
            documentSelectOptions.fileSuffixFilters = ['.json'];
            let documentPicker = new picker.DocumentViewPicker();
            let documentSelectResult = await documentPicker.select(documentSelectOptions);
            if (!documentSelectResult || documentSelectResult.length <= 0) {
                hilog.info(0x0000, TAG, '用户取消选择文件');
                return;
            }
            // 获取文件路径
            let filePath: string = decodeURI(documentSelectResult[0]);
            hilog.info(0x0000, TAG, `选择的文件: ${filePath}`);
            // 导入书单
            const importCount = await bookListManager.importBookList(filePath);
            // 刷新书架
            await this.loadBooksFromDB();
            this.getUIContext()
                .getPromptAction()
                .showToast({ message: `成功导入${importCount}本书籍`, duration: 2000 });
        }
        catch (error) {
            hilog.error(0x0000, TAG, `导入书单失败: ${JSON.stringify(error)}`);
            this.getUIContext()
                .getPromptAction()
                .showToast({ message: '导入失败: ' + error, duration: 2000 });
        }
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
