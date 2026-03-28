if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface BookDetailPage_Params {
    showDetailMenu?: boolean;
    bookDetail?: BookDetailInfo | null;
    chapterList?: ChapterInfo[];
    isLoading?: boolean;
    errorMessage?: string;
    showChapterList?: boolean;
    bookUrl?: string;
    bookTitle?: string;
    bookAuthor?: string;
    bookCover?: string;
    isInBookshelf?: boolean;
    onlineBookId?: number;
    isCaching?: boolean;
    cacheProgress?: number;
    isCacheComplete?: boolean;
}
import hilog from "@ohos:hilog";
import router from "@ohos:router";
import { bookSourceManager } from "@bundle:liubai.yuedu.hos/entry/ets/managers/BookSourceManager";
import type { BookDetailInfo, ChapterInfo } from '../models/BookSourceModel';
import { onlineBookDataManager } from "@bundle:liubai.yuedu.hos/entry/ets/utils/OnlineBookDataManager";
import { OnlineBookInfo } from "@bundle:liubai.yuedu.hos/entry/ets/models/OnlineBookModel";
import type { BookDetailUpdateInfo } from "@bundle:liubai.yuedu.hos/entry/ets/models/OnlineBookModel";
import { downloadManager } from "@bundle:liubai.yuedu.hos/entry/ets/managers/DownloadManager";
import type common from "@ohos:app.ability.common";
import fs from "@ohos:file.fs";
import picker from "@ohos:file.picker";
import type { BusinessError } from "@ohos:base";
const TAG: string = 'BookDetailPage';
/**
 * 页面参数接口
 */
