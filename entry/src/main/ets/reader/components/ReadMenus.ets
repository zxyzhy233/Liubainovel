/**
 * 阅读菜单组件
 * 包含底部菜单栏和各种设置面板
 */

import { PageLoader } from '../core/PageLoader'
import { ReadConfig, PageMode, ThemeConfig } from '../config/ReadConfig'

/**
 * 菜单类型枚举
 */
export enum MenuType {
  NONE = 0,           // 无菜单
  BOTTOM = 1,         // 底部菜单
  ADJUST = 2,         // 阅读调节
  INTERFACE = 3,      // 界面设置
  MORE = 4            // 更多设置
}

/**
 * 阅读菜单组件
 */
@Component
export struct ReadMenus {
  @State private currentMenu: MenuType = MenuType.NONE
  @State private config: ReadConfig = ReadConfig.getInstance()
  @State private currentPageIndex: number = 0
  @State private totalPages: number = 0
  @State private isAutoPage: boolean = false
  @State private isNightTheme: boolean = false
  
  // 通过构造函数参数传递
  @Prop pageLoader: PageLoader | null = null
  @Prop onPageChange?: (page: number) => void
  @Prop onPrevChapter?: () => void
  @Prop onNextChapter?: () => void
  @Prop onShowChapterList?: () => void
  @Prop onNightThemeToggle?: (isNight: boolean) => void
  @Prop onReadAloud?: () => void
  @Prop onAutoPage?: (enabled: boolean) => void
  @Prop onReplaceRule?: () => void
  @Prop onConfigChange?: () => void
  
  aboutToAppear(): void {
    this.updatePageInfo()
  }
  
  /**
   * 设置页面加载器
   */
  setPageLoader(loader: PageLoader): void {
    this.pageLoader = loader
    this.updatePageInfo()
  }
  
  /**
   * 设置回调
   */
  setCallback(callback: ReadMenuCallback): void {
    this.onPageChange = callback.onPageChange
    this.onPrevChapter = callback.onPrevChapter
    this.onNextChapter = callback.onNextChapter
    this.onShowChapterList = callback.onShowChapterList
    this.onNightThemeToggle = callback.onNightThemeToggle
    this.onReadAloud = callback.onReadAloud
    this.onAutoPage = callback.onAutoPage
    this.onReplaceRule = callback.onReplaceRule
    this.onConfigChange = callback.onConfigChange
  }
  
  /**
   * 显示菜单
   */
  show(menuType: MenuType = MenuType.BOTTOM): void {
    this.currentMenu = menuType
    this.updatePageInfo()
  }
  
  /**
   * 隐藏菜单
   */
  hide(): void {
    this.currentMenu = MenuType.NONE
  }
  
  /**
   * 切换菜单
   */
  toggle(): void {
    if (this.currentMenu === MenuType.NONE) {
      this.show(MenuType.BOTTOM)
    } else {
      this.hide()
    }
  }
  
  /**
   * 更新页面信息
   */
  private updatePageInfo(): void {
    if (this.pageLoader) {
      this.currentPageIndex = this.pageLoader.getCurrentPageIndex()
      this.totalPages = this.pageLoader.getPageCount()
    }
  }
  
  /**
   * 更新当前页索引
   */
  updateCurrentPage(pageIndex: number): void {
    this.currentPageIndex = pageIndex
  }
  
  build() {
    if (this.currentMenu !== MenuType.NONE) {
      Stack() {
        // 半透明遮罩
        Column()
          .width('100%')
          .height('100%')
          .backgroundColor('rgba(0, 0, 0, 0.5)')
          .onClick(() => this.hide())
        
        Column() {
          Blank()
          
          // 根据类型显示不同菜单
          if (this.currentMenu === MenuType.BOTTOM) {
            this.BottomMenu()
          } else if (this.currentMenu === MenuType.INTERFACE) {
            this.InterfacePanel()
          } else if (this.currentMenu === MenuType.ADJUST) {
            this.AdjustPanel()
          } else if (this.currentMenu === MenuType.MORE) {
            this.MorePanel()
          }
        }
        .width('100%')
        .height('100%')
        .onClick((event: ClickEvent) => {
          event.stopPropagation()
        })
      }
      .width('100%')
      .height('100%')
    }
  }
  
