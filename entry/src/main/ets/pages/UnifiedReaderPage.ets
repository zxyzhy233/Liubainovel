/**
 * 统一阅读页面 — 自研阅读器验证入口
 * 将 PageEngine、NewReaderView、ReaderMenus、ContentProvider 串联
 * 支持本地 epub/txt 和在线书籍
 *
 * 路由参数：
 *   source: 'local' | 'online'
 *   filePath?: string          — 本地书籍路径
 *   bookId?: number            — 在线书籍 ID
 *   bookTitle?: string         — 书籍标题
 *   chapterIndex?: number      — 起始章节
 *   chapters?: ChapterInfo[]   — 在线章节列表（SourceChapterInfo）
 */

import { router } from '@kit.ArkUI'
import { common } from '@kit.AbilityKit'
import { batteryInfo, BusinessError } from '@kit.BasicServicesKit'
import { promptAction } from '@kit.ArkUI'
import hilog from '@ohos.hilog'
import { image } from '@kit.ImageKit'
import { preferences } from '@kit.ArkData'

import { ContentProvider, UnifiedChapterInfo, BookMeta } from '../reader/providers/ContentProvider'
import { LocalBookProvider } from '../reader/providers/LocalBookProvider'
import { OnlineBookProvider } from '../reader/providers/OnlineBookProvider'
import { PageEngine, RenderPage, PaginateConfig } from '../reader/core/PageEngine'
import { TextMeasurer } from '../reader/core/TextMeasurer'
import { PageCache } from '../reader/core/PageCache'
import { NewReaderView } from '../reader/components/NewReaderView'
import { ReaderMenus, ReaderSettings, MenuCallbacks } from '../reader/components/ReaderMenus'
import { TTSPanel, TTSPanelCallbacks, TTSPanelMode } from '../reader/components/TTSPanel'
import { TTSController, TTSState, TTSCallbacks } from '../reader/tts/TTSController'
import { ChapterInfo as SourceChapterInfo } from '../models/BookSourceModel'
import { onlineBookDataManager } from '../utils/OnlineBookDataManager'
import { bookDataManager } from '../utils/BookDataManager'
import { bookSourceManager } from '../managers/BookSourceManager'

const TAG: string = 'UnifiedReaderPage'
const UNIFIED_READER_PREFS = 'unified_reader_progress'

interface UnifiedReaderParams {
  source: string           // 'local' | 'online'
  filePath?: string
  bookId?: number
  bookTitle?: string
  bookUrl?: string
  chapterIndex?: number
  pageIndex?: number
  chapters?: SourceChapterInfo[]
}

interface SavedProgress {
  chapterIndex: number
  pageIndex: number
}

@Entry
@Component
struct UnifiedReaderPage {
  // 核心引擎
  private provider: ContentProvider | null = null
  private pageEngine: PageEngine | null = null
  private measurer: TextMeasurer | null = null
  private pageCache: PageCache = new PageCache(20)

  // 页面状态
  @State currentPage: RenderPage | null = null
  @State chapterPages: RenderPage[] = []
  @State currentPageIndex: number = 0
  @State currentChapterIndex: number = 0
  @State chapters: UnifiedChapterInfo[] = []
  @State isLoading: boolean = true
  @State errorMessage: string = ''
  @State bookTitle: string = ''
  // 缓存当前章节内容（避免设置变更时重新网络加载）
  private cachedChapterContent: string = ''

  // 阅读记录相关
  private sourceType: string = ''  // 'local' | 'online'
  private filePath: string = ''
  private bookId: number = 0
  private bookUrl: string = ''  // 在线书籍 URL（用于跳转详情页）
  private preference: preferences.Preferences | null = null
  private savedPageIndex: number = 0  // 从路由参数或 Preferences 恢复的页码

  // 右上角菜单
  @State showMorePopup: boolean = false

  // 菜单状态
  @State isMenuVisible: boolean = false
  @State settings: ReaderSettings = {
    fontSize: 60,
    lineSpacing: 0.6,
    fontFamily: 'HarmonyOS Sans',
    themeIndex: 0,
    bgColor: '#FFFFFF',
    textColor: '#333333',
    indent: true,
    animMode: 'slide'
  }

  // 触摸状态
  private touchStartX: number = 0

  // 状态栏
  @State currentTime: string = ''
  @State batteryLevel: number = 0
  private timeInterval: number = -1

