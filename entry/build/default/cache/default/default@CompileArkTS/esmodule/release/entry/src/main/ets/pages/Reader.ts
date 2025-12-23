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
    catalogList?: bookParser.CatalogItem[];
    currentCatalogIndex?: number;
    resourceIndex?: number;
    spineList?: bookParser.SpineItem[];
    catalogListScroller?: Scroller;
    isOnlineBook?: boolean;
    onlineBookId?: number;
    onlineChapters?: ChapterInfo[];
    currentOnlineChapterIndex?: number;
    onlineChapterContent?: string;
    chapterDownloadStatus?: Map<number, boolean>;
    isReverseOrder?: boolean;
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
    ttsEngine?: textToSpeech.TextToSpeechEngine | null;
    isTTSEngineCreated?: boolean;
    isTTSPlaying?: boolean;
    isTTSAutoPlay?: boolean;
    ttsText?: string;
    pcmPlayer?: PcmPlayer;
    showTTSControl?: boolean;
    showTTSPage?: boolean;
    currentSpeakingChapter?: number;
    pcmData?: Map<number, Uint8Array>;
    bufferLength?: number;
    showTimerSheet?: boolean;
    showSpeedSheet?: boolean;
    timerMinutes?: number;
    ttsSpeed?: number;
    timerInterval?: number;
    remainingTime?: number;
    backgroundTaskId?: number;
    isBackgroundTaskActive?: boolean;
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
import textToSpeech from "@hms:ai.textToSpeech";
import backgroundTaskManager from "@ohos:resourceschedule.backgroundTaskManager";
import PcmPlayer from "@bundle:liubai.yuedu.hos/entry/ets/model/PcmPlayer";
import type { ChapterInfo } from '../models/BookSourceModel';
interface paramType {
    filePath?: string;
    resourceIndex?: number;
    domPos?: string;
    isOnlineBook?: boolean;
    bookId?: number;
    bookUrl?: string;
    bookTitle?: string;
    chapters?: ChapterInfo[];
    startChapterIndex?: number;
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
        this.__catalogList = new ObservedPropertyObjectPU([], this, "catalogList");
        this.__currentCatalogIndex = new ObservedPropertySimplePU(-1, this, "currentCatalogIndex");
        this.__resourceIndex = new ObservedPropertySimplePU(-1, this, "resourceIndex");
        this.__spineList = new ObservedPropertyObjectPU([], this, "spineList");
        this.catalogListScroller = new Scroller();
        this.__isOnlineBook = new ObservedPropertySimplePU(false, this, "isOnlineBook");
        this.__onlineBookId = new ObservedPropertySimplePU(0, this, "onlineBookId");
        this.__onlineChapters = new ObservedPropertyObjectPU([], this, "onlineChapters");
        this.__currentOnlineChapterIndex = new ObservedPropertySimplePU(0, this, "currentOnlineChapterIndex");
        this.__onlineChapterContent = new ObservedPropertySimplePU('', this, "onlineChapterContent");
        this.__chapterDownloadStatus = new ObservedPropertyObjectPU(new Map(), this, "chapterDownloadStatus");
        this.__isReverseOrder = new ObservedPropertySimplePU(false, this, "isReverseOrder");
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
        this.fontList = [new FontFileInfo(this.getUIContext().getHostContext()!.resourceManager.getStringSync({ "id": 16777236, "type": 10003, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" }), ''),
            new FontFileInfo(this.getUIContext()
                .getHostContext()!.resourceManager.getStringSync({ "id": 16777235, "type": 10003, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" }), 'fonts/SourceHanSerifCN-VF.ttf')];
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
            'white': { "id": 16777258, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            'yellow': { "id": 16777259, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            'pink': { "id": 16777255, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            'green': { "id": 16777254, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            'dark': { "id": 16777253, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            'whiteSky': { "id": 16777258, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            'darkSky': { "id": 16777253, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" }
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
            0: { "id": 16777250, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            1: { "id": 16777251, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            2: { "id": 16777249, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            3: { "id": 16777248, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            4: { "id": 16777250, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            5: { "id": 16777250, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" },
            6: { "id": 16777250, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" }
        };
        this.__themeSelectIndex = new ObservedPropertySimplePU(0, this, "themeSelectIndex");
        this.__ttsEngine = new ObservedPropertyObjectPU(null, this, "ttsEngine");
        this.__isTTSEngineCreated = new ObservedPropertySimplePU(false, this, "isTTSEngineCreated");
        this.__isTTSPlaying = new ObservedPropertySimplePU(false, this, "isTTSPlaying");
        this.__isTTSAutoPlay = new ObservedPropertySimplePU(false, this, "isTTSAutoPlay");
        this.__ttsText = new ObservedPropertySimplePU('', this, "ttsText");
        this.__pcmPlayer = new ObservedPropertyObjectPU(new PcmPlayer(), this, "pcmPlayer");
        this.__showTTSControl = new ObservedPropertySimplePU(false, this, "showTTSControl");
        this.__showTTSPage = new ObservedPropertySimplePU(false, this, "showTTSPage");
        this.__currentSpeakingChapter = new ObservedPropertySimplePU(-1, this, "currentSpeakingChapter");
        this.__pcmData = new ObservedPropertyObjectPU(new Map(), this, "pcmData");
        this.__bufferLength = new ObservedPropertySimplePU(0, this, "bufferLength");
        this.__showTimerSheet = new ObservedPropertySimplePU(false, this, "showTimerSheet");
        this.__showSpeedSheet = new ObservedPropertySimplePU(false, this, "showSpeedSheet");
        this.__timerMinutes = new ObservedPropertySimplePU(0, this, "timerMinutes");
        this.__ttsSpeed = new ObservedPropertySimplePU(1, this, "ttsSpeed");
        this.timerInterval = -1;
        this.__remainingTime = new ObservedPropertySimplePU(0, this, "remainingTime");
        this.backgroundTaskId = -1;
        this.__isBackgroundTaskActive = new ObservedPropertySimplePU(false, this, "isBackgroundTaskActive");
        this.readerSetting = {
            fontName: this.getUIContext().getHostContext()!.resourceManager.getStringSync({ "id": 16777236, "type": 10003, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" }),
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
        if (params.catalogList !== undefined) {
            this.catalogList = params.catalogList;
        }
        if (params.currentCatalogIndex !== undefined) {
            this.currentCatalogIndex = params.currentCatalogIndex;
        }
        if (params.resourceIndex !== undefined) {
            this.resourceIndex = params.resourceIndex;
        }
        if (params.spineList !== undefined) {
            this.spineList = params.spineList;
        }
        if (params.catalogListScroller !== undefined) {
            this.catalogListScroller = params.catalogListScroller;
        }
        if (params.isOnlineBook !== undefined) {
            this.isOnlineBook = params.isOnlineBook;
        }
        if (params.onlineBookId !== undefined) {
            this.onlineBookId = params.onlineBookId;
        }
        if (params.onlineChapters !== undefined) {
            this.onlineChapters = params.onlineChapters;
        }
        if (params.currentOnlineChapterIndex !== undefined) {
            this.currentOnlineChapterIndex = params.currentOnlineChapterIndex;
        }
        if (params.onlineChapterContent !== undefined) {
            this.onlineChapterContent = params.onlineChapterContent;
        }
        if (params.chapterDownloadStatus !== undefined) {
            this.chapterDownloadStatus = params.chapterDownloadStatus;
        }
        if (params.isReverseOrder !== undefined) {
            this.isReverseOrder = params.isReverseOrder;
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
        if (params.ttsEngine !== undefined) {
            this.ttsEngine = params.ttsEngine;
        }
        if (params.isTTSEngineCreated !== undefined) {
            this.isTTSEngineCreated = params.isTTSEngineCreated;
        }
        if (params.isTTSPlaying !== undefined) {
            this.isTTSPlaying = params.isTTSPlaying;
        }
        if (params.isTTSAutoPlay !== undefined) {
            this.isTTSAutoPlay = params.isTTSAutoPlay;
        }
        if (params.ttsText !== undefined) {
            this.ttsText = params.ttsText;
        }
        if (params.pcmPlayer !== undefined) {
            this.pcmPlayer = params.pcmPlayer;
        }
        if (params.showTTSControl !== undefined) {
            this.showTTSControl = params.showTTSControl;
        }
        if (params.showTTSPage !== undefined) {
            this.showTTSPage = params.showTTSPage;
        }
        if (params.currentSpeakingChapter !== undefined) {
            this.currentSpeakingChapter = params.currentSpeakingChapter;
        }
        if (params.pcmData !== undefined) {
            this.pcmData = params.pcmData;
        }
        if (params.bufferLength !== undefined) {
            this.bufferLength = params.bufferLength;
        }
        if (params.showTimerSheet !== undefined) {
            this.showTimerSheet = params.showTimerSheet;
        }
        if (params.showSpeedSheet !== undefined) {
            this.showSpeedSheet = params.showSpeedSheet;
        }
        if (params.timerMinutes !== undefined) {
            this.timerMinutes = params.timerMinutes;
        }
        if (params.ttsSpeed !== undefined) {
            this.ttsSpeed = params.ttsSpeed;
        }
        if (params.timerInterval !== undefined) {
            this.timerInterval = params.timerInterval;
        }
        if (params.remainingTime !== undefined) {
            this.remainingTime = params.remainingTime;
        }
        if (params.backgroundTaskId !== undefined) {
            this.backgroundTaskId = params.backgroundTaskId;
        }
        if (params.isBackgroundTaskActive !== undefined) {
            this.isBackgroundTaskActive = params.isBackgroundTaskActive;
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
        this.__catalogList.purgeDependencyOnElmtId(rmElmtId);
        this.__currentCatalogIndex.purgeDependencyOnElmtId(rmElmtId);
        this.__resourceIndex.purgeDependencyOnElmtId(rmElmtId);
        this.__spineList.purgeDependencyOnElmtId(rmElmtId);
        this.__isOnlineBook.purgeDependencyOnElmtId(rmElmtId);
        this.__onlineBookId.purgeDependencyOnElmtId(rmElmtId);
        this.__onlineChapters.purgeDependencyOnElmtId(rmElmtId);
        this.__currentOnlineChapterIndex.purgeDependencyOnElmtId(rmElmtId);
        this.__onlineChapterContent.purgeDependencyOnElmtId(rmElmtId);
        this.__chapterDownloadStatus.purgeDependencyOnElmtId(rmElmtId);
        this.__isReverseOrder.purgeDependencyOnElmtId(rmElmtId);
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
        this.__ttsEngine.purgeDependencyOnElmtId(rmElmtId);
        this.__isTTSEngineCreated.purgeDependencyOnElmtId(rmElmtId);
        this.__isTTSPlaying.purgeDependencyOnElmtId(rmElmtId);
        this.__isTTSAutoPlay.purgeDependencyOnElmtId(rmElmtId);
        this.__ttsText.purgeDependencyOnElmtId(rmElmtId);
        this.__pcmPlayer.purgeDependencyOnElmtId(rmElmtId);
        this.__showTTSControl.purgeDependencyOnElmtId(rmElmtId);
        this.__showTTSPage.purgeDependencyOnElmtId(rmElmtId);
        this.__currentSpeakingChapter.purgeDependencyOnElmtId(rmElmtId);
        this.__pcmData.purgeDependencyOnElmtId(rmElmtId);
        this.__bufferLength.purgeDependencyOnElmtId(rmElmtId);
        this.__showTimerSheet.purgeDependencyOnElmtId(rmElmtId);
        this.__showSpeedSheet.purgeDependencyOnElmtId(rmElmtId);
        this.__timerMinutes.purgeDependencyOnElmtId(rmElmtId);
        this.__ttsSpeed.purgeDependencyOnElmtId(rmElmtId);
        this.__remainingTime.purgeDependencyOnElmtId(rmElmtId);
        this.__isBackgroundTaskActive.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__windowWidth.aboutToBeDeleted();
        this.__windowHeight.aboutToBeDeleted();
        this.__colorMode.aboutToBeDeleted();
        this.__showModalBanner.aboutToBeDeleted();
        this.__currentIndex.aboutToBeDeleted();
        this.__catalogItemList.aboutToBeDeleted();
        this.__catalogList.aboutToBeDeleted();
        this.__currentCatalogIndex.aboutToBeDeleted();
        this.__resourceIndex.aboutToBeDeleted();
        this.__spineList.aboutToBeDeleted();
        this.__isOnlineBook.aboutToBeDeleted();
        this.__onlineBookId.aboutToBeDeleted();
        this.__onlineChapters.aboutToBeDeleted();
        this.__currentOnlineChapterIndex.aboutToBeDeleted();
        this.__onlineChapterContent.aboutToBeDeleted();
        this.__chapterDownloadStatus.aboutToBeDeleted();
        this.__isReverseOrder.aboutToBeDeleted();
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
        this.__ttsEngine.aboutToBeDeleted();
        this.__isTTSEngineCreated.aboutToBeDeleted();
        this.__isTTSPlaying.aboutToBeDeleted();
        this.__isTTSAutoPlay.aboutToBeDeleted();
        this.__ttsText.aboutToBeDeleted();
        this.__pcmPlayer.aboutToBeDeleted();
        this.__showTTSControl.aboutToBeDeleted();
        this.__showTTSPage.aboutToBeDeleted();
        this.__currentSpeakingChapter.aboutToBeDeleted();
        this.__pcmData.aboutToBeDeleted();
        this.__bufferLength.aboutToBeDeleted();
        this.__showTimerSheet.aboutToBeDeleted();
        this.__showSpeedSheet.aboutToBeDeleted();
        this.__timerMinutes.aboutToBeDeleted();
        this.__ttsSpeed.aboutToBeDeleted();
        this.__remainingTime.aboutToBeDeleted();
        this.__isBackgroundTaskActive.aboutToBeDeleted();
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
    private __catalogList: ObservedPropertyObjectPU<bookParser.CatalogItem[]>;
    get catalogList() {
        return this.__catalogList.get();
    }
    set catalogList(newValue: bookParser.CatalogItem[]) {
        this.__catalogList.set(newValue);
    }
    private __currentCatalogIndex: ObservedPropertySimplePU<number>; // 当前章节索引
    get currentCatalogIndex() {
        return this.__currentCatalogIndex.get();
    }
    set currentCatalogIndex(newValue: number) {
        this.__currentCatalogIndex.set(newValue);
    }
    private __resourceIndex: ObservedPropertySimplePU<number>; // 当前资源索引
    get resourceIndex() {
        return this.__resourceIndex.get();
    }
    set resourceIndex(newValue: number) {
        this.__resourceIndex.set(newValue);
    }
    private __spineList: ObservedPropertyObjectPU<bookParser.SpineItem[]>; // 脊柱列表
    get spineList() {
        return this.__spineList.get();
    }
    set spineList(newValue: bookParser.SpineItem[]) {
        this.__spineList.set(newValue);
    }
    private catalogListScroller: Scroller; // 目录列表滚动控制器
    // 在线书籍相关状态
    private __isOnlineBook: ObservedPropertySimplePU<boolean>; // 是否为在线书籍
    get isOnlineBook() {
        return this.__isOnlineBook.get();
    }
    set isOnlineBook(newValue: boolean) {
        this.__isOnlineBook.set(newValue);
    }
    private __onlineBookId: ObservedPropertySimplePU<number>; // 在线书籍ID
    get onlineBookId() {
        return this.__onlineBookId.get();
    }
    set onlineBookId(newValue: number) {
        this.__onlineBookId.set(newValue);
    }
    private __onlineChapters: ObservedPropertyObjectPU<ChapterInfo[]>; // 在线章节列表
    get onlineChapters() {
        return this.__onlineChapters.get();
    }
    set onlineChapters(newValue: ChapterInfo[]) {
        this.__onlineChapters.set(newValue);
    }
    private __currentOnlineChapterIndex: ObservedPropertySimplePU<number>; // 当前在线章节索引
    get currentOnlineChapterIndex() {
        return this.__currentOnlineChapterIndex.get();
    }
    set currentOnlineChapterIndex(newValue: number) {
        this.__currentOnlineChapterIndex.set(newValue);
    }
    private __onlineChapterContent: ObservedPropertySimplePU<string>; // 当前在线章节内容
    get onlineChapterContent() {
        return this.__onlineChapterContent.get();
    }
    set onlineChapterContent(newValue: string) {
        this.__onlineChapterContent.set(newValue);
    }
    private __chapterDownloadStatus: ObservedPropertyObjectPU<Map<number, boolean>>; // 章节下载状态
    get chapterDownloadStatus() {
        return this.__chapterDownloadStatus.get();
    }
    set chapterDownloadStatus(newValue: Map<number, boolean>) {
        this.__chapterDownloadStatus.set(newValue);
    }
    private __isReverseOrder: ObservedPropertySimplePU<boolean>; // 是否倒序显示章节
    get isReverseOrder() {
        return this.__isReverseOrder.get();
    }
    set isReverseOrder(newValue: boolean) {
        this.__isReverseOrder.set(newValue);
    }
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
    private __ttsEngine: ObservedPropertyObjectPU<textToSpeech.TextToSpeechEngine | null>;
    get ttsEngine() {
        return this.__ttsEngine.get();
    }
    set ttsEngine(newValue: textToSpeech.TextToSpeechEngine | null) {
        this.__ttsEngine.set(newValue);
    }
    private __isTTSEngineCreated: ObservedPropertySimplePU<boolean>;
    get isTTSEngineCreated() {
        return this.__isTTSEngineCreated.get();
    }
    set isTTSEngineCreated(newValue: boolean) {
        this.__isTTSEngineCreated.set(newValue);
    }
    private __isTTSPlaying: ObservedPropertySimplePU<boolean>;
    get isTTSPlaying() {
        return this.__isTTSPlaying.get();
    }
    set isTTSPlaying(newValue: boolean) {
        this.__isTTSPlaying.set(newValue);
    }
    private __isTTSAutoPlay: ObservedPropertySimplePU<boolean>; // 控制是否自动播放下一章
    get isTTSAutoPlay() {
        return this.__isTTSAutoPlay.get();
    }
    set isTTSAutoPlay(newValue: boolean) {
        this.__isTTSAutoPlay.set(newValue);
    }
    private __ttsText: ObservedPropertySimplePU<string>;
    get ttsText() {
        return this.__ttsText.get();
    }
    set ttsText(newValue: string) {
        this.__ttsText.set(newValue);
    }
    private __pcmPlayer: ObservedPropertyObjectPU<PcmPlayer>;
    get pcmPlayer() {
        return this.__pcmPlayer.get();
    }
    set pcmPlayer(newValue: PcmPlayer) {
        this.__pcmPlayer.set(newValue);
    }
    private __showTTSControl: ObservedPropertySimplePU<boolean>;
    get showTTSControl() {
        return this.__showTTSControl.get();
    }
    set showTTSControl(newValue: boolean) {
        this.__showTTSControl.set(newValue);
    }
    private __showTTSPage: ObservedPropertySimplePU<boolean>; // 控制语音朗读页面显示
    get showTTSPage() {
        return this.__showTTSPage.get();
    }
    set showTTSPage(newValue: boolean) {
        this.__showTTSPage.set(newValue);
    }
    private __currentSpeakingChapter: ObservedPropertySimplePU<number>;
    get currentSpeakingChapter() {
        return this.__currentSpeakingChapter.get();
    }
    set currentSpeakingChapter(newValue: number) {
        this.__currentSpeakingChapter.set(newValue);
    }
    private __pcmData: ObservedPropertyObjectPU<Map<number, Uint8Array>>;
    get pcmData() {
        return this.__pcmData.get();
    }
    set pcmData(newValue: Map<number, Uint8Array>) {
        this.__pcmData.set(newValue);
    }
    private __bufferLength: ObservedPropertySimplePU<number>;
    get bufferLength() {
        return this.__bufferLength.get();
    }
    set bufferLength(newValue: number) {
        this.__bufferLength.set(newValue);
    }
    private __showTimerSheet: ObservedPropertySimplePU<boolean>; // 定时器弹窗显示状态
    get showTimerSheet() {
        return this.__showTimerSheet.get();
    }
    set showTimerSheet(newValue: boolean) {
        this.__showTimerSheet.set(newValue);
    }
    private __showSpeedSheet: ObservedPropertySimplePU<boolean>; // 倍速弹窗显示状态
    get showSpeedSheet() {
        return this.__showSpeedSheet.get();
    }
    set showSpeedSheet(newValue: boolean) {
        this.__showSpeedSheet.set(newValue);
    }
    private __timerMinutes: ObservedPropertySimplePU<number>; // 定时器分钟数，0表示不定时
    get timerMinutes() {
        return this.__timerMinutes.get();
    }
    set timerMinutes(newValue: number) {
        this.__timerMinutes.set(newValue);
    }
    private __ttsSpeed: ObservedPropertySimplePU<number>; // TTS朗读速度，1为正常速度
    get ttsSpeed() {
        return this.__ttsSpeed.get();
    }
    set ttsSpeed(newValue: number) {
        this.__ttsSpeed.set(newValue);
    }
    private timerInterval: number; // 定时器ID
    private __remainingTime: ObservedPropertySimplePU<number>; // 剩余时间（秒）
    get remainingTime() {
        return this.__remainingTime.get();
    }
    set remainingTime(newValue: number) {
        this.__remainingTime.set(newValue);
    }
    // 后台任务相关
    private backgroundTaskId: number; // 后台任务ID
    private __isBackgroundTaskActive: ObservedPropertySimplePU<boolean>; // 后台任务是否激活
    get isBackgroundTaskActive() {
        return this.__isBackgroundTaskActive.get();
    }
    set isBackgroundTaskActive(newValue: boolean) {
        this.__isBackgroundTaskActive.set(newValue);
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
        // 初始化 bookDataManager
        await bookDataManager.init(context);
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
        this.filePath = param.filePath || '';
        let resourceIndex = param.resourceIndex || 0;
        let domPos = param.domPos || '';
        this.startPlay(this.filePath, resourceIndex, domPos);
    }
    onPageHide(): void {
        // 页面隐藏时保存阅读进度
        this.saveReadingProgress();
        // 页面隐藏时不停止TTS朗读，让其在后台继续运行
        hilog.info(0x0000, TAG, 'Page hidden, TTS continues in background');
    }
    onPageShow(): void {
        // 页面显示时恢复TTS状态显示
        hilog.info(0x0000, TAG, 'Page shown, TTS state restored');
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
            // 获取目录列表和脊柱列表
            this.catalogItemList = this.defaultHandler?.getCatalogList() || [];
            this.catalogList = this.defaultHandler?.getCatalogList() || [];
            this.spineList = this.defaultHandler?.getSpineList() || [];
            this.resourceIndex = startResourceIndex;
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
            // 更新spineList和resourceIndex
            this.spineList = spineList;
            this.resourceIndex = this.currentData.resourceIndex;
            // 更新catalogList
            this.catalogList = catalogList;
            if (spineList.length > 0 && this.currentData.resourceIndex >= 0 &&
                this.currentData.resourceIndex < spineList.length) {
                const currentSpine = spineList[this.currentData.resourceIndex];
                // 查找当前spine对应的目录项
                const matchingIndex = catalogList.findIndex(catalog => catalog.href === currentSpine.href);
                if (matchingIndex !== -1) {
                    this.currentCatalogIndex = matchingIndex;
                    hilog.info(0x0000, TAG, `Updated currentCatalogIndex to: ${this.currentCatalogIndex}`);
                }
                else {
                    hilog.warn(0x0000, TAG, `No matching catalog found for spine: ${currentSpine.href}`);
                }
            }
        }
    }
    aboutToDisappear(): void {
        // Force save progress before disappearing
        this.saveReadingProgress();
        // 只有在真正退出应用时才释放TTS引擎，页面切换时保持运行
        // 这里不调用 releaseTTSEngine()，让TTS在后台继续运行
        hilog.info(0x0000, TAG, 'Page disappearing, TTS continues in background');
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
            SymbolGlyph.fontColor([{ "id": 16777260, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" }]);
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
            Image.alt({ "id": 16777280, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.backgroundColor({ "id": 125829129, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777306, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.draggable(false);
            Image.aspectRatio(3 / 4);
            Image.width(42);
            Image.borderRadius(2);
            Image.zIndex(2);
            Image.position({ x: 0, y: 0 });
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777278, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
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
                            Column.create();
                            Column.padding({
                                left: item.catalogLevel ? item.catalogLevel * 26 : 16,
                                right: 16,
                                top: 6,
                                bottom: 6
                            });
                            Column.backgroundColor(index === this.currentCatalogIndex ? { "id": 16777246, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" } : Color.Transparent);
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
                            Text.fontColor({ "id": 16777241, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        }, Text);
                        Text.pop();
                        this.observeComponentCreation2((elmtId, isInitialRender) => {
                            Text.create(item.catalogName);
                            Text.fontSize(14);
                            Text.fontColor(index === this.currentCatalogIndex ? Color.Red : { "id": 16777241, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
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
                    Text.backgroundColor(this.selectFontPath !== data.getPath() ? { "id": 16777245, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" } : { "id": 16777244, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                    Text.borderColor(this.selectFontPath !== data.getPath() ? { "id": 16777243, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" } : { "id": 16777250, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
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
            Text.backgroundColor({ "id": 16777245, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
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
            Text.create({ "id": 16777225, "type": 10003, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
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
            Text.create({ "id": 16777237, "type": 10003, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
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
            Text.backgroundColor({ "id": 16777245, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
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
                    Row.borderColor(this.themeSelectIndex !== index ? { "id": 16777252, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" } :
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
            Text.backgroundColor({ "id": 16777245, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TextInput.create({ placeholder: { "id": 16777226, "type": 10003, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" }, text: this.fontSize });
            TextInput.margin({
                left: 16,
                top: 10,
                right: 16,
                bottom: 10
            });
            TextInput.backgroundColor({ "id": 16777257, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            TextInput.placeholderColor("#666666");
            TextInput.type(InputType.Number);
            TextInput.fontSize(16);
            TextInput.onChange((value: string) => {
                this.fontSize = value;
            });
        }, TextInput);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            TextInput.create({ placeholder: { "id": 16777230, "type": 10003, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" }, text: this.lineHeight });
            TextInput.margin({ left: 16, right: 16, bottom: 10 });
            TextInput.backgroundColor({ "id": 16777257, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            TextInput.placeholderColor("#666666");
            TextInput.type(InputType.NUMBER_DECIMAL);
            TextInput.fontSize(16);
            TextInput.onChange((value: string) => {
                this.lineHeight = value;
            });
        }, TextInput);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel({ "id": 16777238, "type": 10003, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
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
            Button.backgroundColor({ "id": 16777257, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
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
                    }, undefined, elmtId, () => { }, { page: "entry/src/main/ets/pages/Reader.ets", line: 906, col: 7 });
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
            If.create();
            // 语音朗读页面
            if (this.showTTSPage) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.buildTTSPage.bind(this)();
                });
            }
            // menu bar
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
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
            Stack.create();
            Stack.alignContent(Alignment.TopEnd);
        }, Stack);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
            Row.height(80);
            Row.backgroundColor(Color.White);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create({ "id": 16777222, "type": 10003, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
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
            Text.create({ "id": 16777234, "type": 10003, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
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
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 语音朗读圆形按钮 - 放在右上角
            Button.createWithChild();
            // 语音朗读圆形按钮 - 放在右上角
            Button.width(56);
            // 语音朗读圆形按钮 - 放在右上角
            Button.height(56);
            // 语音朗读圆形按钮 - 放在右上角
            Button.borderRadius(24);
            // 语音朗读圆形按钮 - 放在右上角
            Button.backgroundColor(Color.White);
            // 语音朗读圆形按钮 - 放在右上角
            Button.position({ x: '83%', y: -64 });
            // 语音朗读圆形按钮 - 放在右上角
            Button.zIndex(5);
            // 语音朗读圆形按钮 - 放在右上角
            Button.shadow({ radius: 8, color: 'rgba(0, 122, 255, 0.4)', offsetX: 0, offsetY: 2 });
            // 语音朗读圆形按钮 - 放在右上角
            Button.onClick(() => {
                this.showTTSPage = true;
            });
            // 语音朗读圆形按钮 - 放在右上角
            Button.visibility(this.isLoading || this.hasError || this.showTTSPage ? Visibility.Hidden : Visibility.Visible);
        }, Button);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create({ "id": 16777285, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.width(24);
            Image.height(24);
        }, Image);
        // 语音朗读圆形按钮 - 放在右上角
        Button.pop();
        Stack.pop();
        // menu bar
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            // TTS控制面板
            if (this.showTTSControl) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.width('100%');
                        Column.height(200);
                        Column.position({ x: 0, y: '50%' });
                        Column.zIndex(4);
                        Column.shadow({
                            radius: 10,
                            color: Color.Gray,
                            offsetX: 0,
                            offsetY: -2
                        });
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create();
                        Row.width('100%');
                        Row.height(50);
                        Row.backgroundColor('#F1F3F5');
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('语音朗读控制');
                        Text.fontSize(18);
                        Text.fontWeight(FontWeight.Bold);
                        Text.margin({ left: 16 });
                    }, Text);
                    Text.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Blank.create();
                    }, Blank);
                    Blank.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithLabel('关闭');
                        Button.fontSize(14);
                        Button.fontColor(Color.White);
                        Button.backgroundColor(Color.Gray);
                        Button.margin({ right: 16 });
                        Button.onClick(() => {
                            this.showTTSControl = false;
                        });
                    }, Button);
                    Button.pop();
                    Row.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create();
                        Row.width('100%');
                        Row.height(150);
                        Row.backgroundColor(Color.White);
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Column.create();
                        Column.width('50%');
                        Column.height(100);
                        Column.justifyContent(FlexAlign.Center);
                        Column.alignItems(HorizontalAlign.Center);
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithLabel(this.isTTSPlaying ? '暂停朗读' : '开始朗读');
                        Button.fontSize(16);
                        Button.fontColor(Color.White);
                        Button.backgroundColor(this.isTTSPlaying ? Color.Orange : Color.Green);
                        Button.width(120);
                        Button.height(40);
                        Button.onClick(() => {
                            if (this.isTTSPlaying) {
                                this.stopTTS();
                            }
                            else {
                                this.startTTS();
                            }
                        });
                    }, Button);
                    Button.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        If.create();
                        if (this.isTTSPlaying) {
                            this.ifElseBranchUpdateFunction(0, () => {
                                this.observeComponentCreation2((elmtId, isInitialRender) => {
                                    Text.create(`正在朗读: ${this.currentSpeakingChapter >= 0 ? this.catalogList[this.currentSpeakingChapter]?.catalogName || '' : ''}`);
                                    Text.fontSize(12);
                                    Text.fontColor(Color.Gray);
                                    Text.margin({ top: 8 });
                                    Text.width(120);
                                    Text.maxLines(2);
                                    Text.textOverflow({ overflow: TextOverflow.Ellipsis });
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
                        Column.create();
                        Column.width('50%');
                        Column.height(100);
                        Column.justifyContent(FlexAlign.Center);
                        Column.alignItems(HorizontalAlign.Center);
                    }, Column);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Row.create();
                        Row.margin({ bottom: 16 });
                    }, Row);
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithLabel('上一章');
                        Button.fontSize(14);
                        Button.fontColor(Color.White);
                        Button.backgroundColor(Color.Blue);
                        Button.width(80);
                        Button.height(36);
                        Button.onClick(() => {
                            this.jumpToPrevChapter();
                            if (this.isTTSPlaying) {
                                this.stopTTS();
                                setTimeout(() => {
                                    this.startTTS();
                                }, 500);
                            }
                        });
                    }, Button);
                    Button.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Button.createWithLabel('下一章');
                        Button.fontSize(14);
                        Button.fontColor(Color.White);
                        Button.backgroundColor(Color.Blue);
                        Button.width(80);
                        Button.height(36);
                        Button.onClick(() => {
                            this.jumpToNextChapter();
                            if (this.isTTSPlaying) {
                                this.stopTTS();
                                setTimeout(() => {
                                    this.startTTS();
                                }, 500);
                            }
                        });
                    }, Button);
                    Button.pop();
                    Row.pop();
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create('朗读设置');
                        Text.fontSize(14);
                        Text.fontColor(Color.Blue);
                        Text.onClick(() => {
                            // 这里可以添加更多TTS设置选项
                            console.log('打开TTS设置');
                        });
                    }, Text);
                    Text.pop();
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
        this.startPlay(param.filePath || '', param.resourceIndex || 0, param.domPos || '');
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
    // 创建TTS引擎
    private async createTTSEngine(): Promise<void> {
        if (this.isTTSEngineCreated && this.ttsEngine) {
            return;
        }
        return new Promise<void>((resolve, reject) => {
            // 设置创建引擎参数
            let extraParam: Record<string, Object> = {
                "style": 'interaction-broadcast',
                "locate": 'CN',
                "name": 'EngineName'
            };
            let initParamsInfo: textToSpeech.CreateEngineParams = {
                language: 'zh-CN',
                person: 0,
                online: 1,
                extraParams: extraParam
            };
            try {
                hilog.info(0x0000, TAG, 'TTS引擎开始创建...');
                // 调用createEngine方法
                textToSpeech.createEngine(initParamsInfo, async (err: BusinessError, textToSpeechEngine: textToSpeech.TextToSpeechEngine) => {
                    if (!err) {
                        hilog.info(0x0000, TAG, 'TTS createEngine is success');
                        // 接收创建引擎的实例
                        this.ttsEngine = textToSpeechEngine;
                        this.isTTSEngineCreated = true;
                        // 初始化PcmPlayer的AVSession
                        const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
                        try {
                            await this.pcmPlayer.prepare(16000, 1, undefined, undefined, context);
                            hilog.info(0x0000, TAG, 'PcmPlayer AVSession initialized successfully');
                        }
                        catch (error) {
                            hilog.error(0x0000, TAG, 'Failed to initialize PcmPlayer AVSession: ' + JSON.stringify(error));
                            // AVSession初始化失败不影响TTS功能
                        }
                        resolve();
                    }
                    else {
                        hilog.error(0x0000, TAG, "TTS createEngine errCode is " + JSON.stringify(err.code));
                        hilog.error(0x0000, TAG, "TTS createEngine errMessage is " + JSON.stringify(err.message));
                        // 显示用户友好的错误信息
                        let errorMsg = 'TTS引擎创建失败';
                        if (err.code === 1002300001) {
                            errorMsg = 'TTS服务不可用，请检查系统设置';
                        }
                        else if (err.code === 1002300002) {
                            errorMsg = 'TTS参数错误，请重试';
                        }
                        else if (err.code === 1002300003) {
                            errorMsg = 'TTS初始化失败，请重启应用';
                        }
                        this.getUIContext()
                            .getPromptAction()
                            .showToast({
                            message: errorMsg,
                            duration: 3000
                        });
                        reject(new Error(errorMsg));
                    }
                });
            }
            catch (error) {
                let message = (error as BusinessError).message;
                let code = (error as BusinessError).code;
                hilog.error(0x0000, TAG, `TTS createEngine failed, error code: ${code}, message: ${message}.`);
                this.getUIContext()
                    .getPromptAction()
                    .showToast({
                    message: 'TTS引擎创建异常，请重试',
                    duration: 3000
                });
                reject(error);
            }
        });
    }
    // 开始TTS朗读
    private async startTTS(): Promise<void> {
        if (!this.isTTSEngineCreated || !this.ttsEngine) {
            hilog.info(0x0000, TAG, 'TTS引擎未创建，正在创建...');
            await this.createTTSEngine();
            // 创建完成后，如果引擎仍然没有创建成功，则返回
            if (!this.isTTSEngineCreated || !this.ttsEngine) {
                hilog.error(0x0000, TAG, 'TTS引擎创建失败');
                return;
            }
        }
        if (this.isTTSPlaying) {
            // 如果正在播放，则停止播放
            this.stopTTS();
            return;
        }
        // 设置自动播放标志位
        this.isTTSAutoPlay = true;
        // 获取当前章节内容
        try {
            const content = await this.getCurrentChapterContent();
            if (content && content.length > 0) {
                this.ttsText = content;
                this.speakText();
                hilog.info(0x0000, TAG, 'TTS朗读已开始');
            }
            else {
                hilog.warn(0x0000, TAG, '没有找到章节内容');
            }
        }
        catch (error) {
            hilog.error(0x0000, TAG, '获取章节内容失败: ' + JSON.stringify(error));
        }
    }
    // 获取当前章节内容
    private async getCurrentChapterContent(): Promise<string> {
        try {
            if (this.defaultHandler && this.currentCatalogIndex >= 0 && this.currentCatalogIndex < this.catalogList.length) {
                let catalogItem: bookParser.CatalogItem = this.catalogList[this.currentCatalogIndex];
                let spineItem: bookParser.SpineItem = this.getResourceItemByCatalog(catalogItem);
                let content: string = await this.defaultHandler.getSpineItemContent(spineItem.index);
                return content || '';
            }
        }
        catch (error) {
            console.error("获取章节内容失败: " + error);
        }
        return '';
    }
    // TTS朗读文本
    private speakText() {
        if (!this.ttsEngine || !this.ttsText || this.ttsText.length === 0) {
            return;
        }
        let speakListener: textToSpeech.SpeakListener = {
            // 开始播报回调
            onStart: (requestId: string, response: textToSpeech.StartResponse) => {
                console.info(`onStart, requestId: ${requestId} response: ${JSON.stringify(response)}`);
                this.isTTSPlaying = true;
                this.currentSpeakingChapter = this.currentCatalogIndex;
                // 申请后台任务
                this.requestBackgroundTask();
            },
            // 完成播报回调
            onComplete: (requestId: string, response: textToSpeech.CompleteResponse) => {
                console.info(`onComplete, requestId: ${requestId} response: ${JSON.stringify(response)}`);
                this.isTTSPlaying = false;
                this.pcmData.clear();
                this.bufferLength = 0;
                // 只有在设置了自动播放标志位时才自动朗读下一章
                if (this.isTTSAutoPlay && this.currentCatalogIndex < this.catalogList.length - 1) {
                    this.jumpToNextChapter();
                    setTimeout(() => {
                        this.startTTS();
                    }, 1000);
                }
                else {
                    // 如果不继续播放，取消后台任务
                    this.cancelBackgroundTask();
                }
            },
            // 停止播报完成回调，调用stop方法并完成时会触发此回调
            onStop: (requestId: string, response: textToSpeech.StopResponse) => {
                console.info(`onStop, requestId: ${requestId} response: ${JSON.stringify(response)}`);
                this.isTTSPlaying = false;
                this.pcmData.clear();
                this.bufferLength = 0;
                // 取消后台任务
                this.cancelBackgroundTask();
            },
            // 返回音频流
            onData: (requestId: string, audio: ArrayBuffer, response: textToSpeech.SynthesisResponse) => {
                console.info(`onData, requestId: ${requestId} sequence: ${JSON.stringify(response)} audio: ${JSON.stringify(audio)}`);
                // 将ArrayBuffer转换为Uint8Array
                let uint8Array: Uint8Array = new Uint8Array(audio);
                this.pcmData.set(response.sequence, uint8Array);
                this.bufferLength += 1;
            },
            // 错误回调，播报过程发生错误时触发此回调
            onError: (requestId: string, errorCode: number, errorMessage: string) => {
                if (errorCode === 1002300007) {
                    this.isTTSEngineCreated = false;
                }
                console.error(`onError, requestId: ${requestId} errorCode: ${errorCode} errorMessage: ${errorMessage}`);
                this.isTTSPlaying = false;
            }
        };
        // 设置回调
        this.ttsEngine.setListener(speakListener);
        // 设置播报相关参数
        let extraParam: Record<string, Object> = { "queueMode": 0, "speed": this.ttsSpeed, "volume": 2, "pitch": 1, "languageContext": 'zh-CN', "audioType": "pcm", "soundChannel": 3, "playType": 1 };
        let speakParams: textToSpeech.SpeakParams = {
            requestId: '123456' + Date.now(),
            extraParams: extraParam
        };
        // 调用speak播报方法
        this.ttsEngine.speak(this.ttsText, speakParams);
    }
    // 停止TTS朗读
    private stopTTS() {
        if (this.ttsEngine) {
            try {
                // 确保TTS引擎存在并且正在播放
                if (this.isTTSPlaying) {
                    this.ttsEngine.stop();
                }
                // 立即更新UI状态，不等待回调
                this.isTTSPlaying = false;
                // 清除自动播放标志位
                this.isTTSAutoPlay = false;
                console.info("TTS朗读已停止");
            }
            catch (error) {
                console.error("停止TTS失败: " + error);
                // 即使出错也要更新UI状态
                this.isTTSPlaying = false;
                this.isTTSAutoPlay = false;
            }
        }
    }
    // 跳转到下一章
    private jumpToNextChapter() {
        if (this.currentCatalogIndex < this.catalogList.length - 1) {
            let nextIndex = this.currentCatalogIndex + 1;
            this.jumpToCatalogItem(this.catalogList[nextIndex]);
        }
    }
    // 跳转到上一章
    private jumpToPrevChapter() {
        if (this.currentCatalogIndex > 0) {
            let prevIndex = this.currentCatalogIndex - 1;
            this.jumpToCatalogItem(this.catalogList[prevIndex]);
        }
    }
    // 释放TTS引擎
    private releaseTTSEngine() {
        if (this.ttsEngine) {
            try {
                this.ttsEngine.shutdown();
                this.ttsEngine = null;
                this.isTTSEngineCreated = false;
                this.isTTSPlaying = false;
            }
            catch (error) {
                console.error("释放TTS引擎失败: " + error);
            }
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
            return { "id": 16777310, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" };
        }
        else if (themeType === 'darkSky') {
            return { "id": 16777279, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" };
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
     * 构建语音朗读页面
     */
    private buildTTSPage(parent = null) {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.width('100%');
            Column.height('100%');
            Column.backgroundColor(Color.White);
            Column.zIndex(10);
            Column.bindSheet({ value: this.showTimerSheet, changeEvent: newValue => { this.showTimerSheet = newValue; } }, { builder: () => {
                    this.buildTimerSheet.call(this);
                } }, {
                height: 300,
                dragBar: true,
                backgroundColor: Color.White,
                onAppear: () => {
                    hilog.info(0x0000, TAG, '定时器弹窗出现');
                },
                onDisappear: () => {
                    hilog.info(0x0000, TAG, '定时器弹窗消失');
                }
            });
            Column.bindSheet({ value: this.showSpeedSheet, changeEvent: newValue => { this.showSpeedSheet = newValue; } }, { builder: () => {
                    this.buildSpeedSheet.call(this);
                } }, {
                height: 250,
                dragBar: true,
                backgroundColor: Color.White,
                onAppear: () => {
                    hilog.info(0x0000, TAG, '倍速弹窗出现');
                },
                onDisappear: () => {
                    hilog.info(0x0000, TAG, '倍速弹窗消失');
                }
            });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 标题栏
            Row.create();
            // 标题栏
            Row.width('100%');
            // 标题栏
            Row.height(108);
            // 标题栏
            Row.backgroundColor(Color.White);
            // 标题栏
            Row.padding({ left: 16, right: 16 });
            // 标题栏
            Row.justifyContent(FlexAlign.SpaceBetween);
            // 标题栏
            Row.alignItems(VerticalAlign.Bottom - 18);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithChild();
            Button.width(40);
            Button.height(40);
            Button.backgroundColor(Color.Transparent);
            Button.onClick(() => {
                this.showTTSPage = false;
            });
        }, Button);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            SymbolGlyph.create({ "id": 125832663, "type": 40000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            SymbolGlyph.width(32);
            SymbolGlyph.height(32);
            SymbolGlyph.fontColor(['#E6000000']);
        }, SymbolGlyph);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('智能朗读');
            Text.fontSize(18);
            Text.fontWeight(FontWeight.Bold);
            Text.fontColor('#E6000000');
            Text.layoutWeight(1);
            Text.textAlign(TextAlign.Center);
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 占位按钮保持布局平衡
            Button.createWithLabel();
            // 占位按钮保持布局平衡
            Button.width(40);
            // 占位按钮保持布局平衡
            Button.height(40);
            // 占位按钮保持布局平衡
            Button.backgroundColor(Color.Transparent);
        }, Button);
        // 占位按钮保持布局平衡
        Button.pop();
        // 标题栏
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 内容区域
            Column.create();
            // 内容区域
            Column.width('100%');
            // 内容区域
            Column.flexGrow(1);
            // 内容区域
            Column.alignItems(HorizontalAlign.Center);
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 书籍封面
            Stack.create();
            // 书籍封面
            Stack.width(120);
            // 书籍封面
            Stack.height(160);
            // 书籍封面
            Stack.margin({ top: 30, bottom: 30 });
            // 书籍封面
            Stack.shadow({ radius: 18, color: "#4D000000" });
            // 书籍封面
            Stack.borderRadius(8);
        }, Stack);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Image.create(this.bookCover);
            Image.draggable(false);
            Image.width(120);
            Image.aspectRatio(3 / 4);
            Image.borderRadius(8);
            Image.alt({ "id": 16777280, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.backgroundColor({ "id": 125829129, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            Image.objectFit(ImageFit.Cover);
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            // 如果没有封面，显示默认封面
            if (!this.bookCover) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Image.create({ "id": 16777314, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        Image.draggable(false);
                        Image.width(120);
                        Image.aspectRatio(3 / 4);
                        Image.borderRadius(8);
                        Image.backgroundColor({ "id": 125829129, "type": 10001, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
                        Image.objectFit(ImageFit.Cover);
                    }, Image);
                });
            }
            // 添加书脊效果
            else {
                this.ifElseBranchUpdateFunction(1, () => {
                });
            }
        }, If);
        If.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 添加书脊效果
            Image.create({ "id": 16777306, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            // 添加书脊效果
            Image.draggable(false);
            // 添加书脊效果
            Image.aspectRatio(3 / 4);
            // 添加书脊效果
            Image.width(120);
            // 添加书脊效果
            Image.borderRadius(8);
            // 添加书脊效果
            Image.position({ x: 0, y: 0 });
        }, Image);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 添加阴影效果
            Image.create({ "id": 16777278, "type": 20000, params: [], "bundleName": "liubai.yuedu.hos", "moduleName": "entry" });
            // 添加阴影效果
            Image.draggable(false);
            // 添加阴影效果
            Image.width(120);
            // 添加阴影效果
            Image.opacity(0.7);
            // 添加阴影效果
            Image.aspectRatio(3);
            // 添加阴影效果
            Image.position({ x: 0, y: 120 / 3 / 4 - 120 / 9 });
        }, Image);
        // 书籍封面
        Stack.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 书籍信息
            Column.create();
            // 书籍信息
            Column.width('80%');
            // 书籍信息
            Column.margin({ bottom: 30 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.bookTitle);
            Text.fontSize(18);
            Text.fontWeight(FontWeight.Bold);
            Text.maxLines(2);
            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
            Text.margin({ bottom: 8 });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(this.author);
            Text.fontSize(14);
            Text.fontColor(Color.Gray);
            Text.maxLines(1);
            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
        }, Text);
        Text.pop();
        // 书籍信息
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 进度条
            Column.create();
            // 进度条
            Column.width('100%');
            // 进度条
            Column.margin({ bottom: 40 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create(`当前章节: ${this.currentCatalogIndex >= 0 ? this.catalogList[this.currentCatalogIndex]?.catalogName || '' : '未开始'}`);
            Text.fontSize(14);
            Text.fontColor(Color.Gray);
            Text.margin({ bottom: 8 });
            Text.width('80%');
            Text.maxLines(2);
            Text.textOverflow({ overflow: TextOverflow.Ellipsis });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Progress.create({
                value: this.currentCatalogIndex >= 0 ? (this.currentCatalogIndex + 1) / this.catalogList.length * 100 : 0,
                total: 100,
                type: ProgressType.Linear
            });
            Progress.width('80%');
            Progress.height(8);
            Progress.backgroundColor('#F1F3F5');
            Progress.color(Color.Blue);
        }, Progress);
        // 进度条
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 控制按钮
            Row.create();
            // 控制按钮
            Row.width('100%');
            // 控制按钮
            Row.justifyContent(FlexAlign.SpaceEvenly);
            // 控制按钮
            Row.margin({ bottom: 40 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('上一章');
            Button.fontSize(14);
            Button.fontColor('#E6000000');
            Button.backgroundColor('#F7FAFC');
            Button.width(80);
            Button.height(40);
            Button.onClick(() => {
                this.jumpToPrevChapter();
                if (this.isTTSPlaying) {
                    this.stopTTS();
                    setTimeout(() => {
                        this.startTTS();
                    }, 500);
                }
            });
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel(this.timerMinutes > 0 ? `定时${this.timerMinutes}分` : '定时');
            Button.fontSize(14);
            Button.fontColor(Color.White);
            Button.backgroundColor(this.timerMinutes > 0 ? Color.Orange : Color.Gray);
            Button.width(80);
            Button.height(40);
            Button.onClick(() => {
                this.showTimerSheet = true;
            });
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel(`${this.ttsSpeed}x倍速`);
            Button.fontSize(14);
            Button.fontColor(this.ttsSpeed !== 1 ? Color.White : '#E6000000');
            Button.backgroundColor(this.ttsSpeed !== 1 ? Color.Red : '#F7FAFC');
            Button.width(80);
            Button.height(40);
            Button.onClick(() => {
                this.showSpeedSheet = true;
            });
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('下一章');
            Button.fontSize(14);
            Button.fontColor('#E6000000');
            Button.backgroundColor('#F7FAFC');
            Button.width(80);
            Button.height(40);
            Button.onClick(() => {
                this.jumpToNextChapter();
                if (this.isTTSPlaying) {
                    this.stopTTS();
                    setTimeout(() => {
                        this.startTTS();
                    }, 500);
                }
            });
        }, Button);
        Button.pop();
        // 控制按钮
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // TTS控制按钮
            Button.createWithLabel(this.isTTSPlaying ? '暂停朗读' : '开始朗读');
            // TTS控制按钮
            Button.fontSize(16);
            // TTS控制按钮
            Button.fontColor(Color.White);
            // TTS控制按钮
            Button.backgroundColor(this.isTTSPlaying ? Color.Red : Color.Red);
            // TTS控制按钮
            Button.width(160);
            // TTS控制按钮
            Button.height(50);
            // TTS控制按钮
            Button.onClick(() => {
                if (this.isTTSPlaying) {
                    this.stopTTS();
                }
                else {
                    this.startTTS();
                }
            });
            // TTS控制按钮
            Button.margin({ bottom: 20 });
        }, Button);
        // TTS控制按钮
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 选择TTS按钮
            Button.createWithLabel('选择TTS');
            // 选择TTS按钮
            Button.fontSize(14);
            // 选择TTS按钮
            Button.fontColor('#E6000000');
            // 选择TTS按钮
            Button.backgroundColor('#F7FAFC');
            // 选择TTS按钮
            Button.border({ color: Color.Blue, width: 1 });
            // 选择TTS按钮
            Button.width(160);
            // 选择TTS按钮
            Button.height(40);
            // 选择TTS按钮
            Button.onClick(() => {
                // 显示TTS选择功能的提示
                this.getUIContext()
                    .getPromptAction()
                    .showToast({
                    message: 'TTS选择功能开发中...',
                    duration: 2000
                });
                hilog.info(0x0000, TAG, '点击了选择TTS按钮');
            });
            // 选择TTS按钮
            Button.margin({ bottom: 10 });
        }, Button);
        // 选择TTS按钮
        Button.pop();
        // 内容区域
        Column.pop();
        Column.pop();
    }
    /**
     * 构建定时器弹窗
     */
    private buildTimerSheet(parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.padding(20);
            Column.backgroundColor(Color.White);
            Column.borderRadius({ topLeft: 16, topRight: 16 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('定时朗读');
            Text.fontSize(18);
            Text.fontWeight(FontWeight.Medium);
            Text.fontColor('#2D3748');
            Text.margin({ bottom: 20 });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 定时选项
            Column.create();
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
            Row.justifyContent(FlexAlign.SpaceBetween);
            Row.margin({ bottom: 16 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('关闭定时');
            Button.fontSize(16);
            Button.fontColor(this.timerMinutes === 0 ? Color.White : '#2D3748');
            Button.backgroundColor(this.timerMinutes === 0 ? Color.Blue : '#F7FAFC');
            Button.borderRadius(8);
            Button.width('45%');
            Button.height(44);
            Button.onClick(() => {
                this.setTimer(0);
            });
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('30分钟');
            Button.fontSize(16);
            Button.fontColor(this.timerMinutes === 30 ? Color.White : '#2D3748');
            Button.backgroundColor(this.timerMinutes === 30 ? Color.Blue : '#F7FAFC');
            Button.borderRadius(8);
            Button.width('45%');
            Button.height(44);
            Button.onClick(() => {
                this.setTimer(30);
            });
        }, Button);
        Button.pop();
        Row.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create();
            Row.width('100%');
            Row.justifyContent(FlexAlign.SpaceBetween);
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('60分钟');
            Button.fontSize(16);
            Button.fontColor(this.timerMinutes === 60 ? Color.White : '#2D3748');
            Button.backgroundColor(this.timerMinutes === 60 ? Color.Blue : '#F7FAFC');
            Button.borderRadius(8);
            Button.width('45%');
            Button.height(44);
            Button.onClick(() => {
                this.setTimer(60);
            });
        }, Button);
        Button.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Button.createWithLabel('90分钟');
            Button.fontSize(16);
            Button.fontColor(this.timerMinutes === 90 ? Color.White : '#2D3748');
            Button.backgroundColor(this.timerMinutes === 90 ? Color.Blue : '#F7FAFC');
            Button.borderRadius(8);
            Button.width('45%');
            Button.height(44);
            Button.onClick(() => {
                this.setTimer(90);
            });
        }, Button);
        Button.pop();
        Row.pop();
        // 定时选项
        Column.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            If.create();
            // 剩余时间显示
            if (this.timerMinutes > 0 && this.remainingTime > 0) {
                this.ifElseBranchUpdateFunction(0, () => {
                    this.observeComponentCreation2((elmtId, isInitialRender) => {
                        Text.create(`剩余时间: ${Math.floor(this.remainingTime / 60)}分${this.remainingTime % 60}秒`);
                        Text.fontSize(14);
                        Text.fontColor('#718096');
                        Text.margin({ top: 20 });
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
    }
    /**
     * 构建倍速弹窗
     */
    private buildSpeedSheet(parent = null): void {
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Column.create();
            Column.padding(20);
            Column.backgroundColor(Color.White);
            Column.borderRadius({ topLeft: 16, topRight: 16 });
        }, Column);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('朗读倍速');
            Text.fontSize(18);
            Text.fontWeight(FontWeight.Medium);
            Text.fontColor('#2D3748');
            Text.margin({ bottom: 20 });
        }, Text);
        Text.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            // 倍速选项 - 添加横向滑动
            Scroll.create();
            // 倍速选项 - 添加横向滑动
            Scroll.scrollable(ScrollDirection.Horizontal);
            // 倍速选项 - 添加横向滑动
            Scroll.scrollBar(BarState.Off);
            // 倍速选项 - 添加横向滑动
            Scroll.width('100%');
            // 倍速选项 - 添加横向滑动
            Scroll.margin({ bottom: 16 });
        }, Scroll);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Row.create({ space: 12 });
            Row.padding({ left: 8, right: 8 });
        }, Row);
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            ForEach.create();
            const forEachItemGenFunction = _item => {
                const speed = _item;
                this.observeComponentCreation2((elmtId, isInitialRender) => {
                    Button.createWithLabel(`${speed}x`);
                    Button.fontSize(16);
                    Button.fontColor(this.ttsSpeed === speed ? Color.White : '#2D3748');
                    Button.backgroundColor(this.ttsSpeed === speed ? Color.Blue : '#F7FAFC');
                    Button.borderRadius(8);
                    Button.width(80);
                    Button.height(44);
                    Button.onClick(() => {
                        this.setTTSSpeed(speed);
                    });
                }, Button);
                Button.pop();
            };
            this.forEachUpdateFunction(elmtId, [0.5, 0.75, 1, 1.25, 1.5, 2], forEachItemGenFunction);
        }, ForEach);
        ForEach.pop();
        Row.pop();
        // 倍速选项 - 添加横向滑动
        Scroll.pop();
        this.observeComponentCreation2((elmtId, isInitialRender) => {
            Text.create('选择朗读速度，1x为正常速度');
            Text.fontSize(12);
            Text.fontColor('#A0AEC0');
            Text.textAlign(TextAlign.Center);
        }, Text);
        Text.pop();
        Column.pop();
    }
    /**
     * 设置定时器
     */
    private setTimer(minutes: number): void {
        // 清除之前的定时器
        if (this.timerInterval !== -1) {
            clearInterval(this.timerInterval);
            this.timerInterval = -1;
        }
        this.timerMinutes = minutes;
        this.showTimerSheet = false;
        if (minutes > 0) {
            this.remainingTime = minutes * 60; // 转换为秒
            // 启动定时器
            this.timerInterval = setInterval(() => {
                this.remainingTime--;
                if (this.remainingTime <= 0) {
                    // 时间到，停止朗读
                    this.stopTTS();
                    this.timerMinutes = 0;
                    clearInterval(this.timerInterval);
                    this.timerInterval = -1;
                    // 显示提示
                    this.getUIContext()
                        .getPromptAction()
                        .showToast({ message: '定时朗读结束', duration: 2000 });
                }
            }, 1000);
            hilog.info(0x0000, TAG, `设置定时器: ${minutes}分钟`);
        }
        else {
            this.remainingTime = 0;
            hilog.info(0x0000, TAG, '关闭定时器');
        }
    }
    /**
     * 设置TTS朗读速度
     */
    private setTTSSpeed(speed: number): void {
        this.ttsSpeed = speed;
        this.showSpeedSheet = false;
        // 如果正在朗读，需要重新开始以应用新的速度
        if (this.isTTSPlaying) {
            // 保存当前的自动播放状态，避免重新开始时触发自动播放下一章
            const wasAutoPlay = this.isTTSAutoPlay;
            // 临时关闭自动播放，避免停止时触发下一章
            this.isTTSAutoPlay = false;
            this.stopTTS();
            setTimeout(() => {
                // 恢复自动播放状态
                this.isTTSAutoPlay = wasAutoPlay;
                this.startTTS();
            }, 500);
        }
        hilog.info(0x0000, TAG, `设置朗读速度: ${speed}x`);
    }
    /**
     * 申请后台任务
     */
    private async requestBackgroundTask(): Promise<void> {
        if (this.isBackgroundTaskActive) {
            hilog.info(0x0000, TAG, '后台任务已激活，无需重复申请');
            return;
        }
        try {
            const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
            // 只申请延迟挂起任务，不申请长时运行任务
            const delayInfo = await backgroundTaskManager.requestSuspendDelay('TTS_READING', () => {
                hilog.info(0x0000, TAG, '后台任务即将到期，准备续期');
                // 如果TTS还在播放，继续申请后台任务
                if (this.isTTSPlaying) {
                    this.requestBackgroundTask();
                }
            });
            this.backgroundTaskId = delayInfo.requestId;
            this.isBackgroundTaskActive = true;
            hilog.info(0x0000, TAG, '后台延迟挂起任务申请成功');
        }
        catch (error) {
            hilog.error(0x0000, TAG, '申请后台任务失败: ' + JSON.stringify(error));
            // 即使后台任务申请失败，TTS功能仍然可以正常工作
            hilog.warn(0x0000, TAG, 'TTS功能将在前台正常工作，但可能在应用切换到后台时被暂停');
        }
    }
    /**
     * 取消后台任务
     */
    private async cancelBackgroundTask(): Promise<void> {
        if (!this.isBackgroundTaskActive) {
            return;
        }
        try {
            // 只取消延迟挂起任务，不调用stopBackgroundRunning
            // 因为应用没有申请长时运行任务，只申请了延迟挂起任务
            if (this.backgroundTaskId !== -1) {
                backgroundTaskManager.cancelSuspendDelay(this.backgroundTaskId);
                this.backgroundTaskId = -1;
                hilog.info(0x0000, TAG, '延迟挂起任务已取消');
            }
            this.isBackgroundTaskActive = false;
            hilog.info(0x0000, TAG, '后台任务已取消');
        }
        catch (error) {
            hilog.error(0x0000, TAG, '取消后台任务失败: ' + JSON.stringify(error));
        }
    }
    rerender() {
        this.updateDirtyElements();
    }
    static getEntryName(): string {
        return "Reader";
    }
}
registerNamedRoute(() => new Reader(undefined, {}), "", { bundleName: "liubai.yuedu.hos", moduleName: "entry", pagePath: "pages/Reader", pageFullPath: "entry/src/main/ets/pages/Reader", integratedHsp: "false", moduleType: "followWithHap" });
