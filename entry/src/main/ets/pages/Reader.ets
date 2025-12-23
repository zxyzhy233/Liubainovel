/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { WindowAbility } from '../entryability/WindowAbility';
import { display } from '@kit.ArkUI';
import { fileIo as fs } from '@kit.CoreFileKit';
import { image } from '@kit.ImageKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { FontFileInfo } from '../common/FontFileInfo';
import hilog from '@ohos.hilog';
import { bookDataManager } from '../utils/BookDataManager';
import { settingsManager } from '../utils/SettingsManager';
import { preferences } from '@kit.ArkData';

import { ReadPageComponent, readerCore, bookParser } from '@kit.ReaderKit';
import { common, ConfigurationConstant, wantAgent, Want } from '@kit.AbilityKit';
import { textToSpeech } from '@kit.CoreSpeechKit';
import { avSession } from '@kit.AVSessionKit';
import { backgroundTaskManager } from '@kit.BackgroundTasksKit';
import PcmPlayer from '../model/PcmPlayer';
import { ChapterInfo } from '../models/BookSourceModel';
import { onlineBookDataManager } from '../utils/OnlineBookDataManager';
import { downloadManager } from '../managers/DownloadManager';
import { bookSourceManager } from '../managers/BookSourceManager';

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

@Entry
@Component
struct Reader {
  @StorageLink('windowWidth') windowWidth: number = 0;
  @StorageLink('windowHeight') windowHeight: number = 0;
  @StorageLink('colorMode') @Watch('colorModeChange') colorMode: ConfigurationConstant.ColorMode =
    ConfigurationConstant.ColorMode.COLOR_MODE_NOT_SET;
  /**
   * Display dialog box
   */
  @State showModalBanner: boolean = false;
  /**
   * Menu bar type index, 0 : catalog list, 1 : setting, 1 : close dialog
   */
  @State currentIndex: number = -1;
  @State catalogItemList: bookParser.CatalogItem[] = [];
  @State catalogList: bookParser.CatalogItem[] = [];
  @State currentCatalogIndex: number = -1; // 当前章节索引
  @State resourceIndex: number = -1; // 当前资源索引
  @State spineList: bookParser.SpineItem[] = []; // 脊柱列表
  private catalogListScroller: Scroller = new Scroller(); // 目录列表滚动控制器
  
  // 在线书籍相关状态
  @State isOnlineBook: boolean = false; // 是否为在线书籍
  @State onlineBookId: number = 0; // 在线书籍ID
  @State onlineChapters: ChapterInfo[] = []; // 在线章节列表
  @State currentOnlineChapterIndex: number = 0; // 当前在线章节索引
  @State onlineChapterContent: string = ''; // 当前在线章节内容
  @State chapterDownloadStatus: Map<number, boolean> = new Map(); // 章节下载状态
  @State isReverseOrder: boolean = false; // 是否倒序显示章节
  private currentData: readerCore.PageDataInfo | null = null;
  private defaultHandler: bookParser.BookParserHandler | null = null;
  private readerComponentController: readerCore.ReaderComponentController = new readerCore.ReaderComponentController();
  private preference: preferences.Preferences | null = null;
  private filePath: string = '';
  @State bookCover: PixelMap | null = null;
  @State bookTitle: string = '';
  @State author: string = '';
  @State isLoading: boolean = true; // 加载状态
  @State loadingProgress: string = '正在加载...'; // 加载进度文本
  @State hasError: boolean = false; // 错误状态
  @State errorMessage: string = ''; // 错误信息
  @State fontSize: string = '18';
  @State lineHeight: string = '';
  private fontList: Array<FontFileInfo> =
    [new FontFileInfo(this.getUIContext().getHostContext()!.resourceManager.getStringSync($r('app.string.system_font')),
      ''),
      new FontFileInfo(this.getUIContext()
        .getHostContext()!.resourceManager.getStringSync($r('app.string.source_han_serif_font')),
        'fonts/SourceHanSerifCN-VF.ttf')];
  @State selectFontPath: string = '';
  @State themeList: string[] = [
    'white',
    'yellow',
    'pink',
    'green',
    'dark',
    'whiteSky',
    'darkSky'
  ];
  private THEME_BUTTON_BACKGROUND: Record<string, Resource> = {
    'white': $r('app.color.ic_white_theme_button_background'),
    'yellow': $r('app.color.ic_yellow_theme_button_background'),
    'pink': $r('app.color.ic_pink_theme_button_background'),
    'green': $r('app.color.ic_green_theme_button_background'),
    'dark': $r('app.color.ic_dark_theme_button_background'),
    'whiteSky': $r('app.color.ic_white_theme_button_background'),
    'darkSky': $r('app.color.ic_dark_theme_button_background')
  }
  private THEME_PAGE_COLOR: Record<string, string> = {
    'white': '#FFFFFF',
    'yellow': '#BD9063',
    'pink': '#FFE4E5',
    'green': '#C5E7CE',
    'dark': '#202224',
    'whiteSky': '#FFFFFF',
    'darkSky': '#202224'
  }
  private themeBorderColor: Record<number, Resource> = {
    0: $r('app.color.ic_border_select_white'),
    1: $r('app.color.ic_border_select_yellow'),
    2: $r('app.color.ic_border_select_pink'),
    3: $r('app.color.ic_border_select_green'),
    4: $r('app.color.ic_border_select_white'),
    5: $r('app.color.ic_border_select_white'),
    6: $r('app.color.ic_border_select_white')
  }
  @State themeSelectIndex: number = 0;
  @State ttsEngine: textToSpeech.TextToSpeechEngine | null = null;
  @State isTTSEngineCreated: boolean = false;
  @State isTTSPlaying: boolean = false;
  @State isTTSAutoPlay: boolean = false; // 控制是否自动播放下一章
  @State ttsText: string = '';
  @State pcmPlayer: PcmPlayer = new PcmPlayer();
  @State showTTSControl: boolean = false;
  @State showTTSPage: boolean = false; // 控制语音朗读页面显示
  @State currentSpeakingChapter: number = -1;
  @State pcmData: Map<number, Uint8Array> = new Map();
  @State bufferLength: number = 0;
  @State showTimerSheet: boolean = false; // 定时器弹窗显示状态
  @State showSpeedSheet: boolean = false; // 倍速弹窗显示状态
  @State timerMinutes: number = 0; // 定时器分钟数，0表示不定时
  @State ttsSpeed: number = 1; // TTS朗读速度，1为正常速度
  private timerInterval: number = -1; // 定时器ID
  @State remainingTime: number = 0; // 剩余时间（秒）
  