  // Canvas 上下文（用于 TextMeasurer）
  private measureCanvas: CanvasRenderingContext2D =
    new CanvasRenderingContext2D(new RenderingContextSettings(true))

  // 页面尺寸
  @State pageWidth: number = 0
  @State pageHeight: number = 0

  // 自定义 TTS 朗读相关
  private ttsController: TTSController = new TTSController()
  @State isTTSPlaying: boolean = false
  @State ttsState: TTSState = TTSState.IDLE
  @State ttsParagraphs: string[] = []
  @State currentTTSParagraphIndex: number = 0
  @State currentTTSParagraphText: string = ''
  @State isTTSPanelVisible: boolean = false
  @State ttsPanelMode: TTSPanelMode = 'fullscreen'
  @State coverImage: image.PixelMap | null = null
  @State coverUrl: string = ''

  async aboutToAppear() {
    hilog.info(0x0000, TAG, '统一阅读页面启动')

    // 启动时间更新
    this.updateTimeAndBattery()
    this.timeInterval = setInterval(() => {
      this.updateTimeAndBattery()
    }, 30000)

    // 初始化 Preferences（用于保存本地书籍阅读进度）
    const context = getContext(this) as common.UIAbilityContext
    try {
      this.preference = await preferences.getPreferences(context, UNIFIED_READER_PREFS)
    } catch (err) {
      hilog.error(0x0000, TAG, `Failed to get preferences: ${err}`)
    }

    // 初始化数据管理器
    await bookDataManager.init(context)
    await onlineBookDataManager.init(context)

    // 加载保存的阅读器设置（字体、背景、行距等）
    await this.loadReaderSettings()

    // 解析路由参数
    const params = router.getParams() as UnifiedReaderParams
    if (!params) {
      this.errorMessage = '缺少路由参数'
      this.isLoading = false
      return
    }

    // 保存来源信息用于后续保存进度
    this.sourceType = params.source || ''

    try {
      // 创建 ContentProvider
      if (params.source === 'local' && params.filePath) {
        const cacheDir = context.cacheDir
        this.provider = new LocalBookProvider(params.filePath, cacheDir)
        this.bookTitle = params.bookTitle || ''
        this.filePath = params.filePath
      } else if (params.source === 'online' && params.bookId) {
        this.bookId = params.bookId
        this.bookTitle = params.bookTitle || ''
        this.bookUrl = params.bookUrl || ''

        // 如果没有传入章节列表，自动从书源获取
        let chapters = params.chapters
        if (!chapters || chapters.length === 0) {
          hilog.info(0x0000, TAG, '未传入章节列表，从书源自动获取...')
          // 从数据库获取书籍信息
          const onlineBook = await onlineBookDataManager.queryOnlineBookById(params.bookId)
          if (onlineBook) {
            this.bookUrl = onlineBook.bookUrl
            this.bookTitle = this.bookTitle || onlineBook.title
            // 通过书源管理器获取章节列表
            const tocUrl = onlineBook.bookUrl
            const chapterResult = await bookSourceManager.getChapterList(tocUrl)
            if (chapterResult.success && chapterResult.data && chapterResult.data.length > 0) {
              chapters = chapterResult.data
              hilog.info(0x0000, TAG, `自动获取到 ${chapters.length} 个章节`)
            } else {
              this.errorMessage = '获取章节列表失败'
              this.isLoading = false
              return
            }
          } else {
            this.errorMessage = '未找到书籍信息'
            this.isLoading = false
            return
          }
        }

        this.provider = new OnlineBookProvider(
          params.bookId,
          this.bookTitle,
          chapters
        )
      } else {
        this.errorMessage = '无效的参数'
        this.isLoading = false
        return
      }

      // 获取章节列表
      this.chapters = await this.provider.getChapterList()
      if (this.chapters.length === 0) {
        this.errorMessage = '没有找到章节内容'
        this.isLoading = false
        return
      }

      // 恢复阅读进度：优先使用路由参数，其次从 Preferences 恢复
      let startChapterIndex = params.chapterIndex || 0
      let startPageIndex = params.pageIndex || 0

      // 如果路由参数没有指定章节（首次打开），尝试从 Preferences 恢复
      if (startChapterIndex === 0 && startPageIndex === 0) {
        const savedProgress = await this.loadSavedProgress()
        if (savedProgress) {
          startChapterIndex = savedProgress.chapterIndex
          startPageIndex = savedProgress.pageIndex
          hilog.info(0x0000, TAG,
            `从 Preferences 恢复阅读进度: chapter=${startChapterIndex}, page=${startPageIndex}`)
        }
      }

      // 设置起始章节
      this.currentChapterIndex = startChapterIndex
      if (this.currentChapterIndex >= this.chapters.length) {
        this.currentChapterIndex = 0
      }
      this.savedPageIndex = startPageIndex

      // 获取书籍元信息
      const meta = this.provider.getBookMeta()
      if (!this.bookTitle) {
        this.bookTitle = meta.title
      }

      hilog.info(0x0000, TAG,
        `书籍加载: "${this.bookTitle}", ${this.chapters.length} 章, 起始章节=${this.currentChapterIndex}, 起始页=${this.savedPageIndex}`)

      // 如果 Canvas 和页面尺寸已就绪（可能在 aboutToAppear 异步等待期间已触发），主动加载章节
      if (this.measurer && this.pageWidth > 0 && this.pageHeight > 0) {
        hilog.info(0x0000, TAG, '引擎已就绪，主动加载章节')
        await this.loadCurrentChapter()
      }

    } catch (e) {
      hilog.error(0x0000, TAG, `初始化失败: ${JSON.stringify(e)}`)
      this.errorMessage = `加载失败: ${e instanceof Error ? e.message : '未知错误'}`
      this.isLoading = false
    }
  }

