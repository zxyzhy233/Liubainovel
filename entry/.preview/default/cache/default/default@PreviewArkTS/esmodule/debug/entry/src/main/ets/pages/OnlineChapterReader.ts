if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
import hilog from "@ohos:hilog";
import fs from "@ohos:file.fs";
import type common from "@ohos:app.ability.common";
import router from "@ohos:router";
import util from "@ohos:util";
import { settingsManager } from "@bundle:liubai.yuedu.hos/entry/ets/utils/SettingsManager";
import { onlineBookDataManager } from "@bundle:liubai.yuedu.hos/entry/ets/utils/OnlineBookDataManager";
import type { ChapterInfo } from '../models/BookSourceModel';
import type { ChapterDownloadInfo } from '../models/OnlineBookModel';
import { bookSourceManager } from "@bundle:liubai.yuedu.hos/entry/ets/managers/BookSourceManager";
import { BookSourceParser } from "@bundle:liubai.yuedu.hos/entry/ets/managers/BookSourceParser";
const TAG: string = 'OnlineChapterReader';
/**
 * 页面参数接口
 */
interface PageParams {
    bookId: number; // 在线书籍ID
    bookTitle: string; // 书籍标题
    chapterIndex: number; // 当前章节索引
    chapters: ChapterInfo[]; // 章节列表
}
/**
 * 阅读设置接口
 */