  /**
   * 底部菜单
   */
  @Builder
  BottomMenu() {
    Column() {
      // 进度条
      Row() {
        Text(`${this.currentPageIndex + 1}`)
          .fontSize(14)
          .fontColor('#666666')
        
        Slider({
          value: this.currentPageIndex,
          min: 0,
          max: Math.max(this.totalPages - 1, 0),
          step: 1,
          style: SliderStyle.OutSet
        })
          .layoutWeight(1)
          .margin({ left: 10, right: 10 })
          .blockColor('#007DFF')
          .trackColor('#E0E0E0')
          .selectedColor('#007DFF')
          .onChange((value: number) => {
            if (this.pageLoader) {
              this.pageLoader.skipToPage(Math.floor(value))
              if (this.onPageChange) {
                this.onPageChange(Math.floor(value))
              }
            }
          })
        
        Text(`${this.totalPages}`)
          .fontSize(14)
          .fontColor('#666666')
      }
      .width('100%')
      .padding({ left: 20, right: 20, top: 10, bottom: 10 })
      
      // 上一章/下一章
      Row() {
        Button('上一章')
          .fontSize(14)
          .onClick(() => {
            if (this.onPrevChapter) {
              this.onPrevChapter()
            }
            this.hide()
          })
        
        Button('下一章')
          .fontSize(14)
          .onClick(() => {
            if (this.onNextChapter) {
              this.onNextChapter()
            }
            this.hide()
          })
      }
      .width('100%')
      .justifyContent(FlexAlign.SpaceAround)
      .padding({ top: 10, bottom: 10 })
      
      // 功能按钮行
      Row() {
        this.MenuButton('目录', $r('sys.symbol.list_bullet'), () => {
          if (this.onShowChapterList) {
            this.onShowChapterList()
          }
        })
        
        this.MenuButton('调节', $r('sys.symbol.textformat_size'), () => {
          this.currentMenu = MenuType.ADJUST
        })
        
        this.MenuButton('界面', $r('sys.symbol.text_alignleft'), () => {
          this.currentMenu = MenuType.INTERFACE
        })
        
        this.MenuButton('设置', $r('sys.symbol.gear'), () => {
          this.currentMenu = MenuType.MORE
        })
      }
      .width('100%')
      .justifyContent(FlexAlign.SpaceAround)
      .padding({ top: 15, bottom: 15 })
      
      // 快捷功能按钮
      Row() {
        this.IconButton(
          this.isNightTheme ? $r('sys.symbol.sun_max') : $r('sys.symbol.moon'),
          '夜间',
          () => {
            this.isNightTheme = !this.isNightTheme
            if (this.onNightThemeToggle) {
              this.onNightThemeToggle(this.isNightTheme)
            }
          }
        )
        
        this.IconButton(
          $r('sys.symbol.speaker_wave_2'),
          '朗读',
          () => {
            if (this.onReadAloud) {
              this.onReadAloud()
            }
          }
        )
        
        this.IconButton(
          this.isAutoPage ? $r('sys.symbol.pause') : $r('sys.symbol.play'),
          '自动',
          () => {
            this.isAutoPage = !this.isAutoPage
            if (this.onAutoPage) {
              this.onAutoPage(this.isAutoPage)
            }
          }
        )
        
        this.IconButton(
          $r('sys.symbol.arrow_2_squarepath'),
          '替换',
          () => {
            if (this.onReplaceRule) {
              this.onReplaceRule()
            }
          }
        )
      }
      .width('100%')
      .justifyContent(FlexAlign.SpaceAround)
      .padding({ top: 10, bottom: 20 })
    }
    .width('100%')
    .backgroundColor('#FFFFFF')
    .borderRadius({ topLeft: 16, topRight: 16 })
  }
  
