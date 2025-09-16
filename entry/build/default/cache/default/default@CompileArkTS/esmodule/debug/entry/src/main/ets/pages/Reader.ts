if (!("finalizeConstruction" in ViewPU.prototype)) {
    Reflect.set(ViewPU.prototype, "finalizeConstruction", () => { });
}
interface Reader_Params {
    windowWidth?: number;
    windowHeight?: number;
    colorMode?: ConfigurationConstant.ColorMode;
    showModalBanner?: boolean;
    currentIndex?: number;
    catalogItemList?: bookParser.CatalogItem[];
    currentCatalogIndex?: number;
    catalogListScroller?: Scroller;
    currentData?: readerCore.PageDataInfo | null;
    defaultHandler?: bookParser.BookParserHandler | null;
    readerComponentController?: readerCore.ReaderComponentController;
    preference?: preferences.Preferences | null;
    filePath?: string;
    bookCover?: PixelMap | null;
    bookTitle?: string;
    author?: string;
    isLoading?: boolean;
    loadingProgress?: string;
    hasError?: boolean;
    errorMessage?: string;
    fontSize?: string;
    lineHeight?: string;
    fontList?: Array<FontFileInfo>;
    selectFontPath?: string;
    themeList?: string[];
    THEME_BUTTON_BACKGROUND?: Record<string, Resource>;
    THEME_PAGE_COLOR?: Record<string, string>;
    themeBorderColor?: Record<number, Resource>;
    themeSelectIndex?: number;
    readerSetting?: readerCore.ReaderSetting;
    screenDensityCallBack?: Callback<number> | null;
    resourceRequest?: bookParser.CallbackRes<string, ArrayBuffer>;
}
import { WindowAbility } from "@bundle:liubai.yuedu.hos/entry/ets/entryability/WindowAbility";
import display from "@ohos:display";
import fs from "@ohos:file.fs";
import image from "@ohos:multimedia.image";
import type { BusinessError as BusinessError } from "@ohos:base";
import { FontFileInfo } from "@bundle:liubai.yuedu.hos/entry/ets/common/FontFileInfo";
import hilog from "@ohos:hilog";
import { bookDataManager } from "@bundle:liubai.yuedu.hos/entry/ets/utils/BookDataManager";
import { settingsManager } from "@bundle:liubai.yuedu.hos/entry/ets/utils/SettingsManager";
import preferences from "@ohos:data.preferences";
import { ReadPageComponent as ReadPageComponent } from "@hms:core.readerservice.readerComponent";
import { readerCore as readerCore } from "@hms:core.readerservice.readerComponent";
import { bookParser as bookParser } from "@hms:core.readerservice.bookParser";
import type common from "@ohos:app.ability.common";
import ConfigurationConstant from "@ohos:app.ability.ConfigurationConstant";
interface paramType {
    filePath: string;
    resourceIndex: number;
    domPos: string;
}
interface ProgressData {
    resourceIndex: number;
    domPos: string;
}
const TAG: string = 'ReaderPage';
const PREFERENCES_NAME = 'reader_progress';
class Reader extends ViewPU {
    constructor(parent, params, __localStorage, elmtId = -1, paramsLambda = undefined, extraInfo) {
        super(parent, __localStorage, elmtId, extraInfo);
        if (typeof paramsLambda === "function") {
            this.paramsGenerator_ = paramsLambda;
        }
        this.__windowWidth = this.createStorageLink('windowWidth', 0, "windowWidth");
        this.__windowHeight = this.createStorageLink('windowHeight', 0, "windowHeight");
        this.__colorMode = this.createStorageLink('colorMode', ConfigurationConstant.ColorMode.COLOR_MODE_NOT_SET, "colorMode");
        this.__showModalBanner = new ObservedPropertySimplePU(false, this, "showModalBanner");
        this.__currentIndex = new ObservedPropertySimplePU(-1, this, "currentIndex");
        this.__catalogItemList = new ObservedPropertyObjectPU([], this, "catalogItemList");
        this.__currentCatalogIndex = new ObservedPropertySimplePU(-1, this, "currentCatalogIndex");
        this.catalogListScroller = new Scroller();
        this.currentData = null;
        this.defaultHandler = null;
        this.readerComponentController = new readerCore.ReaderComponentController();
        this.preference = null;
        this.filePath = '';
        this.__bookCover = new ObservedPropertyObjectPU(null, this, "bookCover");
        this.__bookTitle = new ObservedPropertySimplePU('', this, "bookTitle");
        this.__author = new ObservedPropertySimplePU('', this, "author");
        this.__isLoading = new ObservedPropertySimplePU(true, this, "isLoading");
        this.__loadingProgress = new ObservedPropertySimplePU('正在加载...', this, "loadingProgress");
        this.__hasError = new ObservedPropertySimplePU(false, this, "hasError");
        this.__errorMessage = new ObservedPropertySimplePU('', this, "errorMessage");
        this.__fontSize = new ObservedPropertySimplePU('18', this, "fontSize");
        this.__lineHeight = new ObservedPropertySimplePU('', this, "lineHeight");
        this.fontList = [new FontFileInfo(this.getUIContext().getHostContext()!.resourceManager.getStringSync({ "id": 16777233, "type": 10003, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" }), ''),
            new FontFileInfo(this.getUIContext()
                .getHostContext()!.resourceManager.getStringSync({ "id": 16777232, "type": 10003, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" }), 'fonts/SourceHanSerifCN-VF.ttf')];
        this.__selectFontPath = new ObservedPropertySimplePU('', this, "selectFontPath");
        this.__themeList = new ObservedPropertyObjectPU([
            'white',
            'yellow',
            'pink',
            'green',
            'dark',
            'whiteSky',
            'darkSky'
        ], this, "themeList");
        this.THEME_BUTTON_BACKGROUND = {
            'white': { "id": 16777255, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            'yellow': { "id": 16777256, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            'pink': { "id": 16777252, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            'green': { "id": 16777251, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            'dark': { "id": 16777250, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            'whiteSky': { "id": 16777255, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            'darkSky': { "id": 16777250, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" }
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
            0: { "id": 16777247, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            1: { "id": 16777248, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            2: { "id": 16777246, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            3: { "id": 16777245, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            4: { "id": 16777247, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            5: { "id": 16777247, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            6: { "id": 16777247, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" }
        };
        this.__themeSelectIndex = new ObservedPropertySimplePU(0, this, "themeSelectIndex");
        this.readerSetting = {
            fontName: this.getUIContext().getHostContext()!.resourceManager.getStringSync({ "id": 16777233, "type": 10003, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" }),
            fontPath: '',
            fontSize: Number.parseInt(this.fontSize),
            fontColor: '#000000',
            fontWeight: 400,
            lineHeight: 1.9,
            nightMode: false,
            themeColor: 'rgba(248, 249, 250, 1)',
            themeBgImg: '',
            flipMode: '0',
            scaledDensity: display.getDefaultDisplaySync().scaledDensity > 0 ? display.getDefaultDisplaySync().scaledDensity :
                1,
            viewPortWidth: this.windowWidth,
            viewPortHeight: this.windowHeight
        };
        this.screenDensityCallBack = null;
        this.resourceRequest = (filePath: string): ArrayBuffer => {
            hilog.info(0x0000, TAG, 'resourceRequest : filePath = ' + filePath + ', this.selectFontPath = ' + this.selectFontPath);
            if (filePath.length === 0) {
                return new ArrayBuffer(0);
            }
            let resourcePath = filePath;
            if (this.isFont(filePath)) {
                resourcePath = this.selectFontPath;
            }
            try {
                let context = this.getUIContext().getHostContext() as common.UIAbilityContext;
                let value: Uint8Array = context.resourceManager.getRawFileContentSync(resourcePath);
                hilog.info(0x0000, TAG, 'resourceRequest : get other resource succeeded ');
                return value.buffer as ArrayBuffer;
            }
            catch (error) {
                let code = (error as BusinessError).code;
                let message = (error as BusinessError).message;
                hilog.error(0x0000, TAG, `resourceRequest : get resource failed, error code: ${code}`);
                hilog.error(0x0000, TAG, `resourceRequest : get resource failed, message: ${message}.`);
            }
            // Get data in the sandbox path
            return this.loadFileFromPath(resourcePath);
        };
        this.setInitiallyProvidedValue(params);
        this.declareWatch("colorMode", this.colorModeChange);
        this.finalizeConstruction();
    }
    setInitiallyProvidedValue(params: Reader_Params) {
        if (params.showModalBanner !== undefined) {
            this.showModalBanner = params.showModalBanner;
        }
        if (params.currentIndex !== undefined) {
            this.currentIndex = params.currentIndex;
        }
        if (params.catalogItemList !== undefined) {
            this.catalogItemList = params.catalogItemList;
        }
        if (params.currentCatalogIndex !== undefined) {
            this.currentCatalogIndex = params.currentCatalogIndex;
        }
        if (params.catalogListScroller !== undefined) {
            this.catalogListScroller = params.catalogListScroller;
        }
        if (params.currentData !== undefined) {
            this.currentData = params.currentData;
        }
        if (params.defaultHandler !== undefined) {
            this.defaultHandler = params.defaultHandler;
        }
        if (params.readerComponentController !== undefined) {
            this.readerComponentController = params.readerComponentController;
        }
        if (params.preference !== undefined) {
            this.preference = params.preference;
        }
        if (params.filePath !== undefined) {
            this.filePath = params.filePath;
        }
        if (params.bookCover !== undefined) {
            this.bookCover = params.bookCover;
        }
        if (params.bookTitle !== undefined) {
            this.bookTitle = params.bookTitle;
        }
        if (params.author !== undefined) {
            this.author = params.author;
        }
        if (params.isLoading !== undefined) {
            this.isLoading = params.isLoading;
        }
        if (params.loadingProgress !== undefined) {
            this.loadingProgress = params.loadingProgress;
        }
        if (params.hasError !== undefined) {
            this.hasError = params.hasError;
        }
        if (params.errorMessage !== undefined) {
            this.errorMessage = params.errorMessage;
        }
        if (params.fontSize !== undefined) {
            this.fontSize = params.fontSize;
        }
        if (params.lineHeight !== undefined) {
            this.lineHeight = params.lineHeight;
        }
        if (params.fontList !== undefined) {
            this.fontList = params.fontList;
        }
        if (params.selectFontPath !== undefined) {
            this.selectFontPath = params.selectFontPath;
        }
        if (params.themeList !== undefined) {
            this.themeList = params.themeList;
        }
        if (params.THEME_BUTTON_BACKGROUND !== undefined) {
            this.THEME_BUTTON_BACKGROUND = params.THEME_BUTTON_BACKGROUND;
        }
        if (params.THEME_PAGE_COLOR !== undefined) {
            this.THEME_PAGE_COLOR = params.THEME_PAGE_COLOR;
        }
        if (params.themeBorderColor !== undefined) {
            this.themeBorderColor = params.themeBorderColor;
        }
        if (params.themeSelectIndex !== undefined) {
            this.themeSelectIndex = params.themeSelectIndex;
        }
        if (params.readerSetting !== undefined) {
            this.readerSetting = params.readerSetting;
        }
        if (params.screenDensityCallBack !== undefined) {
            this.screenDensityCallBack = params.screenDensityCallBack;
        }
        if (params.resourceRequest !== undefined) {
            this.resourceRequest = params.resourceRequest;
        }
    }
    updateStateVars(params: Reader_Params) {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__windowWidth.purgeDependencyOnElmtId(rmElmtId);
        this.__windowHeight.purgeDependencyOnElmtId(rmElmtId);
        this.__colorMode.purgeDependencyOnElmtId(rmElmtId);
        this.__showModalBanner.purgeDependencyOnElmtId(rmElmtId);
        this.__currentIndex.purgeDependencyOnElmtId(rmElmtId);
        this.__catalogItemList.purgeDependencyOnElmtId(rmElmtId);
        this.__currentCatalogIndex.purgeDependencyOnElmtId(rmElmtId);
        this.__bookCover.purgeDependencyOnElmtId(rmElmtId);
        this.__bookTitle.purgeDependencyOnElmtId(rmElmtId);
        this.__author.purgeDependencyOnElmtId(rmElmtId);
        this.__isLoading.purgeDependencyOnElmtId(rmElmtId);
        this.__loadingProgress.purgeDependencyOnElmtId(rmElmtId);
        this.__hasError.purgeDependencyOnElmtId(rmElmtId);
        this.__errorMessage.purgeDependencyOnElmtId(rmElmtId);
        this.__fontSize.purgeDependencyOnElmtId(rmElmtId);
        this.__lineHeight.purgeDependencyOnElmtId(rmElmtId);
        this.__selectFontPath.purgeDependencyOnElmtId(rmElmtId);
        this.__themeList.purgeDependencyOnElmtId(rmElmtId);
        this.__themeSelectIndex.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__windowWidth.aboutToBeDeleted();
        this.__windowHeight.aboutToBeDeleted();
        this.__colorMode.aboutToBeDeleted();
        this.__showModalBanner.aboutToBeDeleted();
        this.__currentIndex.aboutToBeDeleted();
        this.__catalogItemList.aboutToBeDeleted();
        this.__currentCatalogIndex.aboutToBeDeleted();
        this.__bookCover.aboutToBeDeleted();
        this.__bookTitle.aboutToBeDeleted();
        this.__author.aboutToBeDeleted();
        this.__isLoading.aboutToBeDeleted();
        this.__loadingProgress.aboutToBeDeleted();
        this.__hasError.aboutToBeDeleted();
        this.__errorMessage.aboutToBeDeleted();
        this.__fontSize.aboutToBeDeleted();
        this.__lineHeight.aboutToBeDeleted();
        this.__selectFontPath.aboutToBeDeleted();
        this.__themeList.aboutToBeDeleted();
        this.__themeSelectIndex.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    private __windowWidth: ObservedPropertyAbstractPU<number>;
    get windowWidth() {
        return this.__windowWidth.get();
    }
    set windowWidth(newValue: number) {
        this.__windowWidth.set(newValue);
    }
    private __windowHeight: ObservedPropertyAbstractPU<number>;
    get windowHeight() {
        return this.__windowHeight.get();
    }
    set windowHeight(newValue: number) {
        this.__windowHeight.set(newValue);
    }
    private __colorMode: ObservedPropertyAbstractPU<ConfigurationConstant.ColorMode>;
    get colorMode() {
        return this.__colorMode.get();
    }
    set colorMode(newValue: ConfigurationConstant.ColorMode) {
        this.__colorMode.set(newValue);
    }
    /**
     * Display dialog box
     */
    private __showModalBanner: ObservedPropertySimplePU<boolean>;
    get showModalBanner() {
        return this.__showModalBanner.get();
    }
    set showModalBanner(newValue: boolean) {
        this.__showModalBanner.set(newValue);
    }
    /**
     * Menu bar type index, 0 : catalog list, 1 : setting, 1 : close dialog
     */
    private __currentIndex: ObservedPropertySimplePU<number>;
    get currentIndex() {
        return this.__currentIndex.get();
    }
    set currentIndex(newValue: number) {
        this.__currentIndex.set(newValue);
    }
    private __catalogItemList: ObservedPropertyObjectPU<bookParser.CatalogItem[]>;
    get catalogItemList() {
        return this.__catalogItemList.get();
    }
    set catalogItemList(newValue: bookParser.CatalogItem[]) {
        this.__catalogItemList.set(newValue);
    }
    private __currentCatalogIndex: ObservedPropertySimplePU<number>; // 当前章节索引
    get currentCatalogIndex() {
        return this.__currentCatalogIndex.get();
    }
    set currentCatalogIndex(newValue: number) {
        this.__currentCatalogIndex.set(newValue);
    }
    private catalogListScroller: Scroller; // 目录列表滚动控制器
    private currentData: readerCore.PageDataInfo | null;
    private defaultHandler: bookParser.BookParserHandler | null;
    private readerComponentController: readerCore.ReaderComponentController;
    private preference: preferences.Preferences | null;
    private filePath: string;
    private __bookCover: ObservedPropertyObjectPU<PixelMap | null>;
    get bookCover() {
        return this.__bookCover.get();
    }
    set bookCover(newValue: PixelMap | null) {
        this.__bookCover.set(newValue);
    }
    private __bookTitle: ObservedPropertySimplePU<string>;
    get bookTitle() {
        return this.__bookTitle.get();
    }
    set bookTitle(newValue: string) {
        this.__bookTitle.set(newValue);
    }
    private __author: ObservedPropertySimplePU<string>;
    get author() {
        return this.__author.get();
    }
    set author(newValue: string) {
        this.__author.set(newValue);
    }
    private __isLoading: ObservedPropertySimplePU<boolean>; // 加载状态
    get isLoading() {
        return this.__isLoading.get();
    }
    set isLoading(newValue: boolean) {
        this.__isLoading.set(newValue);
    }
    private __loadingProgress: ObservedPropertySimplePU<string>; // 加载进度文本
    get loadingProgress() {
        return this.__loadingProgress.get();
    }
    set loadingProgress(newValue: string) {
        this.__loadingProgress.set(newValue);
    }
    private __hasError: ObservedPropertySimplePU<boolean>; // 错误状态
    get hasError() {
        return this.__hasError.get();
    }
    set hasError(newValue: boolean) {
        this.__hasError.set(newValue);
    }
    private __errorMessage: ObservedPropertySimplePU<string>; // 错误信息
    get errorMessage() {
        return this.__errorMessage.get();
    }
    set errorMessage(newValue: string) {
        this.__errorMessage.set(newValue);
    }
    private __fontSize: ObservedPropertySimplePU<string>;
    get fontSize() {
        return this.__fontSize.get();
    }
    set fontSize(newValue: string) {
        this.__fontSize.set(newValue);
    }
    private __lineHeight: ObservedPropertySimplePU<string>;
    get lineHeight() {
        return this.__lineHeight.get();
    }
    set lineHeight(newValue: string) {
        this.__lineHeight.set(newValue);
    }
    private fontList: Array<FontFileInfo>;
    private __selectFontPath: ObservedPropertySimplePU<string>;
    get selectFontPath() {
        return this.__selectFontPath.get();
    }
    set selectFontPath(newValue: string) {
        this.__selectFontPath.set(newValue);
    }
    private __themeList: ObservedPropertyObjectPU<string[]>;
    get themeList() {
        return this.__themeList.get();
    }
    set themeList(newValue: string[]) {
        this.__themeList.set(newValue);
    }
    private THEME_BUTTON_BACKGROUND: Record<string, Resource>;
    private THEME_PAGE_COLOR: Record<string, string>;
    private themeBorderColor: Record<number, Resource>;
    private __themeSelectIndex: ObservedPropertySimplePU<number>;
    get themeSelectIndex() {
        return this.__themeSelectIndex.get();
    }
    set themeSelectIndex(newValue: number) {
        this.__themeSelectIndex.set(newValue);
    }
    private readerSetting: readerCore.ReaderSetting;
    private screenDensityCallBack: Callback<number> | null;
    async aboutToAppear() {
        // Router addObserver 方法已移除，因为Router类型没有这个属性
        const logCode: number = 0x0000;
        const logTag: string = TAG;
        const currentDensity: number = this.readerSetting.scaledDensity;
        const newDensity: number = display.getDefaultDisplaySync().scaledDensity;
        hilog.info(logCode, logTag, `aboutToAppear : current scaledDensity = ${currentDensity}; change scaledDensity = ${newDensity}`);
        this.readerComponentController = new readerCore.ReaderComponentController();
        const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
        try {
            this.preference = await preferences.getPreferences(context, PREFERENCES_NAME);
        }
        catch (err) {
            const errorMessage: string = `Failed to get preferences; err: ${err}`;
            hilog.error(0x0000, TAG, errorMessage);
        }
        await settingsManager.init(context);
        const settings = await settingsManager.loadSettings();
        // Apply loaded settings
        this.readerSetting.fontName = settings.fontName;
        this.readerSetting.fontPath = settings.fontPath;
        this.selectFontPath = settings.fontPath;
        this.readerSetting.fontSize = settings.fontSize;
        this.fontSize = settings.fontSize.toString();
        this.readerSetting.lineHeight = settings.lineHeight;
        this.lineHeight = settings.lineHeight.toString();
        this.readerSetting.flipMode = settings.flipMode;
        this.themeSelectIndex = this.themeList.indexOf(settings.theme);
        this.applyTheme(settings.theme, this.themeSelectIndex);
        this.registerScreenDensityChange();
        WindowAbility.getInstance().toggleWindowSystemBar([], this.getUIContext().getHostContext());
        let param = this.getUIContext().getRouter().getParams() as paramType;
        this.filePath = param.filePath;
        let resourceIndex = param.resourceIndex;
        let domPos = param.domPos;
        this.startPlay(this.filePath, resourceIndex, domPos);
    }
    onPageHide(): void {
        // 页面隐藏时保存阅读进度
        this.saveReadingProgress();
    }
    /**
     * The color mode of the system changed
     */
    colorModeChange() {
        if (this.colorMode === ConfigurationConstant.ColorMode.COLOR_MODE_DARK) {
            this.readerSetting.nightMode = true;
            this.readerSetting.fontColor = '#ffffff';
            this.readerSetting.themeColor = '#202224';
        }
        else {
            this.readerSetting.nightMode = false;
            this.readerSetting.fontColor = '#000000';
            this.readerSetting.themeColor = '#FFFFFF';
        }
        this.readerComponentController.setPageConfig(this.readerSetting);
    }
    /**
     * register screen density changed callback
     */
    registerScreenDensityChange() {
        this.screenDensityCallBack = (data: number) => {
            let displaySync = display.getDefaultDisplaySync();
            let scaledDensity = displaySync.scaledDensity;
            if (scaledDensity !== this.readerSetting.scaledDensity) {
                AppStorage.setOrCreate('isDensityChange', true);
                this.getUIContext().getRouter().back();
            }
        };
        display.on('change', this.screenDensityCallBack);
    }
    /**
     * Resource request callback. Font files and theme background images can be stored in the resource directory (resources/rawfile) or application sandbox path
     */
    private resourceRequest: bookParser.CallbackRes<string, ArrayBuffer>;
    private async startPlay(path: string, resourceIndex: number, domPos: string) {
        try {
            this.isLoading = true;
            this.hasError = false;
            this.loadingProgress = '正在初始化阅读器...';
            const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
            const initPromise: Promise<void> = this.readerComponentController.init(context);
            // 使用默认处理器
            hilog.info(0x0000, TAG, 'Using default handler for file');
            this.loadingProgress = '正在解析书籍文件...';
            const defaultHandler = await bookParser.getDefaultHandler(path);
            this.loadingProgress = '正在启动阅读器...';
            await initPromise;
            this.defaultHandler = defaultHandler;
            hilog.info(0x0000, TAG, 'startPlay handler initialized successfully');
            this.readerComponentController.registerBookParser(this.defaultHandler);
            // Register listeners
            this.readerComponentController.on('resourceRequest', this.resourceRequest);
            this.readerComponentController.on('pageShow', (pageData: readerCore.PageDataInfo): void => {
                hilog.info(0x0000, TAG, 'pageshow: data is: ' + JSON.stringify(pageData));
                this.currentData = pageData;
                // Save page data
                this.saveReadingProgress();
                // Update current catalog index
                this.updateCurrentCatalogIndex();
                // 更新目录滚动位置
                if (this.currentCatalogIndex >= 0 && this.currentCatalogIndex < this.catalogItemList.length) {
                    this.catalogListScroller.scrollToIndex(this.currentCatalogIndex);
                }
            });
            WindowAbility.getInstance().onWindowSizeChange(() => {
                if (this.readerSetting.viewPortWidth != this.windowWidth ||
                    this.readerSetting.viewPortHeight != this.windowHeight) {
                    hilog.info(0x0000, TAG, 'onWindowSizeChange is changed, update page config');
                    // Windows size is changed, update current page viewport size
                    this.readerSetting.viewPortWidth = this.windowWidth;
                    this.readerSetting.viewPortHeight = this.windowHeight;
                    try {
                        this.readerComponentController.setPageConfig(this.readerSetting);
                    }
                    catch (e) {
                        hilog.error(0x0000, TAG, 'onWindowSizeChange, error ' + JSON.stringify(e));
                    }
                }
            });
            this.readerComponentController.setPageConfig(this.readerSetting);
            // 优先从 Preferences 加载精确阅读进度
            const progressKey = `${this.filePath}_progress`;
            const savedProgress = await this.preference?.get(progressKey, '');
            let startResourceIndex = 0;
            let startDomPos = '';
            if (typeof savedProgress === 'string' && savedProgress) {
                try {
                    const savedProgressObj = JSON.parse(savedProgress) as ProgressData;
                    startResourceIndex = savedProgressObj.resourceIndex;
                    startDomPos = savedProgressObj.domPos;
                    hilog.info(0x0000, TAG, `Loaded reading progress from preferences: resourceIndex=${startResourceIndex}, domPos=${startDomPos}`);
                }
                catch (e) {
                    hilog.error(0x0000, TAG, `Failed to parse saved progress: ${savedProgress}`);
                    // 如果 Preferences 解析失败，使用传入的参数作为备用
                    startResourceIndex = resourceIndex || 0;
                    startDomPos = domPos || '';
                    hilog.info(0x0000, TAG, `Using fallback parameters: resourceIndex=${startResourceIndex}, domPos=${startDomPos}`);
                }
            }
            else {
                // 如果 Preferences 中没有保存的进度，使用传入的参数（通常是首次阅读）
                startResourceIndex = resourceIndex || 0;
                startDomPos = domPos || '';
                hilog.info(0x0000, TAG, `No saved progress found, using initial parameters: resourceIndex=${startResourceIndex}, domPos=${startDomPos}`);
            }
            this.loadingProgress = '正在加载内容...';
            this.readerComponentController.startPlay(startResourceIndex, startDomPos);
            // 获取目录列表
            this.catalogItemList = this.defaultHandler?.getCatalogList() || [];
            this.updateCurrentCatalogIndex();
            // 加载完成
            this.isLoading = false;
            this.loadingProgress = '';
            hilog.info(0x0000, TAG, 'Reader initialization completed successfully');
        }
        catch (err) {
            hilog.error(0x0000, TAG, 'startPlay: err: ' + JSON.stringify(err));
            this.hasError = true;
            this.isLoading = false;
            this.errorMessage = `加载失败: ${err instanceof Error ? err.message : '未知错误'}`;
            // 尝试提供解决建议
            if (err instanceof Error && err.message.includes('memory')) {
                this.errorMessage += '\n建议：文件过大，请尝试使用较小的文件或重启应用';
            }
            else if (err instanceof Error && err.message.includes('timeout')) {
                this.errorMessage += '\n建议：加载超时，请检查文件是否损坏或重试';
            }
        }
    }
    private async getBookInfo() {
        try {
            let bookInfo: bookParser.BookInfo | undefined = this.defaultHandler?.getBookInfo();
            if (bookInfo) {
                this.bookTitle = bookInfo.bookTitle || '';
                this.author = bookInfo?.bookCreator || '';
                // SpineIndex is not required for get the book cover
                let buffer = this.defaultHandler?.getResourceContent(-1, bookInfo.bookCoverImage);
                let imageSource: image.ImageSource = image.createImageSource(buffer);
                this.bookCover = await imageSource.createPixelMap();
                imageSource.release();
            }
            hilog.info(0x0000, TAG, 'getBookInfo bookInfo is: ' + JSON.stringify(bookInfo));
        }
        catch (e) {
            hilog.error(0x0000, TAG, 'getBookInfo failed', e);
        }
    }
    /**
     * 更新当前章节索引
     */
    private updateCurrentCatalogIndex() {
        if (this.currentData && this.defaultHandler) {
            const spineList = this.defaultHandler.getSpineList();
            const catalogList = this.defaultHandler.getCatalogList();
            if (spineList.length > 0 && this.currentData.resourceIndex >= 0 &&
                this.currentData.resourceIndex < spineList.length) {
                const currentSpine = spineList[this.currentData.resourceIndex];
                // 查找当前spine对应的目录项
                const matchingIndex = catalogList.findIndex(catalog => catalog.href === currentSpine.href);
                if (matchingIndex !== -1) {
                    this.currentCatalogIndex = matchingIndex;
                }
            }
        }
    }
    aboutToDisappear(): void {
        // Force save progress before disappearing
        this.saveReadingProgress();
        display.off('change', this.screenDensityCallBack);
        if (this.readerComponentController) {
            this.readerComponentController.off('pageShow');
            this.readerComponentController.off('resourceRequest');
            this.readerComponentController.releaseBook();
        }
        this.defaultHandler = null;
        this.currentData = null;
    }
    private buildCatalogItemList(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.borderRadius({ topRight: 32, topLeft: 32 });
            Column.visibility(this.currentIndex === 0 ? Visibility.Visible : Visibility.None);
            Column.backgroundColor(Color.White);
            Column.zIndex(3);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
            Row.height(56);
            Row.alignItems(VerticalAlign.Center);
            Row.justifyContent(FlexAlign.End);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Stack.create();
            Stack.borderRadius('50%');
            Stack.backgroundColor("#0d777777");
            Stack.align(Alignment.Center);
            Stack.width(40);
            Stack.height(40);
            Stack.margin({ top: 8, left: 16, right: 16 });
            Stack.onClick(() => {
                this.closeModal();
            });
        }, Stack);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            SymbolGlyph.create({ "id": 125831487, "type": 40000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            SymbolGlyph.fontColor([{ "id": 16777257, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" }]);
            SymbolGlyph.width(18);
            SymbolGlyph.fontSize(18);
            SymbolGlyph.fontWeight(600);
            SymbolGlyph.renderingStrategy(SymbolRenderingStrategy.SINGLE);
            SymbolGlyph.effectStrategy(SymbolEffectStrategy.NONE);
        }, SymbolGlyph);
        Stack.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.padding({
                left: 16,
                right: 16
            });
            Row.width('100%');
            Row.margin({ bottom: 20 });
            Row.alignSelf(ItemAlign.Start);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Stack.create({ alignContent: Alignment.Top });
            Stack.width(42);
            Stack.shadow({ radius: 18, color: "#4D000000" });
            Stack.borderRadius(2);
            Stack.aspectRatio(3 / 4);
            Stack.visibility(this.bookTitle ? Visibility.Visible : Visibility.None);
        }, Stack);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create(this.bookCover);
            Image.draggable(false);
            Image.width(42);
            Image.aspectRatio(3 / 4);
            Image.borderRadius(2);
            Image.zIndex(1);
            Image.alt({ "id": 16777275, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.backgroundColor({ "id": 125829129, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777291, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.draggable(false);
            Image.aspectRatio(3 / 4);
            Image.width(42);
            Image.borderRadius(2);
            Image.zIndex(2);
            Image.position({ x: 0, y: 0 });
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777273, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.draggable(false);
            Image.width(42);
            Image.opacity(0.7);
            Image.aspectRatio(3);
            Image.position({ x: 0, y: 42 / 3 / 4 - 42 / 9 });
            Image.zIndex(0);
        }, Image);
        Stack.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.bookTitle);
            Text.fontSize({ "id": 125829684, "type": 10002, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
            Text.maxLines(1);
            Text.margin({ right: 12, left: 12 });
            Text.fontWeight(FontWeight.Bold);
            Text.flexShrink(1);
            Text.fontColor("#E6000000");
            Text.height(40);
            Text.visibility(this.bookTitle ? Visibility.Visible : Visibility.None);
        }, Text);
        Text.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            List.create({ scroller: this.catalogListScroller });
            List.scrollBar(BarState.On);
            List.scrollBarWidth(10);
            List.scrollBarColor('#80000000');
            List.edgeEffect(EdgeEffect.Spring);
            List.onReachStart(() => {
                hilog.info(0x0000, TAG, 'Catalog list reached start');
            });
            List.onReachEnd(() => {
                hilog.info(0x0000, TAG, 'Catalog list reached end');
            });
            List.width('100%');
            List.height('100%');
        }, List);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            ForEach.create();
            const forEachItemGenFunction = (_item, index: number) => {
                const item = _item;
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
                            Column.create();
                            Column.padding({
                                left: item.catalogLevel ? item.catalogLevel * 26 : 16,
                                right: 16,
                                top: 6,
                                bottom: 6
                            });
                            Column.backgroundColor(index === this.currentCatalogIndex ? { "id": 16777243, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" } : Color.Transparent);
                            Column.onClick(async () => {
                                this.jumpToCatalogItem(item);
                            });
                        }, Column);
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            Row.create();
                            Row.width('100%');
                            Row.height(48);
                            Row.justifyContent(FlexAlign.Center);
                            Row.alignItems(VerticalAlign.Center);
                        }, Row);
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            Row.create();
                        }, Row);
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            Text.create(' · ');
                            Text.fontSize(14);
                            Text.fontColor({ "id": 16777238, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        }, Text);
                        Text.pop();
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            Text.create(item.catalogName);
                            Text.fontSize(14);
                            Text.fontColor(index === this.currentCatalogIndex ? Color.Red : { "id": 16777238, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
                            Text.padding({ top: 8, bottom: 8 });
                            Text.maxLines(2);
                            Text.layoutWeight(1);
                        }, Text);
                        Text.pop();
                        Row.pop();
                        Row.pop();
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            Divider.create();
                        }, Divider);
                        Column.pop();
                        ListItem.pop();
                    };
                    this.observeComponentCreation2(itemCreation2, ListItem);
                    ListItem.pop();
                }
            };
            this.forEachUpdateFunction(elmtId, this.catalogItemList, forEachItemGenFunction, undefined, true, false);
        }, ForEach);
        ForEach.pop();
        List.pop();
        Column.pop();
    }
    private buildSetting(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.visibility(this.currentIndex === 1 ? Visibility.Visible : Visibility.None);
            Column.alignItems(HorizontalAlign.Start);
            Column.backgroundColor(Color.White);
            Column.zIndex(3);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            GridRow.create({
                columns: {
                    xs: 4,
                    sm: 4,
                    md: 9,
                    lg: 12
                },
                gutter: { x: 8, y: 8 },
                breakpoints: { value: ['0vp', '520vp', '840vp'] },
                direction: GridRowDirection.Row
            });
            GridRow.margin({ top: 24, left: 16, right: 16 });
        }, GridRow);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            ForEach.create();
            const forEachItemGenFunction = _item => {
                const data = _item;
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    GridCol.create({
                        span: {
                            xs: 1,
                            sm: 2,
                            md: 3,
                            lg: 4
                        },
                        offset: 0,
                        order: 0
                    });
                }, GridCol);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Column.create();
                    Column.width('100%');
                    Column.onClick(async () => {
                        this.selectFontPath = data.getPath();
                        this.readerSetting.fontName = data.getAlias();
                        this.readerSetting.fontPath = data.getPath();
                        this.readerComponentController.setPageConfig(this.readerSetting);
                        await this.saveSettings();
                        hilog.info(0x0000, TAG, 'getAlias: = ' + data.getAlias() + " , getPath = " + data.getPath());
                    });
                    Column.id(TAG + '_Stack_' + data.getAlias());
                    Column.onAppear(() => {
                        focusControl.requestFocus(TAG + '_Stack_' + data.getAlias());
                    });
                }, Column);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Text.create(data.getAlias());
                    Text.fontSize(14);
                    Text.borderRadius(12);
                    Text.borderWidth(1.5);
                    Text.width('100%');
                    Text.height(48);
                    Text.fontColor(this.selectFontPath !== data.getPath() ? Color.Black :
                        Color.Red);
                    Text.textAlign(TextAlign.Center);
                    Text.backgroundColor(this.selectFontPath !== data.getPath() ? { "id": 16777242, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" } : { "id": 16777241, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                    Text.borderColor(this.selectFontPath !== data.getPath() ? { "id": 16777240, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" } : { "id": 16777247, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                }, Text);
                Text.pop();
                Column.pop();
                GridCol.pop();
            };
            this.forEachUpdateFunction(elmtId, this.fontList, forEachItemGenFunction);
        }, ForEach);
        ForEach.pop();
        GridRow.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create();
            Text.width('92%');
            Text.height(1);
            Text.margin({ left: 16, top: 12, right: 16 });
            Text.backgroundColor({ "id": 16777242, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 20 });
            Row.margin({ left: 16, top: 16, right: 16 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Radio.create({
                value: 'flipMode', group: 'radioGroup'
            });
            Radio.height(20);
            Radio.width(20);
            Radio.checked(true);
            Radio.radioStyle({
                checkedBackgroundColor: Color.Red,
            });
            Radio.onClick(async () => {
                this.readerSetting.flipMode = '0';
                this.readerComponentController.setPageConfig(this.readerSetting);
                await this.saveSettings();
            });
        }, Radio);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create({ "id": 16777223, "type": 10003, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Text.fontSize(16);
            Text.lineHeight(21);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Radio.create({
                value: 'flipMode', group: 'radioGroup'
            });
            Radio.height(20);
            Radio.width(20);
            Radio.checked(false);
            Radio.radioStyle({
                checkedBackgroundColor: Color.Red,
            });
            Radio.onClick(async () => {
                this.readerSetting.flipMode = '1';
                this.readerComponentController.setPageConfig(this.readerSetting);
                await this.saveSettings();
            });
        }, Radio);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create({ "id": 16777234, "type": 10003, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Text.fontSize(16);
            Text.lineHeight(21);
        }, Text);
        Text.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create();
            Text.width('92%');
            Text.height(1);
            Text.margin({ left: 16, top: 12, right: 16 });
            Text.backgroundColor({ "id": 16777242, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Scroll.create();
            Scroll.margin({ top: 8 });
            Scroll.scrollable(ScrollDirection.Horizontal);
            Scroll.scrollBar(BarState.Off);
            Scroll.edgeEffect(EdgeEffect.Spring);
        }, Scroll);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 12 });
            Row.constraintSize({
                minWidth: '100%'
            });
            Row.id(TAG + '_Row_1');
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
                    Stack.width(`calc((100% - ${(Number(this.themeList.length) - 1) * 12}vp) / ${Number(this.themeList.length)})`);
                    Stack.constraintSize({
                        minWidth: 60
                    });
                    Stack.borderRadius(30);
                    Stack.borderStyle(BorderStyle.Solid);
                    Stack.onClick(async () => {
                        this.themeSelectIndex = index;
                        this.applyTheme(item, index);
                        this.readerComponentController.setPageConfig(this.readerSetting);
                        await this.saveSettings();
                    });
                    Stack.id(TAG + '_Stack_' + index);
                    Stack.onAppear(() => {
                        focusControl.requestFocus(TAG + '_Stack_' + index);
                    });
                }, Stack);
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Row.create();
                    Row.width('100%');
                    Row.height(40);
                    Row.borderWidth(this.themeSelectIndex !== index ? 1 : 2);
                    Row.borderColor(this.themeSelectIndex !== index ? { "id": 16777249, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" } :
                        this.themeBorderColor[this.themeSelectIndex]);
                    Row.backgroundImage(this.getBackgroundImage(item));
                    Row.backgroundColor(this.THEME_BUTTON_BACKGROUND[item.toString()]);
                    Row.backgroundImagePosition(Alignment.BottomEnd);
                    Row.backgroundImageSize(ImageSize.Cover);
                    Row.borderRadius(20);
                    Row.id(TAG + '_Row_' + index);
                }, Row);
                Row.pop();
                Stack.pop();
            };
            this.forEachUpdateFunction(elmtId, this.themeList, forEachItemGenFunction, undefined, true, false);
        }, ForEach);
        ForEach.pop();
        Row.pop();
        Scroll.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create();
            Text.width('92%');
            Text.height(1);
            Text.margin({ left: 16, top: 12, right: 16 });
            Text.backgroundColor({ "id": 16777242, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TextInput.create({ placeholder: { "id": 16777224, "type": 10003, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" }, text: this.fontSize });
            TextInput.margin({
                left: 16,
                top: 10,
                right: 16,
                bottom: 10
            });
            TextInput.backgroundColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            TextInput.placeholderColor("#666666");
            TextInput.type(InputType.Number);
            TextInput.fontSize(16);
            TextInput.onChange((value: string) => {
                this.fontSize = value;
            });
        }, TextInput);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TextInput.create({ placeholder: { "id": 16777228, "type": 10003, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" }, text: this.lineHeight });
            TextInput.margin({ left: 16, right: 16, bottom: 10 });
            TextInput.backgroundColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            TextInput.placeholderColor("#666666");
            TextInput.type(InputType.NUMBER_DECIMAL);
            TextInput.fontSize(16);
            TextInput.onChange((value: string) => {
                this.lineHeight = value;
            });
        }, TextInput);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel({ "id": 16777235, "type": 10003, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Button.onClick(async () => {
                hilog.info(0x0000, TAG, 'click : update page setting, fontSize = ' + this.fontSize + ' ,lineHeight = ' + this.lineHeight);
                if (!isNaN(Number.parseInt(this.fontSize))) {
                    this.readerSetting.fontSize = Number.parseInt(this.fontSize);
                }
                if (!isNaN(Number.parseFloat(this.lineHeight))) {
                    this.readerSetting.lineHeight = Number.parseFloat(this.lineHeight);
                }
                this.readerComponentController.setPageConfig(this.readerSetting);
                await this.saveSettings();
            });
            Button.fontSize(16);
            Button.width('92%');
            Button.fontColor(Color.Red);
            Button.backgroundColor({ "id": 16777254, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Button.padding({ top: 10, bottom: 10 });
            Button.margin({ left: 16, right: 16, bottom: 30 });
        }, Button);
        Button.pop();
        Column.pop();
    }
    initialRender() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Stack.create();
            Stack.width('100%');
            Stack.height('100%');
            Stack.onClick(() => {
                if (!this.isLoading && !this.hasError) {
                    this.showModal();
                }
            });
        }, Stack);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            // 加载状态显示
            if (this.isLoading) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.width('100%');
                        Column.height('100%');
                        Column.justifyContent(FlexAlign.Center);
                        Column.alignItems(HorizontalAlign.Center);
                        Column.backgroundColor(Color.White);
                        Column.zIndex(10);
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        LoadingProgress.create();
                        LoadingProgress.width(60);
                        LoadingProgress.height(60);
                        LoadingProgress.color(Color.Red);
                    }, LoadingProgress);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(this.loadingProgress);
                        Text.fontSize(16);
                        Text.fontColor(Color.Black);
                        Text.margin({ top: 20 });
                        Text.textAlign(TextAlign.Center);
                    }, Text);
                    Text.pop();
                    Column.pop();
                });
            }
            // 错误状态显示
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            // 错误状态显示
            if (this.hasError) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.width('100%');
                        Column.height('100%');
                        Column.justifyContent(FlexAlign.Center);
                        Column.alignItems(HorizontalAlign.Center);
                        Column.backgroundColor(Color.White);
                        Column.zIndex(10);
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        SymbolGlyph.create({ "id": 125832652, "type": 40000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        SymbolGlyph.width(80);
                        SymbolGlyph.height(80);
                        SymbolGlyph.margin({ bottom: 20 });
                        SymbolGlyph.fontColor([Color.Orange]);
                    }, SymbolGlyph);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('加载失败');
                        Text.fontSize(20);
                        Text.fontWeight(FontWeight.Bold);
                        Text.fontColor(Color.Black);
                        Text.margin({ bottom: 10 });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(this.errorMessage);
                        Text.fontSize(14);
                        Text.fontColor(Color.Gray);
                        Text.textAlign(TextAlign.Center);
                        Text.margin({ bottom: 30, left: 20, right: 20 });
                        Text.maxLines(5);
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create({ space: 20 });
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithLabel('返回');
                        Button.onClick(() => {
                            this.getUIContext().getRouter().back();
                        });
                        Button.backgroundColor(Color.Gray);
                        Button.fontColor(Color.White);
                    }, Button);
                    Button.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithLabel('重试');
                        Button.onClick(() => {
                            this.retryLoading();
                        });
                        Button.backgroundColor(Color.Red);
                        Button.fontColor(Color.White);
                    }, Button);
                    Button.pop();
                    Row.pop();
                    Column.pop();
                });
            }
            // 阅读器组件
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            __Common__.create();
            __Common__.zIndex(1);
            __Common__.visibility(this.isLoading || this.hasError ? Visibility.Hidden : Visibility.Visible);
        }, __Common__);
        {
            this.observeComponentCreation2((elmtId, isInitialRender) => {
                if (isInitialRender) {
                    let componentCall = new 
                    // 阅读器组件
                    ReadPageComponent(this, {
                        controller: this.readerComponentController,
                        readerCallback: (err: BusinessError, data: readerCore.ReaderComponentController) => {
                            if (err) {
                                hilog.error(0x0000, TAG, `ReaderComponent callback error: ${err.message}`);
                                this.hasError = true;
                                this.isLoading = false;
                                this.errorMessage = `阅读器初始化失败: ${err.message}`;
                            }
                            else {
                                this.readerComponentController = data;
                            }
                        }
                    }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/Reader.ets", line: 831, col: 7 });
                    ViewPU.create(componentCall);
                    let paramsLambda = () => {
                        return {
                            controller: this.readerComponentController,
                            readerCallback: (err: BusinessError, data: readerCore.ReaderComponentController) => {
                                if (err) {
                                    hilog.error(0x0000, TAG, `ReaderComponent callback error: ${err.message}`);
                                    this.hasError = true;
                                    this.isLoading = false;
                                    this.errorMessage = `阅读器初始化失败: ${err.message}`;
                                }
                                else {
                                    this.readerComponentController = data;
                                }
                            }
                        };
                    };
                    componentCall.paramsGenerator_ = paramsLambda;
                }
                else {
                    this.updateStateVarsOfChildByElmtId(elmtId, {});
                }
            }, { name: "ReadPageComponent" });
        }
        __Common__.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // menu bar
            Column.create();
            // menu bar
            Column.width('100%');
            // menu bar
            Column.height('100%');
            // menu bar
            Column.backgroundColor(this.currentIndex == 0 ? '#0d626262' : Color.Transparent);
            // menu bar
            Column.zIndex(this.showModalBanner ? 2 : 0);
            // menu bar
            Column.justifyContent(FlexAlign.End);
            // menu bar
            Column.onClick(() => {
                this.closeModal();
            });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.visibility(this.currentIndex < 0 ? Visibility.None : Visibility.Visible);
            Column.width('100%');
            Column.height(this.currentIndex === 0 ? 'calc(100%  - 80vp - 56vp)' : '60%');
            Column.justifyContent(FlexAlign.End);
            Column.onClick(() => {
                this.showModalBanner = true;
            });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.padding({ bottom: !this.bookCover && !this.bookTitle ? 56 : 100 });
            Column.backgroundColor(Color.White);
            Column.borderRadius({
                topRight: this.currentIndex === 0 ? 32 : 0,
                topLeft: this.currentIndex === 0 ? 32 : 0
            });
        }, Column);
        // catalog list view
        this.buildCatalogItemList.bind(this)();
        // setting view
        this.buildSetting.bind(this)();
        Column.pop();
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
            Row.height(80);
            Row.backgroundColor(Color.White);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create({ "id": 16777221, "type": 10003, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Text.width('50%');
            Text.height('100%');
            Text.onClick(() => {
                this.jumpToCatalogList();
            });
            Text.textAlign(TextAlign.Center);
            Text.fontColor(this.currentIndex === 0 ? Color.Red : Color.Black);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create({ "id": 16777231, "type": 10003, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Text.width('50%');
            Text.height('100%');
            Text.onClick(() => {
                this.jumpToSetting();
            });
            Text.textAlign(TextAlign.Center);
            Text.fontColor(this.currentIndex === 1 ? Color.Red : Color.Black);
        }, Text);
        Text.pop();
        Row.pop();
        // menu bar
        Column.pop();
        Stack.pop();
    }
    /**
     * 重试加载
     */
    private retryLoading(): void {
        this.hasError = false;
        this.errorMessage = '';
        this.isLoading = true;
        // 重新获取参数并启动
        let param = this.getUIContext().getRouter().getParams() as paramType;
        this.startPlay(param.filePath, param.resourceIndex || 0, param.domPos || '');
    }
    private applyTheme(theme: string, index: number) {
        this.readerSetting.themeColor = this.THEME_PAGE_COLOR[theme];
        this.readerSetting.nightMode = false;
        if (index === 5) {
            this.readerSetting.themeBgImg = 'white_sky_first.jpg';
            this.readerSetting.fontColor = '#000000';
        }
        else if (index === 6) {
            this.readerSetting.themeBgImg = 'dark_sky_first.jpg';
            this.readerSetting.fontColor = '#ffffff';
            this.readerSetting.nightMode = true;
        }
        else if (index == 4) {
            this.readerSetting.themeBgImg = '';
            this.readerSetting.nightMode = true;
            this.readerSetting.fontColor = '#ffffff';
        }
        else {
            this.readerSetting.themeBgImg = '';
            this.readerSetting.fontColor = '#000000';
        }
        this.readerSetting.scaledDensity = display.getDefaultDisplaySync().scaledDensity;
    }
    private async saveSettings() {
        await settingsManager.saveSettings({
            fontName: this.readerSetting.fontName,
            fontPath: this.readerSetting.fontPath,
            fontSize: this.readerSetting.fontSize,
            lineHeight: this.readerSetting.lineHeight,
            theme: this.themeList[this.themeSelectIndex],
            flipMode: this.readerSetting.flipMode
        });
    }
    /**
     * show menu bar
     */
    private showModal() {
        this.showModalBanner = true;
    }
    /**
     * 保存阅读进度和阅读记录
     * 阅读进度：保存到 Preferences，用于精确恢复阅读位置
     * 阅读记录：保存到数据库，用于书架显示已读章节名和进度百分比
     */
    private saveReadingProgress() {
        if (this.filePath && this.currentData && this.currentData.resourceIndex !== undefined) {
            const resourceIndex = this.currentData.resourceIndex;
            const domPos = this.currentData.startDomPos || '';
            const spineList = this.defaultHandler?.getSpineList() || [];
            // 获取当前章节名用于显示
            let chapterName = '未知章节';
            if (spineList.length > 0 && resourceIndex >= 0 && resourceIndex < spineList.length) {
                const currentSpine = spineList[resourceIndex];
                chapterName = currentSpine.href || '未知章节';
                // 尝试从目录中获取更友好的章节名
                const catalogList = this.defaultHandler?.getCatalogList() || [];
                const matchingCatalog = catalogList.find(catalog => catalog.resourceFile === currentSpine.href);
                if (matchingCatalog && matchingCatalog.catalogName) {
                    chapterName = matchingCatalog.catalogName;
                }
            }
            // 计算阅读进度百分比
            let progressPercent = '0%';
            if (spineList.length > 0) {
                const progress = Math.round((resourceIndex / spineList.length) * 100);
                progressPercent = `${progress}%`;
            }
            // 1. 保存精确阅读进度到 Preferences（用于恢复阅读位置）
            const progressKey = `${this.filePath}_progress`;
            const progressValue = JSON.stringify({ resourceIndex, domPos });
            this.preference?.put(progressKey, progressValue).then(() => {
                this.preference?.flush((err) => {
                    if (err) {
                        hilog.error(0x0000, TAG, `Failed to flush preferences, err: ${err}`);
                    }
                    else {
                        hilog.info(0x0000, TAG, `Saved reading progress to preferences: ${progressValue}`);
                    }
                });
            });
            // 2. 保存阅读记录到数据库（用于书架显示章节名）
            hilog.info(0x0000, TAG, `Updating reading record for ${this.filePath}: chapterName=${chapterName}`);
            bookDataManager.updateBookReadingRecord(this.filePath, chapterName);
            // 3. 保存阅读进度百分比到数据库（用于书架显示进度）
            hilog.info(0x0000, TAG, `Updating reading progress for ${this.filePath}: progress=${progressPercent}`);
            bookDataManager.updateBookProgress(this.filePath, progressPercent);
        }
    }
    /**
     * close menu bar
     */
    private closeModal() {
        this.showModalBanner = false;
        this.currentIndex = -1;
    }
    private jumpToCatalogList() {
        this.currentIndex = 0;
        this.catalogItemList = this.defaultHandler?.getCatalogList() || [];
        this.getBookInfo();
        hilog.info(0x0000, TAG, 'catalog list length: ' + this.catalogItemList.length);
        // 延迟执行滚动，确保列表已渲染
        setTimeout(() => {
            if (this.currentCatalogIndex >= 0 && this.currentCatalogIndex < this.catalogItemList.length) {
                this.catalogListScroller.scrollToIndex(this.currentCatalogIndex);
                hilog.info(0x0000, TAG, 'Scrolled to catalog index: ' + this.currentCatalogIndex);
            }
        }, 100);
    }
    private jumpToSetting() {
        this.currentIndex = 1;
    }
    private async jumpToCatalogItem(catalogItem: bookParser.CatalogItem) {
        const domPos = await this.getDomPos(catalogItem);
        const resourceIndex = this.getResourceItemByCatalog(catalogItem).index;
        this.readerComponentController.startPlay(resourceIndex, domPos);
        this.closeModal();
    }
    private async getDomPos(catalogItem: bookParser.CatalogItem): Promise<string> {
        const domPos: string = this.defaultHandler?.getDomPosByCatalogHref(catalogItem.href || '') || '';
        return domPos;
    }
    private getResourceItemByCatalog(catalogItem: bookParser.CatalogItem): bookParser.SpineItem {
        let resourceFile = catalogItem.resourceFile || '';
        let spineList: bookParser.SpineItem[] = this.defaultHandler?.getSpineList() || [];
        let resourceItemArr = spineList.filter(item => item.href === resourceFile);
        if (resourceItemArr.length > 0) {
            hilog.info(0x0000, TAG, 'getResourceItemByCatalog get resource ', resourceItemArr[0]);
            let resourceItem = resourceItemArr[0];
            return resourceItem;
        }
        else if (spineList.length > 0) {
            hilog.info(0x0000, TAG, 'getResourceItemByCatalog get resource in resourceList', spineList[0]);
            return spineList[0];
        }
        else {
            hilog.info(0x0000, TAG, 'getResourceItemByCatalog get resource in escape');
            return {
                idRef: '',
                index: 0,
                href: '',
                properties: ''
            };
        }
    }
    getBackgroundImage(themeType: string): Resource | string {
        if (themeType === 'whiteSky') {
            return { "id": 16777295, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" };
        }
        else if (themeType === 'darkSky') {
            return { "id": 16777274, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" };
        }
        return '';
    }
    private isFont(filePath: string): boolean {
        let options = [".ttf", ".woff2", ".otf"];
        let path = filePath.toLowerCase();
        let result = path.indexOf(options[0]) != -1 || path.indexOf(options[1]) != -1 || path.indexOf(options[2]) != -1;
        hilog.info(0x0000, TAG, 'isFont = ' + result);
        return result;
    }
    private loadFileFromPath(filePath: string): ArrayBuffer {
        try {
            let stats = fs.statSync(filePath);
            let file = fs.openSync(filePath, fs.OpenMode.READ_ONLY);
            let buffer = new ArrayBuffer(stats.size);
            fs.readSync(file.fd, buffer);
            fs.closeSync(file);
            return buffer;
        }
        catch (err) {
            hilog.error(0x0000, TAG, "loadFileFromPath failed with error message: ", err.message, ", error code: ", err.code);
            return new ArrayBuffer(0);
        }
    }
    /**
     * Remove the page transition animation to speed up the page access speed of the reader
     */
    pageTransition() {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            PageTransition.create();
        }, null);
        PageTransition.pop();
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "Reader";
    }
}
registerNamedRoute(() => new Reader(undefined, {}), "", { bundleName: "liubai.yuedu.hos", moduleName: "entry", pagePath: "pages/Reader", pageFullPath: "entry/src/main/ets/pages/Reader", integratedHsp: "false", moduleType: "followWithHap" });
