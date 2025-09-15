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
import { hilog } from '@kit.PerformanceAnalysisKit';
import { bookDataManager } from '../utils/BookDataManager';
import { settingsManager } from '../utils/SettingsManager';
import { preferences } from '@kit.ArkData';

import { ReadPageComponent, readerCore, bookParser } from '@kit.ReaderKit';
import { common, ConfigurationConstant } from '@kit.AbilityKit';

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
  private currentData: readerCore.PageDataInfo | null = null;
  private defaultHandler: bookParser.BookParserHandler | null = null;
  private readerComponentController: readerCore.ReaderComponentController = new readerCore.ReaderComponentController();
  private preference: preferences.Preferences | null = null;
  private filePath: string = '';
  @State bookCover: PixelMap | null = null;
  @State bookTitle: string = '';
  @State author: string = '';
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
    this.getUIContext().getRouter().addObserver({
      onSessionInactive: (sessionId: number) => {
        // 当页面即将返回时保存阅读进度
        this.saveReadingProgress();
      }
    });
  }

  onPageHide(): void {
    // 页面隐藏时保存阅读进度
    this.saveReadingProgress();
  }
    const logCode: number = 0x0000;
    const logTag: string = TAG;
    const currentDensity: number = this.readerSetting.scaledDensity;
    const newDensity: number = display.getDefaultDisplaySync().scaledDensity;
    hilog.info(logCode, logTag,
      `aboutToAppear : current scaledDensity = ${currentDensity}, change scaledDensity = ${newDensity}`);
    this.readerComponentController = new readerCore.ReaderComponentController();
    const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
    try {
      this.preference = await preferences.getPreferences(context, PREFERENCES_NAME);
    } catch (err) {
      const errorMessage: string = `Failed to get preferences, err: ${err}`;
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
    } catch (error: BusinessError) {
      let code = error.code;
      let message = error.message;
      hilog.error(0x0000, TAG,
        `resourceRequest : get resource failed, error code: ${code}`);
        hilog.error(0x0000, TAG, `resourceRequest : get resource failed, message: ${message}.`);
    }
    // Get data in the sandbox path
    return this.loadFileFromPath(resourcePath);
  }

  private async startPlay(path: string, resourceIndex: number, domPos: string) {
    try {
      const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
      const initPromise: Promise<void> = this.readerComponentController.init(context);
      const defaultHandlerPromise: Promise<bookParser.BookParserHandler> = bookParser.getDefaultHandler(path);
      const results = await Promise.all([defaultHandlerPromise, initPromise]);
      const defaultHandler = results[0];
      this.defaultHandler = defaultHandler;

      hilog.info(0x0000, TAG, 'startPlay getDefaultHandler end,result is:' + JSON.stringify(this.defaultHandler));
      this.readerComponentController.registerBookParser(this.defaultHandler);

      // Register listeners
      this.readerComponentController.on('resourceRequest', this.resourceRequest);
      this.readerComponentController.on('pageShow', (pageData: readerCore.PageDataInfo): void => {
        hilog.info(0x0000, TAG, 'pageshow: data is: ' + JSON.stringify(pageData));
        this.currentData = pageData;
        // Save page data
        this.saveReadingProgress();
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

      // 优先从 Preferences 加载进度
      const progressKey = `${this.filePath}_progress`;
      const savedProgress = await this.preference?.get(progressKey, '');
      let startResourceIndex = resourceIndex || 0;
      let startDomPos = domPos || '';
      if (typeof savedProgress === 'string' && savedProgress) {
        try {
          const savedProgressObj = JSON.parse(savedProgress) as ProgressData;
          const savedResourceIndex = savedProgressObj.resourceIndex;
          const savedDomPos = savedProgressObj.domPos;
          startResourceIndex = savedResourceIndex;
          startDomPos = savedDomPos;
          hilog.info(0x0000, TAG, `Loaded progress from preferences: resourceIndex=${startResourceIndex}, domPos=${startDomPos}`);
        } catch (e) {
          hilog.error(0x0000, TAG, `Failed to parse saved progress: ${savedProgress}`);
        }
      }

      this.readerComponentController.startPlay(startResourceIndex, startDomPos);
     } catch (err: BusinessError) {
       hilog.error(0x0000, TAG, 'startPlay: err: ' + JSON.stringify(err));
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

      List() {
        ForEach(this.catalogItemList, (item: bookParser.CatalogItem) => {
          ListItem() {
            Column() {
              Row() {
                Row() {
                  Text(' · ')
                    .fontSize(14)
                    .fontColor($r('app.color.black_90_opacity'))
                  Text(item.catalogName)
                    .fontSize(14)
                    .fontColor($r('app.color.black_90_opacity'))
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
            .onClick(async () => {
              this.jumpToCatalogItem(item);
            })
          }
        })
      }
      .scrollBar(BarState.Off)
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
      ReadPageComponent({
        controller: this.readerComponentController,
        readerCallback: (err: BusinessError, data: readerCore.ReaderComponentController) => {
          this.readerComponentController = data;
        }
      }).zIndex(1)
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
      }
      .width('100%')
      .height('100%')
      .backgroundColor(this.currentIndex == 0 ? '#0d626262' : Color.Transparent)
      .zIndex(this.showModalBanner ? 2 : 0)
      .justifyContent(FlexAlign.End)
      .onClick(() => {
        this.closeModal();
      })
    }.width('100%').height('100%').onClick(() => {
      this.showModal();
    })
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
   * 保存阅读进度（改为记录章节名）
   */
  private saveReadingProgress() {
    if (this.filePath && this.currentData && this.currentData.resourceIndex !== undefined) {
      const resourceIndex = this.currentData.resourceIndex;
      const domPos = this.currentData.startDomPos || '';
      const spineList = this.defaultHandler?.getSpineList() || [];
      
      // 获取当前章节名
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

      // 保存到 Preferences
      const progressKey = `${this.filePath}_progress`;
      const progressValue = JSON.stringify({ resourceIndex, domPos });
      this.preference?.put(progressKey, progressValue).then(() => {
        this.preference?.flush((err) => {
          if (err) {
            hilog.error(0x0000, TAG, `Failed to flush preferences, err: ${err}`);
          } else {
            hilog.info(0x0000, TAG, `Saved progress to preferences: ${progressValue}`);
          }
        });
      });

      // 更新数据库，保存章节名而不是进度百分比
      hilog.info(0x0000, TAG,
        `Updating progress for ${this.filePath}: resourceIndex=${resourceIndex}, domPos=${domPos}, chapterName=${chapterName}`);
      bookDataManager.updateBookProgress(this.filePath, resourceIndex, domPos, chapterName);
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
    path.match(options[0]);
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
    } catch (err: BusinessError) {
      hilog.error(0x0000, TAG, "loadFileFromPath failed with error message: ", err.message, ", error code: ", err.code);
      return new ArrayBuffer(0);
    }
  }

  /**
   * Remove the page transition animation to speed up the page access speed of the reader
   */
  pageTransition() {
    PageTransitionEnter({ duration: 0, curve: Curve.Sharp });
    PageTransitionExit({ duration: 0, curve: Curve.Sharp });
  }
}





