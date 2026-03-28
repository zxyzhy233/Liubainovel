/**
 * 统一阅读器菜单组件
 * 从 Reader.ets 和 OnlineChapterReader.ets 中抽取的公共菜单
 * 包含：目录、字体、主题、翻页 四个 Tab 面板
 */

import { UnifiedChapterInfo } from '../providers/ContentProvider'
import hilog from '@ohos.hilog'

const TAG: string = 'ReaderMenus'

/**
 * 阅读器设置
 */
export interface ReaderSettings {
  fontSize: number
  lineSpacing: number
  fontFamily: string
  themeIndex: number
  bgColor: string
  textColor: string
  indent: boolean
  animMode: string  // 'none' | 'slide' | 'curl'
}

/**
 * 菜单事件回调
 */
export interface MenuCallbacks {
  onBack: () => void
  onStartTTS: () => void
  onStopTTS: () => void
  onChapterSelect: (index: number) => void
  onPrevChapter: () => void
  onNextChapter: () => void
  onSettingsChange: (settings: ReaderSettings) => void
  onRefresh?: () => void
  onOpenDetail?: () => void
}

@Component
export struct ReaderMenus {
  /** 是否显示菜单 */
  @Link isMenuVisible: boolean
  /** 当前选中的 Tab 索引 */
  @State currentTabIndex: number = -1
  /** 章节列表 */
  @Prop chapters: UnifiedChapterInfo[] = []
  /** 当前章节索引 */
  @Prop currentChapterIndex: number = 0
  /** 当前设置 */
  @Link settings: ReaderSettings
  /** 是否正在朗读 */
  @Prop isTTSPlaying: boolean = false
  /** 章节标题 */
  @Prop chapterTitle: string = ''
  /** 是否显示在线菜单（刷新、详情） */
  @Prop showOnlineMenu: boolean = false
  /** 右上角更多菜单弹出状态 */
  @State showMorePopup: boolean = false

  /** 回调 */
  callbacks: MenuCallbacks = {
    onBack: () => {},
    onStartTTS: () => {},
    onStopTTS: () => {},
    onChapterSelect: (_index: number) => {},
    onPrevChapter: () => {},
    onNextChapter: () => {},
    onSettingsChange: (_settings: ReaderSettings) => {}
  }

  private catalogScroller: Scroller = new Scroller()

  // 主题配置
  private themeList: string[] = ['白色', '米黄', '粉色', '护眼', '夜间']
  private themeBgColors: string[] = ['#FFFFFF', '#F5E6C8', '#FFE4E5', '#C5E7CE', '#202224']
  private themeTextColors: string[] = ['#333333', '#333333', '#333333', '#333333', '#CCCCCC']

  @Builder
  private buildMoreMenu() {
    Column() {
      Text('刷新')
        .fontSize(14).fontColor('#333333')
        .width('100%').height(44)
        .textAlign(TextAlign.Center)
        .onClick(() => {
          this.showMorePopup = false
          this.isMenuVisible = false
          if (this.callbacks.onRefresh) {
            this.callbacks.onRefresh()
          }
        })
      Divider().color('#F0F0F0')
      Text('书籍详情')
        .fontSize(14).fontColor('#333333')
        .width('100%').height(44)
        .textAlign(TextAlign.Center)
        .onClick(() => {
          this.showMorePopup = false
          this.isMenuVisible = false
          if (this.callbacks.onOpenDetail) {
            this.callbacks.onOpenDetail()
          }
        })
    }
    .width(120)
    .backgroundColor(Color.White)
    .borderRadius(12)
    .shadow({ radius: 8, color: '#1A000000', offsetX: 0, offsetY: 2 })
  }

