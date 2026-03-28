/**
 * TTS 朗读面板组件（重构版）
 * 支持两种模式：
 *   - fullscreen: 全屏朗读页面，大封面、书名、章节、段落文本、控制栏
 *   - capsule: 悬浮胶囊，圆形封面 + 倍速 + 播放/暂停
 */

import { TTSState } from '../tts/TTSController'
import { image } from '@kit.ImageKit'

/**
 * 朗读面板回调
 */
export interface TTSPanelCallbacks {
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onPrevParagraph: () => void
  onNextParagraph: () => void
  onSpeedChange: (speed: number) => void
  /** 关闭全屏 → 切换到胶囊模式（朗读不停止） */
  onClose: () => void
  /** 彻底停止朗读并关闭面板 */
  onShutdown: () => void
}

/** 面板显示模式 */
export type TTSPanelMode = 'fullscreen' | 'capsule'

@Component
export struct TTSPanel {
  /** 面板模式 */
  @Prop mode: TTSPanelMode = 'fullscreen'
  /** 是否显示面板 */
  @Prop isVisible: boolean = false
  /** 朗读状态 */
  @Prop ttsState: TTSState = TTSState.IDLE
  /** 书籍封面（PixelMap） */
  @Prop coverImage: image.PixelMap | null = null
  /** 封面 URL（网络图片） */
  @Prop coverUrl: string = ''
  /** 书籍标题 */
  @Prop bookTitle: string = ''
  /** 当前章节标题 */
  @Prop chapterTitle: string = ''
  /** 当前朗读段落文本 */
  @Prop currentParagraphText: string = ''
  /** 当前段落索引 */
  @Prop currentParagraphIndex: number = 0
  /** 总段落数 */
  @Prop totalParagraphs: number = 0
  /** 当前速度 */
  @State currentSpeed: number = 1

  /** 回调 */
  callbacks: TTSPanelCallbacks = {
    onPlay: () => {},
    onPause: () => {},
    onStop: () => {},
    onPrevParagraph: () => {},
    onNextParagraph: () => {},
    onSpeedChange: (_speed: number) => {},
    onClose: () => {},
    onShutdown: () => {}
  }

  // 速度选项
  private speedOptions: number[] = [0.5, 0.75, 1, 1.25, 1.5, 2]

  build() {
    if (this.isVisible) {
      if (this.mode === 'fullscreen') {
        this.buildFullscreen()
      } else {
        this.buildCapsule()
      }
    }
  }