  // 后台任务相关
  private backgroundTaskId: number = -1; // 后台任务ID
  @State isBackgroundTaskActive: boolean = false; // 后台任务是否激活
  
  private readerSetting: readerCore.ReaderSetting = {
    fontName: this.getUIContext().getHostContext()!.resourceManager.getStringSync($r('app.string.system_font')),
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
  private screenDensityCallBack: Callback<number> | null = null;

  async aboutToAppear() {
    // Router addObserver 方法已移除，因为Router类型没有这个属性
    
    const logCode: number = 0x0000;
    const logTag: string = TAG;
    const currentDensity: number = this.readerSetting.scaledDensity;
    const newDensity: number = display.getDefaultDisplaySync().scaledDensity;
    hilog.info(logCode, logTag,
      `aboutToAppear : current scaledDensity = ${currentDensity}; change scaledDensity = ${newDensity}`);
    this.readerComponentController = new readerCore.ReaderComponentController();
    const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
    try {
      this.preference = await preferences.getPreferences(context, PREFERENCES_NAME);
    } catch (err) {
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
    } else {
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
    }
    display.on('change', this.screenDensityCallBack);
  }

  /**
   * Resource request callback. Font files and theme background images can be stored in the resource directory (resources/rawfile) or application sandbox path
   */
  private resourceRequest: bookParser.CallbackRes<string, ArrayBuffer> = (filePath: string): ArrayBuffer => {
    hilog.info(0x0000, TAG,
      'resourceRequest : filePath = ' + filePath + ', this.selectFontPath = ' + this.selectFontPath);
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
    } catch (error) {
      let code = (error as BusinessError).code;
      let message = (error as BusinessError).message;
      hilog.error(0x0000, TAG,
        `resourceRequest : get resource failed, error code: ${code}`);
        hilog.error(0x0000, TAG, `resourceRequest : get resource failed, message: ${message}.`);
    }
    // Get data in the sandbox path
    return this.loadFileFromPath(resourcePath);
  }

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
          } catch (e) {
            hilog.error(0x0000, TAG,
              'onWindowSizeChange, error ' + JSON.stringify(e));
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
        } catch (e) {
          hilog.error(0x0000, TAG, `Failed to parse saved progress: ${savedProgress}`);
          // 如果 Preferences 解析失败，使用传入的参数作为备用
          startResourceIndex = resourceIndex || 0;
          startDomPos = domPos || '';
          hilog.info(0x0000, TAG, `Using fallback parameters: resourceIndex=${startResourceIndex}, domPos=${startDomPos}`);
        }
      } else {
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
     } catch (err) {
       hilog.error(0x0000, TAG, 'startPlay: err: ' + JSON.stringify(err));
       this.hasError = true;
       this.isLoading = false;
       this.errorMessage = `加载失败: ${err instanceof Error ? err.message : '未知错误'}`;
       
       // 尝试提供解决建议
       if (err instanceof Error && err.message.includes('memory')) {
         this.errorMessage += '\n建议：文件过大，请尝试使用较小的文件或重启应用';
       } else if (err instanceof Error && err.message.includes('timeout')) {
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
    } catch (e) {
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
        const matchingIndex = catalogList.findIndex(catalog => 
          catalog.href === currentSpine.href
        );
        
        if (matchingIndex !== -1) {
          this.currentCatalogIndex = matchingIndex;
          hilog.info(0x0000, TAG, `Updated currentCatalogIndex to: ${this.currentCatalogIndex}`);
        } else {
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

  @Builder
  private buildCatalogItemList() {
    Column() {
      Row() {
        Stack() {
          SymbolGlyph($r('sys.symbol.xmark'))
            .fontColor([$r('app.color.ohos_id_color_primary_light')])
            .width(18)
            .fontSize(18)
            .fontWeight(600)
            .renderingStrategy(SymbolRenderingStrategy.SINGLE)
            .effectStrategy(SymbolEffectStrategy.NONE)
        }
        .borderRadius('50%')
        .backgroundColor("#0d777777")
        .align(Alignment.Center)
        .width(40)
        .height(40)
        .margin({ top: 8, left: 16, right: 16 })
        .onClick(() => {
          this.closeModal();
        })
      }
      .width('100%')
      .height(56)
      .alignItems(VerticalAlign.Center)
      .justifyContent(FlexAlign.End)

      Row() {
        Stack({ alignContent: Alignment.Top }) {
          Image(this.bookCover)
            .draggable(false)
            .width(42)
            .aspectRatio(3 / 4)
            .borderRadius(2)
            .zIndex(1)
            .alt($r('app.media.default_cover'))
            .backgroundColor($r('sys.color.ohos_id_color_background'))

          Image($r('app.media.spines'))
            .draggable(false)
            .aspectRatio(3 / 4)
            .width(42)
            .borderRadius(2)
            .zIndex(2)
            .position({ x: 0, y: 0 })

          Image($r('app.media.cover_shadow'))
            .draggable(false)
            .width(42)
            .opacity(0.7)
            .aspectRatio(3)
            .position({ x: 0, y: 42 / 3 / 4 - 42 / 9 })
            .zIndex(0)
        }
        .width(42)
        .shadow({ radius: 18, color: "#4D000000" })
        .borderRadius(2)
        .aspectRatio(3 / 4)
        .visibility(this.bookTitle ? Visibility.Visible : Visibility.None)

        Text(this.bookTitle)
          .fontSize($r('sys.float.ohos_id_text_size_body1'))
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .maxLines(1)
          .margin({ right: 12, left: 12 })
          .fontWeight(FontWeight.Bold)
          .flexShrink(1)
          .fontColor("#E6000000")
          .height(40)
          .visibility(this.bookTitle ? Visibility.Visible : Visibility.None)
      }
      .padding({
        left: 16,
        right: 16
      })
      .width('100%')
      .margin({ bottom: 20 })
      .alignSelf(ItemAlign.Start)

      List({ scroller: this.catalogListScroller }) {
        ForEach(this.catalogItemList, (item: bookParser.CatalogItem, index: number) => {
          ListItem() {
            Column() {
              Row() {
                Row() {
                  Text(' · ')
                    .fontSize(14)
                    .fontColor($r('app.color.black_90_opacity'))
                  Text(item.catalogName)
                    .fontSize(14)
                    .fontColor(index === this.currentCatalogIndex ? Color.Red : $r('app.color.black_90_opacity'))
                    .textOverflow({ overflow: TextOverflow.Ellipsis })
                    .padding({ top: 8, bottom: 8 })
                    .maxLines(2)
                    .layoutWeight(1)
                }
              }
              .width('100%')
              .height(48)
              .justifyContent(FlexAlign.Center)
              .alignItems(VerticalAlign.Center)

              Divider()
            }
            .padding({
              left: item.catalogLevel ? item.catalogLevel * 26 : 16,
              right: 16,
              top: 6,
              bottom: 6
            })
            .backgroundColor(index === this.currentCatalogIndex ? $r('app.color.ic_bg_selected') : Color.Transparent)
            .onClick(async () => {
              this.jumpToCatalogItem(item);
            })
          }
        })
      }
      .scrollBar(BarState.On) // 启用滚动条
      .scrollBarWidth(10) // 设置滚动条宽度，增加到10vp提高触摸体验
      .scrollBarColor('#80000000') // 设置滚动条颜色
      .edgeEffect(EdgeEffect.Spring) // 添加弹性边缘效果
      .onReachStart(() => {
        hilog.info(0x0000, TAG, 'Catalog list reached start');
      })
      .onReachEnd(() => {
        hilog.info(0x0000, TAG, 'Catalog list reached end');
      })
      .width('100%')
      .height('100%')
    }
    .borderRadius({ topRight: 32, topLeft: 32 })
    .visibility(this.currentIndex === 0 ? Visibility.Visible : Visibility.None)
    .backgroundColor(Color.White)
    .zIndex(3)
  }

  @Builder
  private buildSetting() {
    Column() {
      GridRow({
        columns: {
          xs: 4,
          sm: 4,
          md: 9,
          lg: 12
        },
        gutter: { x: 8, y: 8 },
        breakpoints: { value: ['0vp', '520vp', '840vp'] },
        direction: GridRowDirection.Row
      }) {
        ForEach(this.fontList, (data: FontFileInfo) => {
          GridCol({
            span: {
              xs: 1,
              sm: 2,
              md: 3,
              lg: 4
            },
            offset: 0,
            order: 0
          }) {
            Column() {
              Text(data.getAlias())
                .fontSize(14)
                .borderRadius(12)
                .borderWidth(1.5)
                .width('100%')
                .height(48)
                .fontColor(this.selectFontPath !== data.getPath() ? Color.Black :
                Color.Red)
                .textAlign(TextAlign.Center)
                .backgroundColor(this.selectFontPath !== data.getPath() ? $r('app.color.ic_bg_grey') :
                $r('app.color.ic_bg_font_selected'))
                .borderColor(this.selectFontPath !== data.getPath() ? $r('app.color.color_transparent') :
                $r('app.color.ic_border_select_white'))
            }
            .width('100%')
            .onClick(async () => {
              this.selectFontPath = data.getPath();
              this.readerSetting.fontName = data.getAlias();
              this.readerSetting.fontPath = data.getPath();
              this.readerComponentController.setPageConfig(this.readerSetting);
              await this.saveSettings();
              hilog.info(0x0000, TAG, 'getAlias: = ' + data.getAlias() + " , getPath = " + data.getPath());
            })
            .id(TAG + '_Stack_' + data.getAlias())
            .onAppear(() => {
              focusControl.requestFocus(TAG + '_Stack_' + data.getAlias());
            })
          }
        });
      }.margin({ top: 24, left: 16, right: 16 })

      Text()
        .width('92%')
        .height(1)
        .margin({ left: 16, top: 12, right: 16 })
        .backgroundColor($r('app.color.ic_bg_grey'))

      Row({ space: 20 }) {
        Radio({
          value: 'flipMode', group: 'radioGroup'
        })
          .height(20)
          .width(20)
          .checked(true)
          .radioStyle({
            checkedBackgroundColor: Color.Red,
          })
          .onClick(async () => {
            this.readerSetting.flipMode = '0';
            this.readerComponentController.setPageConfig(this.readerSetting);
            await this.saveSettings();
          })
        Text($r('app.string.emulation_page'))
          .fontSize(16)
          .lineHeight(21)

        Radio({
          value: 'flipMode', group: 'radioGroup'
        })
          .height(20)
          .width(20)
          .checked(false)
          .radioStyle({
            checkedBackgroundColor: Color.Red,
          })
          .onClick(async () => {
            this.readerSetting.flipMode = '1';
            this.readerComponentController.setPageConfig(this.readerSetting);
            await this.saveSettings();
          })
        Text($r('app.string.transversal_slip_page'))
          .fontSize(16)
          .lineHeight(21)
      }
      .margin({ left: 16, top: 16, right: 16 })

      Text()
        .width('92%')
        .height(1)
        .margin({ left: 16, top: 12, right: 16 })
        .backgroundColor($r('app.color.ic_bg_grey'))

      Scroll() {
        Row({ space: 12 }) {
          ForEach(this.themeList, (item: string, index: number) => {
            Stack() {
              Row()
                .width('100%')
                .height(40)
                .borderWidth(this.themeSelectIndex !== index ? 1 : 2)
                .borderColor(this.themeSelectIndex !== index ? $r('app.color.ic_border_unselect') :
                this.themeBorderColor[this.themeSelectIndex])
                .backgroundImage(this.getBackgroundImage(item))
                .backgroundColor(this.THEME_BUTTON_BACKGROUND[item.toString()])
                .backgroundImagePosition(Alignment.BottomEnd)
                .backgroundImageSize(ImageSize.Cover)
                .borderRadius(20)
                .id(TAG + '_Row_' + index)
            }
            .width(`calc((100% - ${(Number(this.themeList.length) - 1) * 12}vp) / ${Number(this.themeList.length)})`)
            .constraintSize({
              minWidth: 60
            })
            .borderRadius(30)
            .borderStyle(BorderStyle.Solid)
            .onClick(async () => {
              this.themeSelectIndex = index;
              this.applyTheme(item, index);
              this.readerComponentController.setPageConfig(this.readerSetting);
              await this.saveSettings();
            })
            .id(TAG + '_Stack_' + index)
            .onAppear(() => {
              focusControl.requestFocus(TAG + '_Stack_' + index);
            })
          })
        }
        .constraintSize({
          minWidth: '100%'
        })
        .id(TAG + '_Row_1')
        .padding({
          left: 12,
          right: 12,
          top: 12,
          bottom: 12
        })
      }
      .margin({ top: 8 })
      .scrollable(ScrollDirection.Horizontal)
      .scrollBar(BarState.Off)
      .edgeEffect(EdgeEffect.Spring)

      Text()
        .width('92%')
        .height(1)
        .margin({ left: 16, top: 12, right: 16 })
        .backgroundColor($r('app.color.ic_bg_grey'))

      TextInput({ placeholder: $r('app.string.font_size_placeholder'), text: this.fontSize })
        .margin({
          left: 16,
          top: 10,
          right: 16,
          bottom: 10
        })
        .backgroundColor($r('app.color.ic_text_input_bg'))
        .placeholderColor("#666666")
        .type(InputType.Number)
        .fontSize(16)
        .onChange((value: string) => {
          this.fontSize = value;
        })

      TextInput({ placeholder: $r('app.string.line_height_placeholder'), text: this.lineHeight })
        .margin({ left: 16, right: 16, bottom: 10 })
        .backgroundColor($r('app.color.ic_text_input_bg'))
        .placeholderColor("#666666")
        .type(InputType.NUMBER_DECIMAL)
        .fontSize(16)
        .onChange((value: string) => {
          this.lineHeight = value;
        })

      Button($r('app.string.update_font_size_and_line_height'))
        .onClick(async () => {
          hilog.info(0x0000, TAG,
            'click : update page setting, fontSize = ' + this.fontSize + ' ,lineHeight = ' + this.lineHeight);
          if (!isNaN(Number.parseInt(this.fontSize))) {
            this.readerSetting.fontSize = Number.parseInt(this.fontSize);
          }
          if (!isNaN(Number.parseFloat(this.lineHeight))) {
            this.readerSetting.lineHeight = Number.parseFloat(this.lineHeight);
          }
          this.readerComponentController.setPageConfig(this.readerSetting);
          await this.saveSettings();
        })
        .fontSize(16)
        .width('92%')
        .fontColor(Color.Red)
        .backgroundColor($r('app.color.ic_text_input_bg'))
        .padding({ top: 10, bottom: 10 })
        .margin({ left: 16, right: 16, bottom: 30 })

    }.visibility(this.currentIndex === 1 ? Visibility.Visible : Visibility.None)
    .alignItems(HorizontalAlign.Start)
    .backgroundColor(Color.White)
    .zIndex(3)
  }

  build() {
    Stack() {
      // 加载状态显示
      if (this.isLoading) {
        Column() {
          LoadingProgress()
            .width(60)
            .height(60)
            .color(Color.Red)
          
          Text(this.loadingProgress)
            .fontSize(16)
            .fontColor(Color.Black)
            .margin({ top: 20 })
            .textAlign(TextAlign.Center)
        }
        .width('100%')
        .height('100%')
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center)
        .backgroundColor(Color.White)
        .zIndex(10)
      }
      
      // 错误状态显示
      if (this.hasError) {
        Column() {
          SymbolGlyph($r('sys.symbol.exclamationmark_triangle'))
            .width(80)
            .height(80)
            .margin({ bottom: 20 })
            .fontColor([Color.Orange])
          
          Text('加载失败')
            .fontSize(20)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.Black)
            .margin({ bottom: 10 })
          
          Text(this.errorMessage)
            .fontSize(14)
            .fontColor(Color.Gray)
            .textAlign(TextAlign.Center)
            .margin({ bottom: 30, left: 20, right: 20 })
            .maxLines(5)
          
          Row({ space: 20 }) {
            Button('返回')
              .onClick(() => {
                this.getUIContext().getRouter().back();
              })
              .backgroundColor(Color.Gray)
              .fontColor(Color.White)
            
            Button('重试')
              .onClick(() => {
                this.retryLoading();
              })
              .backgroundColor(Color.Red)
              .fontColor(Color.White)
          }
        }
        .width('100%')
        .height('100%')
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center)
        .backgroundColor(Color.White)
        .zIndex(10)
      }
      
      // 阅读器组件
      ReadPageComponent({
        controller: this.readerComponentController,
        readerCallback: (err: BusinessError, data: readerCore.ReaderComponentController) => {
          if (err) {
            hilog.error(0x0000, TAG, `ReaderComponent callback error: ${err.message}`);
            this.hasError = true;
            this.isLoading = false;
            this.errorMessage = `阅读器初始化失败: ${err.message}`;
          } else {
            this.readerComponentController = data;
          }
        }
      })
      .zIndex(1)
      .visibility(this.isLoading || this.hasError ? Visibility.Hidden : Visibility.Visible)
      
      
      
      // 语音朗读页面
      if (this.showTTSPage) {
        this.buildTTSPage()
      }
      
      // menu bar
      Column() {
        Column() {
          Column() {
            // catalog list view
            this.buildCatalogItemList()
            // setting view
            this.buildSetting()
          }
          .padding({ bottom: !this.bookCover && !this.bookTitle ? 56 : 100 })
          .backgroundColor(Color.White)
          .borderRadius({
            topRight: this.currentIndex === 0 ? 32 : 0,
            topLeft: this.currentIndex === 0 ? 32 : 0
          })
        }
        .visibility(this.currentIndex < 0 ? Visibility.None : Visibility.Visible)
        .width('100%')
        .height(this.currentIndex === 0 ? 'calc(100%  - 80vp - 56vp)' : '60%')
        .justifyContent(FlexAlign.End)
        .onClick(() => {
          this.showModalBanner = true;
        })

        Stack() {
          Row() {
            Text($r('app.string.catalog_list'))
              .width('50%')
              .height('100%')
              .onClick(() => {
                this.jumpToCatalogList();
              })
              .textAlign(TextAlign.Center)
              .fontColor(this.currentIndex === 0 ? Color.Red : Color.Black)
            Text($r('app.string.setting'))
              .width('50%')
              .height('100%')
              .onClick(() => {
                this.jumpToSetting();
              })
              .textAlign(TextAlign.Center)
              .fontColor(this.currentIndex === 1 ? Color.Red : Color.Black)
          }
          .width('100%')
          .height(80)
          .backgroundColor(Color.White)
          
          // 语音朗读圆形按钮 - 放在右上角
          Button() {
            Image($r('app.media.headset'))
              .width(24)
              .height(24)
          }
          .width(56)
          .height(56)
          .borderRadius(24)
          .backgroundColor(Color.White)
          .position({ x: '83%', y: -64 })
          .zIndex(5)
          .shadow({ radius: 8, color: 'rgba(0, 122, 255, 0.4)', offsetX: 0, offsetY: 2 })
          .onClick(() => {
            this.showTTSPage = true;
          })
          .visibility(this.isLoading || this.hasError || this.showTTSPage ? Visibility.Hidden : Visibility.Visible)
        }
        .alignContent(Alignment.TopEnd)
      }
      .width('100%')
      .height('100%')
      .backgroundColor(this.currentIndex == 0 ? '#0d626262' : Color.Transparent)
      .zIndex(this.showModalBanner ? 2 : 0)
      .justifyContent(FlexAlign.End)
      .onClick(() => {
        this.closeModal();
      })
      
      // TTS控制面板
      if (this.showTTSControl) {
        Column() {
          Row() {
            Text('语音朗读控制')
              .fontSize(18)
              .fontWeight(FontWeight.Bold)
              .margin({ left: 16 })
            
            Blank()
            
            Button('关闭')
              .fontSize(14)
              .fontColor(Color.White)
              .backgroundColor(Color.Gray)
              .margin({ right: 16 })
              .onClick(() => {
                this.showTTSControl = false;
              })
          }
          .width('100%')
          .height(50)
          .backgroundColor('#F1F3F5')
          
          Row() {
            Column() {
              Button(this.isTTSPlaying ? '暂停朗读' : '开始朗读')
                .fontSize(16)
                .fontColor(Color.White)
                .backgroundColor(this.isTTSPlaying ? Color.Orange : Color.Green)
                .width(120)
                .height(40)
                .onClick(() => {
                  if (this.isTTSPlaying) {
                    this.stopTTS();
                  } else {
                    this.startTTS();
                  }
                })
              
              if (this.isTTSPlaying) {
                Text(`正在朗读: ${this.currentSpeakingChapter >= 0 ? this.catalogList[this.currentSpeakingChapter]?.catalogName || '' : ''}`)
                  .fontSize(12)
                  .fontColor(Color.Gray)
                  .margin({ top: 8 })
                  .width(120)
                  .maxLines(2)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
              }
            }
            .width('50%')
            .height(100)
            .justifyContent(FlexAlign.Center)
            .alignItems(HorizontalAlign.Center)
            
            Column() {
              Row() {
                Button('上一章')
                  .fontSize(14)
                  .fontColor(Color.White)
                  .backgroundColor(Color.Blue)
                  .width(80)
                  .height(36)
                  .onClick(() => {
                    this.jumpToPrevChapter();
                    if (this.isTTSPlaying) {
                      this.stopTTS();
                      setTimeout(() => {
                        this.startTTS();
                      }, 500);
                    }
                  })
                
                Button('下一章')
                  .fontSize(14)
                  .fontColor(Color.White)
                  .backgroundColor(Color.Blue)
                  .width(80)
                  .height(36)
                  .onClick(() => {
                    this.jumpToNextChapter();
                    if (this.isTTSPlaying) {
                      this.stopTTS();
                      setTimeout(() => {
                        this.startTTS();
                      }, 500);
                    }
                  })
              }
              .margin({ bottom: 16 })
              
              Text('朗读设置')
                .fontSize(14)
                .fontColor(Color.Blue)
                .onClick(() => {
                  // 这里可以添加更多TTS设置选项
                  console.log('打开TTS设置');
                })
            }
            .width('50%')
            .height(100)
            .justifyContent(FlexAlign.Center)
            .alignItems(HorizontalAlign.Center)
          }
          .width('100%')
          .height(150)
          .backgroundColor(Color.White)
        }
        .width('100%')
        .height(200)
        .position({ x: 0, y: '50%' })
        .zIndex(4)
        .shadow({
          radius: 10,
          color: Color.Gray,
          offsetX: 0,
          offsetY: -2
        })
      }
    }.width('100%').height('100%').onClick(() => {
      if (!this.isLoading && !this.hasError) {
        this.showModal();
      }
    })
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
    } else if (index === 6) {
      this.readerSetting.themeBgImg = 'dark_sky_first.jpg';
      this.readerSetting.fontColor = '#ffffff';
      this.readerSetting.nightMode = true;
    } else if (index == 4) {
      this.readerSetting.themeBgImg = '';
      this.readerSetting.nightMode = true;
      this.readerSetting.fontColor = '#ffffff';
    } else {
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
        const matchingCatalog = catalogList.find(catalog => 
          catalog.resourceFile === currentSpine.href
        );
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
          } else {
            hilog.info(0x0000, TAG, `Saved reading progress to preferences: ${progressValue}`);
          }
        });
      });

      // 2. 保存阅读记录到数据库（用于书架显示章节名）
      hilog.info(0x0000, TAG,
        `Updating reading record for ${this.filePath}: chapterName=${chapterName}`);
      bookDataManager.updateBookReadingRecord(this.filePath, chapterName);

      // 3. 保存阅读进度百分比到数据库（用于书架显示进度）
      hilog.info(0x0000, TAG,
        `Updating reading progress for ${this.filePath}: progress=${progressPercent}`);
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
      }
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
            } catch (error) {
              hilog.error(0x0000, TAG, 'Failed to initialize PcmPlayer AVSession: ' + JSON.stringify(error));
              // AVSession初始化失败不影响TTS功能
            }
            
            resolve();
          } else {
            hilog.error(0x0000, TAG, "TTS createEngine errCode is " + JSON.stringify(err.code));
            hilog.error(0x0000, TAG, "TTS createEngine errMessage is " + JSON.stringify(err.message));
            
            // 显示用户友好的错误信息
            let errorMsg = 'TTS引擎创建失败';
            if (err.code === 1002300001) {
              errorMsg = 'TTS服务不可用，请检查系统设置';
            } else if (err.code === 1002300002) {
              errorMsg = 'TTS参数错误，请重试';
            } else if (err.code === 1002300003) {
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
      } catch (error) {
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
      } else {
        hilog.warn(0x0000, TAG, '没有找到章节内容');
      }
    } catch (error) {
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
    } catch (error) {
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
        } else {
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
    let extraParam: Record<string, Object> = {"queueMode": 0, "speed": this.ttsSpeed, "volume": 2, "pitch": 1, "languageContext": 'zh-CN', "audioType": "pcm", "soundChannel": 3, "playType":1}
    let speakParams: textToSpeech.SpeakParams = {
      requestId: '123456' + Date.now(), // requestId在同一实例内仅能用一次，请勿重复设置
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
      } catch (error) {
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
      } catch (error) {
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
    let spineList: bookParser.SpineItem[] = this.defaultHandler?.getSpineList() || []

    let resourceItemArr = spineList.filter(item => item.href === resourceFile);
    if (resourceItemArr.length > 0) {
      hilog.info(0x0000, TAG, 'getResourceItemByCatalog get resource ', resourceItemArr[0]);
      let resourceItem = resourceItemArr[0];
      return resourceItem;
    } else if (spineList.length > 0) {
      hilog.info(0x0000, TAG, 'getResourceItemByCatalog get resource in resourceList', spineList[0]);
      return spineList[0];
    } else {
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
      return $r('app.media.white_sky_icon');
    } else if (themeType === 'darkSky') {
      return $r('app.media.dark_sky_icon');
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
    } catch (err) {
      hilog.error(0x0000, TAG, "loadFileFromPath failed with error message: ", err.message, ", error code: ", err.code);
      return new ArrayBuffer(0);
    }
  }

  /**
   * 构建语音朗读页面
   */
  @Builder
  private buildTTSPage() {
    Column() {
      // 标题栏
      Row() {
        Button() {
          SymbolGlyph($r('sys.symbol.chevron_left'))
            .width(32)
            .height(32)
            .fontColor(['#E6000000'])
        }
        .width(40)
        .height(40)
        .backgroundColor(Color.Transparent)
        .onClick(() => {
          this.showTTSPage = false;
        })
        
        Text('智能朗读')
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor('#E6000000')
          .layoutWeight(1)
          .textAlign(TextAlign.Center)
        
        // 占位按钮保持布局平衡
        Button()
          .width(40)
          .height(40)
          .backgroundColor(Color.Transparent)
      }
      .width('100%')
      .height(108)
      .backgroundColor(Color.White)
      .padding({ left: 16, right: 16 })
      .justifyContent(FlexAlign.SpaceBetween)
      .alignItems(VerticalAlign.Bottom - 18)
      
      // 内容区域
      Column() {
        // 书籍封面
        Stack() {
          Image(this.bookCover)
            .draggable(false)
            .width(120)
            .aspectRatio(3 / 4)
            .borderRadius(8)
            .alt($r('app.media.default_cover'))
            .backgroundColor($r('sys.color.ohos_id_color_background'))
            .objectFit(ImageFit.Cover)
          
          // 如果没有封面，显示默认封面
          if (!this.bookCover) {
            Image($r('app.media.zwfm'))
              .draggable(false)
              .width(120)
              .aspectRatio(3 / 4)
              .borderRadius(8)
              .backgroundColor($r('sys.color.ohos_id_color_background'))
              .objectFit(ImageFit.Cover)
          }
          
          // 添加书脊效果
          Image($r('app.media.spines'))
            .draggable(false)
            .aspectRatio(3 / 4)
            .width(120)
            .borderRadius(8)
            .position({ x: 0, y: 0 })
          
          // 添加阴影效果
          Image($r('app.media.cover_shadow'))
            .draggable(false)
            .width(120)
            .opacity(0.7)
            .aspectRatio(3)
            .position({ x: 0, y: 120 / 3 / 4 - 120 / 9 })
        }
        .width(120)
        .height(160)
        .margin({ top: 30, bottom: 30 })
        .shadow({ radius: 18, color: "#4D000000" })
        .borderRadius(8)
        
        // 书籍信息
        Column() {
          Text(this.bookTitle)
            .fontSize(18)
            .fontWeight(FontWeight.Bold)
            .maxLines(2)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .margin({ bottom: 8 })
          
          Text(this.author)
            .fontSize(14)
            .fontColor(Color.Gray)
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
        }
        .width('80%')
        .margin({ bottom: 30 })
        
        // 进度条
        Column() {
          Text(`当前章节: ${this.currentCatalogIndex >= 0 ? this.catalogList[this.currentCatalogIndex]?.catalogName || '' : '未开始'}`)
            .fontSize(14)
            .fontColor(Color.Gray)
            .margin({ bottom: 8 })
            .width('80%')
            .maxLines(2)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
          
          Progress({
            value: this.currentCatalogIndex >= 0 ? (this.currentCatalogIndex + 1) / this.catalogList.length * 100 : 0,
            total: 100,
            type: ProgressType.Linear
          })
            .width('80%')
            .height(8)
            .backgroundColor('#F1F3F5')
            .color(Color.Blue)
        }
        .width('100%')
        .margin({ bottom: 40 })
        
        // 控制按钮
        Row() {
          Button('上一章')
            .fontSize(14)
            .fontColor('#E6000000')
            .backgroundColor('#F7FAFC')
            .width(80)
            .height(40)
            .onClick(() => {
              this.jumpToPrevChapter();
              if (this.isTTSPlaying) {
                this.stopTTS();
                setTimeout(() => {
                  this.startTTS();
                }, 500);
              }
            })
          
          Button(this.timerMinutes > 0 ? `定时${this.timerMinutes}分` : '定时')
            .fontSize(14)
            .fontColor(Color.White)
            .backgroundColor(this.timerMinutes > 0 ? Color.Orange : Color.Gray)
            .width(80)
            .height(40)
            .onClick(() => {
              this.showTimerSheet = true;
            })
          
          Button(`${this.ttsSpeed}x倍速`)
            .fontSize(14)
            .fontColor(this.ttsSpeed !== 1 ? Color.White : '#E6000000')
            .backgroundColor(this.ttsSpeed !== 1 ? Color.Red : '#F7FAFC')
            .width(80)
            .height(40)
            .onClick(() => {
              this.showSpeedSheet = true;
            })
          
          Button('下一章')
            .fontSize(14)
            .fontColor('#E6000000')
            .backgroundColor('#F7FAFC')
            .width(80)
            .height(40)
            .onClick(() => {
              this.jumpToNextChapter();
              if (this.isTTSPlaying) {
                this.stopTTS();
                setTimeout(() => {
                  this.startTTS();
                }, 500);
              }
            })
        }
        .width('100%')
        .justifyContent(FlexAlign.SpaceEvenly)
        .margin({ bottom: 40 })
        
        // TTS控制按钮
        Button(this.isTTSPlaying ? '暂停朗读' : '开始朗读')
          .fontSize(16)
          .fontColor(Color.White)
          .backgroundColor(this.isTTSPlaying ? Color.Red : Color.Red)
          .width(160)
          .height(50)
          .onClick(() => {
            if (this.isTTSPlaying) {
              this.stopTTS();
            } else {
              this.startTTS();
            }
          })
          .margin({ bottom: 20 })
        
        // 选择TTS按钮
        Button('选择TTS')
          .fontSize(14)
          .fontColor('#E6000000')
          .backgroundColor('#F7FAFC')
          .border({ color: Color.Blue, width: 1 })
          .width(160)
          .height(40)
          .onClick(() => {
            // 显示TTS选择功能的提示
            this.getUIContext()
              .getPromptAction()
              .showToast({ 
                message: 'TTS选择功能开发中...', 
                duration: 2000 
              });
            
            hilog.info(0x0000, TAG, '点击了选择TTS按钮');
          })
          .margin({ bottom: 10 })
        
      }
      .width('100%')
      .flexGrow(1)
      .alignItems(HorizontalAlign.Center)
    }
    .width('100%')
    .height('100%')
    .backgroundColor(Color.White)
    .zIndex(10)
    .bindSheet($$this.showTimerSheet, this.buildTimerSheet(), {
      height: 300,
      dragBar: true,
      backgroundColor: Color.White,
      onAppear: () => {
        hilog.info(0x0000, TAG, '定时器弹窗出现');
      },
      onDisappear: () => {
        hilog.info(0x0000, TAG, '定时器弹窗消失');
      }
    })
    .bindSheet($$this.showSpeedSheet, this.buildSpeedSheet(), {
      height: 250,
      dragBar: true,
      backgroundColor: Color.White,
      onAppear: () => {
        hilog.info(0x0000, TAG, '倍速弹窗出现');
      },
      onDisappear: () => {
        hilog.info(0x0000, TAG, '倍速弹窗消失');
      }
    })
  }

  /**
   * 构建定时器弹窗
   */
  @Builder
  private buildTimerSheet(): void {
    Column() {
      Text('定时朗读')
        .fontSize(18)
        .fontWeight(FontWeight.Medium)
        .fontColor('#2D3748')
        .margin({ bottom: 20 })
      
      // 定时选项
      Column() {
        Row() {
          Button('关闭定时')
            .fontSize(16)
            .fontColor(this.timerMinutes === 0 ? Color.White : '#2D3748')
            .backgroundColor(this.timerMinutes === 0 ? Color.Blue : '#F7FAFC')
            .borderRadius(8)
            .width('45%')
            .height(44)
            .onClick(() => {
              this.setTimer(0);
            })
          
          Button('30分钟')
            .fontSize(16)
            .fontColor(this.timerMinutes === 30 ? Color.White : '#2D3748')
            .backgroundColor(this.timerMinutes === 30 ? Color.Blue : '#F7FAFC')
            .borderRadius(8)
            .width('45%')
            .height(44)
            .onClick(() => {
              this.setTimer(30);
            })
        }
        .width('100%')
        .justifyContent(FlexAlign.SpaceBetween)
        .margin({ bottom: 16 })
        
        Row() {
          Button('60分钟')
            .fontSize(16)
            .fontColor(this.timerMinutes === 60 ? Color.White : '#2D3748')
            .backgroundColor(this.timerMinutes === 60 ? Color.Blue : '#F7FAFC')
            .borderRadius(8)
            .width('45%')
            .height(44)
            .onClick(() => {
              this.setTimer(60);
            })
          
          Button('90分钟')
            .fontSize(16)
            .fontColor(this.timerMinutes === 90 ? Color.White : '#2D3748')
            .backgroundColor(this.timerMinutes === 90 ? Color.Blue : '#F7FAFC')
            .borderRadius(8)
            .width('45%')
            .height(44)
            .onClick(() => {
              this.setTimer(90);
            })
        }
        .width('100%')
        .justifyContent(FlexAlign.SpaceBetween)
      }
      
      // 剩余时间显示
      if (this.timerMinutes > 0 && this.remainingTime > 0) {
        Text(`剩余时间: ${Math.floor(this.remainingTime / 60)}分${this.remainingTime % 60}秒`)
          .fontSize(14)
          .fontColor('#718096')
          .margin({ top: 20 })
      }
    }
    .padding(20)
    .backgroundColor(Color.White)
    .borderRadius({ topLeft: 16, topRight: 16 })
  }

  /**
   * 构建倍速弹窗
   */
  @Builder
  private buildSpeedSheet(): void {
    Column() {
      Text('朗读倍速')
        .fontSize(18)
        .fontWeight(FontWeight.Medium)
        .fontColor('#2D3748')
        .margin({ bottom: 20 })
      
      // 倍速选项 - 添加横向滑动
      Scroll() {
        Row({ space: 12 }) {
          ForEach([0.5, 0.75, 1, 1.25, 1.5, 2], (speed: number) => {
            Button(`${speed}x`)
              .fontSize(16)
              .fontColor(this.ttsSpeed === speed ? Color.White : '#2D3748')
              .backgroundColor(this.ttsSpeed === speed ? Color.Blue : '#F7FAFC')
              .borderRadius(8)
              .width(80)
              .height(44)
              .onClick(() => {
                this.setTTSSpeed(speed);
              })
          })
        }
        .padding({ left: 8, right: 8 })
      }
      .scrollable(ScrollDirection.Horizontal)
      .scrollBar(BarState.Off)
      .width('100%')
      .margin({ bottom: 16 })
      
      Text('选择朗读速度，1x为正常速度')
        .fontSize(12)
        .fontColor('#A0AEC0')
        .textAlign(TextAlign.Center)
    }
    .padding(20)
    .backgroundColor(Color.White)
    .borderRadius({ topLeft: 16, topRight: 16 })
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
    } else {
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
    } catch (error) {
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
    } catch (error) {
      hilog.error(0x0000, TAG, '取消后台任务失败: ' + JSON.stringify(error));
    }
  }

  }