  /**
   * 界面设置面板
   */
  @Builder
  InterfacePanel() {
    Column() {
      // 标题栏
      Row() {
        Text('界面设置')
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .layoutWeight(1)
        
        Image($r('sys.symbol.xmark'))
          .width(24)
          .height(24)
          .onClick(() => this.currentMenu = MenuType.BOTTOM)
      }
      .width('100%')
      .padding(16)
      
      Scroll() {
        Column() {
          // 字体大小
          this.SettingItem('字体大小', () => {
            Row() {
              Button('-')
                .fontSize(18)
                .width(40)
                .height(40)
                .onClick(() => {
                  const size = this.config.getTextSize()
                  this.config.setTextSize(size - 2)
                  if (this.onConfigChange) {
                    this.onConfigChange()
                  }
                })
              
              Text(`${this.config.getTextSize()}`)
                .fontSize(16)
                .margin({ left: 20, right: 20 })
              
              Button('+')
                .fontSize(18)
                .width(40)
                .height(40)
                .onClick(() => {
                  const size = this.config.getTextSize()
                  this.config.setTextSize(size + 2)
                  if (this.onConfigChange) {
                    this.onConfigChange()
                  }
                })
            }
          })
          
          Divider()
          
          // 翻页模式
          this.SettingItem('翻页模式', () => {
            Row() {
              ForEach(['仿真', '覆盖', '滑动', '滚动', '无'], (mode: string, index: number) => {
                Button(mode)
                  .fontSize(14)
                  .type(this.config.getPageMode() === index ? ButtonType.Normal : ButtonType.Capsule)
                  .backgroundColor(this.config.getPageMode() === index ? '#007DFF' : '#F0F0F0')
                  .fontColor(this.config.getPageMode() === index ? '#FFFFFF' : '#333333')
                  .margin({ right: 8 })
                  .onClick(() => {
                    this.config.setPageMode(index as PageMode)
                    if (this.onConfigChange) {
                      this.onConfigChange()
                    }
                  })
              })
            }
          })
          
          Divider()
          
          // 主题背景
          this.SettingItem('主题背景', () => {
            Row() {
              ForEach(ReadConfig.getPresetThemes(), (theme: ThemeConfig) => {
                Column() {
                  Rect()
                    .width(40)
                    .height(40)
                    .fill(theme.bgColor)
                    .radius(8)
                    .stroke(this.config.getBgColor() === theme.bgColor ? '#007DFF' : '#E0E0E0')
                    .strokeWidth(2)
                  
                  Text(theme.name)
                    .fontSize(12)
                    .fontColor('#666666')
                    .margin({ top: 4 })
                }
                .margin({ right: 12 })
                .onClick(() => {
                  this.config.applyTheme(theme)
                  if (this.onConfigChange) {
                    this.onConfigChange()
                  }
                })
              })
            }
          })
          
          Divider()
          
          // 加粗文本
          this.SettingItem('加粗文本', () => {
            Toggle({ type: ToggleType.Switch, isOn: false })
              .onChange((isOn: boolean) => {
                // 这里可以添加加粗功能
                if (this.onConfigChange) {
                  this.onConfigChange()
                }
              })
          })
        }
        .width('100%')
      }
      .layoutWeight(1)
      .scrollBar(BarState.Off)
    }
    .width('100%')
    .height('60%')
    .backgroundColor('#FFFFFF')
    .borderRadius({ topLeft: 16, topRight: 16 })
  }
  
  /**
   * 阅读调节面板
   */
  @Builder
  AdjustPanel() {
    Column() {
      // 标题栏
      Row() {
        Text('阅读调节')
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .layoutWeight(1)
        
        Image($r('sys.symbol.xmark'))
          .width(24)
          .height(24)
          .onClick(() => this.currentMenu = MenuType.BOTTOM)
      }
      .width('100%')
      .padding(16)
      
      Scroll() {
        Column() {
          // 行间距
          this.SettingItem('行间距', () => {
            Row() {
              ForEach([
                { label: '默认', value: 1.5 },
                { label: '紧凑', value: 1.2 },
                { label: '适中', value: 1.8 },
                { label: '宽松', value: 2.0 }
              ], (item: { label: string, value: number }) => {
                Button(item.label)
                  .fontSize(14)
                  .type(ButtonType.Capsule)
                  .backgroundColor('#F0F0F0')
                  .fontColor('#333333')
                  .margin({ right: 8 })
                  .onClick(() => {
                    this.config.setLineSpacing(item.value)
                    if (this.onConfigChange) {
                      this.onConfigChange()
                    }
                  })
              })
            }
          })
          
          Divider()
          
          // 段落间距
          this.SettingItem('段落间距', () => {
            Row() {
              Button('-')
                .width(40)
                .height(40)
                .onClick(() => {
                  const spacing = this.config.getParagraphSpacing()
                  this.config.setParagraphSpacing(spacing - 2)
                  if (this.onConfigChange) {
                    this.onConfigChange()
                  }
                })
              
              Text(`${this.config.getParagraphSpacing()}`)
                .fontSize(16)
                .margin({ left: 20, right: 20 })
              
              Button('+')
                .width(40)
                .height(40)
                .onClick(() => {
                  const spacing = this.config.getParagraphSpacing()
                  this.config.setParagraphSpacing(spacing + 2)
                  if (this.onConfigChange) {
                    this.onConfigChange()
                  }
                })
            }
          })
          
          Divider()
          
          // 页边距
          this.SettingItem('页边距', () => {
            Column() {
              Row() {
                Text('左右边距')
                  .fontSize(14)
                  .layoutWeight(1)
                
                Text(`${this.config.getPaddingLeft()}`)
                  .fontSize(14)
              }
              .width('100%')
              .margin({ bottom: 8 })
              
              Slider({
                value: this.config.getPaddingLeft(),
                min: 0,
                max: 50,
                step: 5
              })
                .onChange((value: number) => {
                  this.config.setPaddingLeft(value)
                  this.config.setPaddingRight(value)
                  if (this.onConfigChange) {
                    this.onConfigChange()
                  }
                })
              
              Row() {
                Text('上下边距')
                  .fontSize(14)
                  .layoutWeight(1)
                
                Text(`${this.config.getPaddingTop()}`)
                  .fontSize(14)
              }
              .width('100%')
              .margin({ top: 16, bottom: 8 })
              
              Slider({
                value: this.config.getPaddingTop(),
                min: 0,
                max: 80,
                step: 10
              })
                .onChange((value: number) => {
                  this.config.setPaddingTop(value)
                  this.config.setPaddingBottom(value)
                  if (this.onConfigChange) {
                    this.onConfigChange()
                  }
                })
            }
            .width('100%')
          })
        }
        .width('100%')
      }
      .layoutWeight(1)
      .scrollBar(BarState.Off)
    }
    .width('100%')
    .height('60%')
    .backgroundColor('#FFFFFF')
    .borderRadius({ topLeft: 16, topRight: 16 })
  }
  