  build() {
    Stack() {
      // ========== 顶部栏 ==========
      Row() {
        Button() {
          SymbolGlyph($r('sys.symbol.chevron_left'))
            .width(24).height(24)
            .fontColor(['#333333'])
        }
        .width(40).height(40)
        .backgroundColor(Color.Transparent)
        .onClick(() => {
          this.callbacks.onBack()
        })

        Text(this.chapterTitle)
          .fontSize(14)
          .fontColor('#666666')
          .layoutWeight(1)
          .textAlign(TextAlign.Center)
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })

        // 朗读按钮
        Button() {
          Image($r('app.media.headset'))
            .width(20).height(20)
        }
        .width(36).height(36)
        .backgroundColor(Color.Transparent)
        .onClick(() => {
          this.isMenuVisible = false
          if (!this.isTTSPlaying) {
            this.callbacks.onStartTTS()
          } else {
            this.callbacks.onStopTTS()
          }
        })

        // 更多菜单按钮（在线书籍时显示）
        if (this.showOnlineMenu) {
          Button() {
            Text('⋮').fontSize(20).fontColor('#333333')
          }
          .width(36).height(36)
          .backgroundColor(Color.Transparent)
          .bindPopup(this.showMorePopup, {
            builder: this.buildMoreMenu,
            placement: Placement.BottomRight,
            popupColor: Color.Transparent,
            onStateChange: (e) => {
              if (!e.isVisible) {
                this.showMorePopup = false
              }
            }
          })
          .onClick(() => {
            this.showMorePopup = !this.showMorePopup
          })
        }
      }
      .width('100%')
      .height(80)
      .padding({ left: 8, right: 8, top: 36 })
      .backgroundColor('#F5F5F0')
      .position({ x: 0, y: 0 })
      .zIndex(5)
      .visibility(this.isMenuVisible ? Visibility.Visible : Visibility.None)