  aboutToDisappear(): void {
    // 退出前保存阅读进度
    this.saveReadingProgress()

    if (this.timeInterval !== -1) {
      clearInterval(this.timeInterval)
    }
    // 停止朗读并清理
    if (this.isTTSPlaying) {
      this.ttsController.stop()
    }
    this.ttsController.release()
    this.pageCache.release()
    this.provider?.release()
  }

  build() {
    Stack() {
      // ========== 加载状态 ==========
      if (this.isLoading) {
        Column() {
          LoadingProgress()
            .width(60).height(60)
            .color('#4A7C59')
          Text('正在加载...')
            .fontSize(16).fontColor('#666666')
            .margin({ top: 20 })
        }
        .width('100%').height('100%')
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center)
        .backgroundColor(this.settings.bgColor)
        .zIndex(10)
      }

      // ========== 错误状态 ==========
      if (this.errorMessage) {
        Column() {
          Text('⚠').fontSize(60)
            .margin({ bottom: 20 })
          Text('加载失败')
            .fontSize(20).fontWeight(FontWeight.Bold)
            .fontColor('#333333').margin({ bottom: 10 })
          Text(this.errorMessage)
            .fontSize(14).fontColor('#999999')
            .textAlign(TextAlign.Center)
            .margin({ bottom: 30, left: 20, right: 20 })
          Row({ space: 20 }) {
            Button('返回')
              .onClick(() => { router.back() })
              .backgroundColor('#999999').fontColor(Color.White)
            Button('重试')
              .onClick(() => { this.retryLoading() })
              .backgroundColor('#4A7C59').fontColor(Color.White)
          }
        }
        .width('100%').height('100%')
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center)
        .backgroundColor(this.settings.bgColor)
        .zIndex(10)
      }

      // ========== 隐藏的测量 Canvas ==========
      Canvas(this.measureCanvas)
        .width(1).height(1)
        .position({ x: -10, y: -10 })
        .onReady(() => {
          this.onMeasureCanvasReady()
        })

      // ========== 阅读器视图 ==========
      NewReaderView({
          currentPage: this.currentPage,
          nextPage: this.getNextPage(),
          prevPage: this.getPrevPage(),
          animMode: this.settings.animMode,
          bgColor: this.settings.bgColor,
          textColor: this.settings.textColor,
          fontSize: this.settings.fontSize,
          fontFamily: this.settings.fontFamily,
          showHeader: true,
          showFooter: true,
          headerText: this.getCurrentChapterTitle(),
          footerLeftText: this.currentTime,
          footerRightText: this.getPageProgressText(),
          onCenterTap: () => {
            this.isMenuVisible = !this.isMenuVisible
          },
          onNextPage: () => {
            this.goNextPage()
          },
          onPrevPage: () => {
            this.goPrevPage()
          }
        })
          .width('100%')
          .height('100%')
          .visibility(!this.isLoading && !this.errorMessage ? Visibility.Visible : Visibility.Hidden)
          .onAreaChange((_oldValue: Area, newValue: Area) => {
            const w = newValue.width as number
            const h = newValue.height as number
            if (w !== this.pageWidth || h !== this.pageHeight) {
              this.pageWidth = w
              this.pageHeight = h
              hilog.info(0x0000, TAG, `页面尺寸: ${w}x${h}`)
              if (this.measurer && this.provider) {
                this.loadCurrentChapter()
              }
            }
          })

