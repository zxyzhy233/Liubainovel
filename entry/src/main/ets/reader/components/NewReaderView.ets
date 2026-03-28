/**
 * 全新阅读器渲染组件
 * 使用 Canvas 绘制文本，支持翻页手势和翻页动画
 *
 * 支持三种翻页动画模式：
 * - none: 无动画，即时切换
 * - slide: 滑动切换（页面左右滑入滑出）
 * - curl: 简化版折角翻页（右侧折角+阴影）
 */

import { RenderPage, RenderLine, RenderChar } from '../core/PageEngine'
import hilog from '@ohos.hilog'
import { pasteboard } from '@kit.BasicServicesKit'

const TAG: string = 'NewReaderView'

interface CharPosition {
  lineIdx: number
  charIdx: number
}

@Component
export struct NewReaderView {
  /** 当前页面数据 */
  @Prop @Watch('onPageChanged') currentPage: RenderPage | null = null
  /** 下一页数据（用于翻页动画） */
  @Prop nextPage: RenderPage | null = null
  /** 上一页数据（用于翻页动画） */
  @Prop prevPage: RenderPage | null = null
  /** 翻页动画模式 */
  @Prop animMode: string = 'slide'

  @Prop @Watch('onStyleChanged') bgColor: string = '#FFFFFF'
  @Prop @Watch('onStyleChanged') textColor: string = '#333333'
  @Prop @Watch('onStyleChanged') fontSize: number = 20
  @Prop fontFamily: string = 'HarmonyOS Sans'
  @Prop showHeader: boolean = true
  @Prop showFooter: boolean = true
  @Prop @Watch('onStyleChanged') headerText: string = ''
  @Prop @Watch('onStyleChanged') footerLeftText: string = ''
  @Prop @Watch('onStyleChanged') footerRightText: string = ''
  @Prop bgImageSrc: Resource | null = null

  onCenterTap: () => void = () => {}
  onNextPage: () => void = () => {}
  onPrevPage: () => void = () => {}

  private canvasContext: CanvasRenderingContext2D =
    new CanvasRenderingContext2D(new RenderingContextSettings(true))
  @State private canvasWidth: number = 0
  @State private canvasHeight: number = 0
  private isCanvasReady: boolean = false

  // 触摸和动画状态
  private touchStartX: number = 0
  private touchStartY: number = 0
  private dragOffsetX: number = 0
  private isDragging: boolean = false
  private isAnimating: boolean = false
  private animDirection: number = 0  // -1=上一页, 1=下一页
  private animProgress: number = 0   // 0~1 动画进度
  private animTimerId: number = -1

  // 文字选择状态
  @State isSelectMode: boolean = false
  @State showCopyButton: boolean = false
  @State copyButtonX: number = 0
  @State copyButtonY: number = 0
  private selectStartLine: number = -1
  private selectStartChar: number = -1
  private selectEndLine: number = -1
  private selectEndChar: number = -1
  private longPressTriggered: boolean = false

  onPageChanged(): void {
    if (!this.isAnimating) {
      this.requestDraw()
    }
  }

  onStyleChanged(): void {
    this.requestDraw()
  }

  private requestDraw(): void {
    if (this.isCanvasReady && this.canvasWidth > 0 && this.canvasHeight > 0) {
      this.drawFrame()
    }
  }