  /**
   * 更多设置面板
   */
  @Builder
  MorePanel() {
    Column() {
      // 标题栏
      Row() {
        Text('更多设置')
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .layoutWeight(1)
        
        Image($r('sys.symbol.xmark'))
          .width(24)
          .height(24)
          .onClick(() => this.currentMenu = MenuType.BOTTOM)
      }
      .width('100%')
      .padding(16)
      
      Scroll() {
        Column() {
          this.SettingItem('显示状态栏', () => {
            Toggle({ type: ToggleType.Switch, isOn: this.config.getShowStatusBar() })
              .onChange((isOn: boolean) => {
                this.config.setShowStatusBar(isOn)
                if (this.onConfigChange) {
                  this.onConfigChange()
                }
              })
          })
          
          Divider()
          
          this.SettingItem('显示时间', () => {
            Toggle({ type: ToggleType.Switch, isOn: this.config.getShowTime() })
              .onChange((isOn: boolean) => {
                this.config.setShowTime(isOn)
                if (this.onConfigChange) {
                  this.onConfigChange()
                }
              })
          })
          
          Divider()
          
          this.SettingItem('显示电量', () => {
            Toggle({ type: ToggleType.Switch, isOn: this.config.getShowBattery() })
              .onChange((isOn: boolean) => {
                this.config.setShowBattery(isOn)
                if (this.onConfigChange) {
                  this.onConfigChange()
                }
              })
          })
          
          Divider()
          
          this.SettingItem('显示进度', () => {
            Toggle({ type: ToggleType.Switch, isOn: this.config.getShowProgress() })
              .onChange((isOn: boolean) => {
                this.config.setShowProgress(isOn)
                if (this.onConfigChange) {
                  this.onConfigChange()
                }
              })
          })
        }
        .width('100%')
      }
      .layoutWeight(1)
      .scrollBar(BarState.Off)
    }
    .width('100%')
    .height('50%')
    .backgroundColor('#FFFFFF')
    .borderRadius({ topLeft: 16, topRight: 16 })
  }
  
  /**
   * 设置项组件
   */
  @Builder
  SettingItem(title: string, content: () => void) {
    Row() {
      Text(title)
        .fontSize(15)
        .fontColor('#333333')
        .layoutWeight(1)
      
      content()
    }
    .width('100%')
    .padding({ left: 16, right: 16, top: 12, bottom: 12 })
  }
  
  /**
   * 菜单按钮
   */
  @Builder
  MenuButton(text: string, icon: Resource, onClick: () => void) {
    Column() {
      Image(icon)
        .width(24)
        .height(24)
        .fillColor('#333333')
      
      Text(text)
        .fontSize(12)
        .fontColor('#666666')
        .margin({ top: 4 })
    }
    .onClick(onClick)
  }
  
  /**
   * 图标按钮
   */
  @Builder
  IconButton(icon: Resource, text: string, onClick: () => void) {
    Column() {
      Image(icon)
        .width(28)
        .height(28)
        .fillColor('#666666')
      
      Text(text)
        .fontSize(11)
        .fontColor('#999999')
        .margin({ top: 2 })
    }
    .onClick(onClick)
  }
}

/**
 * 菜单回调接口
 */
export interface ReadMenuCallback {
  onPageChange?: (page: number) => void
  onPrevChapter?: () => void
  onNextChapter?: () => void
  onShowChapterList?: () => void
  onNightThemeToggle?: (isNight: boolean) => void
  onReadAloud?: () => void
  onAutoPage?: (enabled: boolean) => void
  onReplaceRule?: () => void
  onConfigChange?: () => void
}