      // ========== 底部状态栏 ==========
      Row() {
        Text(this.currentTime)
          .fontSize(12).fontColor('#999999')
        if (this.batteryLevel >= 0) {
          Text(`🔋${this.batteryLevel}%`)
            .fontSize(12).fontColor('#999999')
            .margin({ left: 8 })
        }
        Blank()
        Text(this.getPageProgressText())
          .fontSize(12).fontColor('#999999')
      }
      .width('100%').height(24)
      .padding({ left: 16, right: 16 })
      .position({ x: 0, y: '100%' })
      .translate({ y: -48 })
      .zIndex(1)
      .visibility(!this.isLoading && !this.errorMessage && !this.isMenuVisible
        ? Visibility.Visible : Visibility.None)

      // ========== 菜单 ==========
      ReaderMenus({
        isMenuVisible: $isMenuVisible,
        chapters: this.chapters,
        currentChapterIndex: this.currentChapterIndex,
        settings: $settings,
        isTTSPlaying: this.isTTSPlaying,
        chapterTitle: this.getCurrentChapterTitle(),
        showOnlineMenu: this.sourceType === 'online',
        callbacks: {
          onBack: () => {
            router.back()
          },
          onStartTTS: () => {
            this.startTTS()
          },
          onStopTTS: () => {
            this.stopTTS()
          },
          onChapterSelect: (index: number) => {
            this.switchToChapter(index)
          },
          onPrevChapter: () => {
            if (this.currentChapterIndex > 0) {
              this.switchToChapter(this.currentChapterIndex - 1)
            }
          },
          onNextChapter: () => {
            if (this.currentChapterIndex < this.chapters.length - 1) {
              this.switchToChapter(this.currentChapterIndex + 1)
            }
          },
          onSettingsChange: (_newSettings: ReaderSettings) => {
            // settings 已通过 @Link 自动同步
            // 保存设置到 Preferences
            this.saveReaderSettings()
            // 使用缓存内容重新分页，不重新网络加载
            this.pageCache.invalidateAll()
            this.repaginate()
          },
          onRefresh: () => {
            // 刷新当前章节内容
            this.cachedChapterContent = ''
            this.loadCurrentChapter()
          },
          onOpenDetail: () => {
            // 跳转到书籍详情页
            if (this.bookUrl) {
              router.pushUrl({
                url: 'pages/BookDetailPage',
                params: {
                  bookUrl: this.bookUrl,
                  bookTitle: this.bookTitle
                }
              })
            }
          }
        } as MenuCallbacks
      })

      // ========== 全屏朗读页面 ==========
      if (this.isTTSPanelVisible && this.ttsPanelMode === 'fullscreen') {
        TTSPanel({
          mode: 'fullscreen',
          isVisible: true,
          ttsState: this.ttsState,
          coverImage: this.coverImage,
          coverUrl: this.coverUrl,
          bookTitle: this.bookTitle,
          chapterTitle: this.getCurrentChapterTitle(),
          currentParagraphText: this.currentTTSParagraphText,
          currentParagraphIndex: this.currentTTSParagraphIndex,
          totalParagraphs: this.ttsParagraphs.length,
          callbacks: {
            onPlay: () => {
              if (this.ttsState === TTSState.PAUSED) {
                this.ttsController.resume()
              } else {
                this.startTTS()
              }
            },
            onPause: () => { this.ttsController.pause() },
            onStop: () => { this.stopTTS() },
            onPrevParagraph: () => { this.ttsController.prevParagraph() },
            onNextParagraph: () => { this.ttsController.nextParagraph() },
            onSpeedChange: (speed: number) => { this.ttsController.setSpeed(speed) },
            onClose: () => {
              // 关闭全屏 → 切换到胶囊模式（朗读不停止）
              this.ttsPanelMode = 'capsule'
            },
            onShutdown: () => {
              // 彻底停止朗读
              this.stopTTS()
            }
          } as TTSPanelCallbacks
        })
          .width('100%')
          .height('100%')
          .zIndex(200)
          .transition(TransitionEffect.OPACITY.animation({ duration: 300, curve: Curve.EaseOut }))
      }