  build() {
    Stack() {
      if (this.bgImageSrc) {
        Image(this.bgImageSrc)
          .width('100%')
          .height('100%')
          .objectFit(ImageFit.Cover)
      }

      Canvas(this.canvasContext)
        .width('100%')
        .height('100%')
        .backgroundColor(this.bgImageSrc ? Color.Transparent : this.bgColor)
        .onReady(() => {
          hilog.info(0x0000, TAG, 'Canvas onReady')
          this.isCanvasReady = true
          this.requestDraw()
        })
        .onAreaChange((_oldValue: Area, newValue: Area) => {
          const newWidth = newValue.width as number
          const newHeight = newValue.height as number
          if (newWidth > 0 && newHeight > 0 &&
            (newWidth !== this.canvasWidth || newHeight !== this.canvasHeight)) {
            this.canvasWidth = newWidth
            this.canvasHeight = newHeight
            hilog.info(0x0000, TAG, `Canvas 尺寸: ${newWidth}x${newHeight}`)
            this.requestDraw()
          }
        })
        .gesture(
          GestureGroup(GestureMode.Exclusive,
            LongPressGesture({ repeat: false, duration: 500 })
              .onAction((event: GestureEvent) => {
                if (this.isAnimating) return
                this.handleLongPress(event)
              }),
            TapGesture()
              .onAction((event: GestureEvent) => {
                if (this.isAnimating) return
                if (this.isSelectMode) {
                  this.exitSelectMode()
                  return
                }
                this.handleTap(event)
              }),
            PanGesture({ direction: PanDirection.All })
              .onActionStart((event: GestureEvent) => {
                if (this.isAnimating) return
                if (this.isSelectMode) {
                  // 选择模式下拖动扩展选区
                  return
                }
                this.touchStartX = event.fingerList[0].localX
                this.touchStartY = event.fingerList[0].localY
                this.dragOffsetX = 0
                this.isDragging = true
              })
              .onActionUpdate((event: GestureEvent) => {
                if (this.isSelectMode) {
                  const x = event.fingerList[0].localX
                  const y = event.fingerList[0].localY
                  this.updateSelection(x, y)
                  return
                }
                if (!this.isDragging || this.isAnimating) return
                const currentX = event.fingerList[0].localX
                this.dragOffsetX = currentX - this.touchStartX
                this.drawDragFrame()
              })
              .onActionEnd((event: GestureEvent) => {
                if (this.isSelectMode) return
                if (!this.isDragging) return
                this.isDragging = false
                this.handleDragEnd()
              })
          )
        )

      // 复制按钮
      if (this.showCopyButton) {
        Button('复制')
          .fontSize(14)
          .fontColor('#FFFFFF')
          .backgroundColor('#3D8A5A')
          .borderRadius(20)
          .height(36)
          .padding({ left: 20, right: 20 })
          .shadow({ radius: 8, color: '#00000030', offsetX: 0, offsetY: 2 })
          .position({ x: this.copyButtonX, y: this.copyButtonY })
          .onClick(() => {
            this.copySelectedText()
          })
      }
    }
    .width('100%')
    .height('100%')
  }

  // ========== 绘制方法 ==========

  /**
   * 绘制当前帧（无动画状态）
   */
  private drawFrame(): void {
    const ctx = this.canvasContext
    if (!ctx) return

    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
    this.drawPageContent(ctx, this.currentPage, 0)
  }

  /**
   * 绘制拖动中的帧
   */
  private drawDragFrame(): void {
    if (this.animMode === 'none') return

    const ctx = this.canvasContext
    if (!ctx) return

    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)

