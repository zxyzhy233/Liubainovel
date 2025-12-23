if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
import hilog from "@ohos:hilog";
import router from "@ohos:router";
import { bookSourceManager } from "@bundle:liubai.yuedu.hos/entry/ets/managers/BookSourceManager";
import type { BookDetailInfo, ChapterInfo } from '../models/BookSourceModel';
import { onlineBookDataManager } from "@bundle:liubai.yuedu.hos/entry/ets/utils/OnlineBookDataManager";
import { OnlineBookInfo } from "@bundle:liubai.yuedu.hos/entry/ets/models/OnlineBookModel";
import { downloadManager } from "@bundle:liubai.yuedu.hos/entry/ets/managers/DownloadManager";
import type common from "@ohos:app.ability.common";
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
class BookDetailPage extends ViewV2 {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda, extraInfo) {
        super(parent, elmtId, extraInfo);
        this.bookDetail = null;
        this.chapterList = [];
        this.isLoading = true;
        this.errorMessage = '';
        this.showChapterList = false;
        this.bookUrl = '';
        this.bookTitle = '';
        this.bookAuthor = '';
        this.bookCover = '';
        this.isInBookshelf = false;
        this.onlineBookId = 0;
        this.finalizeConstruction();
    }
    @Local
    bookDetail: BookDetailInfo | null; // 书籍详情
    @Local
    chapterList: ChapterInfo[]; // 章节列表
    @Local
    isLoading: boolean; // 加载状态
    @Local
    errorMessage: string; // 错误信息
    @Local
    showChapterList: boolean; // 是否显示章节列表
    @Local
    bookUrl: string; // 书籍详情页URL
    @Local
    bookTitle: string; // 书籍标题
    @Local
    bookAuthor: string; // 书籍作者
    @Local
    bookCover: string; // 书籍封面
    @Local
    isInBookshelf: boolean; // 是否已加入书架
    @Local
    onlineBookId: number; // 在线书籍ID
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
            // 检查是否已加入书架
            await this.checkBookshelfStatus();
            if (this.bookUrl) {
                await this.loadBookDetail();
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
     */
    private async loadBookDetail(): Promise<void> {
        try {
            this.isLoading = true;
            this.errorMessage = '';
            // 使用鹿析管理器获取书籍详情
            const detailResult = await bookSourceManager.getBookDetail(this.bookUrl);
            if (detailResult.success && detailResult.data) {
                this.bookDetail = detailResult.data;
                hilog.info(0x0000, TAG, `成功加载书籍详情: ${detailResult.data.title}，来源: ${detailResult.source}`);
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
                this.errorMessage = detailResult.error || '获取书籍详情失败';
                hilog.error(0x0000, TAG, '获取书籍详情失败: ' + this.errorMessage);
            }
        }
        catch (error) {
            hilog.error(0x0000, TAG, '加载书籍详情失败: ' + JSON.stringify(error));
            this.errorMessage = '加载失败，请重试';
        }
        finally {
            this.isLoading = false;
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
                .showToast({ message: '已加入书架，开始下载章节...', duration: 2000 });
            hilog.info(0x0000, TAG, `书籍已加入书架: ${onlineBook.title}`);
            // 加入书架后立即开始后台批量下载章节
            if (this.chapterList.length > 0) {
                downloadManager.startDownloadBook(this.onlineBookId, this.bookDetail.title, this.chapterList);
                hilog.info(0x0000, TAG, `开始后台下载 ${this.chapterList.length} 个章节`);
            }
        }
        catch (error) {
            hilog.error(0x0000, TAG, '加入书架失败: ' + JSON.stringify(error));
            this.getUIContext()
                .getPromptAction()
                .showToast({ message: '加入书架失败', duration: 2000 });
        }
    }
    /**
     * 开始阅读
     */
    private async startReading(): Promise<void> {
        console.log('BookDetailPage: === 开始阅读 ===');
        console.log(`BookDetailPage: 章节列表长度=${this.chapterList.length}, bookId=${this.onlineBookId}`);
        hilog.info(0x0000, TAG, '=== 开始阅读 ===');
        hilog.info(0x0000, TAG, `章节列表长度: ${this.chapterList.length}`);
        hilog.info(0x0000, TAG, `在线书籍ID: ${this.onlineBookId}`);
        if (this.chapterList.length === 0) {
            this.getUIContext()
                .getPromptAction()
                .showToast({ message: '暂无章节可阅读', duration: 2000 });
            return;
        }
        // 读取上次阅读的章节索引
        let startChapterIndex = 0;
        try {
            const bookInfo = await onlineBookDataManager.queryOnlineBookById(this.onlineBookId);
            if (bookInfo && bookInfo.currentChapter) {
                // 查找上次阅读章节的索引
                const lastChapterIndex = this.chapterList.findIndex((chapter) => chapter.title === bookInfo.currentChapter);
                if (lastChapterIndex >= 0) {
                    startChapterIndex = lastChapterIndex;
                    hilog.info(0x0000, TAG, `继续阅读: 第${startChapterIndex + 1}章 - ${bookInfo.currentChapter}`);
                }
            }
        }
        catch (error) {
            hilog.warn(0x0000, TAG, '读取阅读进度失败，从第一章开始: ' + JSON.stringify(error));
        }
        // 检查起始章节是否已下载
        const chapterDownloadInfo = await onlineBookDataManager.queryChapterDownload(this.onlineBookId, startChapterIndex);
        console.log(`BookDetailPage: 第${startChapterIndex + 1}章下载状态`, chapterDownloadInfo);
        hilog.info(0x0000, TAG, `第${startChapterIndex + 1}章下载状态: ${JSON.stringify(chapterDownloadInfo)}`);
        if (chapterDownloadInfo && chapterDownloadInfo.isDownloaded && chapterDownloadInfo.filePath) {
            // 章节已下载，跳转到在线章节阅读页面
            interface ReaderParams {
                bookId: number;
                bookTitle: string;
                chapterIndex: number;
                chapters: ChapterInfo[];
            }
            const params: ReaderParams = {
                bookId: this.onlineBookId,
                bookTitle: this.bookDetail?.title || this.bookTitle,
                chapterIndex: startChapterIndex,
                chapters: this.chapterList
            };
            interface LogParams {
                bookId: number;
                bookTitle: string;
                chapterIndex: number;
                chaptersCount: number;
            }
            const logParams: LogParams = {
                bookId: params.bookId,
                bookTitle: params.bookTitle,
                chapterIndex: params.chapterIndex,
                chaptersCount: params.chapters.length
            };
            hilog.info(0x0000, TAG, `准备跳转，参数: ${JSON.stringify(logParams)}`);
            console.log('BookDetailPage: 准备跳转到OnlineChapterReader', logParams);
            router.pushUrl({
                url: 'pages/OnlineChapterReader',
                params: params
            }).then(() => {
                console.log('BookDetailPage: 跳转成功');
                hilog.info(0x0000, TAG, '成功跳转到在线阅读器页面');
            }).catch((error: Error) => {
                console.error('BookDetailPage: 跳转失败', error);
                hilog.error(0x0000, TAG, '跳转失败: ' + error.message);
                this.getUIContext()
                    .getPromptAction()
                    .showToast({ message: '打开阅读器失败', duration: 2000 });
            });
        }
        else {
            // 第一章未下载，提示用户等待
            hilog.warn(0x0000, TAG, '第一章未下载');
            this.getUIContext()
                .getPromptAction()
                .showToast({ message: '章节正在下载中，请稍后...', duration: 2000 });
            // 确保下载任务已启动（防止意外情况）
            if (this.onlineBookId > 0 && this.bookDetail) {
                downloadManager.startDownloadBook(this.onlineBookId, this.bookDetail.title, this.chapterList);
            }
        }
    }
    /**
     * 打开章节阅读
     * @param chapter 章节信息
     */
    private async openChapter(chapter: ChapterInfo): Promise<void> {
        hilog.info(0x0000, TAG, '打开章节: ' + chapter.title);
        // 查找章节索引
        const chapterIndex = this.chapterList.findIndex(c => c.url === chapter.url);
        // 获取章节下载信息
        const chapterDownloadInfo = await onlineBookDataManager.queryChapterDownload(this.onlineBookId, chapterIndex);
        if (!chapterDownloadInfo || !chapterDownloadInfo.isDownloaded || !chapterDownloadInfo.filePath) {
            this.getUIContext()
                .getPromptAction()
                .showToast({ message: '章节未下载，请等待下载完成', duration: 2000 });
            // 开始下载
            if (this.onlineBookId > 0 && this.bookDetail) {
                downloadManager.startDownloadBook(this.onlineBookId, this.bookDetail.title, this.chapterList);
            }
            return;
        }
        // 跳转到在线章节阅读页面
        router.pushUrl({
            url: 'pages/OnlineChapterReader',
            params: {
                bookId: this.onlineBookId,
                bookTitle: this.bookDetail?.title || this.bookTitle,
                chapterIndex: chapterIndex,
                chapters: this.chapterList
            }
        }).then(() => {
            hilog.info(0x0000, TAG, '成功跳转到在线阅读器页面');
        }).catch((error: Error) => {
            hilog.error(0x0000, TAG, '跳转失败: ' + error.message);
            this.getUIContext()
                .getPromptAction()
                .showToast({ message: '打开阅读器失败', duration: 2000 });
        });
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
            Row.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(383:5)", "entry");
            Row.width('100%');
            Row.height(56);
            Row.padding({ left: 16, right: 16 });
            Row.margin({ top: 44 });
            Row.backgroundColor('#9F6548');
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 返回按钮
            Button.createWithChild();
            Button.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(385:7)", "entry");
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
            Text.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(386:9)", "entry");
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
            Text.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(399:7)", "entry");
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
            // 占位按钮保持对称
            Button.createWithLabel();
            Button.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(409:7)", "entry");
            // 占位按钮保持对称
            Button.width(40);
            // 占位按钮保持对称
            Button.height(40);
            // 占位按钮保持对称
            Button.backgroundColor(Color.Transparent);
        }, Button);
        // 占位按钮保持对称
        Button.pop();
        Row.pop();
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
                        Column.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(427:7)", "entry");
                        Column.width('100%');
                        Column.height('45%');
                        Column.padding(20);
                        Column.backgroundColor('#FFFFFF');
                        Column.borderRadius(12);
                        Column.margin({ left: 16, right: 16, top: 2 });
                        Column.shadow({
                            radius: 4,
                            color: '#10000000',
                            offsetY: 2
                        });
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create();
                        Row.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(428:9)", "entry");
                        Row.width('100%');
                        Row.alignItems(VerticalAlign.Top);
                        Row.justifyContent(FlexAlign.Start);
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 封面图片
                        Image.create(this.bookCover || { "id": 16777262, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        Image.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(430:11)", "entry");
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
                        Column.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(442:11)", "entry");
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
                        Text.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(444:13)", "entry");
                        // 书名
                        Text.fontSize(20);
                        // 书名
                        Text.fontWeight(FontWeight.Bold);
                        // 书名
                        Text.fontColor('#2D3748');
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
                        Text.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(455:13)", "entry");
                        // 作者
                        Text.fontSize(14);
                        // 作者
                        Text.fontColor('#4A5568');
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
                        Text.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(463:13)", "entry");
                        // 状态
                        Text.fontSize(14);
                        // 状态
                        Text.fontColor('#4A5568');
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
                        Text.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(471:13)", "entry");
                        // 提示信息
                        Text.fontSize(14);
                        // 提示信息
                        Text.fontColor('#718096');
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
                        Column.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(506:7)", "entry");
                        Column.width('100%');
                        Column.height('48%');
                        Column.justifyContent(FlexAlign.Start);
                        Column.padding(20);
                        Column.backgroundColor('#FFFFFF');
                        Column.borderRadius(12);
                        Column.margin({ left: 16, right: 16, top: 2 });
                        Column.shadow({
                            radius: 4,
                            color: '#10000000',
                            offsetY: 2
                        });
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create();
                        Row.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(507:9)", "entry");
                        Row.width('100%');
                        Row.margin({ bottom: 24 });
                        Row.alignItems(VerticalAlign.Top);
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 封面图片
                        Image.create(this.bookDetail.cover);
                        Image.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(509:11)", "entry");
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
                        Column.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(521:11)", "entry");
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
                        Text.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(523:13)", "entry");
                        // 书名
                        Text.fontSize(20);
                        // 书名
                        Text.fontWeight(FontWeight.Bold);
                        // 书名
                        Text.fontColor('#2D3748');
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
                                    Row.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(536:17)", "entry");
                                }, Row);
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    If.create();
                                    if (this.bookDetail.category) {
                                        this.ifElseBranchUpdateFunction(0, () => {
                                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                                Text.create(this.bookDetail.category);
                                                Text.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(538:21)", "entry");
                                                Text.fontSize(14);
                                                Text.fontColor('#4A5568');
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
                                                Text.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(547:21)", "entry");
                                                Text.fontSize(14);
                                                Text.fontColor('#4A5568');
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
                        Row.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(556:13)", "entry");
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 状态
                        Text.create(`${this.bookDetail.status}`);
                        Text.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(558:15)", "entry");
                        // 状态
                        Text.fontSize(14);
                        // 状态
                        Text.fontColor('#4A5568');
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
                        Text.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(566:15)", "entry");
                        // 更新时间
                        Text.fontSize(14);
                        // 更新时间
                        Text.fontColor('#4A5568');
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
                        Row.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(584:9)", "entry");
                        Row.margin({ top: 12 });
                        Row.margin({ bottom: 12 });
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Image.create({ "id": 16777316, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        Image.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(585:11)", "entry");
                        Image.width(32);
                        Image.height(32);
                    }, Image);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 作者
                        Text.create(`${this.bookDetail.author}`);
                        Text.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(589:9)", "entry");
                        // 作者
                        Text.fontSize(20);
                        // 作者
                        Text.fontColor('#4A5568');
                        // 作者
                        Text.width('100%');
                    }, Text);
                    // 作者
                    Text.pop();
                    Row.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 最新章节
                        Text.create(`最新：${this.bookDetail.latestChapter}`);
                        Text.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(600:9)", "entry");
                        // 最新章节
                        Text.fontSize(16);
                        // 最新章节
                        Text.fontColor('#9F6548');
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
                        Row.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(630:7)", "entry");
                        Row.width('100%');
                        Row.padding({ left: 16, right: 16, top: 12, bottom: 12 });
                        Row.backgroundColor('#FFFFFF');
                        Row.shadow({
                            radius: 4,
                            color: '#10000000',
                            offsetY: -2
                        });
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithLabel(this.isInBookshelf ? '开始阅读' : '加入书架');
                        Button.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(631:9)", "entry");
                        Button.fontSize(16);
                        Button.fontColor('#FFFFFF');
                        Button.backgroundColor('#9F6548');
                        Button.borderRadius(8);
                        Button.layoutWeight(1);
                        Button.height(48);
                        Button.onClick(() => {
                            if (this.isInBookshelf) {
                                this.startReading();
                            }
                            else {
                                this.addToBookshelf();
                            }
                        });
                    }, Button);
                    Button.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithLabel('查看目录');
                        Button.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(646:9)", "entry");
                        Button.fontSize(16);
                        Button.fontColor('#9F6548');
                        Button.backgroundColor('#FFFFFF');
                        Button.border({ width: 1, color: '#9F6548' });
                        Button.borderRadius(8);
                        Button.layoutWeight(1);
                        Button.height(48);
                        Button.margin({ left: 12 });
                        Button.onClick(() => {
                            this.showChapters();
                        });
                    }, Button);
                    Button.pop();
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
     * 构建简介卡片
     */
    private buildDescription(parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            if (this.bookDetail?.description) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(676:7)", "entry");
                        Column.width('100%');
                        Column.height('46%');
                        Column.padding(20);
                        Column.backgroundColor('#FFFFFF');
                        Column.borderRadius(12);
                        Column.margin({ left: 16, right: 16, top: 16 });
                        Column.shadow({
                            radius: 4,
                            color: '#10000000',
                            offsetY: 2
                        });
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('内容简介');
                        Text.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(677:7)", "entry");
                        Text.fontSize(16);
                        Text.fontWeight(FontWeight.Bold);
                        Text.fontColor('#2D3748');
                        Text.width('100%');
                        Text.textAlign(TextAlign.Start);
                        Text.margin({ bottom: 12 });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(this.bookDetail.description);
                        Text.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(685:7)", "entry");
                        Text.fontSize(14);
                        Text.fontColor('#4A5568');
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
     * 构建章节列表弹窗
     */
    private buildChapterListSheet(parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(711:5)", "entry");
            Column.padding(20);
            Column.backgroundColor(Color.White);
            Column.borderRadius({ topLeft: 16, topRight: 16 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 弹窗标题（移除自定义关闭按钮，使用系统默认的）
            Row.create();
            Row.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(713:7)", "entry");
            // 弹窗标题（移除自定义关闭按钮，使用系统默认的）
            Row.width('100%');
            // 弹窗标题（移除自定义关闭按钮，使用系统默认的）
            Row.margin({ bottom: 16 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('章节目录');
            Text.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(714:9)", "entry");
            Text.fontSize(18);
            Text.fontWeight(FontWeight.Medium);
            Text.fontColor('#2D3748');
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
                        List.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(726:9)", "entry");
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
                                    itemCreation2(elmtId, isInitialRender);
                                    if (!isInitialRender) {
                                        ListItem.pop();
                                    }
                                    ViewStackProcessor.StopGetAccessRecording();
                                };
                                const itemCreation2 = (elmtId, isInitialRender) => {
                                    ListItem.create(deepRenderFunction, true);
                                    ListItem.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(728:13)", "entry");
                                };
                                const deepRenderFunction = (elmtId, isInitialRender) => {
                                    itemCreation(elmtId, isInitialRender);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Row.create();
                                        Row.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(729:15)", "entry");
                                        Row.width('100%');
                                        Row.padding({ left: 12, right: 12, top: 12, bottom: 12 });
                                        Row.backgroundColor('#F7FAFC');
                                        Row.borderRadius(8);
                                        Row.margin({ bottom: 8 });
                                        Row.onClick(() => {
                                            this.openChapter(chapter);
                                            this.showChapterList = false;
                                        });
                                    }, Row);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(`${index + 1}.`);
                                        Text.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(730:17)", "entry");
                                        Text.fontSize(14);
                                        Text.fontColor('#718096');
                                        Text.width(40);
                                    }, Text);
                                    Text.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(chapter.title);
                                        Text.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(735:17)", "entry");
                                        Text.fontSize(14);
                                        Text.fontColor('#2D3748');
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
                        Column.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(757:9)", "entry");
                        Column.width('100%');
                        Column.height(200);
                        Column.justifyContent(FlexAlign.Center);
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('📖');
                        Text.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(758:11)", "entry");
                        Text.fontSize(48);
                        Text.margin({ bottom: 12 });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('暂无章节信息');
                        Text.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(761:11)", "entry");
                        Text.fontSize(14);
                        Text.fontColor('#718096');
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
            Column.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(776:5)", "entry");
            Column.width('100%');
            Column.height('wrapContent');
            Column.backgroundColor('#F7FAFC');
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
                        Scroll.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(783:9)", "entry");
                        // 加载中状态
                        Scroll.layoutWeight(1);
                        // 加载中状态
                        Scroll.scrollBar(BarState.Off);
                        // 加载中状态
                        Scroll.backgroundColor('#F7FAFC');
                    }, Scroll);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(784:11)", "entry");
                        Column.justifyContent(FlexAlign.Start);
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(785:13)", "entry");
                        Column.width('100%');
                        Column.padding({ top: 40 });
                        Column.justifyContent(FlexAlign.Center);
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Progress.create({ type: ProgressType.Ring, value: 0 });
                        Progress.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(786:15)", "entry");
                        Progress.width(40);
                        Progress.height(40);
                        Progress.color('#9F6548');
                    }, Progress);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('正在加载书籍详情...');
                        Text.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(790:15)", "entry");
                        Text.fontSize(14);
                        Text.fontColor('#718096');
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
                        Scroll.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(806:9)", "entry");
                        // 错误状态 - 显示传递的参数信息和错误提示
                        Scroll.layoutWeight(1);
                        // 错误状态 - 显示传递的参数信息和错误提示
                        Scroll.scrollBar(BarState.Off);
                        // 错误状态 - 显示传递的参数信息和错误提示
                        Scroll.backgroundColor('#F7FAFC');
                    }, Scroll);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(807:11)", "entry");
                    }, Column);
                    // 显示传递的书籍信息
                    this.buildDefaultBookInfo.bind(this)();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 错误提示卡片
                        Column.create();
                        Column.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(812:13)", "entry");
                        // 错误提示卡片
                        Column.width('100%');
                        // 错误提示卡片
                        Column.padding(20);
                        // 错误提示卡片
                        Column.backgroundColor('#FFFFFF');
                        // 错误提示卡片
                        Column.borderRadius(12);
                        // 错误提示卡片
                        Column.margin({ left: 16, right: 16, top: 16 });
                        // 错误提示卡片
                        Column.shadow({
                            radius: 4,
                            color: '#10000000',
                            offsetY: 2
                        });
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('数据加载失败');
                        Text.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(813:15)", "entry");
                        Text.fontSize(16);
                        Text.fontWeight(FontWeight.Bold);
                        Text.fontColor('#9F6548');
                        Text.margin({ bottom: 8 });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(this.errorMessage);
                        Text.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(819:15)", "entry");
                        Text.fontSize(14);
                        Text.fontColor('#4A5568');
                        Text.textAlign(TextAlign.Center);
                        Text.margin({ bottom: 16 });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithLabel('重试');
                        Button.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(825:15)", "entry");
                        Button.fontSize(14);
                        Button.fontColor(Color.White);
                        Button.backgroundColor('#9F6548');
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
                        Column.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(847:13)", "entry");
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
                        Scroll.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(856:9)", "entry");
                        // 书籍详情内容
                        Scroll.layoutWeight(1);
                        // 书籍详情内容
                        Scroll.scrollBar(BarState.Off);
                        // 书籍详情内容
                        Scroll.backgroundColor('#F7FAFC');
                    }, Scroll);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(857:11)", "entry");
                    }, Column);
                    // 书籍信息卡片
                    this.buildBookInfo.bind(this)();
                    // 简介卡片
                    this.buildDescription.bind(this)();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 底部间距，为底部按钮留出空间
                        Column.create();
                        Column.debugLine("entry/src/main/ets/pages/BookDetailPage.ets(865:13)", "entry");
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