      // ========== 悬浮胶囊 ==========
      if (this.isTTSPanelVisible && this.ttsPanelMode === 'capsule') {
        TTSPanel({
          mode: 'capsule',
          isVisible: true,
          ttsState: this.ttsState,
          coverImage: this.coverImage,
          coverUrl: this.coverUrl,
          bookTitle: this.bookTitle,
          chapterTitle: this.getCurrentChapterTitle(),
          currentParagraphText: this.currentTTSParagraphText,
          currentParagraphIndex: this.currentTTSParagraphIndex,
          totalParagraphs: this.ttsParagraphs.length,
          callbacks: {
            onPlay: () => {
              if (this.ttsState === TTSState.PAUSED) {
                this.ttsController.resume()
              } else {
                this.startTTS()
              }
            },
            onPause: () => { this.ttsController.pause() },
            onStop: () => { this.stopTTS() },
            onPrevParagraph: () => { this.ttsController.prevParagraph() },
            onNextParagraph: () => { this.ttsController.nextParagraph() },
            onSpeedChange: (speed: number) => { this.ttsController.setSpeed(speed) },
            onClose: () => {
              // 点击胶囊 → 进入全屏模式
              this.ttsPanelMode = 'fullscreen'
            },
            onShutdown: () => {
              // 彻底停止朗读
              this.stopTTS()
            }
          } as TTSPanelCallbacks
        })
          .position({ x: '4%', y: '100%' })
          .translate({ y: -76 })
          .zIndex(150)
          .transition(TransitionEffect.OPACITY.animation({ duration: 200, curve: Curve.EaseOut }))
      }

    }
    .width('100%').height('100%')
  }

  // ========== 核心方法 ==========

  /**
   * 测量 Canvas 就绪后初始化引擎
   */
  private async onMeasureCanvasReady(): Promise<void> {
    this.measurer = new TextMeasurer(this.measureCanvas)
    this.pageEngine = new PageEngine(this.measurer)

    hilog.info(0x0000, TAG, 'TextMeasurer 和 PageEngine 初始化完成')

    // 如果页面尺寸已知，开始加载
    if (this.pageWidth > 0 && this.pageHeight > 0 && this.provider) {
      await this.loadCurrentChapter()
    }
  }

  /**
   * 加载当前章节
   */
  private async loadCurrentChapter(): Promise<void> {
    if (!this.provider || !this.pageEngine || this.pageWidth === 0) {
      return
    }

    this.isLoading = true
    this.errorMessage = ''

    try {
      const content = await this.provider.getChapterContent(this.currentChapterIndex)
      this.cachedChapterContent = content
      const chapterTitle = this.chapters[this.currentChapterIndex]?.title || ''

      const config: PaginateConfig = {
        pageWidth: this.pageWidth,
        pageHeight: this.pageHeight,
        fontSize: this.settings.fontSize,
        fontFamily: this.settings.fontFamily,
        lineSpacing: this.settings.lineSpacing,
        paragraphSpacing: 10,
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 40,
        paddingBottom: 50,
        indent: this.settings.indent,
        chapterTitle: chapterTitle,
        chapterIndex: this.currentChapterIndex
      }

      this.chapterPages = this.pageEngine.paginate(content, config)

      if (this.chapterPages.length > 0) {
        // 恢复保存的页码（仅首次加载时使用）
        if (this.savedPageIndex > 0 && this.savedPageIndex < this.chapterPages.length) {
          this.currentPageIndex = this.savedPageIndex
          this.savedPageIndex = 0  // 只使用一次
        } else {
          this.currentPageIndex = 0
        }
        this.currentPage = this.chapterPages[this.currentPageIndex]
      } else {
        this.currentPage = null
      }

      this.isLoading = false

      hilog.info(0x0000, TAG,
        `章节加载完成: "${chapterTitle}", ${this.chapterPages.length} 页, 当前页=${this.currentPageIndex}`)

      // 在线书籍：后台预缓存后10章（不阻塞UI）
      if (this.sourceType === 'online' && this.provider instanceof OnlineBookProvider) {
        const prefetchStart = this.currentChapterIndex + 1
        ;(this.provider as OnlineBookProvider).prefetchChapters(prefetchStart, 10)
      }

    } catch (e) {
      hilog.error(0x0000, TAG, `加载章节失败: ${JSON.stringify(e)}`)
      this.errorMessage = `加载失败: ${e instanceof Error ? e.message : '未知错误'}`
      this.isLoading = false
    }
  }

  /**
   * 仅重新分页（设置变更时使用，不重新网络加载）
   */
  private repaginate(): void {
    if (!this.pageEngine || this.pageWidth === 0 || !this.cachedChapterContent) {
      return
    }

    const chapterTitle = this.chapters[this.currentChapterIndex]?.title || ''
    const config: PaginateConfig = {
      pageWidth: this.pageWidth,
      pageHeight: this.pageHeight,
      fontSize: this.settings.fontSize,
      fontFamily: this.settings.fontFamily,
      lineSpacing: this.settings.lineSpacing,
      paragraphSpacing: 10,
      paddingLeft: 20,
      paddingRight: 20,
      paddingTop: 40,
      paddingBottom: 50,
      indent: this.settings.indent,
      chapterTitle: chapterTitle,
      chapterIndex: this.currentChapterIndex
    }

    this.chapterPages = this.pageEngine.paginate(this.cachedChapterContent, config)

    // 尽量保持在相近的阅读位置
    if (this.currentPageIndex >= this.chapterPages.length) {
      this.currentPageIndex = Math.max(0, this.chapterPages.length - 1)
    }

    if (this.chapterPages.length > 0) {
      this.currentPage = this.chapterPages[this.currentPageIndex]
    } else {
      this.currentPage = null
    }

    hilog.info(0x0000, TAG, `重新分页完成: ${this.chapterPages.length} 页`)
  }

  /**
   * 下一页
   */
  private goNextPage(): void {
    if (this.currentPageIndex < this.chapterPages.length - 1) {
      this.currentPageIndex++
      this.currentPage = this.chapterPages[this.currentPageIndex]
      this.saveReadingProgress()
    } else if (this.currentChapterIndex < this.chapters.length - 1) {
      // 自动切换到下一章
      this.switchToChapter(this.currentChapterIndex + 1)
    }
  }

  /**
   * 上一页
   */
  private goPrevPage(): void {
    if (this.currentPageIndex > 0) {
      this.currentPageIndex--
      this.currentPage = this.chapterPages[this.currentPageIndex]
      this.saveReadingProgress()
    } else if (this.currentChapterIndex > 0) {
      // 切换到上一章最后一页
      this.currentChapterIndex--
      this.loadCurrentChapter().then(() => {
        if (this.chapterPages.length > 0) {
          this.currentPageIndex = this.chapterPages.length - 1
          this.currentPage = this.chapterPages[this.currentPageIndex]
          this.saveReadingProgress()
        }
      })
    }
  }

  /**
   * 切换章节
   */
  private async switchToChapter(index: number): Promise<void> {
    if (index < 0 || index >= this.chapters.length) return
    this.currentChapterIndex = index
    this.currentPageIndex = 0
    this.savedPageIndex = 0
    await this.loadCurrentChapter()
    this.saveReadingProgress()
  }

  /**
   * 重试加载
   */
  private retryLoading(): void {
    this.errorMessage = ''
    this.loadCurrentChapter()
  }

  // ========== 阅读器设置持久化方法 ==========

  private static readonly SETTINGS_KEY = 'unified_reader_settings'

  /**
   * 保存阅读器设置到 Preferences
   */
  private saveReaderSettings(): void {
    if (!this.preference) return

    const settingsData = JSON.stringify({
      fontSize: this.settings.fontSize,
      lineSpacing: this.settings.lineSpacing,
      fontFamily: this.settings.fontFamily,
      themeIndex: this.settings.themeIndex,
      bgColor: this.settings.bgColor,
      textColor: this.settings.textColor,
      indent: this.settings.indent
    })

    this.preference.put(UnifiedReaderPage.SETTINGS_KEY, settingsData).then(() => {
      this.preference?.flush().then(() => {
        hilog.info(0x0000, TAG, `阅读器设置已保存`)
      }).catch((err: Error) => {
        hilog.error(0x0000, TAG, `flush 设置失败: ${err}`)
      })
    }).catch((err: Error) => {
      hilog.error(0x0000, TAG, `保存设置失败: ${err}`)
    })
  }

  /**
   * 从 Preferences 加载阅读器设置
   */
  private async loadReaderSettings(): Promise<void> {
    if (!this.preference) return

    try {
      const saved = await this.preference.get(UnifiedReaderPage.SETTINGS_KEY, '')
      if (typeof saved === 'string' && saved) {
        const parsed = JSON.parse(saved) as ReaderSettings
        this.settings = {
          fontSize: parsed.fontSize ?? 60,
          lineSpacing: parsed.lineSpacing ?? 0.6,
          fontFamily: parsed.fontFamily ?? 'HarmonyOS Sans',
          themeIndex: parsed.themeIndex ?? 0,
          bgColor: parsed.bgColor ?? '#FFFFFF',
          textColor: parsed.textColor ?? '#333333',
          indent: parsed.indent ?? true,
          animMode: parsed.animMode ?? 'slide'
        }
        hilog.info(0x0000, TAG,
          `阅读器设置已加载: fontSize=${this.settings.fontSize}, theme=${this.settings.themeIndex}`)
      }
    } catch (e) {
      hilog.error(0x0000, TAG, `加载阅读器设置失败: ${e}`)
    }
  }

  // ========== 阅读记录方法 ==========

  /**
   * 获取当前书籍的 Preferences 存储 key
   */
  private getProgressKey(): string {
    if (this.sourceType === 'online' && this.bookId > 0) {
      return `unified_online_${this.bookId}`
    } else if (this.sourceType === 'local' && this.filePath) {
      return `unified_local_${this.filePath}`
    }
    return ''
  }

  /**
   * 保存阅读进度
   * - Preferences: 保存精确的 chapterIndex + pageIndex（用于恢复阅读位置）
   * - 数据库: 保存章节名和进度百分比（用于书架显示）
   */
  private saveReadingProgress(): void {
    const progressKey = this.getProgressKey()
    if (!progressKey) return

    // 1. 保存精确位置到 Preferences
    const progressData: SavedProgress = {
      chapterIndex: this.currentChapterIndex,
      pageIndex: this.currentPageIndex
    }
    const progressValue = JSON.stringify(progressData)
    this.preference?.put(progressKey, progressValue).then(() => {
      this.preference?.flush().then(() => {
        hilog.info(0x0000, TAG,
          `保存阅读进度: ${progressValue}`)
      }).catch((err: Error) => {
        hilog.error(0x0000, TAG, `flush preferences 失败: ${err}`)
      })
    }).catch((err: Error) => {
      hilog.error(0x0000, TAG, `保存 preferences 失败: ${err}`)
    })

    // 2. 保存到数据库（用于书架显示）
    const chapterTitle = this.chapters[this.currentChapterIndex]?.title || ''
    const progressPercent = this.chapters.length > 0
      ? `${Math.round(((this.currentChapterIndex + 1) / this.chapters.length) * 100)}%`
      : '0%'

    if (this.sourceType === 'online' && this.bookId > 0) {
      onlineBookDataManager.updateReadingProgress(
        this.bookId, this.currentChapterIndex, chapterTitle
      ).catch((err: Error) => {
        hilog.error(0x0000, TAG, `更新在线书籍阅读进度失败: ${err}`)
      })
    } else if (this.sourceType === 'local' && this.filePath) {
      bookDataManager.updateBookReadingRecord(this.filePath, chapterTitle)
      bookDataManager.updateBookProgress(this.filePath, progressPercent)
    }
  }

  /**
   * 从 Preferences 加载保存的阅读进度
   */
  private async loadSavedProgress(): Promise<SavedProgress | null> {
    const progressKey = this.getProgressKey()
    if (!progressKey || !this.preference) return null

    try {
      const saved = await this.preference.get(progressKey, '')
      if (typeof saved === 'string' && saved) {
        const progress = JSON.parse(saved) as SavedProgress
        if (progress.chapterIndex >= 0) {
          return progress
        }
      }
    } catch (e) {
      hilog.error(0x0000, TAG, `读取保存的阅读进度失败: ${e}`)
    }
    return null
  }

  // ========== 自定义 TTS 朗读方法 ==========

  /**
   * 开始朗读（使用自定义 TTSController + TTSPanel）
   */
  private async startTTS(): Promise<void> {
    if (!this.cachedChapterContent) {
      promptAction.showToast({ message: '没有可朗读的内容', duration: 1500 })
      return
    }

    // 构建段落列表
    this.ttsParagraphs = this.cachedChapterContent
      .split('\n')
      .filter((p: string): boolean => p.trim().length > 0)

    if (this.ttsParagraphs.length === 0) {
      promptAction.showToast({ message: '没有可朗读的内容', duration: 1500 })
      return
    }

    // 设置 TTS 回调
    const callbacks: TTSCallbacks = {
      onStateChange: (state: TTSState) => {
        this.ttsState = state
        this.isTTSPlaying = (state === TTSState.PLAYING)
        if (state === TTSState.COMPLETED) {
          hilog.info(0x0000, TAG, '朗读完成')
        }
      },
      onParagraphStart: (index: number) => {
        this.currentTTSParagraphIndex = index
        if (index < this.ttsParagraphs.length) {
          this.currentTTSParagraphText = this.ttsParagraphs[index]
        }
      },
      onParagraphEnd: (_index: number) => {
        // 段落朗读结束
      },
      onError: (message: string) => {
        hilog.error(0x0000, TAG, `TTS 错误: ${message}`)
        promptAction.showToast({ message: `朗读错误: ${message}`, duration: 2000 })
      }
    }
    this.ttsController.setCallbacks(callbacks)

    // 获取封面图片或封面 URL
    if (!this.coverImage && !this.coverUrl && this.provider) {
      try {
        this.coverImage = await this.provider.getCoverImage()
      } catch (e) {
        hilog.warn(0x0000, TAG, '获取封面 PixelMap 失败')
      }
      // 如果 PixelMap 获取失败，尝试获取封面 URL（在线书籍）
      if (!this.coverImage) {
        try {
          if (this.provider instanceof OnlineBookProvider) {
            this.coverUrl = await (this.provider as OnlineBookProvider).getCoverUrl()
          }
          if (!this.coverUrl) {
            const meta: BookMeta = this.provider.getBookMeta()
            if (meta.coverUrl) {
              this.coverUrl = meta.coverUrl
            }
          }
        } catch (e) {
          hilog.warn(0x0000, TAG, '获取封面 URL 失败')
        }
      }
    }

    // 根据当前页面位置估算起始段落
    let startIndex = 0
    if (this.chapterPages.length > 0 && this.ttsParagraphs.length > 0) {
      const progress = this.currentPageIndex / this.chapterPages.length
      startIndex = Math.floor(progress * this.ttsParagraphs.length)
    }

    this.currentTTSParagraphIndex = startIndex
    if (startIndex < this.ttsParagraphs.length) {
      this.currentTTSParagraphText = this.ttsParagraphs[startIndex]
    }

    // 显示全屏面板并开始朗读
    this.ttsPanelMode = 'fullscreen'
    this.isTTSPanelVisible = true
    await this.ttsController.start(this.ttsParagraphs, startIndex)
    hilog.info(0x0000, TAG, `自定义 TTS 朗读已开始, 起始段落=${startIndex}`)
  }

  /**
   * 停止朗读
   */
  private stopTTS(): void {
    this.ttsController.stop()
    this.isTTSPlaying = false
    this.isTTSPanelVisible = false
    this.ttsState = TTSState.IDLE
  }

  // ========== 辅助方法 ==========

  /**
   * 获取下一页数据（用于翻页动画）
   */
  private getNextPage(): RenderPage | null {
    if (this.currentPageIndex < this.chapterPages.length - 1) {
      return this.chapterPages[this.currentPageIndex + 1]
    }
    return null  // 跨章节的下一页暂不支持预览
  }

  /**
   * 获取上一页数据（用于翻页动画）
   */
  private getPrevPage(): RenderPage | null {
    if (this.currentPageIndex > 0) {
      return this.chapterPages[this.currentPageIndex - 1]
    }
    return null  // 跨章节的上一页暂不支持预览
  }

  private getCurrentChapterTitle(): string {
    if (this.currentChapterIndex >= 0 && this.currentChapterIndex < this.chapters.length) {
      return this.chapters[this.currentChapterIndex].title
    }
    return this.bookTitle
  }

  private getPageProgressText(): string {
    if (this.chapterPages.length === 0) return ''
    return `${this.currentPageIndex + 1}/${this.chapterPages.length}`
  }

  private updateTimeAndBattery(): void {
    const now = new Date()
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    this.currentTime = `${hours}:${minutes}`
    try {
      this.batteryLevel = batteryInfo.batterySOC
    } catch (e) {
      this.batteryLevel = -1
    }
  }
}