interface ReaderSettings {
    fontName: string;
    fontPath: string;
    fontSize: number;
    lineHeight: number;
    theme: string;
    flipMode: string;
}
class OnlineChapterReader extends ViewV2 {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda, extraInfo) {
        super(parent, elmtId, extraInfo);
        this.bookId = 0;
        this.bookTitle = '';
        this.currentChapterIndex = 0;
        this.chapters = [];
        this.chapterContent = '';
        this.isLoading = true;
        this.errorMessage = '';
        this.showCatalog = false;
        this.showSettings = false;
        this.showToolbar = false;
        this.showDebugDialog = false;
        this.debugContent = '';
        this.fontSize = 18;
        this.lineHeight = 1.9;
        this.fontFamily = 'system';
        this.themeColor = '#FFFFFF';
        this.fontColor = '#000000';
        this.backgroundColorValue = '#FFFFFF';
        this.themeSelectIndex = 0;
        this.selectFontPath = '';
        this.flipMode = '0';
        this.themeList = [
            'white',
            'yellow',
            'pink',
            'green',
            'dark',
            'whiteSky',
            'darkSky'
        ];
        this.THEME_BUTTON_BACKGROUND = {
            'white': { "id": 16777255, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            'yellow': { "id": 16777256, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            'pink': { "id": 16777253, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            'green': { "id": 16777252, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            'dark': { "id": 16777251, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            'whiteSky': { "id": 16777255, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            'darkSky': { "id": 16777251, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" }
        };
        this.THEME_PAGE_COLOR = {
            'white': '#FFFFFF',
            'yellow': '#BD9063',
            'pink': '#FFE4E5',
            'green': '#C5E7CE',
            'dark': '#202224',
            'whiteSky': '#FFFFFF',
            'darkSky': '#202224'
        };
        this.themeBorderColor = {
            0: { "id": 16777248, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            1: { "id": 16777249, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            2: { "id": 16777247, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            3: { "id": 16777246, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            4: { "id": 16777248, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            5: { "id": 16777248, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            6: { "id": 16777248, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" }
        };
        this.catalogScroller = new Scroller();
        this.bookCover = null;
        this.finalizeConstruction();
    }
    @Local
    bookId: number;
    @Local
    bookTitle: string;
    @Local
    currentChapterIndex: number;
    @Local
    chapters: ChapterInfo[];
    @Local
    chapterContent: string;
    @Local
    isLoading: boolean;
    @Local
    errorMessage: string;
    @Local
    showCatalog: boolean;
    @Local
    showSettings: boolean;
    @Local
    showToolbar: boolean;
    @Local
    showDebugDialog: boolean;
    @Local
    debugContent: string;
    // 阅读设置（与 Reader 页面统一）
    @Local
    fontSize: number;
    @Local
    lineHeight: number;
    @Local
    fontFamily: string;
    @Local
    themeColor: string;
    @Local
    fontColor: string;
    @Local
    backgroundColorValue: string;
    @Local
    themeSelectIndex: number;
    @Local
    selectFontPath: string;
    @Local
    flipMode: string; // 0: 仿真翻页, 1: 横向滑动
    // 主题配置
    @Local
    themeList: string[];
    private THEME_BUTTON_BACKGROUND: Record<string, Resource>;
    private THEME_PAGE_COLOR: Record<string, string>;
    private themeBorderColor: Record<number, Resource>;
    private catalogScroller: Scroller;
    @Local
    bookCover: PixelMap | null;
    async aboutToAppear() {
        console.log('OnlineChapterReader: aboutToAppear 开始');
        hilog.info(0x0000, TAG, '=== OnlineChapterReader aboutToAppear 开始 ===');
        try {
            const params = router.getParams() as PageParams;
            console.log('OnlineChapterReader: 接收到参数', params);
            hilog.info(0x0000, TAG, `接收到的参数: bookId=${params?.bookId}, chapterIndex=${params?.chapterIndex}`);
            if (!params || !params.bookId) {
                console.error('OnlineChapterReader: 参数错误');
                hilog.error(0x0000, TAG, '未接收到有效页面参数！');
                this.errorMessage = '页面参数错误';
                this.isLoading = false;
                return;
            }
            this.bookId = params.bookId;
            this.bookTitle = params.bookTitle || '在线阅读';
            this.currentChapterIndex = params.chapterIndex || 0;
            this.chapters = params.chapters || [];
            console.log(`OnlineChapterReader: 初始化完成 - bookId=${this.bookId}, chapters=${this.chapters.length}`);
            hilog.info(0x0000, TAG, `初始化阅读器: bookId=${this.bookId}, chapter=${this.currentChapterIndex}, chapters数量=${this.chapters.length}`);
            // 初始化数据管理器
            const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
            await onlineBookDataManager.init(context);
            console.log('OnlineChapterReader: 数据管理器初始化完成');
            // 加载阅读设置
            await this.loadSettings();
            console.log('OnlineChapterReader: 阅读设置加载完成');
            // 加载当前章节
            await this.loadChapter(this.currentChapterIndex);
            console.log('OnlineChapterReader: 章节加载完成');
            hilog.info(0x0000, TAG, '=== OnlineChapterReader aboutToAppear 完成 ===');
        }
        catch (error) {
            console.error('OnlineChapterReader: 初始化失败', error);
            hilog.error(0x0000, TAG, '页面初始化失败: ' + JSON.stringify(error));
            this.errorMessage = '页面初始化失败: ' + (error instanceof Error ? error.message : '未知错误');
            this.isLoading = false;
        }
    }
    /**
     * 加载阅读设置
     */
    private async loadSettings(): Promise<void> {
        try {
            const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
            await settingsManager.init(context);
            const settings = await settingsManager.loadSettings();
            this.fontSize = settings.fontSize;
            this.lineHeight = settings.lineHeight;
            this.fontFamily = settings.fontName === '系统字体' ? 'system' : settings.fontName;
            this.selectFontPath = settings.fontPath;
            this.flipMode = settings.flipMode;
            // 应用主题
            this.themeSelectIndex = this.themeList.indexOf(settings.theme);
            this.applyTheme(settings.theme, this.themeSelectIndex);
            hilog.info(0x0000, TAG, `加载设置成功: fontSize=${this.fontSize}, theme=${settings.theme}`);
        }
        catch (error) {
            hilog.error(0x0000, TAG, '加载设置失败: ' + JSON.stringify(error));
        }
    }
    /**
     * 应用主题
     */
    private applyTheme(theme: string, index: number): void {
        this.backgroundColorValue = this.THEME_PAGE_COLOR[theme];
        if (index === 5 || index === 6) {
            // 天空主题
            this.fontColor = index === 5 ? '#000000' : '#FFFFFF';
        }
        else if (index === 4) {
            // 暗色主题
            this.fontColor = '#FFFFFF';
        }
        else {
            // 其他主题
            this.fontColor = '#000000';
        }
    }
    /**
     * 加载章节内容
     */
    private async loadChapter(chapterIndex: number): Promise<void> {
        try {
            this.isLoading = true;
            this.errorMessage = '';
            if (chapterIndex < 0 || chapterIndex >= this.chapters.length) {
                throw new Error('章节索引超出范围');
            }
            const chapter = this.chapters[chapterIndex];
            hilog.info(0x0000, TAG, `开始加载章节: ${chapter.title}`);
            // 优先从本地缓存读取
            const cachedChapter = await onlineBookDataManager.queryChapterDownload(this.bookId, chapterIndex);
            if (cachedChapter && cachedChapter.isDownloaded && cachedChapter.content) {
                // 从缓存读取成功 - 先更新索引，再更新内容，确保UI刷新
                this.currentChapterIndex = chapterIndex;
                // 使用setTimeout确保状态更新触发UI刷新
                setTimeout(() => {
                    this.chapterContent = cachedChapter.content;
                    this.isLoading = false;
                }, 0);
                hilog.info(0x0000, TAG, `从缓存加载章节成功: ${chapter.title}, 长度: ${cachedChapter.content.length}`);
                hilog.info(0x0000, TAG, `当前章节索引: ${this.currentChapterIndex}, 内容前100字: ${cachedChapter.content.substring(0, 100)}`);
                // 保存阅读进度
                this.saveReadingProgress();
                return;
            }
            // 缓存不存在或无效，从网络获取
            hilog.info(0x0000, TAG, `缓存未找到，从网络获取: ${chapter.title}, URL: ${chapter.url}`);
            // 获取所有在线书籍，找到对应的书籍
            const allBooks = await onlineBookDataManager.queryAllOnlineBooks();
            const onlineBook = allBooks.find((book) => book.id === this.bookId);
            if (!onlineBook) {
                throw new Error('未找到在线书籍信息');
            }
            // 获取所有书源，找到对应的书源
            const allSources = await bookSourceManager.getAllBookSources();
            const bookSource = allSources.find((source) => onlineBook.bookUrl.includes(source.bookSourceUrl));
            if (!bookSource) {
                throw new Error('未找到对应的书源');
            }
            // 使用BookSourceParser重新获取章节内容
            const parser = new BookSourceParser(bookSource);
            const result = await parser.parseChapterContent(chapter.url);
            if (!result.success || !result.data) {
                throw new Error(result.error || '获取章节内容失败');
            }
            // 从网络加载成功 - 先更新索引，再更新内容
            this.currentChapterIndex = chapterIndex;
            setTimeout(() => {
                this.chapterContent = result.data;
                this.isLoading = false;
            }, 0);
            hilog.info(0x0000, TAG, `从网络加载章节成功: ${chapter.title}, 长度: ${result.data.length}`);
            hilog.info(0x0000, TAG, `当前章节索引: ${this.currentChapterIndex}, 内容前100字: ${result.data.substring(0, 100)}`);
            // 保存阅读进度
            this.saveReadingProgress();
            // 更新下载记录（保存正确的内容）
            await this.updateChapterDownload(chapterIndex, this.chapterContent);
        }
        catch (error) {
            hilog.error(0x0000, TAG, '加载章节失败: ' + JSON.stringify(error));
            this.errorMessage = `加载失败: ${error instanceof Error ? error.message : '未知错误'}`;
            this.isLoading = false;
        }
    }
    /**
     * 更新章节下载记录
     */
    private async updateChapterDownload(chapterIndex: number, content: string): Promise<void> {
        try {
            const chapter = this.chapters[chapterIndex];
            const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
            const cacheDir = context.cacheDir;
            const fileName = `${this.bookTitle}_${this.bookId}_${chapterIndex}.txt`;
            const filePath = `${cacheDir}/chapters/${fileName}`;
            // 确保目录存在
            const dirPath = `${cacheDir}/chapters`;
            if (!fs.accessSync(dirPath)) {
                fs.mkdirSync(dirPath, true);
            }
            // 写入文件
            const file = fs.openSync(filePath, fs.OpenMode.CREATE | fs.OpenMode.TRUNC | fs.OpenMode.WRITE_ONLY);
            const encoder = new util.TextEncoder();
            const uint8Array = encoder.encodeInto(content);
            fs.writeSync(file.fd, uint8Array.buffer);
            fs.closeSync(file);
            // 更新数据库记录
            const chapterDownloadInfo: ChapterDownloadInfo = {
                id: 0,
                bookId: this.bookId,
                chapterIndex: chapterIndex,
                chapterTitle: chapter.title,
                chapterUrl: chapter.url,
                content: content,
                isDownloaded: true,
                downloadTime: Date.now(),
                filePath: filePath
            };
            await onlineBookDataManager.saveChapterDownload(chapterDownloadInfo);
            hilog.info(0x0000, TAG, `章节下载记录已更新: ${chapter.title}`);
        }
        catch (error) {
            hilog.error(0x0000, TAG, '更新章节下载记录失败: ' + JSON.stringify(error));
        }
    }
    /**
     * 保存阅读进度
     */
    private async saveReadingProgress(): Promise<void> {
        if (this.bookId > 0 && this.currentChapterIndex >= 0 && this.chapters.length > 0) {
            const chapterTitle = this.chapters[this.currentChapterIndex]?.title || '';
            try {
                await onlineBookDataManager.updateReadingProgress(this.bookId, this.currentChapterIndex, chapterTitle);
                hilog.info(0x0000, TAG, `保存阅读进度成功: 章节${this.currentChapterIndex + 1}/${this.chapters.length} - ${chapterTitle}`);
            }
            catch (error) {
                hilog.error(0x0000, TAG, '保存阅读进度失败: ' + JSON.stringify(error));
            }
        }
    }
    /**
     * 上一章
     */
    private async previousChapter(): Promise<void> {
        if (this.currentChapterIndex > 0) {
            await this.loadChapter(this.currentChapterIndex - 1);
        }
        else {
            this.getUIContext().getPromptAction().showToast({ message: '已经是第一章了', duration: 2000 });
        }
    }
    /**
     * 下一章
     */
    private async nextChapter(): Promise<void> {
        if (this.currentChapterIndex < this.chapters.length - 1) {
            await this.loadChapter(this.currentChapterIndex + 1);
        }
        else {
            this.getUIContext().getPromptAction().showToast({ message: '已经是最后一章了', duration: 2000 });
        }
    }
    /**
     * 跳转到指定章节
     */
    private async jumpToChapter(chapterIndex: number): Promise<void> {
        this.showCatalog = false;
        this.showToolbar = false;
        await this.loadChapter(chapterIndex);
    }
    /**
     * 切换工具栏显示
     */
    private toggleToolbar(): void {
        this.showToolbar = !this.showToolbar;
    }
    /**
     * 返回上一页
     */
    private goBack(): void {
        router.back();
    }
    /**
     * 保存设置
     */
    private async saveSettings(): Promise<void> {
        try {
            await settingsManager.saveSettings({
                fontName: this.fontFamily,
                fontPath: this.selectFontPath,
                fontSize: this.fontSize,
                lineHeight: this.lineHeight,
                theme: this.themeList[this.themeSelectIndex],
                flipMode: this.flipMode
            });
        }
        catch (error) {
            hilog.error(0x0000, TAG, '保存设置失败: ' + JSON.stringify(error));
        }
    }
    /**
     * 构建调试对话框
     */
    private buildDebugDialog(parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(427:5)", "entry");
            Column.width('100%');
            Column.height('100%');
            Column.backgroundColor(Color.White);
            Column.borderRadius({ topLeft: 16, topRight: 16 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 标题栏
            Row.create();
            Row.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(429:7)", "entry");
            // 标题栏
            Row.width('100%');
            // 标题栏
            Row.height(56);
            // 标题栏
            Row.padding({ left: 16, right: 16 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('章节内容调试');
            Text.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(430:9)", "entry");
            Text.fontSize(18);
            Text.fontWeight(FontWeight.Medium);
            Text.fontColor('#2D3748');
            Text.layoutWeight(1);
            Text.textAlign(TextAlign.Center);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithChild();
            Button.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(437:9)", "entry");
            Button.width(40);
            Button.height(40);
            Button.backgroundColor(Color.Transparent);
            Button.onClick(() => {
                this.showDebugDialog = false;
            });
        }, Button);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            SymbolGlyph.create({ "id": 125831487, "type": 40000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            SymbolGlyph.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(438:11)", "entry");
            SymbolGlyph.fontColor(['#666666']);
            SymbolGlyph.fontSize(18);
        }, SymbolGlyph);
        Button.pop();
        // 标题栏
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 内容区域
            Scroll.create();
            Scroll.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(454:7)", "entry");
            // 内容区域
            Scroll.width('100%');
            // 内容区域
            Scroll.layoutWeight(1);
            // 内容区域
            Scroll.scrollBar(BarState.Auto);
            // 内容区域
            Scroll.edgeEffect(EdgeEffect.Spring);
        }, Scroll);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.debugContent);
            Text.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(455:9)", "entry");
            Text.fontSize(14);
            Text.fontColor('#2D3748');
            Text.width('100%');
            Text.padding(16);
        }, Text);
        Text.pop();
        // 内容区域
        Scroll.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 底部按钮
            Row.create();
            Row.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(467:7)", "entry");
            // 底部按钮
            Row.width('100%');
            // 底部按钮
            Row.padding(16);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('关闭');
            Button.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(468:9)", "entry");
            Button.fontSize(14);
            Button.fontColor(Color.White);
            Button.backgroundColor(Color.Blue);
            Button.layoutWeight(1);
            Button.onClick(() => {
                this.showDebugDialog = false;
            });
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('重新加载');
            Button.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(477:9)", "entry");
            Button.fontSize(14);
            Button.fontColor(Color.White);
            Button.backgroundColor(Color.Orange);
            Button.layoutWeight(1);
            Button.margin({ left: 8 });
            Button.onClick(() => {
                this.showDebugDialog = false;
                this.loadChapter(this.currentChapterIndex);
            });
        }, Button);
        Button.pop();
        // 底部按钮
        Row.pop();
        Column.pop();
    }
    /**
     * 构建目录列表
     */
    private buildCatalog(parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(502:5)", "entry");
            Column.padding(20);
            Column.backgroundColor(Color.White);
            Column.borderRadius({ topLeft: 16, topRight: 16 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 弹窗标题（移除自定义关闭按钮，使用系统默认的）
            Row.create();
            Row.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(504:7)", "entry");
            // 弹窗标题（移除自定义关闭按钮，使用系统默认的）
            Row.width('100%');
            // 弹窗标题（移除自定义关闭按钮，使用系统默认的）
            Row.margin({ bottom: 16 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('章节目录');
            Text.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(505:9)", "entry");
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
            if (this.chapters.length > 0) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        List.create({ scroller: this.catalogScroller });
                        List.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(517:9)", "entry");
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
                                    ListItem.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(519:13)", "entry");
                                };
                                const deepRenderFunction = (elmtId, isInitialRender) => {
                                    itemCreation(elmtId, isInitialRender);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Row.create();
                                        Row.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(520:15)", "entry");
                                        Row.width('100%');
                                        Row.padding({ left: 12, right: 12, top: 12, bottom: 12 });
                                        Row.backgroundColor(index === this.currentChapterIndex ? '#FFF5F5' : '#F7FAFC');
                                        Row.borderRadius(8);
                                        Row.margin({ bottom: 8 });
                                        Row.onClick(() => {
                                            this.jumpToChapter(index);
                                        });
                                    }, Row);
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(`${index + 1}.`);
                                        Text.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(521:17)", "entry");
                                        Text.fontSize(14);
                                        Text.fontColor('#718096');
                                        Text.width(40);
                                    }, Text);
                                    Text.pop();
                                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                                        Text.create(chapter.title);
                                        Text.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(526:17)", "entry");
                                        Text.fontSize(14);
                                        Text.fontColor(index === this.currentChapterIndex ? Color.Red : '#2D3748');
                                        Text.fontWeight(index === this.currentChapterIndex ? FontWeight.Bold : FontWeight.Normal);
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
                        this.forEachUpdateFunction(elmtId, this.chapters, forEachItemGenFunction, undefined, true, false);
                    }, ForEach);
                    ForEach.pop();
                    List.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(548:9)", "entry");
                        Column.width('100%');
                        Column.height(200);
                        Column.justifyContent(FlexAlign.Center);
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('📖');
                        Text.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(549:11)", "entry");
                        Text.fontSize(48);
                        Text.margin({ bottom: 12 });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('暂无章节信息');
                        Text.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(552:11)", "entry");
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
    /**
     * 构建设置面板
     */
    private buildSettings(parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(571:5)", "entry");
            Column.padding(20);
            Column.backgroundColor(Color.White);
            Column.borderRadius({ topLeft: 16, topRight: 16 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('阅读设置');
            Text.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(572:7)", "entry");
            Text.fontSize(18);
            Text.fontWeight(FontWeight.Medium);
            Text.margin({ bottom: 20 });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 字体大小
            Row.create();
            Row.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(578:7)", "entry");
            // 字体大小
            Row.width('100%');
            // 字体大小
            Row.margin({ bottom: 16 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('字体大小');
            Text.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(579:9)", "entry");
            Text.fontSize(14);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Blank.create();
            Blank.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(582:9)", "entry");
        }, Blank);
        Blank.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('-');
            Button.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(584:9)", "entry");
            Button.fontSize(18);
            Button.width(40);
            Button.height(40);
            Button.onClick(() => {
                if (this.fontSize > 12) {
                    this.fontSize--;
                    this.saveSettings();
                }
            });
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.fontSize.toString());
            Text.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(595:9)", "entry");
            Text.fontSize(16);
            Text.width(40);
            Text.textAlign(TextAlign.Center);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('+');
            Button.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(600:9)", "entry");
            Button.fontSize(18);
            Button.width(40);
            Button.height(40);
            Button.onClick(() => {
                if (this.fontSize < 32) {
                    this.fontSize++;
                    this.saveSettings();
                }
            });
        }, Button);
        Button.pop();
        // 字体大小
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 行间距
            Row.create();
            Row.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(615:7)", "entry");
            // 行间距
            Row.width('100%');
            // 行间距
            Row.margin({ bottom: 16 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('行间距');
            Text.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(616:9)", "entry");
            Text.fontSize(14);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Blank.create();
            Blank.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(619:9)", "entry");
        }, Blank);
        Blank.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('-');
            Button.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(621:9)", "entry");
            Button.fontSize(18);
            Button.width(40);
            Button.height(40);
            Button.onClick(() => {
                if (this.lineHeight > 1.0) {
                    this.lineHeight = Math.round((this.lineHeight - 0.1) * 10) / 10;
                    this.saveSettings();
                }
            });
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.lineHeight.toFixed(1));
            Text.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(632:9)", "entry");
            Text.fontSize(16);
            Text.width(40);
            Text.textAlign(TextAlign.Center);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('+');
            Button.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(637:9)", "entry");
            Button.fontSize(18);
            Button.width(40);
            Button.height(40);
            Button.onClick(() => {
                if (this.lineHeight < 3.0) {
                    this.lineHeight = Math.round((this.lineHeight + 0.1) * 10) / 10;
                    this.saveSettings();
                }
            });
        }, Button);
        Button.pop();
        // 行间距
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create();
            Text.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(651:7)", "entry");
            Text.width('92%');
            Text.height(1);
            Text.margin({ top: 12, bottom: 12 });
            Text.backgroundColor({ "id": 16777244, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 主题选择
            Scroll.create();
            Scroll.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(658:7)", "entry");
            // 主题选择
            Scroll.margin({ top: 8 });
            // 主题选择
            Scroll.scrollable(ScrollDirection.Horizontal);
            // 主题选择
            Scroll.scrollBar(BarState.Off);
            // 主题选择
            Scroll.edgeEffect(EdgeEffect.Spring);
        }, Scroll);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 12 });
            Row.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(659:9)", "entry");
            Row.constraintSize({
                minWidth: '100%'
            });
            Row.padding({
                left: 12,
                right: 12,
                top: 12,
                bottom: 12
            });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            ForEach.create();
            const forEachItemGenFunction = (_item, index: number) => {
                const item = _item;
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Stack.create();
                    Stack.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(661:13)", "entry");
                    Stack.width(`calc((100% - ${(Number(this.themeList.length) - 1) * 12}vp) / ${Number(this.themeList.length)})`);
                    Stack.constraintSize({
                        minWidth: 60
                    });
                    Stack.borderRadius(30);
                    Stack.borderStyle(BorderStyle.Solid);
                    Stack.onClick(async () => {
                        this.themeSelectIndex = index;
                        this.applyTheme(item, index);
                        await this.saveSettings();
                    });
                }, Stack);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    Row.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(662:15)", "entry");
                    Row.width('100%');
                    Row.height(40);
                    Row.borderWidth(this.themeSelectIndex !== index ? 1 : 2);
                    Row.borderColor(this.themeSelectIndex !== index ? { "id": 16777250, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" } :
                        this.themeBorderColor[this.themeSelectIndex]);
                    Row.backgroundColor(this.THEME_BUTTON_BACKGROUND[item.toString()]);
                    Row.borderRadius(20);
                }, Row);
                Row.pop();
                Stack.pop();
            };
            this.forEachUpdateFunction(elmtId, this.themeList, forEachItemGenFunction, undefined, true, false);
        }, ForEach);
        ForEach.pop();
        Row.pop();
        // 主题选择
        Scroll.pop();
        Column.pop();
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Stack.create();
            Stack.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(705:5)", "entry");
            Stack.width('100%');
            Stack.height('100%');
            Stack.bindSheet({ value: this.showCatalog, changeEvent: newValue => { this.showCatalog = newValue; } }, { builder: () => {
                    this.buildCatalog.call(this);
                } }, {
                height: 600,
                dragBar: true,
                backgroundColor: Color.White
            });
            Stack.bindSheet({ value: this.showSettings, changeEvent: newValue => { this.showSettings = newValue; } }, { builder: () => {
                    this.buildSettings.call(this);
                } }, {
                height: 400,
                dragBar: true,
                backgroundColor: Color.White
            });
            Stack.bindSheet({ value: this.showDebugDialog, changeEvent: newValue => { this.showDebugDialog = newValue; } }, { builder: () => {
                    this.buildDebugDialog.call(this);
                } }, {
                height: 600,
                dragBar: true,
                backgroundColor: Color.White
            });
        }, Stack);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 主内容区域
            Column.create();
            Column.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(707:7)", "entry");
            // 主内容区域
            Column.width('100%');
            // 主内容区域
            Column.height('100%');
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            // 顶部标题栏（条件显示）
            if (this.showToolbar) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create();
                        Row.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(710:11)", "entry");
                        Row.width('100%');
                        Row.height(56);
                        Row.padding({ left: 16, right: 16 });
                        Row.backgroundColor(this.backgroundColorValue);
                        Row.transition(TransitionEffect.OPACITY.animation({ duration: 300 }));
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithChild();
                        Button.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(711:13)", "entry");
                        Button.width(40);
                        Button.height(40);
                        Button.backgroundColor(Color.Transparent);
                        Button.onClick(() => {
                            this.goBack();
                        });
                    }, Button);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        SymbolGlyph.create({ "id": 125832663, "type": 40000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        SymbolGlyph.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(712:15)", "entry");
                        SymbolGlyph.fontColor([this.fontColor]);
                        SymbolGlyph.fontSize(24);
                    }, SymbolGlyph);
                    Button.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(this.bookTitle);
                        Text.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(723:13)", "entry");
                        Text.fontSize(16);
                        Text.fontColor(this.fontColor);
                        Text.layoutWeight(1);
                        Text.textAlign(TextAlign.Center);
                        Text.maxLines(1);
                        Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithLabel();
                        Button.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(731:13)", "entry");
                        Button.width(40);
                        Button.height(40);
                        Button.backgroundColor(Color.Transparent);
                    }, Button);
                    Button.pop();
                    Row.pop();
                });
            }
            // WebView内容区域
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            // WebView内容区域
            if (this.isLoading) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(745:11)", "entry");
                        Column.width('100%');
                        Column.layoutWeight(1);
                        Column.justifyContent(FlexAlign.Center);
                        Column.backgroundColor(this.backgroundColorValue);
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        LoadingProgress.create();
                        LoadingProgress.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(746:13)", "entry");
                        LoadingProgress.width(60);
                        LoadingProgress.height(60);
                        LoadingProgress.color(Color.Blue);
                    }, LoadingProgress);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('正在加载章节...');
                        Text.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(751:13)", "entry");
                        Text.fontSize(14);
                        Text.fontColor(this.fontColor);
                        Text.margin({ top: 16 });
                    }, Text);
                    Text.pop();
                    Column.pop();
                });
            }
            else if (this.errorMessage) {
                this.ifElseBranchUpdateFunction(1, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(761:11)", "entry");
                        Column.width('100%');
                        Column.layoutWeight(1);
                        Column.justifyContent(FlexAlign.Center);
                        Column.backgroundColor(this.backgroundColorValue);
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        SymbolGlyph.create({ "id": 125832652, "type": 40000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        SymbolGlyph.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(762:13)", "entry");
                        SymbolGlyph.fontSize(48);
                        SymbolGlyph.fontColor([Color.Orange]);
                        SymbolGlyph.margin({ bottom: 16 });
                    }, SymbolGlyph);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(this.errorMessage);
                        Text.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(767:13)", "entry");
                        Text.fontSize(14);
                        Text.fontColor(this.fontColor);
                        Text.textAlign(TextAlign.Center);
                        Text.margin({ bottom: 20 });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithLabel('重试');
                        Button.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(773:13)", "entry");
                        Button.onClick(() => {
                            this.loadChapter(this.currentChapterIndex);
                        });
                    }, Button);
                    Button.pop();
                    Column.pop();
                });
            }
            else {
                this.ifElseBranchUpdateFunction(2, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 使用Scroll + Text组件显示内容（更可靠）
                        Scroll.create();
                        Scroll.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(784:11)", "entry");
                        // 使用Scroll + Text组件显示内容（更可靠）
                        Scroll.width('100%');
                        // 使用Scroll + Text组件显示内容（更可靠）
                        Scroll.layoutWeight(1);
                        // 使用Scroll + Text组件显示内容（更可靠）
                        Scroll.backgroundColor(this.backgroundColorValue);
                        // 使用Scroll + Text组件显示内容（更可靠）
                        Scroll.scrollBar(BarState.Auto);
                        // 使用Scroll + Text组件显示内容（更可靠）
                        Scroll.edgeEffect(EdgeEffect.Spring);
                        // 使用Scroll + Text组件显示内容（更可靠）
                        Scroll.onClick(() => {
                            this.toggleToolbar();
                        });
                    }, Scroll);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(785:13)", "entry");
                        Column.width('100%');
                        Column.padding(20);
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 章节标题
                        Text.create(this.chapters[this.currentChapterIndex]?.title || '');
                        Text.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(787:15)", "entry");
                        // 章节标题
                        Text.fontSize(this.fontSize + 2);
                        // 章节标题
                        Text.fontWeight(FontWeight.Bold);
                        // 章节标题
                        Text.fontColor(this.fontColor);
                        // 章节标题
                        Text.textAlign(TextAlign.Center);
                        // 章节标题
                        Text.width('100%');
                        // 章节标题
                        Text.margin({ bottom: 20 });
                        // 章节标题
                        Text.padding({ bottom: 10 });
                        // 章节标题
                        Text.border({
                            width: { bottom: 1 },
                            color: this.fontColor + '33'
                        });
                    }, Text);
                    // 章节标题
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        // 章节内容 - 按段落分割显示
                        Column.create();
                        Column.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(801:15)", "entry");
                        // 章节内容 - 按段落分割显示
                        Column.width('100%');
                        // 章节内容 - 按段落分割显示
                        Column.alignItems(HorizontalAlign.Start);
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        ForEach.create();
                        const forEachItemGenFunction = (_item, index: number) => {
                            const paragraph = _item;
                            this.observeComponentCreation2((elmtId, isInitialRender) => {
                                Text.create(paragraph.trim());
                                Text.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(803:19)", "entry");
                                Text.fontSize(this.fontSize);
                                Text.fontColor(this.fontColor);
                                Text.lineHeight(this.fontSize * this.lineHeight);
                                Text.width('100%');
                                Text.textAlign(TextAlign.Start);
                                Text.textIndent(this.fontSize * 2);
                                Text.margin({ bottom: this.fontSize * 0.8 });
                            }, Text);
                            Text.pop();
                        };
                        this.forEachUpdateFunction(elmtId, this.chapterContent.split('\n').filter((p: string) => p.trim().length > 0), forEachItemGenFunction, (paragraph: string, index: number) => `paragraph_${index}`, true, true);
                    }, ForEach);
                    ForEach.pop();
                    // 章节内容 - 按段落分割显示
                    Column.pop();
                    Column.pop();
                    // 使用Scroll + Text组件显示内容（更可靠）
                    Scroll.pop();
                });
            }
        }, If);
        If.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            // 底部操作栏（条件显示）
            if (this.showToolbar && !this.isLoading && !this.errorMessage) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create();
                        Row.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(831:11)", "entry");
                        Row.width('100%');
                        Row.height(60);
                        Row.padding({ left: 16, right: 16 });
                        Row.backgroundColor(Color.White);
                        Row.shadow({
                            radius: 8,
                            color: '#20000000',
                            offsetY: -2
                        });
                        Row.transition(TransitionEffect.OPACITY.animation({ duration: 300 }));
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithLabel('上一章');
                        Button.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(832:13)", "entry");
                        Button.fontSize(14);
                        Button.fontColor(Color.White);
                        Button.backgroundColor(Color.Blue);
                        Button.layoutWeight(1);
                        Button.onClick(() => {
                            this.previousChapter();
                        });
                    }, Button);
                    Button.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithLabel('目录');
                        Button.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(841:13)", "entry");
                        Button.fontSize(14);
                        Button.fontColor(Color.White);
                        Button.backgroundColor(Color.Blue);
                        Button.layoutWeight(1);
                        Button.margin({ left: 8, right: 8 });
                        Button.onClick(() => {
                            // 先显示弹窗，延迟隐藏工具栏
                            this.showCatalog = true;
                            setTimeout(() => {
                                this.showToolbar = false;
                            }, 100);
                        });
                    }, Button);
                    Button.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithLabel('设置');
                        Button.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(855:13)", "entry");
                        Button.fontSize(14);
                        Button.fontColor(Color.White);
                        Button.backgroundColor(Color.Blue);
                        Button.layoutWeight(1);
                        Button.margin({ right: 8 });
                        Button.onClick(() => {
                            // 先显示弹窗，延迟隐藏工具栏
                            this.showSettings = true;
                            setTimeout(() => {
                                this.showToolbar = false;
                            }, 100);
                        });
                    }, Button);
                    Button.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithLabel('下一章');
                        Button.debugLine("entry/src/main/ets/pages/OnlineChapterReader.ets(869:13)", "entry");
                        Button.fontSize(14);
                        Button.fontColor(Color.White);
                        Button.backgroundColor(Color.Blue);
                        Button.layoutWeight(1);
                        Button.onClick(() => {
                            this.nextChapter();
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
        // 主内容区域
        Column.pop();
        Stack.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "OnlineChapterReader";
    }
}
export { OnlineChapterReader };
registerNamedRoute(() => new OnlineChapterReader(undefined, {}), "", { bundleName: "liubai.yuedu.hos", moduleName: "entry", pagePath: "pages/OnlineChapterReader", pageFullPath: "entry/src/main/ets/pages/OnlineChapterReader", integratedHsp: "false", moduleType: "followWithHap" });