  // ==================== 全屏模式 ====================
  @Builder
  buildFullscreen() {
    Column() {
      // 顶部关闭按钮（增大 paddingTop 避免状态栏遮挡）
      Row() {
        Button() {
          SymbolGlyph($r('sys.symbol.chevron_down'))
            .width(22).height(22)
            .fontColor(['#FFFFFF'])
        }
        .width(40).height(40)
        .backgroundColor('#33FFFFFF')
        .borderRadius(20)
        .onClick(() => {
          this.callbacks.onClose()
        })

        Blank()

        // 停止朗读按钮
        Button() {
          SymbolGlyph($r('sys.symbol.xmark'))
            .width(18).height(18)
            .fontColor(['#FFFFFF'])
        }
        .width(40).height(40)
        .backgroundColor('#33FFFFFF')
        .borderRadius(20)
        .onClick(() => {
          this.callbacks.onShutdown()
        })
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 64 })

      // 封面 + 书名 + 章节信息区域（固定高度，不随内容变化浮动）
      Column() {
        // 大封面图片
        Stack() {
          if (this.coverImage) {
            Image(this.coverImage)
              .width(180).height(240)
              .borderRadius(12)
              .objectFit(ImageFit.Cover)
          } else if (this.coverUrl) {
            Image(this.coverUrl)
              .width(180).height(240)
              .borderRadius(12)
              .objectFit(ImageFit.Cover)
              .alt($r('app.media.default_cover'))
          } else {
            Image($r('app.media.default_cover'))
              .width(180).height(240)
              .borderRadius(12)
              .objectFit(ImageFit.Cover)
          }
        }
        .width(180).height(240)
        .shadow({ radius: 24, color: '#66000000', offsetX: 0, offsetY: 8 })

        // 书名
        Text(this.bookTitle)
          .fontSize(22)
          .fontWeight(FontWeight.Bold)
          .fontColor('#FFFFFF')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .margin({ top: 20 })
          .textAlign(TextAlign.Center)
          .width('80%')

        // 章节标题
        Text(this.chapterTitle)
          .fontSize(14)
          .fontColor('#AAFFFFFF')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .margin({ top: 8 })
          .textAlign(TextAlign.Center)
          .width('80%')

        // 朗读进度
        Text(`${this.currentParagraphIndex + 1} / ${this.totalParagraphs}`)
          .fontSize(12)
          .fontColor('#77FFFFFF')
          .margin({ top: 6 })
      }
      .alignItems(HorizontalAlign.Center)
      .width('100%')
      .margin({ top: 16 })

      // 当前朗读段落文本（弹性填充剩余空间）
      Scroll() {
        Text(this.currentParagraphText || '等待朗读...')
          .fontSize(15)
          .fontColor('#CCFFFFFF')
          .lineHeight(24)
          .textAlign(TextAlign.Center)
          .width('100%')
          .padding({ left: 32, right: 32 })
      }
      .layoutWeight(1)
      .width('100%')
      .scrollBar(BarState.Off)
      .margin({ top: 20 })

      // 底部控制栏
      Column() {
        // 进度条（段落进度）
        Row() {
          Text(`${this.currentParagraphIndex + 1}`)
            .fontSize(11)
            .fontColor('#77FFFFFF')
          Progress({
            value: this.totalParagraphs > 0
              ? (this.currentParagraphIndex + 1) : 0,
            total: this.totalParagraphs > 0 ? this.totalParagraphs : 1,
            type: ProgressType.Linear
          })
            .layoutWeight(1)
            .margin({ left: 10, right: 10 })
            .color('#4A7C59')
            .backgroundColor('#33FFFFFF')
            .style({ strokeWidth: 3 })
          Text(`${this.totalParagraphs}`)
            .fontSize(11)
            .fontColor('#77FFFFFF')
        }
        .width('100%')
        .padding({ left: 32, right: 32 })

        // 控制按钮
        Row() {
          // 倍速按钮
          Button() {
            Text(`${this.currentSpeed}x`)
              .fontSize(13)
              .fontColor('#FFFFFF')
              .fontWeight(FontWeight.Medium)
          }
          .width(56).height(36)
          .backgroundColor('#33FFFFFF')
          .borderRadius(18)
          .onClick(() => {
            this.cycleSpeed()
          })

          Blank()

          // 上一段
          Button() {
            Image($r('app.media.backward_end_fill'))
              .width(28).height(28)
              .fillColor(this.currentParagraphIndex > 0 ? '#FFFFFF' : '#55FFFFFF')
          }
          .width(48).height(48)
          .backgroundColor(Color.Transparent)
          .enabled(this.currentParagraphIndex > 0)
          .onClick(() => {
            this.callbacks.onPrevParagraph()
          })

          // 播放/暂停按钮（大圆形）
          Button() {
            if (this.ttsState === TTSState.PLAYING) {
              Image($r('app.media.pause_48'))
                .width(36).height(36)
                .fillColor(Color.White)
            } else {
              Image($r('app.media.play_48'))
                .width(36).height(36)
                .fillColor(Color.White)
            }
          }
          .width(64).height(64)
          .backgroundColor('#4A7C59')
          .borderRadius(32)
          .shadow({ radius: 12, color: '#664A7C59', offsetX: 0, offsetY: 4 })
          .onClick(() => {
            if (this.ttsState === TTSState.PLAYING) {
              this.callbacks.onPause()
            } else {
              this.callbacks.onPlay()
            }
          })

          // 下一段
          Button() {
            Image($r('app.media.forward_end_fill'))
              .width(28).height(28)
              .fillColor(this.currentParagraphIndex < this.totalParagraphs - 1
                ? '#FFFFFF' : '#55FFFFFF')
          }
          .width(48).height(48)
          .backgroundColor(Color.Transparent)
          .enabled(this.currentParagraphIndex < this.totalParagraphs - 1)
          .onClick(() => {
            this.callbacks.onNextParagraph()
          })

          Blank()

          // 占位（与左侧倍速按钮对称）
          Row().width(56).height(36)
        }
        .width('100%')
        .padding({ left: 24, right: 24, top: 20, bottom: 8 })
        .alignItems(VerticalAlign.Center)
      }
      .width('100%')
      .padding({ bottom: 40 })
    }
    .width('100%')
    .height('100%')
    .linearGradient({
      direction: GradientDirection.Bottom,
      colors: [['#1a1a2e', 0.0], ['#16213e', 0.5], ['#0f3460', 1.0]]
    })
  }

  // ==================== 胶囊模式 ====================
  @Builder
  buildCapsule() {
    Row() {
      // 圆形封面缩略图
      Stack() {
        if (this.coverImage) {
          Image(this.coverImage)
            .width(40).height(40)
            .borderRadius(20)
            .objectFit(ImageFit.Cover)
        } else if (this.coverUrl) {
          Image(this.coverUrl)
            .width(40).height(40)
            .borderRadius(20)
            .objectFit(ImageFit.Cover)
            .alt($r('app.media.default_cover'))
        } else {
          Image($r('app.media.default_cover'))
            .width(40).height(40)
            .borderRadius(20)
            .objectFit(ImageFit.Cover)
        }

        // 朗读动画指示（播放中时显示）
        if (this.ttsState === TTSState.PLAYING) {
          Circle()
            .width(44).height(44)
            .fill(Color.Transparent)
            .stroke('#4A7C59')
            .strokeWidth(2)
        }
      }
      .width(44).height(44)

      // 书名（简短显示）
      Text(this.bookTitle)
        .fontSize(13)
        .fontColor('#333333')
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .layoutWeight(1)
        .margin({ left: 10, right: 8 })

      // 倍速按钮
      Button() {
        Text(`${this.currentSpeed}x`)
          .fontSize(12)
          .fontColor('#4A7C59')
          .fontWeight(FontWeight.Medium)
      }
      .width(44).height(30)
      .backgroundColor('#E8F5E9')
      .borderRadius(15)
      .onClick(() => {
        this.cycleSpeed()
      })

      // 播放/暂停按钮
      Button() {
        if (this.ttsState === TTSState.PLAYING) {
          Image($r('app.media.pause_round_triangle_fill'))
            .width(20).height(20)
            .fillColor(Color.White)
        } else {
          Image($r('app.media.play_circle_fill'))
            .width(20).height(20)
            .fillColor(Color.White)
        }
      }
      .width(36).height(36)
      .backgroundColor('#4A7C59')
      .borderRadius(18)
      .margin({ left: 8 })
      .onClick(() => {
        if (this.ttsState === TTSState.PLAYING) {
          this.callbacks.onPause()
        } else {
          this.callbacks.onPlay()
        }
      })

      // 关闭按钮
      Button() {
        SymbolGlyph($r('sys.symbol.xmark'))
          .width(14).height(14)
          .fontColor(['#999999'])
      }
      .width(28).height(28)
      .backgroundColor('#0d000000')
      .borderRadius(14)
      .margin({ left: 6 })
      .onClick(() => {
        this.callbacks.onShutdown()
      })
    }
    .width('92%')
    .height(56)
    .padding({ left: 6, right: 10 })
    .backgroundColor('#F8F8F8')
    .borderRadius(28)
    .shadow({ radius: 16, color: '#33000000', offsetX: 0, offsetY: 4 })
    .alignItems(VerticalAlign.Center)
    .onClick(() => {
      // 点击胶囊 → 进入全屏模式
      this.callbacks.onClose() // 复用 onClose 通知父组件切换到全屏
    })
  }

  /**
   * 循环切换速度
   */
  private cycleSpeed(): void {
    const currentIdx = this.speedOptions.indexOf(this.currentSpeed)
    const nextIdx = (currentIdx + 1) % this.speedOptions.length
    this.currentSpeed = this.speedOptions[nextIdx]
    this.callbacks.onSpeedChange(this.currentSpeed)
  }
}