    if (this.animMode === 'curl') {
      this.drawCurlFrame(ctx, this.dragOffsetX)
    } else {
      this.drawSlideFrame(ctx, this.dragOffsetX)
    }
  }

  /**
   * 滑动模式：绘制帧
   */
  private drawSlideFrame(ctx: CanvasRenderingContext2D, offsetX: number): void {
    if (offsetX < 0) {
      // 向左滑 → 翻到下一页
      this.drawPageContent(ctx, this.currentPage, offsetX)
      if (this.nextPage) {
        this.drawPageContent(ctx, this.nextPage, this.canvasWidth + offsetX)
      }
      // 阴影
      this.drawSlideShadow(ctx, offsetX + this.canvasWidth)
    } else if (offsetX > 0) {
      // 向右滑 → 翻到上一页
      this.drawPageContent(ctx, this.currentPage, offsetX)
      if (this.prevPage) {
        this.drawPageContent(ctx, this.prevPage, -this.canvasWidth + offsetX)
      }
      // 阴影
      this.drawSlideShadow(ctx, offsetX)
    } else {
      this.drawPageContent(ctx, this.currentPage, 0)
    }
  }

  /**
   * 折角模式：绘制帧
   */
  private drawCurlFrame(ctx: CanvasRenderingContext2D, offsetX: number): void {
    if (offsetX >= 0) {
      // 向右滑（上一页）：简单滑动
      this.drawSlideFrame(ctx, offsetX)
      return
    }

    // 向左滑（下一页）：折角效果
    const foldWidth = Math.abs(offsetX)
    const foldX = this.canvasWidth - foldWidth

    // 先绘制下一页（在折角露出的区域）
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(foldX, 0)
    ctx.lineTo(this.canvasWidth, 0)
    ctx.lineTo(this.canvasWidth, this.canvasHeight)
    ctx.lineTo(foldX, this.canvasHeight)
    ctx.closePath()
    ctx.clip()
    if (this.nextPage) {
      this.drawPageContent(ctx, this.nextPage, 0)
    } else {
      ctx.fillStyle = '#F0F0F0'
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)
    }
    ctx.restore()

    // 绘制当前页（被裁剪掉折角部分）
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(foldX, 0)
    ctx.lineTo(foldX, this.canvasHeight)
    ctx.lineTo(0, this.canvasHeight)
    ctx.closePath()
    ctx.clip()
    this.drawPageContent(ctx, this.currentPage, 0)
    ctx.restore()

    // 绘制折角阴影
    const shadowWidth = Math.min(foldWidth * 0.3, 20)
    const gradient = ctx.createLinearGradient(foldX - shadowWidth, 0, foldX + shadowWidth, 0)
    gradient.addColorStop(0, 'rgba(0,0,0,0)')
    gradient.addColorStop(0.5, 'rgba(0,0,0,0.15)')
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(foldX - shadowWidth, 0, shadowWidth * 2, this.canvasHeight)

  }

  /**
   * 绘制滑动阴影
   */
  private drawSlideShadow(ctx: CanvasRenderingContext2D, edgeX: number): void {
    const shadowWidth = 15
    const gradient = ctx.createLinearGradient(edgeX - shadowWidth, 0, edgeX + 2, 0)
    gradient.addColorStop(0, 'rgba(0,0,0,0)')
    gradient.addColorStop(1, 'rgba(0,0,0,0.12)')
    ctx.fillStyle = gradient
    ctx.fillRect(edgeX - shadowWidth, 0, shadowWidth + 2, this.canvasHeight)
  }

  /**
   * 拖动结束后的处理
   */
  private handleDragEnd(): void {
    const threshold = this.canvasWidth * 0.25

    if (this.animMode === 'none') {
      // 无动画模式：直接判断方向
      if (this.dragOffsetX < -50) {
        this.onNextPage()
      } else if (this.dragOffsetX > 50) {
        this.onPrevPage()
      }
      this.dragOffsetX = 0
      return
    }

    if (Math.abs(this.dragOffsetX) > threshold) {
      // 超过阈值：完成翻页动画
      if (this.dragOffsetX < 0 && this.nextPage) {
        this.animateComplete(1)  // 下一页
      } else if (this.dragOffsetX > 0 && this.prevPage) {
        this.animateComplete(-1) // 上一页
      } else {
        this.animateCancel()
      }
    } else {
      // 未超过阈值：回弹
      this.animateCancel()
    }
  }

  /**
   * 绘制一帧动画（抽取公共逻辑，减少重复绘制开销）
   */
  private drawAnimFrame(offsetX: number, direction?: number): void {
    const ctx = this.canvasContext
    if (!ctx) return
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
    if (this.animMode === 'curl' && (direction === undefined || direction > 0)) {
      this.drawCurlFrame(ctx, offsetX)
    } else {
      this.drawSlideFrame(ctx, offsetX)
    }
  }

  /**
   * 完成翻页动画
   * 使用更短的 setTimeout 间隔 + 基于时间戳的进度计算，减少掉帧
   */
  private animateComplete(direction: number): void {
    this.isAnimating = true
    this.animDirection = direction
    const startOffset = this.dragOffsetX
    const targetOffset = direction > 0 ? -this.canvasWidth : this.canvasWidth
    // 根据剩余距离动态计算时长，避免短距离动画过慢
    const remainRatio = Math.abs(targetOffset - startOffset) / this.canvasWidth
    const duration = Math.max(120, 250 * remainRatio)
    const startTime = Date.now()
    let lastFrameTime = startTime

    const animate = () => {
      const now = Date.now()
      // 跳过间隔过短的帧（< 4ms），避免无意义重绘
      if (now - lastFrameTime < 4) {
        this.animTimerId = setTimeout(animate, 4)
        return
      }
      lastFrameTime = now

      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // 缓动函数：easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3)

      this.dragOffsetX = startOffset + (targetOffset - startOffset) * eased
      this.drawAnimFrame(this.dragOffsetX, direction)

      if (progress < 1) {
        this.animTimerId = setTimeout(animate, 8)
      } else {
        // 动画完成
        this.isAnimating = false
        this.dragOffsetX = 0
        if (direction > 0) {
          this.onNextPage()
        } else {
          this.onPrevPage()
        }
      }
    }

    animate()
  }

  /**
   * 取消翻页（回弹动画）
   */
  private animateCancel(): void {
    this.isAnimating = true
    const startOffset = this.dragOffsetX
    const duration = Math.max(80, 200 * Math.abs(startOffset) / this.canvasWidth)
    const startTime = Date.now()
    let lastFrameTime = startTime

    const animate = () => {
      const now = Date.now()
      if (now - lastFrameTime < 4) {
        this.animTimerId = setTimeout(animate, 4)
        return
      }
      lastFrameTime = now

      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // 缓动函数：easeOutQuad
      const eased = 1 - Math.pow(1 - progress, 2)

      this.dragOffsetX = startOffset * (1 - eased)
      this.drawAnimFrame(this.dragOffsetX)

      if (progress < 1) {
        this.animTimerId = setTimeout(animate, 8)
      } else {
        this.isAnimating = false
        this.dragOffsetX = 0
        this.drawFrame()
      }
    }

    animate()
  }

  // ========== 页面内容绘制 ==========

  /**
   * 在指定偏移位置绘制一页内容
   */
  private drawPageContent(ctx: CanvasRenderingContext2D, page: RenderPage | null, offsetX: number): void {
    // 绘制背景
    if (!this.bgImageSrc) {
      ctx.fillStyle = this.bgColor
      ctx.fillRect(offsetX, 0, this.canvasWidth, this.canvasHeight)
    }

    if (!page || !page.lines || page.lines.length === 0) {
      if (offsetX === 0) {
        ctx.font = `16px ${this.fontFamily}`
        ctx.fillStyle = '#999999'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('暂无内容', this.canvasWidth / 2, this.canvasHeight / 2)
      }
      return
    }

    // 绘制正文
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    const isFirstPage = page.pageIndex === 0
    for (let lineIdx = 0; lineIdx < page.lines.length; lineIdx++) {
      const line = page.lines[lineIdx]

      if (isFirstPage && lineIdx === 0 && page.chapterTitle) {
        ctx.font = `bold ${this.fontSize + 4}px ${this.fontFamily}`
        ctx.fillStyle = this.textColor
      } else {
        ctx.font = `${this.fontSize}px ${this.fontFamily}`
        ctx.fillStyle = this.textColor
      }
      if (!line.chars) continue

      for (let charIdx = 0; charIdx < line.chars.length; charIdx++) {
        const ch = line.chars[charIdx]
        if (ch.char && ch.char.trim().length > 0) {
          ctx.fillText(ch.char, ch.x + offsetX, ch.y)
        }
      }
    }

    // 绘制页眉
    if (this.showHeader && offsetX === 0) {
      const headerStr = this.headerText || page.chapterTitle || ''
      if (headerStr) {
        ctx.save()
        ctx.font = `12px ${this.fontFamily}`
        ctx.fillStyle = this.textColor + '66'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(headerStr, this.canvasWidth / 2 + offsetX, 12)
        ctx.restore()
      }
    }

    // 绘制页脚
    if (this.showFooter && offsetX === 0) {
      ctx.save()
      ctx.font = `12px ${this.fontFamily}`
      ctx.fillStyle = this.textColor + '66'
      ctx.textBaseline = 'bottom'
      const footerY = this.canvasHeight - 12

      if (this.footerLeftText) {
        ctx.textAlign = 'left'
        ctx.fillText(this.footerLeftText, 16 + offsetX, footerY)
      }
      if (this.footerRightText) {
        ctx.textAlign = 'right'
        ctx.fillText(this.footerRightText, this.canvasWidth - 16 + offsetX, footerY)
      }
      ctx.restore()
    }
  }

  // ========== 手势处理 ==========

  private handleTap(event: GestureEvent): void {
    const x = event.fingerList[0].localX
    const leftZone = this.canvasWidth * 0.3
    const rightZone = this.canvasWidth * 0.7

    if (x < leftZone) {
      if (this.animMode !== 'none' && this.prevPage) {
        this.triggerPageTurn(-1)
      } else {
        this.onPrevPage()
      }
    } else if (x > rightZone) {
      if (this.animMode !== 'none' && this.nextPage) {
        this.triggerPageTurn(1)
      } else {
        this.onNextPage()
      }
    } else {
      this.onCenterTap()
    }
  }

  /**
   * 点击触发翻页动画
   */
  private triggerPageTurn(direction: number): void {
    this.dragOffsetX = 0
    this.animateComplete(direction)
  }

  // ========== 文字选择功能 ==========

  /**
   * 长按触发文字选择
   */
  handleLongPress(event: GestureEvent): void {
    const x = event.fingerList[0].localX
    const y = event.fingerList[0].localY
    const pos = this.findCharAt(x, y)
    if (pos.lineIdx >= 0 && pos.charIdx >= 0) {
      this.isSelectMode = true
      this.selectStartLine = pos.lineIdx
      this.selectStartChar = pos.charIdx
      this.selectEndLine = pos.lineIdx
      this.selectEndChar = pos.charIdx
      this.drawFrameWithSelection()
      this.updateCopyButtonPosition()
      hilog.info(0x0000, TAG, `长按选中: line=${pos.lineIdx}, char=${pos.charIdx}`)
    }
  }

  /**
   * 拖动更新选区
   */
  updateSelection(x: number, y: number): void {
    const pos = this.findCharAt(x, y)
    if (pos.lineIdx >= 0 && pos.charIdx >= 0) {
      this.selectEndLine = pos.lineIdx
      this.selectEndChar = pos.charIdx
      this.drawFrameWithSelection()
      this.updateCopyButtonPosition()
    }
  }

  /**
   * 退出选择模式
   */
  exitSelectMode(): void {
    this.isSelectMode = false
    this.showCopyButton = false
    this.selectStartLine = -1
    this.selectStartChar = -1
    this.selectEndLine = -1
    this.selectEndChar = -1
    this.requestDraw()
  }

  /**
   * 根据坐标查找对应的字符位置
   */
  private findCharAt(x: number, y: number): CharPosition {
    if (!this.currentPage || !this.currentPage.lines) {
      return { lineIdx: -1, charIdx: -1 } as CharPosition
    }
    const lines = this.currentPage.lines
    // 找到最近的行
    let bestLine = -1
    let minLineDist = Infinity
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line.chars || line.chars.length === 0) continue
      const lineTop = line.y
      const lineBottom = line.y + line.height
      if (y >= lineTop && y <= lineBottom) {
        bestLine = i
        break
      }
      const dist = Math.min(Math.abs(y - lineTop), Math.abs(y - lineBottom))
      if (dist < minLineDist) {
        minLineDist = dist
        bestLine = i
      }
    }
    if (bestLine < 0) return { lineIdx: -1, charIdx: -1 } as CharPosition

    // 在行内找到最近的字符
    const chars = lines[bestLine].chars
    if (!chars || chars.length === 0) return { lineIdx: -1, charIdx: -1 } as CharPosition
    let bestChar = 0
    let minCharDist = Infinity
    for (let j = 0; j < chars.length; j++) {
      const ch = chars[j]
      const charCenterX = ch.x + ch.width / 2
      const dist = Math.abs(x - charCenterX)
      if (dist < minCharDist) {
        minCharDist = dist
        bestChar = j
      }
    }
    return { lineIdx: bestLine, charIdx: bestChar } as CharPosition
  }

  /**
   * 获取选中的文本
   */
  private getSelectedText(): string {
    if (!this.currentPage || this.selectStartLine < 0) return ''
    const lines = this.currentPage.lines
    // 规范化选区方向
    let sLine = this.selectStartLine
    let sChar = this.selectStartChar
    let eLine = this.selectEndLine
    let eChar = this.selectEndChar
    if (sLine > eLine || (sLine === eLine && sChar > eChar)) {
      const tmp1 = sLine; sLine = eLine; eLine = tmp1
      const tmp2 = sChar; sChar = eChar; eChar = tmp2
    }

    let text = ''
    for (let i = sLine; i <= eLine && i < lines.length; i++) {
      const chars = lines[i].chars
      if (!chars) continue
      const startJ = (i === sLine) ? sChar : 0
      const endJ = (i === eLine) ? eChar : chars.length - 1
      for (let j = startJ; j <= endJ && j < chars.length; j++) {
        text += chars[j].char
      }
      if (i < eLine) text += '\n'
    }
    return text
  }

  /**
   * 复制选中文本到剪贴板
   */
  copySelectedText(): void {
    const text = this.getSelectedText()
    if (!text) return
    try {
      const pasteData = pasteboard.createData(pasteboard.MIMETYPE_TEXT_PLAIN, text)
      const sysBoard = pasteboard.getSystemPasteboard()
      sysBoard.setData(pasteData)
      hilog.info(0x0000, TAG, `已复制文本: ${text.substring(0, 30)}...`)
    } catch (e) {
      hilog.error(0x0000, TAG, `复制失败: ${e}`)
    }
    this.exitSelectMode()
  }

  /**
   * 更新复制按钮位置
   */
  private updateCopyButtonPosition(): void {
    if (!this.currentPage || this.selectStartLine < 0) return
    const lines = this.currentPage.lines
    // 规范化
    let sLine = Math.min(this.selectStartLine, this.selectEndLine)
    let eLine = Math.max(this.selectStartLine, this.selectEndLine)
    if (sLine >= lines.length) return
    const topLine = lines[sLine]
    // 按钮放在选区上方居中
    let minX = this.canvasWidth
    let maxX = 0
    const sChar = (this.selectStartLine <= this.selectEndLine) ? this.selectStartChar : this.selectEndChar
    const eChar = (this.selectStartLine <= this.selectEndLine) ? this.selectEndChar : this.selectStartChar
    if (sLine === eLine && topLine.chars) {
      const s = Math.min(sChar, eChar)
      const e = Math.max(sChar, eChar)
      if (s < topLine.chars.length) minX = topLine.chars[s].x
      if (e < topLine.chars.length) maxX = topLine.chars[e].x + topLine.chars[e].width
    } else {
      minX = 50
      maxX = this.canvasWidth - 50
    }
    this.copyButtonX = Math.max(10, Math.min((minX + maxX) / 2 - 30, this.canvasWidth - 80))
    this.copyButtonY = Math.max(10, topLine.y - 45)
    this.showCopyButton = true
  }

  /**
   * 绘制带选中高亮的页面
   */
  private drawFrameWithSelection(): void {
    const ctx = this.canvasContext
    if (!ctx || !this.currentPage) return

    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
    this.drawPageContent(ctx, this.currentPage, 0)

    // 绘制选中高亮
    const lines = this.currentPage.lines
    let sLine = this.selectStartLine
    let sChar = this.selectStartChar
    let eLine = this.selectEndLine
    let eChar = this.selectEndChar
    if (sLine > eLine || (sLine === eLine && sChar > eChar)) {
      const tmp1 = sLine; sLine = eLine; eLine = tmp1
      const tmp2 = sChar; sChar = eChar; eChar = tmp2
    }

    ctx.save()
    ctx.fillStyle = 'rgba(61, 138, 90, 0.25)' // 绿色半透明高亮
    for (let i = sLine; i <= eLine && i < lines.length; i++) {
      const chars = lines[i].chars
      if (!chars || chars.length === 0) continue
      const startJ = (i === sLine) ? sChar : 0
      const endJ = (i === eLine) ? eChar : chars.length - 1
      if (startJ >= chars.length) continue
      const firstCh = chars[startJ]
      const lastCh = chars[Math.min(endJ, chars.length - 1)]
      const rectX = firstCh.x
      const rectY = firstCh.y
      const rectW = lastCh.x + lastCh.width - firstCh.x
      const rectH = lines[i].height
      ctx.fillRect(rectX, rectY, rectW, rectH)
    }
    ctx.restore()
  }
}