      // ========== 底部菜单区域 ==========
      Column() {
        // 目录面板
        if (this.currentTabIndex === 0) {
          this.buildCatalogPanel()
        }

        // 字体面板
        if (this.currentTabIndex === 1) {
          this.buildFontPanel()
        }

        // 主题面板
        if (this.currentTabIndex === 2) {
          this.buildThemePanel()
        }

        // 翻页面板（预留）
        if (this.currentTabIndex === 3) {
          this.buildFlipPanel()
        }

        // 进度条
        Row() {
          SymbolGlyph($r('sys.symbol.chevron_left'))
            .width(20).height(20)
            .fontColor(['#718096'])
            .onClick(() => { this.callbacks.onPrevChapter() })

          Slider({
            value: this.currentChapterIndex >= 0 ? this.currentChapterIndex : 0,
            min: 0,
            max: Math.max(this.chapters.length - 1, 0),
            step: 1,
            style: SliderStyle.OutSet
          })
            .layoutWeight(1)
            .margin({ left: 8, right: 8 })
            .blockColor('#C1D8C3')
            .trackColor('#E8E8E8')
            .selectedColor('#C1D8C3')
            .blockSize({ width: 24, height: 24 })
            .trackThickness(4)
            .onChange((value: number) => {
              this.callbacks.onChapterSelect(Math.round(value))
            })

          SymbolGlyph($r('sys.symbol.chevron_right'))
            .width(20).height(20)
            .fontColor(['#718096'])
            .onClick(() => { this.callbacks.onNextChapter() })
        }
        .width('100%').height(48)
        .padding({ left: 16, right: 16 })
        .backgroundColor('#F5F5F0')

        // 底部 Tab 栏
        Row() {
          this.buildTab('≡', '目录', 0)
          this.buildTab('A', '字体', 1)
          this.buildTab('☀', '显示', 2)
          this.buildTab('📖', '翻页', 3)
        }
        .width('100%').height(56)
        .backgroundColor('#F5F5F0')
        .justifyContent(FlexAlign.SpaceAround)
        .alignItems(VerticalAlign.Center)
      }
      .width('100%').height('100%')
      .backgroundColor(this.currentTabIndex === 0 ? '#0d626262' : Color.Transparent)
      .zIndex(2)
      .justifyContent(FlexAlign.End)
      .visibility(this.isMenuVisible ? Visibility.Visible : Visibility.None)
      .onClick(() => {
        this.isMenuVisible = false
        this.currentTabIndex = -1
      })
    }
    .width('100%').height('100%')
    .enabled(this.isMenuVisible)
    .hitTestBehavior(this.isMenuVisible ? HitTestMode.Default : HitTestMode.Transparent)
  }

  @Builder
  private buildTab(icon: string, label: string, index: number) {
    Column() {
      Text(icon)
        .fontSize(22)
        .fontColor(this.currentTabIndex === index ? '#4A7C59' : '#999999')
      Text(label)
        .fontSize(10)
        .fontColor(this.currentTabIndex === index ? '#4A7C59' : '#999999')
        .margin({ top: 2 })
    }
    .width('25%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .onClick(() => {
      if (this.currentTabIndex === index) {
        this.currentTabIndex = -1
      } else {
        this.currentTabIndex = index
      }
    })
  }

  @Builder
  private buildCatalogPanel() {
    Column() {
      Row() {
        Stack() {
          SymbolGlyph($r('sys.symbol.xmark'))
            .fontColor([$r('app.color.ohos_id_color_primary_light')])
            .width(18).fontSize(18).fontWeight(600)
        }
        .borderRadius('50%')
        .backgroundColor('#0d777777')
        .align(Alignment.Center)
        .width(40).height(40)
        .margin({ top: 8, left: 16, right: 16 })
        .onClick(() => { this.currentTabIndex = -1 })
      }
      .width('100%').height(56)
      .alignItems(VerticalAlign.Center)
      .justifyContent(FlexAlign.End)

      List({ scroller: this.catalogScroller }) {
        ForEach(this.chapters, (item: UnifiedChapterInfo, index: number) => {
          ListItem() {
            Column() {
              Row() {
                Text(' · ').fontSize(14).fontColor('#333333')
                Text(item.title)
                  .fontSize(14)
                  .fontColor(index === this.currentChapterIndex ? Color.Red : '#333333')
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
                  .padding({ top: 8, bottom: 8 })
                  .maxLines(2)
                  .layoutWeight(1)
              }
              .width('100%').height(48)
              .justifyContent(FlexAlign.Center)
              .alignItems(VerticalAlign.Center)

              Divider()
            }
            .padding({ left: 16, right: 16, top: 6, bottom: 6 })
            .backgroundColor(index === this.currentChapterIndex ? '#0d4A7C59' : Color.Transparent)
            .onClick(() => {
              this.callbacks.onChapterSelect(index)
              this.isMenuVisible = false
              this.currentTabIndex = -1
            })
          }
        })
      }
      .scrollBar(BarState.On)
      .scrollBarWidth(10)
      .scrollBarColor('#80000000')
      .edgeEffect(EdgeEffect.Spring)
      .width('100%')
      .layoutWeight(1)
    }
    .borderRadius({ topRight: 32, topLeft: 32 })
    .backgroundColor(Color.White)
    .constraintSize({ maxHeight: '60%' })
  }

  @Builder
  private buildFontPanel() {
    Column() {
      // 字号滑块
      Row() {
        Text('A').fontSize(14).fontColor('#999999')
        Slider({
          value: this.settings.fontSize,
          min: 50, max: 100, step: 2,
          style: SliderStyle.OutSet
        })
          .layoutWeight(1)
          .margin({ left: 12, right: 12 })
          .blockColor('#C1D8C3')
          .trackColor('#E8E8E8')
          .selectedColor('#C1D8C3')
          .onChange((value: number) => {
            this.settings.fontSize = value
            this.callbacks.onSettingsChange(this.settings)
          })
        Text('A').fontSize(22).fontColor('#333333')
      }
      .width('100%')
      .padding({ left: 20, right: 20, top: 16, bottom: 8 })

      // 行距滑块
      Row() {
        Text('≡').fontSize(14).fontColor('#999999')
        Slider({
          value: this.settings.lineSpacing,
          min: 0.6, max: 1.2, step: 0.1,
          style: SliderStyle.OutSet
        })
          .layoutWeight(1)
          .margin({ left: 12, right: 12 })
          .blockColor('#C1D8C3')
          .trackColor('#E8E8E8')
          .selectedColor('#C1D8C3')
          .onChange((value: number) => {
            this.settings.lineSpacing = value
            this.callbacks.onSettingsChange(this.settings)
          })
        Text('≡').fontSize(22).fontColor('#333333')
      }
      .width('100%')
      .padding({ left: 20, right: 20, top: 8, bottom: 16 })
    }
    .backgroundColor(Color.White)
    .borderRadius({ topLeft: 16, topRight: 16 })
  }

  @Builder
  private buildThemePanel() {
    Column() {
      Row({ space: 16 }) {
        ForEach(this.themeList, (label: string, index: number) => {
          Column() {
            Circle()
              .width(56).height(56)
              .fill(this.themeBgColors[index])
              .stroke(this.settings.themeIndex === index ? '#4A7C59' : '#E0E0E0')
              .strokeWidth(this.settings.themeIndex === index ? 2.5 : 1)
            Text(label)
              .fontSize(11)
              .fontColor('#666666')
              .margin({ top: 4 })
          }
          .alignItems(HorizontalAlign.Center)
          .onClick(() => {
            this.settings.themeIndex = index
            this.settings.bgColor = this.themeBgColors[index]
            this.settings.textColor = this.themeTextColors[index]
            this.callbacks.onSettingsChange(this.settings)
          })
        })
      }
      .padding({ left: 20, right: 20, top: 20, bottom: 20 })
    }
    .backgroundColor(Color.White)
    .borderRadius({ topLeft: 16, topRight: 16 })
  }

  @Builder
  private buildFlipPanel() {
    Column() {
      // 翻页效果
      Row() {
        Text('翻页效果').fontSize(14).fontColor('#333333')
        Blank()
        Row({ space: 8 }) {
          Text('无')
            .fontSize(13)
            .fontColor(this.settings.animMode === 'none' ? '#4A7C59' : '#666666')
            .borderRadius(16).borderWidth(1)
            .borderColor(this.settings.animMode === 'none' ? '#4A7C59' : '#E0E0E0')
            .backgroundColor(this.settings.animMode === 'none' ? '#E8F5E9' : '#F5F5F5')
            .padding({ left: 12, right: 12, top: 6, bottom: 6 })
            .onClick(() => {
              this.settings.animMode = 'none'
              this.callbacks.onSettingsChange(this.settings)
            })
          Text('滑动')
            .fontSize(13)
            .fontColor(this.settings.animMode === 'slide' ? '#4A7C59' : '#666666')
            .borderRadius(16).borderWidth(1)
            .borderColor(this.settings.animMode === 'slide' ? '#4A7C59' : '#E0E0E0')
            .backgroundColor(this.settings.animMode === 'slide' ? '#E8F5E9' : '#F5F5F5')
            .padding({ left: 12, right: 12, top: 6, bottom: 6 })
            .onClick(() => {
              this.settings.animMode = 'slide'
              this.callbacks.onSettingsChange(this.settings)
            })
          Text('翻页')
            .fontSize(13)
            .fontColor(this.settings.animMode === 'curl' ? '#4A7C59' : '#666666')
            .borderRadius(16).borderWidth(1)
            .borderColor(this.settings.animMode === 'curl' ? '#4A7C59' : '#E0E0E0')
            .backgroundColor(this.settings.animMode === 'curl' ? '#E8F5E9' : '#F5F5F5')
            .padding({ left: 12, right: 12, top: 6, bottom: 6 })
            .onClick(() => {
              this.settings.animMode = 'curl'
              this.callbacks.onSettingsChange(this.settings)
            })
        }
      }
      .width('100%')
      .padding({ left: 20, right: 20, top: 16, bottom: 12 })

      Divider().color('#F0F0F0').margin({ left: 20, right: 20 })

      // 首行缩进
      Row() {
        Text('首行缩进').fontSize(14).fontColor('#333333')
        Blank()
        Toggle({ type: ToggleType.Switch, isOn: this.settings.indent })
          .selectedColor('#4A7C59')
          .onChange((isOn: boolean) => {
            this.settings.indent = isOn
            this.callbacks.onSettingsChange(this.settings)
          })
      }
      .width('100%')
      .padding({ left: 20, right: 20, top: 12, bottom: 16 })
    }
    .backgroundColor(Color.White)
    .borderRadius({ topLeft: 16, topRight: 16 })
  }
}