interface PageParams {
    bookUrl?: string; // 书籍详情页URL
    bookTitle?: string; // 书籍标题（用于显示）
    bookAuthor?: string; // 书籍作者（用于显示）
    bookCover?: string; // 书籍封面（用于显示）
}
class BookDetailPage extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__showDetailMenu = new ObservedPropertySimplePU(false, this, "showDetailMenu");
        this.__bookDetail = new ObservedPropertyObjectPU(null, this, "bookDetail");
        this.__chapterList = new ObservedPropertyObjectPU([], this, "chapterList");
        this.__isLoading = new ObservedPropertySimplePU(true, this, "isLoading");
        this.__errorMessage = new ObservedPropertySimplePU('', this, "errorMessage");
        this.__showChapterList = new ObservedPropertySimplePU(false, this, "showChapterList");
        this.__bookUrl = new ObservedPropertySimplePU('', this, "bookUrl");
        this.__bookTitle = new ObservedPropertySimplePU('', this, "bookTitle");
        this.__bookAuthor = new ObservedPropertySimplePU('', this, "bookAuthor");
        this.__bookCover = new ObservedPropertySimplePU('', this, "bookCover");
        this.__isInBookshelf = new ObservedPropertySimplePU(false, this, "isInBookshelf");
        this.__onlineBookId = new ObservedPropertySimplePU(0, this, "onlineBookId");
        this.__isCaching = new ObservedPropertySimplePU(false, this, "isCaching");
        this.__cacheProgress = new ObservedPropertySimplePU(0, this, "cacheProgress");
        this.__isCacheComplete = new ObservedPropertySimplePU(false, this, "isCacheComplete");
        this.setInitiallyProvidedValue(params);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: BookDetailPage_Params) {
        if (params.showDetailMenu !== undefined) {
            this.showDetailMenu = params.showDetailMenu;
        }
        if (params.bookDetail !== undefined) {
            this.bookDetail = params.bookDetail;
        }
        if (params.chapterList !== undefined) {
            this.chapterList = params.chapterList;
        }
        if (params.isLoading !== undefined) {
            this.isLoading = params.isLoading;
        }
        if (params.errorMessage !== undefined) {
            this.errorMessage = params.errorMessage;
        }
        if (params.showChapterList !== undefined) {
            this.showChapterList = params.showChapterList;
        }
        if (params.bookUrl !== undefined) {
            this.bookUrl = params.bookUrl;
        }
        if (params.bookTitle !== undefined) {
            this.bookTitle = params.bookTitle;
        }
        if (params.bookAuthor !== undefined) {
            this.bookAuthor = params.bookAuthor;
        }
        if (params.bookCover !== undefined) {
            this.bookCover = params.bookCover;
        }
        if (params.isInBookshelf !== undefined) {
            this.isInBookshelf = params.isInBookshelf;
        }
        if (params.onlineBookId !== undefined) {
            this.onlineBookId = params.onlineBookId;
        }
        if (params.isCaching !== undefined) {
            this.isCaching = params.isCaching;
        }
        if (params.cacheProgress !== undefined) {
            this.cacheProgress = params.cacheProgress;
        }
        if (params.isCacheComplete !== undefined) {
            this.isCacheComplete = params.isCacheComplete;
        }
    }
    updateStateVars(params: BookDetailPage_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__showDetailMenu.purgeDependencyOnElmtId(rmElmtId);
        this.__bookDetail.purgeDependencyOnElmtId(rmElmtId);
        this.__chapterList.purgeDependencyOnElmtId(rmElmtId);
        this.__isLoading.purgeDependencyOnElmtId(rmElmtId);
        this.__errorMessage.purgeDependencyOnElmtId(rmElmtId);
        this.__showChapterList.purgeDependencyOnElmtId(rmElmtId);
        this.__bookUrl.purgeDependencyOnElmtId(rmElmtId);
        this.__bookTitle.purgeDependencyOnElmtId(rmElmtId);
        this.__bookAuthor.purgeDependencyOnElmtId(rmElmtId);
        this.__bookCover.purgeDependencyOnElmtId(rmElmtId);
        this.__isInBookshelf.purgeDependencyOnElmtId(rmElmtId);
        this.__onlineBookId.purgeDependencyOnElmtId(rmElmtId);
        this.__isCaching.purgeDependencyOnElmtId(rmElmtId);
        this.__cacheProgress.purgeDependencyOnElmtId(rmElmtId);
        this.__isCacheComplete.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__showDetailMenu.aboutToBeDeleted();
        this.__bookDetail.aboutToBeDeleted();
        this.__chapterList.aboutToBeDeleted();
        this.__isLoading.aboutToBeDeleted();
        this.__errorMessage.aboutToBeDeleted();
        this.__showChapterList.aboutToBeDeleted();
        this.__bookUrl.aboutToBeDeleted();
        this.__bookTitle.aboutToBeDeleted();
        this.__bookAuthor.aboutToBeDeleted();
        this.__bookCover.aboutToBeDeleted();
        this.__isInBookshelf.aboutToBeDeleted();
        this.__onlineBookId.aboutToBeDeleted();
        this.__isCaching.aboutToBeDeleted();
        this.__cacheProgress.aboutToBeDeleted();
        this.__isCacheComplete.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __showDetailMenu: ObservedPropertySimplePU<boolean>; // 详情页菜单弹出状态
    get showDetailMenu() {
        return this.__showDetailMenu.get();
    }
    set showDetailMenu(newValue: boolean) {
        this.__showDetailMenu.set(newValue);
    }
    private __bookDetail: ObservedPropertyObjectPU<BookDetailInfo | null>; // 书籍详情
    get bookDetail() {
        return this.__bookDetail.get();
    }
    set bookDetail(newValue: BookDetailInfo | null) {
        this.__bookDetail.set(newValue);
    }
    private __chapterList: ObservedPropertyObjectPU<ChapterInfo[]>; // 章节列表
    get chapterList() {
        return this.__chapterList.get();
    }
    set chapterList(newValue: ChapterInfo[]) {
        this.__chapterList.set(newValue);
    }
    private __isLoading: ObservedPropertySimplePU<boolean>; // 加载状态
    get isLoading() {
        return this.__isLoading.get();
    }
    set isLoading(newValue: boolean) {
        this.__isLoading.set(newValue);
    }
    private __errorMessage: ObservedPropertySimplePU<string>; // 错误信息
    get errorMessage() {
        return this.__errorMessage.get();
    }
    set errorMessage(newValue: string) {
        this.__errorMessage.set(newValue);
    }
    private __showChapterList: ObservedPropertySimplePU<boolean>; // 是否显示章节列表
    get showChapterList() {
        return this.__showChapterList.get();
    }
    set showChapterList(newValue: boolean) {
        this.__showChapterList.set(newValue);
    }
    private __bookUrl: ObservedPropertySimplePU<string>; // 书籍详情页URL
    get bookUrl() {
        return this.__bookUrl.get();
    }
    set bookUrl(newValue: string) {
        this.__bookUrl.set(newValue);
    }
    private __bookTitle: ObservedPropertySimplePU<string>; // 书籍标题
    get bookTitle() {
        return this.__bookTitle.get();
    }
    set bookTitle(newValue: string) {
        this.__bookTitle.set(newValue);
    }
    private __bookAuthor: ObservedPropertySimplePU<string>; // 书籍作者
    get bookAuthor() {
        return this.__bookAuthor.get();
    }
    set bookAuthor(newValue: string) {
        this.__bookAuthor.set(newValue);
    }
    private __bookCover: ObservedPropertySimplePU<string>; // 书籍封面
    get bookCover() {
        return this.__bookCover.get();
    }
    set bookCover(newValue: string) {
        this.__bookCover.set(newValue);
    }
    private __isInBookshelf: ObservedPropertySimplePU<boolean>; // 是否已加入书架
    get isInBookshelf() {
        return this.__isInBookshelf.get();
    }
    set isInBookshelf(newValue: boolean) {
        this.__isInBookshelf.set(newValue);
    }
    private __onlineBookId: ObservedPropertySimplePU<number>; // 在线书籍ID
    get onlineBookId() {
        return this.__onlineBookId.get();
    }
    set onlineBookId(newValue: number) {
        this.__onlineBookId.set(newValue);
    }
    private __isCaching: ObservedPropertySimplePU<boolean>; // 是否正在缓存
    get isCaching() {
        return this.__isCaching.get();
    }
    set isCaching(newValue: boolean) {
        this.__isCaching.set(newValue);
    }
    private __cacheProgress: ObservedPropertySimplePU<number>; // 缓存进度 0-100
    get cacheProgress() {
        return this.__cacheProgress.get();
    }
    set cacheProgress(newValue: number) {
        this.__cacheProgress.set(newValue);
    }
    private __isCacheComplete: ObservedPropertySimplePU<boolean>; // 缓存是否完成
    get isCacheComplete() {
        return this.__isCacheComplete.get();
    }
    set isCacheComplete(newValue: boolean) {
        this.__isCacheComplete.set(newValue);
    }
    /**
     * 页面显示时初始化数据
     */
    async aboutToAppear() {
        try {
            const params = router.getParams() as PageParams;
            if (params) {
                this.bookUrl = params.bookUrl || '';
                this.bookTitle = params.bookTitle || '书籍详情';
                this.bookAuthor = params.bookAuthor || '';
                this.bookCover = params.bookCover || '';
                hilog.info(0x0000, TAG, `接收到页面参数: URL=${this.bookUrl}, 标题=${this.bookTitle}, 作者=${this.bookAuthor}`);
            }
            // 初始化在线书籍数据管理器和下载管理器
            const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
            await onlineBookDataManager.init(context);
            downloadManager.init(context);
            // 检查是否已加入书架，并尝试从缓存加载书籍详情
            await this.checkBookshelfStatus();
            if (this.bookUrl) {
                // 如果已经从缓存加载了书籍详情，在后台静默刷新
                if (this.bookDetail) {
                    hilog.info(0x0000, TAG, '已从缓存加载书籍详情，后台刷新中...');
                    this.isLoading = false;
                    // 后台静默刷新，不显示加载状态
                    this.loadBookDetail(true);
                }
                else {
                    // 没有缓存，正常加载
                    await this.loadBookDetail(false);
                }
            }
            else {
                this.errorMessage = '缺少书籍链接信息';
                this.isLoading = false;
            }
        }
        catch (error) {
            hilog.error(0x0000, TAG, '页面初始化失败: ' + JSON.stringify(error));
            this.errorMessage = '页面初始化失败';
            this.isLoading = false;
        }
    }
    /**
     * 使用鹿析管理器加载书籍详情
     * @param silent 是否静默刷新（不显示加载状态，不覆盖错误信息）
     */
    private async loadBookDetail(silent: boolean = false): Promise<void> {
        try {
            if (!silent) {
                this.isLoading = true;
                this.errorMessage = '';
            }
            // 使用鹿析管理器获取书籍详情
            const detailResult = await bookSourceManager.getBookDetail(this.bookUrl);
            if (detailResult.success && detailResult.data) {
                this.bookDetail = detailResult.data;
                hilog.info(0x0000, TAG, `成功加载书籍详情: ${detailResult.data.title}，来源: ${detailResult.source}`);
                // 如果书籍已在书架中，更新缓存的书籍信息
                if (this.isInBookshelf && this.onlineBookId > 0) {
                    try {
                        const updateInfo: BookDetailUpdateInfo = {
                            title: detailResult.data.title,
                            author: detailResult.data.author || '',
                            cover: detailResult.data.cover || '',
                            description: detailResult.data.description || '',
                            category: detailResult.data.category || '',
                            status: detailResult.data.status || '',
                            latestChapter: detailResult.data.latestChapter || '',
                            updateTime: detailResult.data.updateTime || ''
                        };
                        await onlineBookDataManager.updateOnlineBookDetail(this.onlineBookId, updateInfo);
                        hilog.info(0x0000, TAG, '已更新缓存的书籍详情');
                    }
                    catch (updateError) {
                        hilog.warn(0x0000, TAG, '更新缓存书籍详情失败: ' + JSON.stringify(updateError));
                    }
                }
                // 如果有目录URL，获取章节列表
                if (detailResult.data.tocUrl) {
                    await this.loadChapterList(detailResult.data.tocUrl);
                }
                else {
                    // 尝试使用当前URL获取章节列表
                    await this.loadChapterList(this.bookUrl);
                }
            }
            else {
                if (!silent) {
                    this.errorMessage = detailResult.error || '获取书籍详情失败';
                }
                hilog.error(0x0000, TAG, '获取书籍详情失败: ' + (detailResult.error || '未知错误'));
            }
        }
        catch (error) {
            hilog.error(0x0000, TAG, '加载书籍详情失败: ' + JSON.stringify(error));
            if (!silent) {
                this.errorMessage = '加载失败，请重试';
            }
        }
        finally {
            if (!silent) {
                this.isLoading = false;
            }
        }
    }
    /**
     * 使用鹿析管理器加载章节列表
     * @param tocUrl 目录URL
     */
    private async loadChapterList(tocUrl: string): Promise<void> {
        try {
            const chapterResult = await bookSourceManager.getChapterList(tocUrl);
            if (chapterResult.success && chapterResult.data) {
                this.chapterList = chapterResult.data;
                hilog.info(0x0000, TAG, `成功加载 ${chapterResult.data.length} 个章节，来源: ${chapterResult.source}`);
            }
            else {
                hilog.warn(0x0000, TAG, '获取章节列表失败: ' + (chapterResult.error || '未知错误'));
                // 章节列表获取失败不影响书籍详情显示
                this.chapterList = [];
            }
        }
        catch (error) {
            hilog.error(0x0000, TAG, '加载章节列表失败: ' + JSON.stringify(error));
            this.chapterList = [];
        }
    }
    /**
     * 显示章节列表
     */
    private showChapters(): void {
        this.showChapterList = true;
    }
    /**
     * 检查书籍是否已加入书架
     */
    private async checkBookshelfStatus(): Promise<void> {
        try {
            const book = await onlineBookDataManager.queryOnlineBookByUrl(this.bookUrl);
            if (book) {
                this.isInBookshelf = true;
                this.onlineBookId = book.id;
                hilog.info(0x0000, TAG, `书籍已在书架中: ${book.title}`);
                // 从缓存的书籍信息构建BookDetailInfo，立即显示
                if (book.title) {
                    this.bookDetail = {
                        cover: book.cover || this.bookCover || '',
                        title: book.title || this.bookTitle || '',
                        author: book.author || this.bookAuthor || '',
                        description: book.description || '',
                        status: book.status || '',
                        updateTime: book.updateTime || '',
                        latestChapter: book.latestChapter || '',
                        category: book.category || '',
                    };
                    hilog.info(0x0000, TAG, `从缓存加载书籍详情: ${book.title}`);
                }
                // 检查是否已有合并文件
                const mergedFilePath = downloadManager.getMergedFilePath(book.id, book.title);
                if (mergedFilePath) {
                    this.isCacheComplete = true;
                    hilog.info(0x0000, TAG, `书籍已缓存完成: ${mergedFilePath}`);
                }
                else {
                    // 检查是否正在下载
                    if (downloadManager.isDownloading(book.id)) {
                        this.isCaching = true;
                        this.cacheProgress = downloadManager.getDownloadProgress(book.id);
                        hilog.info(0x0000, TAG, `书籍正在缓存中: ${this.cacheProgress}%`);
                    }
                }
            }
            else {
                this.isInBookshelf = false;
                this.onlineBookId = 0;
            }
        }
        catch (error) {
            hilog.error(0x0000, TAG, '检查书架状态失败: ' + JSON.stringify(error));
        }
    }
    /**
     * 加入书架
     */
    private async addToBookshelf(): Promise<void> {
        if (!this.bookDetail) {
            return;
        }
        try {
            const onlineBook = new OnlineBookInfo();
            onlineBook.bookUrl = this.bookUrl;
            onlineBook.title = this.bookDetail.title;
            onlineBook.author = this.bookDetail.author || '';
            onlineBook.cover = this.bookDetail.cover || '';
            onlineBook.description = this.bookDetail.description || '';
            onlineBook.category = this.bookDetail.category || '';
            onlineBook.status = this.bookDetail.status || '';
            onlineBook.latestChapter = this.bookDetail.latestChapter || '';
            onlineBook.updateTime = this.bookDetail.updateTime || '';
            onlineBook.totalChapters = this.chapterList.length;
            const bookId = await onlineBookDataManager.addOnlineBook(onlineBook);
            this.onlineBookId = bookId;
            this.isInBookshelf = true;
            this.getUIContext()
                .getPromptAction()
                .showToast({ message: '已加入书架', duration: 2000 });
            hilog.info(0x0000, TAG, `书籍已加入书架: ${onlineBook.title}`);
        }
        catch (error) {
            hilog.error(0x0000, TAG, '加入书架失败: ' + JSON.stringify(error));
            this.getUIContext()
                .getPromptAction()
                .showToast({ message: '加入书架失败', duration: 2000 });
        }
    }
    /**
     * 开始缓存全部章节
     */
    private startCacheAll(): void {
        if (!this.bookDetail || this.chapterList.length === 0) {
            return;
        }
        this.isCaching = true;
        this.cacheProgress = 0;
        hilog.info(0x0000, TAG, `开始缓存全部章节: ${this.chapterList.length} 章`);
        // 开始下载并合并章节
        downloadManager.startDownloadBook(this.onlineBookId, this.bookDetail.title, this.chapterList, (current: number, total: number) => {
            // 进度回调
            this.cacheProgress = Math.round((current / total) * 100);
            hilog.info(0x0000, TAG, `缓存进度: ${this.cacheProgress}%`);
        }, () => {
            // 完成回调
            this.isCaching = false;
            this.isCacheComplete = true;
            hilog.info(0x0000, TAG, '缓存完成');
            this.getUIContext()
                .getPromptAction()
                .showToast({ message: '缓存完成，可以开始阅读了', duration: 2000 });
        });
    }
    /**
     * 开始阅读
     */
    private async startReading(): Promise<void> {
        hilog.info(0x0000, TAG, '=== 开始阅读 ===');
        // 如果章节列表为空，尝试重新加载
        if (this.chapterList.length === 0) {
            hilog.info(0x0000, TAG, '章节列表为空，尝试重新加载...');
            const tocUrl = this.bookDetail?.tocUrl || this.bookUrl;
            if (tocUrl) {
                await this.loadChapterList(tocUrl);
            }
            if (this.chapterList.length === 0) {
                this.getUIContext()
                    .getPromptAction()
                    .showToast({ message: '暂无章节可阅读，请稍后重试', duration: 2000 });
                return;
            }
        }
        // 跳转到自研阅读器（阅读进度由 UnifiedReaderPage 自动从 Preferences 恢复）
        router.pushUrl({
            url: 'pages/UnifiedReaderPage',
            params: {
                source: 'online',
                bookId: this.onlineBookId,
                bookTitle: this.bookDetail?.title || this.bookTitle,
                chapters: this.chapterList
            }
        }).then(() => {
            hilog.info(0x0000, TAG, '成功跳转到阅读器');
        }).catch((error: Error) => {
            hilog.error(0x0000, TAG, '跳转失败: ' + error.message);
            this.getUIContext()
                .getPromptAction()
                .showToast({ message: '打开阅读器失败', duration: 2000 });
        });
    }
    /**
     * 打开章节阅读
     * @param chapter 章节信息
     */
    private async openChapter(chapter: ChapterInfo): Promise<void> {
        hilog.info(0x0000, TAG, '打开章节: ' + chapter.title);
        // 查找章节索引
        const chapterIndex = this.chapterList.findIndex(c => c.url === chapter.url);
        hilog.info(0x0000, TAG, `跳转到阅读器，章节: ${chapter.title}, 索引: ${chapterIndex}`);
        router.pushUrl({
            url: 'pages/UnifiedReaderPage',
            params: {
                source: 'online',
                bookId: this.onlineBookId,
                bookTitle: this.bookDetail?.title || this.bookTitle,
                chapterIndex: chapterIndex >= 0 ? chapterIndex : 0,
                chapters: this.chapterList
            }
        }).then(() => {
            hilog.info(0x0000, TAG, '成功跳转到阅读器');
        }).catch((error: Error) => {
            hilog.error(0x0000, TAG, '跳转失败: ' + error.message);
            this.getUIContext()
                .getPromptAction()
                .showToast({ message: '打开阅读器失败', duration: 2000 });
        });
    }
    /**
     * 导出合并的TXT文件
     */
    private async exportMergedFile(): Promise<void> {
        try {
            // 检查是否有合并文件
            const mergedFilePath = downloadManager.getMergedFilePath(this.onlineBookId, this.bookDetail?.title || this.bookTitle);
            if (!mergedFilePath) {
                this.getUIContext()
                    .getPromptAction()
                    .showToast({ message: '请先缓存全部章节', duration: 2000 });
                return;
            }
            // 检查文件是否存在
            if (!fs.accessSync(mergedFilePath)) {
                this.getUIContext()
                    .getPromptAction()
                    .showToast({ message: '缓存文件不存在', duration: 2000 });
                return;
            }
            hilog.info(0x0000, TAG, `准备导出文件: ${mergedFilePath}`);
            // 使用文件选择器让用户选择保存位置
            const documentSaveOptions = new picker.DocumentSaveOptions();
            documentSaveOptions.newFileNames = [`${this.bookDetail?.title || this.bookTitle}.txt`];
            const documentPicker = new picker.DocumentViewPicker();
            documentPicker.save(documentSaveOptions).then(async (result: Array<string>) => {
                if (result && result.length > 0) {
                    const destUri = result[0];
                    hilog.info(0x0000, TAG, `用户选择的保存路径: ${destUri}`);
                    try {
                        // 读取源文件
                        const srcFile = fs.openSync(mergedFilePath, fs.OpenMode.READ_ONLY);
                        const stat = fs.statSync(mergedFilePath);
                        const buffer = new ArrayBuffer(stat.size);
                        fs.readSync(srcFile.fd, buffer);
                        fs.closeSync(srcFile);
                        // 写入目标文件
                        const destFile = fs.openSync(destUri, fs.OpenMode.WRITE_ONLY | fs.OpenMode.CREATE);
                        fs.writeSync(destFile.fd, buffer);
                        fs.closeSync(destFile);
                        hilog.info(0x0000, TAG, `文件导出成功: ${destUri}`);
                        this.getUIContext()
                            .getPromptAction()
                            .showToast({ message: '导出成功', duration: 2000 });
                    }
                    catch (error) {
                        const err = error as BusinessError;
                        hilog.error(0x0000, TAG, `文件复制失败: code=${err.code}, message=${err.message}`);
                        this.getUIContext()
                            .getPromptAction()
                            .showToast({ message: '导出失败', duration: 2000 });
                    }
                }
                else {
                    hilog.info(0x0000, TAG, '用户取消了保存');
                }
            }).catch((error: BusinessError) => {
                hilog.error(0x0000, TAG, `文件选择器错误: code=${error.code}, message=${error.message}`);
                this.getUIContext()
                    .getPromptAction()
                    .showToast({ message: '打开文件选择器失败', duration: 2000 });
            });
        }
        catch (error) {
            hilog.error(0x0000, TAG, '导出文件失败: ' + JSON.stringify(error));
            this.getUIContext()
                .getPromptAction()
                .showToast({ message: '导出失败', duration: 2000 });
        }
    }
    /**
     * 返回上一页
     */
    private goBack(): void {
        router.back();
    }
    /**
     * 构建顶部导航栏
     */
    private buildHeader(parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
            Row.height(56);
            Row.padding({ left: 16, right: 16 });
            Row.margin({ top: 44 });
            Row.backgroundColor({ "id": 16777304, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 返回按钮
            Button.createWithChild();
            // 返回按钮
            Button.width(40);
            // 返回按钮
            Button.height(40);
            // 返回按钮
            Button.backgroundColor(Color.Transparent);
            // 返回按钮
            Button.onClick(() => {
                this.goBack();
            });
        }, Button);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('‹');
            Text.fontSize(24);
            Text.fontColor('#FFFFFF');
            Text.fontWeight(FontWeight.Bold);
        }, Text);
        Text.pop();
        // 返回按钮
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 标题
            Text.create(this.bookDetail?.title || this.bookTitle || '书籍详情');
            // 标题
            Text.fontSize(18);
            // 标题
            Text.fontWeight(FontWeight.Medium);
            // 标题
            Text.fontColor('#FFFFFF');
            // 标题
            Text.layoutWeight(1);
            // 标题
            Text.textAlign(TextAlign.Center);
            // 标题
            Text.maxLines(1);
            // 标题
            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
        }, Text);
        // 标题
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 菜单按钮
            Button.createWithChild();
            // 菜单按钮
            Button.width(40);
            // 菜单按钮
            Button.height(40);
            // 菜单按钮
            Button.backgroundColor(Color.Transparent);
            // 菜单按钮
            Button.bindPopup(this.showDetailMenu, {
                builder: { builder: this.buildDetailMenuPopup.bind(this) },
                placement: Placement.BottomRight,
                popupColor: Color.White,
                onStateChange: (e) => {
                    if (!e.isVisible) {
                        this.showDetailMenu = false;
                    }
                }
            });
            // 菜单按钮
            Button.onClick(() => {
                this.showDetailMenu = !this.showDetailMenu;
            });
        }, Button);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('≡');
            Text.fontSize(22);
            Text.fontColor('#FFFFFF');
        }, Text);
        Text.pop();
        // 菜单按钮
        Button.pop();
        Row.pop();
    }
    private buildDetailMenuPopup(parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width(160);
            Column.padding({ top: 4, bottom: 4 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
            Row.height(44);
            Row.padding({ left: 16, right: 16 });
            Row.alignItems(VerticalAlign.Center);
            Row.onClick(() => {
                this.showDetailMenu = false;
                if (!this.isCaching && !this.isCacheComplete) {
                    this.startCacheAll();
                }
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('📥');
            Text.fontSize(16);
            Text.margin({ right: 8 });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.isCaching
                ? `缓存中 ${this.cacheProgress}%`
                : (this.isCacheComplete ? '已缓存' : '缓存全部'));
            Text.fontSize(14);
            Text.fontColor(this.isCaching ? '#999' : { "id": 16777307, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        }, Text);
        Text.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Divider.create();
            Divider.color('#F0F0F0');
        }, Divider);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
            Row.height(44);
            Row.padding({ left: 16, right: 16 });
            Row.alignItems(VerticalAlign.Center);
            Row.onClick(() => {
                this.showDetailMenu = false;
                this.exportMergedFile();
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('📄');
            Text.fontSize(16);
            Text.margin({ right: 8 });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('导出TXT');
            Text.fontSize(14);
            Text.fontColor(this.isCacheComplete ? { "id": 16777307, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" } : { "id": 16777309, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        }, Text);
        Text.pop();
        Row.pop();
        Column.pop();
    }
    /**
     * 构建默认书籍信息（使用传递的参数）
     */
    private buildDefaultBookInfo(parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.bookTitle || this.bookAuthor || this.bookCover) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.width('100%');
                        Column.height('45%');
                        Column.padding(20);
                        Column.backgroundColor({ "id": 16777274, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        Column.borderRadius(16);
                        Column.margin({ left: 16, right: 16, top: 2 });
                        Column.shadow({
                            radius: 8,
                            color: '#0D000000',
                            offsetY: 2
                        });
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create();
                        Row.width('100%');
                        Row.alignItems(VerticalAlign.Top);
                        Row.justifyContent(FlexAlign.Start);
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 封面图片
                        Image.create(this.bookCover || { "id": 16777328, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        // 封面图片
                        Image.width(100);
                        // 封面图片
                        Image.height(130);
                        // 封面图片
                        Image.objectFit(ImageFit.Cover);
                        // 封面图片
                        Image.borderRadius(8);
                        // 封面图片
                        Image.shadow({
                            radius: 8,
                            color: '#20000000',
                            offsetY: 4
                        });
                    }, Image);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 书籍信息
                        Column.create();
                        // 书籍信息
                        Column.layoutWeight(1);
                        // 书籍信息
                        Column.margin({ left: 16 });
                        // 书籍信息
                        Column.alignItems(HorizontalAlign.Start);
                        // 书籍信息
                        Column.justifyContent(FlexAlign.SpaceBetween);
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 书名
                        Text.create(this.bookTitle || '未知书名');
                        // 书名
                        Text.fontSize(20);
                        // 书名
                        Text.fontWeight(FontWeight.Bold);
                        // 书名
                        Text.fontColor({ "id": 16777307, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        // 书名
                        Text.maxLines(2);
                        // 书名
                        Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                        // 书名
                        Text.width('100%');
                        // 书名
                        Text.textAlign(TextAlign.Start);
                        // 书名
                        Text.margin({ bottom: 8 });
                    }, Text);
                    // 书名
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 作者
                        Text.create(`作者：${this.bookAuthor || '未知作者'}`);
                        // 作者
                        Text.fontSize(14);
                        // 作者
                        Text.fontColor({ "id": 16777308, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        // 作者
                        Text.width('100%');
                        // 作者
                        Text.textAlign(TextAlign.Start);
                        // 作者
                        Text.margin({ bottom: 6 });
                    }, Text);
                    // 作者
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 状态
                        Text.create('状态：数据加载中...');
                        // 状态
                        Text.fontSize(14);
                        // 状态
                        Text.fontColor({ "id": 16777308, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        // 状态
                        Text.width('100%');
                        // 状态
                        Text.textAlign(TextAlign.Start);
                        // 状态
                        Text.margin({ bottom: 6 });
                    }, Text);
                    // 状态
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 提示信息
                        Text.create('正在获取详细信息...');
                        // 提示信息
                        Text.fontSize(14);
                        // 提示信息
                        Text.fontColor({ "id": 16777309, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        // 提示信息
                        Text.width('100%');
                        // 提示信息
                        Text.textAlign(TextAlign.Start);
                    }, Text);
                    // 提示信息
                    Text.pop();
                    // 书籍信息
                    Column.pop();
                    Row.pop();
                    Column.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
    }
    /**
     * 构建书籍信息卡片
     */
    private buildBookInfo(parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.bookDetail) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.width('100%');
                        Column.height('48%');
                        Column.justifyContent(FlexAlign.Start);
                        Column.padding(20);
                        Column.backgroundColor({ "id": 16777274, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        Column.borderRadius(16);
                        Column.margin({ left: 16, right: 16, top: 2 });
                        Column.shadow({
                            radius: 8,
                            color: '#0D000000',
                            offsetY: 2
                        });
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create();
                        Row.width('100%');
                        Row.margin({ bottom: 24 });
                        Row.alignItems(VerticalAlign.Top);
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 封面图片
                        Image.create(this.bookDetail.cover);
                        // 封面图片
                        Image.width(110);
                        // 封面图片
                        Image.height(150);
                        // 封面图片
                        Image.objectFit(ImageFit.Cover);
                        // 封面图片
                        Image.borderRadius(8);
                        // 封面图片
                        Image.shadow({
                            radius: 8,
                            color: '#20000000',
                            offsetY: 4
                        });
                    }, Image);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 书籍信息
                        Column.create();
                        // 书籍信息
                        Column.layoutWeight(1);
                        // 书籍信息
                        Column.margin({ left: 8 });
                        // 书籍信息
                        Column.alignItems(HorizontalAlign.Start);
                        // 书籍信息
                        Column.justifyContent(FlexAlign.SpaceBetween);
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 书名
                        Text.create(this.bookDetail.title);
                        // 书名
                        Text.fontSize(20);
                        // 书名
                        Text.fontWeight(FontWeight.Bold);
                        // 书名
                        Text.fontColor({ "id": 16777307, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        // 书名
                        Text.maxLines(2);
                        // 书名
                        Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                        // 书名
                        Text.width('100%');
                        // 书名
                        Text.textAlign(TextAlign.Start);
                        // 书名
                        Text.margin({ bottom: 24 });
                    }, Text);
                    // 书名
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        If.create();
                        // 分类和字数标签
                        if (this.bookDetail.category || this.bookDetail.wordCount) {
                            this.ifElseBranchUpdateFunction(0, () => {
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    Row.create();
                                }, Row);
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    If.create();
                                    if (this.bookDetail.category) {
                                        this.ifElseBranchUpdateFunction(0, () => {
                                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                Text.create(this.bookDetail.category);
                                                Text.fontSize(14);
                                                Text.fontColor({ "id": 16777308, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                                Text.width('wrapContent');
                                                Text.textAlign(TextAlign.Start);
                                                Text.margin({ bottom: 18 });
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
                                    if (this.bookDetail.wordCount) {
                                        this.ifElseBranchUpdateFunction(0, () => {
                                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                Text.create(this.bookDetail.wordCount);
                                                Text.fontSize(14);
                                                Text.fontColor({ "id": 16777308, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                                Text.width('wrapContent');
                                                Text.textAlign(TextAlign.Start);
                                                Text.margin({ bottom: 18 });
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
                            });
                        }
                        else {
                            this.ifElseBranchUpdateFunction(1, () => {
                            });
                        }
                    }, If);
                    If.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create();
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 状态
                        Text.create(`${this.bookDetail.status}`);
                        // 状态
                        Text.fontSize(14);
                        // 状态
                        Text.fontColor({ "id": 16777308, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        // 状态
                        Text.width('wrapContent');
                        // 状态
                        Text.textAlign(TextAlign.Start);
                        // 状态
                        Text.margin({ bottom: 6 });
                    }, Text);
                    // 状态
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 更新时间
                        Text.create(`🕒${this.bookDetail.updateTime}`);
                        // 更新时间
                        Text.fontSize(14);
                        // 更新时间
                        Text.fontColor({ "id": 16777308, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        // 更新时间
                        Text.width('wrapContent');
                        // 更新时间
                        Text.textAlign(TextAlign.Start);
                        // 更新时间
                        Text.margin({ bottom: 6 });
                    }, Text);
                    // 更新时间
                    Text.pop();
                    Row.pop();
                    // 书籍信息
                    Column.pop();
                    Row.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create();
                        Row.margin({ top: 12 });
                        Row.margin({ bottom: 12 });
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Image.create({ "id": 16777321, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        Image.width(32);
                        Image.height(32);
                    }, Image);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 作者
                        Text.create(`${this.bookDetail.author}`);
                        // 作者
                        Text.fontSize(20);
                        // 作者
                        Text.fontColor({ "id": 16777308, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        // 作者
                        Text.width('100%');
                    }, Text);
                    // 作者
                    Text.pop();
                    Row.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 最新章节
                        Text.create(`最新：${this.bookDetail.latestChapter}`);
                        // 最新章节
                        Text.fontSize(16);
                        // 最新章节
                        Text.fontColor({ "id": 16777304, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        // 最新章节
                        Text.width('100%');
                        // 最新章节
                        Text.textAlign(TextAlign.Start);
                        // 最新章节
                        Text.maxLines(1);
                        // 最新章节
                        Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                        // 最新章节
                        Text.margin({ top: 12 });
                    }, Text);
                    // 最新章节
                    Text.pop();
                    Column.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
    }
    /**
     * 构建底部操作按钮
     */
    private buildActionButtons(parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.bookDetail) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create();
                        Row.width('100%');
                        Row.padding({ left: 16, right: 16, top: 12, bottom: 12 });
                        Row.backgroundColor({ "id": 16777274, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        Row.shadow({
                            radius: 8,
                            color: '#0D000000',
                            offsetY: -2
                        });
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 主按钮（使用Stack结构与查看目录按钮保持一致）
                        Stack.create();
                        // 主按钮（使用Stack结构与查看目录按钮保持一致）
                        Stack.width('100%');
                        // 主按钮（使用Stack结构与查看目录按钮保持一致）
                        Stack.height(48);
                        // 主按钮（使用Stack结构与查看目录按钮保持一致）
                        Stack.layoutWeight(1);
                        // 主按钮（使用Stack结构与查看目录按钮保持一致）
                        Stack.clip(true);
                        // 主按钮（使用Stack结构与查看目录按钮保持一致）
                        Stack.borderRadius(8);
                        // 主按钮（使用Stack结构与查看目录按钮保持一致）
                        Stack.onClick(() => {
                            this.handleMainButtonClick();
                        });
                    }, Stack);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create();
                        Row.width('100%');
                        Row.height('100%');
                        Row.backgroundColor({ "id": 16777304, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        Row.borderRadius(8);
                    }, Row);
                    Row.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(this.getMainButtonText());
                        Text.fontSize(16);
                        Text.fontColor('#FFFFFF');
                        Text.fontWeight(FontWeight.Medium);
                        Text.width('100%');
                        Text.height('100%');
                        Text.textAlign(TextAlign.Center);
                        Text.zIndex(10);
                    }, Text);
                    Text.pop();
                    // 主按钮（使用Stack结构与查看目录按钮保持一致）
                    Stack.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 查看目录按钮（使用Stack结构保持一致）
                        Stack.create();
                        // 查看目录按钮（使用Stack结构保持一致）
                        Stack.width('100%');
                        // 查看目录按钮（使用Stack结构保持一致）
                        Stack.height(48);
                        // 查看目录按钮（使用Stack结构保持一致）
                        Stack.layoutWeight(1);
                        // 查看目录按钮（使用Stack结构保持一致）
                        Stack.clip(true);
                        // 查看目录按钮（使用Stack结构保持一致）
                        Stack.borderRadius(8);
                        // 查看目录按钮（使用Stack结构保持一致）
                        Stack.margin({ left: 12 });
                        // 查看目录按钮（使用Stack结构保持一致）
                        Stack.onClick(() => {
                            this.showChapters();
                        });
                    }, Stack);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 按钮背景
                        Row.create();
                        // 按钮背景
                        Row.width('100%');
                        // 按钮背景
                        Row.height('100%');
                        // 按钮背景
                        Row.backgroundColor({ "id": 16777274, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        // 按钮背景
                        Row.border({ width: 1, color: { "id": 16777304, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" } });
                        // 按钮背景
                        Row.borderRadius(8);
                    }, Row);
                    // 按钮背景
                    Row.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 按钮文字
                        Text.create('查看目录');
                        // 按钮文字
                        Text.fontSize(16);
                        // 按钮文字
                        Text.fontColor({ "id": 16777304, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        // 按钮文字
                        Text.fontWeight(FontWeight.Medium);
                        // 按钮文字
                        Text.width('100%');
                        // 按钮文字
                        Text.height('100%');
                        // 按钮文字
                        Text.textAlign(TextAlign.Center);
                        // 按钮文字
                        Text.zIndex(10);
                    }, Text);
                    // 按钮文字
                    Text.pop();
                    // 查看目录按钮（使用Stack结构保持一致）
                    Stack.pop();
                    Row.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
    }
    /**
     * 获取主按钮文字
     */
    private getMainButtonText(): string {
        if (!this.isInBookshelf) {
            return '加入书架';
        }
        return '开始阅读';
    }
    /**
     * 处理主按钮点击
     */
    private handleMainButtonClick(): void {
        if (!this.isInBookshelf) {
            this.addToBookshelf();
        }
        else {
            this.startReading();
        }
    }
    /**
     * 构建简介卡片
     */
    private buildDescription(parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.bookDetail?.description) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.width('100%');
                        Column.height('46%');
                        Column.padding(20);
                        Column.backgroundColor({ "id": 16777274, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        Column.borderRadius(16);
                        Column.margin({ left: 16, right: 16, top: 16 });
                        Column.shadow({
                            radius: 8,
                            color: '#0D000000',
                            offsetY: 2
                        });
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('内容简介');
                        Text.fontSize(16);
                        Text.fontWeight(FontWeight.Bold);
                        Text.fontColor({ "id": 16777307, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        Text.width('100%');
                        Text.textAlign(TextAlign.Start);
                        Text.margin({ bottom: 12 });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(this.bookDetail.description);
                        Text.fontSize(14);
                        Text.fontColor({ "id": 16777308, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        Text.lineHeight(22);
                        Text.width('100%');
                        Text.textAlign(TextAlign.Start);
                    }, Text);
                    Text.pop();
                    Column.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
    }
    /**
     * 构建缓存和导出按钮
     */
    private buildExportButton(parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.isInBookshelf) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        If.create();
                        // 缓存进度条（仅在缓存进行中显示）
                        if (this.isCaching) {
                            this.ifElseBranchUpdateFunction(0, () => {
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    Stack.create();
                                    Stack.width('calc(100% - 32vp)');
                                    Stack.height(48);
                                    Stack.clip(true);
                                    Stack.borderRadius(8);
                                    Stack.alignContent(Alignment.Start);
                                    Stack.margin({ left: 16, right: 16, top: 16 });
                                }, Stack);
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    Row.create();
                                    Row.width('100%');
                                    Row.height('100%');
                                    Row.backgroundColor({ "id": 16777296, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                    Row.border({ width: 1, color: { "id": 16777304, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" } });
                                    Row.borderRadius(8);
                                }, Row);
                                Row.pop();
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    Row.create();
                                    Row.width(`${this.cacheProgress}%`);
                                    Row.height('100%');
                                    Row.backgroundColor({ "id": 16777293, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                    Row.borderRadius(8);
                                }, Row);
                                Row.pop();
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    Text.create(`缓存中 ${this.cacheProgress}%`);
                                    Text.fontSize(16);
                                    Text.fontColor({ "id": 16777304, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                    Text.fontWeight(FontWeight.Medium);
                                    Text.width('100%');
                                    Text.height('100%');
                                    Text.textAlign(TextAlign.Center);
                                    Text.zIndex(10);
                                }, Text);
                                Text.pop();
                                Stack.pop();
                            });
                        }
                        // 导出TXT按钮（缓存完成后显示）
                        else {
                            this.ifElseBranchUpdateFunction(1, () => {
                            });
                        }
                    }, If);
                    If.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        If.create();
                        // 导出TXT按钮（缓存完成后显示）
                        if (this.isCacheComplete) {
                            this.ifElseBranchUpdateFunction(0, () => {
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    Button.createWithLabel('导出TXT文件');
                                    Button.fontSize(16);
                                    Button.fontColor('#FFFFFF');
                                    Button.fontWeight(FontWeight.Medium);
                                    Button.backgroundColor({ "id": 16777304, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                    Button.borderRadius(8);
                                    Button.width('calc(100% - 32vp)');
                                    Button.height(48);
                                    Button.margin({ left: 16, right: 16, top: 16 });
                                    Button.onClick(() => {
                                        this.exportMergedFile();
                                    });
                                }, Button);
                                Button.pop();
                            });
                        }
                        else {
                            this.ifElseBranchUpdateFunction(1, () => {
                            });
                        }
                    }, If);
                    If.pop();
                    Column.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
    }
    /**
     * 构建章节列表弹窗
     */
    private buildChapterListSheet(parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.padding(20);
            Column.backgroundColor(Color.White);
            Column.borderRadius({ topLeft: 16, topRight: 16 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 弹窗标题（移除自定义关闭按钮，使用系统默认的）
            Row.create();
            // 弹窗标题（移除自定义关闭按钮，使用系统默认的）
            Row.width('100%');
            // 弹窗标题（移除自定义关闭按钮，使用系统默认的）
            Row.margin({ bottom: 16 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('章节目录');
            Text.fontSize(18);
            Text.fontWeight(FontWeight.Medium);
            Text.fontColor({ "id": 16777307, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Text.width('100%');
            Text.textAlign(TextAlign.Center);
        }, Text);
        Text.pop();
        // 弹窗标题（移除自定义关闭按钮，使用系统默认的）
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            // 章节列表
            if (this.chapterList.length > 0) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        List.create();
                        List.height(400);
                        List.scrollBar(BarState.Auto);
                    }, List);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        ForEach.create();
                        const forEachItemGenFunction = (_item, index: number) => {
                            const chapter = _item;
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
                                        Row.create();
                                        Row.width('100%');
                                        Row.padding({ left: 12, right: 12, top: 12, bottom: 12 });
                                        Row.backgroundColor({ "id": 16777296, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                        Row.borderRadius(8);
                                        Row.margin({ bottom: 8 });
                                        Row.onClick(() => {
                                            this.openChapter(chapter);
                                            this.showChapterList = false;
                                        });
                                    }, Row);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(`${index + 1}.`);
                                        Text.fontSize(14);
                                        Text.fontColor({ "id": 16777309, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                        Text.width(40);
                                    }, Text);
                                    Text.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(chapter.title);
                                        Text.fontSize(14);
                                        Text.fontColor({ "id": 16777307, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                                        Text.layoutWeight(1);
                                        Text.maxLines(1);
                                        Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                                    }, Text);
                                    Text.pop();
                                    Row.pop();
                                    ListItem.pop();
                                };
                                this.observeComponentCreation2(itemCreation2, ListItem);
                                ListItem.pop();
                            }
                        };
                        this.forEachUpdateFunction(elmtId, this.chapterList, forEachItemGenFunction, undefined, true, false);
                    }, ForEach);
                    ForEach.pop();
                    List.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.width('100%');
                        Column.height(200);
                        Column.justifyContent(FlexAlign.Center);
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('📖');
                        Text.fontSize(48);
                        Text.margin({ bottom: 12 });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('暂无章节信息');
                        Text.fontSize(14);
                        Text.fontColor({ "id": 16777309, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                    }, Text);
                    Text.pop();
                    Column.pop();
                });
            }
        }, If);
        If.pop();
        Column.pop();
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.height('wrapContent');
            Column.backgroundColor({ "id": 16777296, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Column.bindSheet({ value: this.showChapterList, changeEvent: newValue => { this.showChapterList = newValue; } }, { builder: () => {
                    this.buildChapterListSheet.call(this);
                } }, {
                height: 500,
                dragBar: true,
                backgroundColor: Color.White
            });
        }, Column);
        // 顶部导航栏
        this.buildHeader.bind(this)();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            // 主要内容区域
            if (this.isLoading) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 加载中状态
                        Scroll.create();
                        // 加载中状态
                        Scroll.layoutWeight(1);
                        // 加载中状态
                        Scroll.scrollBar(BarState.Off);
                        // 加载中状态
                        Scroll.backgroundColor({ "id": 16777296, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                    }, Scroll);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.justifyContent(FlexAlign.Start);
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.width('100%');
                        Column.padding({ top: 40 });
                        Column.justifyContent(FlexAlign.Center);
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Progress.create({ type: ProgressType.Ring, value: 0 });
                        Progress.width(40);
                        Progress.height(40);
                        Progress.color({ "id": 16777304, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                    }, Progress);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('正在加载书籍详情...');
                        Text.fontSize(14);
                        Text.fontColor({ "id": 16777309, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        Text.margin({ top: 12 });
                    }, Text);
                    Text.pop();
                    Column.pop();
                    Column.pop();
                    // 加载中状态
                    Scroll.pop();
                });
            }
            else if (this.errorMessage) {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 错误状态 - 显示传递的参数信息和错误提示
                        Scroll.create();
                        // 错误状态 - 显示传递的参数信息和错误提示
                        Scroll.layoutWeight(1);
                        // 错误状态 - 显示传递的参数信息和错误提示
                        Scroll.scrollBar(BarState.Off);
                        // 错误状态 - 显示传递的参数信息和错误提示
                        Scroll.backgroundColor({ "id": 16777296, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                    }, Scroll);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                    }, Column);
                    // 显示传递的书籍信息
                    this.buildDefaultBookInfo.bind(this)();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 错误提示卡片
                        Column.create();
                        // 错误提示卡片
                        Column.width('100%');
                        // 错误提示卡片
                        Column.padding(20);
                        // 错误提示卡片
                        Column.backgroundColor({ "id": 16777274, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        // 错误提示卡片
                        Column.borderRadius(16);
                        // 错误提示卡片
                        Column.margin({ left: 16, right: 16, top: 16 });
                        // 错误提示卡片
                        Column.shadow({
                            radius: 8,
                            color: '#0D000000',
                            offsetY: 2
                        });
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('数据加载失败');
                        Text.fontSize(16);
                        Text.fontWeight(FontWeight.Bold);
                        Text.fontColor({ "id": 16777304, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        Text.margin({ bottom: 8 });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(this.errorMessage);
                        Text.fontSize(14);
                        Text.fontColor({ "id": 16777308, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        Text.textAlign(TextAlign.Center);
                        Text.margin({ bottom: 16 });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithLabel('重试');
                        Button.fontSize(14);
                        Button.fontColor(Color.White);
                        Button.backgroundColor({ "id": 16777304, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        Button.borderRadius(20);
                        Button.padding({ left: 20, right: 20, top: 8, bottom: 8 });
                        Button.onClick(() => {
                            this.loadBookDetail();
                        });
                    }, Button);
                    Button.pop();
                    // 错误提示卡片
                    Column.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 底部间距
                        Column.create();
                        // 底部间距
                        Column.height(80);
                    }, Column);
                    // 底部间距
                    Column.pop();
                    Column.pop();
                    // 错误状态 - 显示传递的参数信息和错误提示
                    Scroll.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(2, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 书籍详情内容
                        Scroll.create();
                        // 书籍详情内容
                        Scroll.layoutWeight(1);
                        // 书籍详情内容
                        Scroll.scrollBar(BarState.Off);
                        // 书籍详情内容
                        Scroll.backgroundColor({ "id": 16777296, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                    }, Scroll);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                    }, Column);
                    // 书籍信息卡片
                    this.buildBookInfo.bind(this)();
                    // 简介卡片
                    this.buildDescription.bind(this)();
                    // 缓存和导出按钮
                    this.buildExportButton.bind(this)();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 底部间距，为底部按钮留出空间
                        Column.create();
                        // 底部间距，为底部按钮留出空间
                        Column.height(80);
                    }, Column);
                    // 底部间距，为底部按钮留出空间
                    Column.pop();
                    Column.pop();
                    // 书籍详情内容
                    Scroll.pop();
                    // 底部操作按钮
                    this.buildActionButtons.bind(this)();
                });
            }
        }, If);
        If.pop();
        Column.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "BookDetailPage";
    }
}
export { BookDetailPage };
registerNamedRoute(() => new BookDetailPage(undefined, {}), "", { bundleName: "liubai.yuedu.hos", moduleName: "entry", pagePath: "pages/BookDetailPage", pageFullPath: "entry/src/main/ets/pages/BookDetailPage", integratedHsp: "false", moduleType: "followWithHap" });
