/**
 * 阅读视图组件 - 核心阅读器UI组件
 */

import { TxtPage } from '../models/BookModels'
import { PageLoader, PageStatus } from '../core/PageLoader'
import { ReadConfig, PageMode } from '../config/ReadConfig'

/**
 * 阅读视图组件
 */
@Component
export struct ReaderView {
  @State private pageLoader: PageLoader | null = null
  @State private currentPage: TxtPage | null = null
  @State private config: ReadConfig = ReadConfig.getInstance()
  @State private canvasWidth: number = 0
  @State private canvasHeight: number = 0
  
  // 触摸相关
  @State private touchStartX: number = 0
  @State private touchStartY: number = 0
  @State private touchMoveX: number = 0
  @State private touchMoveY: number = 0
  @State private isTouching: boolean = false
  
  // 翻页相关
  @State private isAnimating: boolean = false
  @State private animationProgress: number = 0
  
  // 回调函数
  private onPageChange?: (pageIndex: number) => void
  private onTap?: () => void
  
  /**
   * 设置页面加载器
   */
  setPageLoader(loader: PageLoader): void {
    this.pageLoader = loader
    this.updateCurrentPage()
  }
  
  /**
   * 设置回调
   */
  setCallbacks(callbacks: {
    onPageChange?: (pageIndex: number) => void,
    onTap?: () => void
  }): void {
    this.onPageChange = callbacks.onPageChange
    this.onTap = callbacks.onTap
  }
  
  /**
   * 更新当前页
   */
  private updateCurrentPage(): void {
    if (this.pageLoader) {
      this.currentPage = this.pageLoader.getCurrentPage()
      if (this.onPageChange) {
        this.onPageChange(this.pageLoader.getCurrentPageIndex())
      }
    }
  }
  
  /**
   * 翻到下一页
   */
  nextPage(): void {
    if (this.pageLoader && this.pageLoader.skipToNextPage()) {
      this.performPageAnimation(true)
    }
  }
  
  /**
   * 翻到上一页
   */
  prevPage(): void {
    if (this.pageLoader && this.pageLoader.skipToPrevPage()) {
      this.performPageAnimation(false)
    }
  }
  
  /**
   * 执行翻页动画
   */
  private performPageAnimation(isNext: boolean): void {
    const pageMode = this.config.getPageMode()
    
    if (pageMode === PageMode.NONE) {
      // 无动画，直接更新
      this.updateCurrentPage()
      return
    }
    
    // 设置动画状态
    this.isAnimating = true
    this.animationProgress = 0
    
    // 执行动画
    const duration = 300 // 动画时长（毫秒）
    const startTime = Date.now()
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      this.animationProgress = Math.min(elapsed / duration, 1)
      
      if (this.animationProgress < 1) {
        requestAnimationFrame(animate)
      } else {
        this.isAnimating = false
        this.updateCurrentPage()
      }
    }
    
    requestAnimationFrame(animate)
  }
  
  /**
   * 刷新视图
   */
  refresh(): void {
    if (this.pageLoader) {
      this.pageLoader.refresh()
      this.updateCurrentPage()
    }
  }
  
  build() {
    Stack() {
      // 背景
      if (this.config.getBgImagePath()) {
        Image(this.config.getBgImagePath())
          .width('100%')
          .height('100%')
          .objectFit(ImageFit.Cover)
      } else {
        Rect()
          .width('100%')
          .height('100%')
          .fill(this.config.getBgColor())
      }
      
      // 内容画布
      Canvas(this.canvasContext)
        .width('100%')
        .height('100%')
        .onReady(() => {
          this.drawPage()
        })
        .onAreaChange((oldValue: Area, newValue: Area) => {
          this.canvasWidth = newValue.width as number
          this.canvasHeight = newValue.height as number
          if (this.pageLoader) {
            this.pageLoader.updatePageSize(this.canvasWidth, this.canvasHeight)
            this.updateCurrentPage()
          }
        })
        .gesture(
          GestureGroup(GestureMode.Exclusive,
            // 点击手势
            TapGesture()
              .onAction((event: GestureEvent) => {
                this.handleTap(event)
              }),
            // 滑动手势
            PanGesture()
              .onActionStart((event: GestureEvent) => {
                this.handleTouchStart(event)
              })
              .onActionUpdate((event: GestureEvent) => {
                this.handleTouchMove(event)
              })
              .onActionEnd((event: GestureEvent) => {
                this.handleTouchEnd(event)
              })
          )
        )
      
      // 加载提示
      if (this.pageLoader?.getPageStatus() === PageStatus.LOADING) {
        LoadingProgress()
          .color(this.config.getTextColor())
          .width(50)
          .height(50)
      }
      
      // 错误提示
      if (this.pageLoader?.getPageStatus() === PageStatus.ERROR) {
        Text('加载失败')
          .fontSize(16)
          .fontColor(this.config.getTextColor())
      }
      
      // 空内容提示
      if (this.pageLoader?.getPageStatus() === PageStatus.EMPTY) {
        Text('暂无内容')
          .fontSize(16)
          .fontColor(this.config.getTextColor())
      }
    }
    .width('100%')
    .height('100%')
  }
  
  /**
   * Canvas上下文
   */
  private canvasContext: CanvasRenderingContext2D = new CanvasRenderingContext2D(new RenderingContextSettings(true))
  
  /**
   * 绘制页面
   */
  private drawPage(): void {
    if (!this.currentPage || !this.canvasContext) {
      return
    }
    
    // 清空画布
    this.canvasContext.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
    
    // 设置字体
    this.canvasContext.font = `${this.config.getTextSize()}px ${this.config.getFontFamily()}`
    this.canvasContext.fillStyle = this.config.getTextColor()
    this.canvasContext.textBaseline = 'top'
    
    // 绘制文本内容
    for (let line of this.currentPage.txtLines) {
      for (let char of line.txtChars) {
        this.canvasContext.fillText(
          char.charData,
          char.topLeftX,
          char.topLeftY
        )
      }
    }
    
    // 绘制页眉（章节标题）
    if (this.config.getShowStatusBar() && this.currentPage.title) {
      this.drawHeader()
    }
    
    // 绘制页脚（进度、时间、电量等）
    if (this.config.getShowStatusBar()) {
      this.drawFooter()
    }
  }
  
  /**
   * 绘制页眉
   */
  private drawHeader(): void {
    if (!this.canvasContext || !this.currentPage) {
      return
    }
    
    const headerY = 15
    const headerSize = 12
    
    this.canvasContext.font = `${headerSize}px ${this.config.getFontFamily()}`
    this.canvasContext.fillStyle = this.config.getTextColor() + '80' // 半透明
    this.canvasContext.textAlign = 'center'
    
    this.canvasContext.fillText(
      this.currentPage.title,
      this.canvasWidth / 2,
      headerY
    )
  }
  
  /**
   * 绘制页脚
   */
  private drawFooter(): void {
    if (!this.canvasContext || !this.pageLoader) {
      return
    }
    
    const footerY = this.canvasHeight - 20
    const footerSize = 12
    
    this.canvasContext.font = `${footerSize}px ${this.config.getFontFamily()}`
    this.canvasContext.fillStyle = this.config.getTextColor() + '80' // 半透明
    
    // 左侧：时间
    if (this.config.getShowTime()) {
      this.canvasContext.textAlign = 'left'
      const time = new Date().toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
      this.canvasContext.fillText(time, this.config.getPaddingLeft(), footerY)
    }
    
    // 中间：进度
    if (this.config.getShowProgress()) {
      this.canvasContext.textAlign = 'center'
      const progress = `${this.pageLoader.getCurrentPageIndex() + 1}/${this.pageLoader.getPageCount()}`
      this.canvasContext.fillText(progress, this.canvasWidth / 2, footerY)
    }
    
    // 右侧：电量（这里简化处理，实际需要获取系统电量）
    if (this.config.getShowBattery()) {
      this.canvasContext.textAlign = 'right'
      this.canvasContext.fillText('100%', this.canvasWidth - this.config.getPaddingRight(), footerY)
    }
  }
  
  /**
   * 处理点击
   */
  private handleTap(event: GestureEvent): void {
    const x = event.fingerList[0].localX
    const y = event.fingerList[0].localY
    
    // 判断点击区域
    const leftArea = this.canvasWidth * 0.3
    const rightArea = this.canvasWidth * 0.7
    
    if (x < leftArea) {
      // 左侧区域 - 上一页
      this.prevPage()
    } else if (x > rightArea) {
      // 右侧区域 - 下一页
      this.nextPage()
    } else {
      // 中间区域 - 显示菜单
      if (this.onTap) {
        this.onTap()
      }
    }
  }
  
  /**
   * 处理触摸开始
   */
  private handleTouchStart(event: GestureEvent): void {
    this.touchStartX = event.fingerList[0].localX
    this.touchStartY = event.fingerList[0].localY
    this.isTouching = true
  }
  
  /**
   * 处理触摸移动
   */
  private handleTouchMove(event: GestureEvent): void {
    if (!this.isTouching) {
      return
    }
    
    this.touchMoveX = event.fingerList[0].localX
    this.touchMoveY = event.fingerList[0].localY
    
    // 这里可以实现拖动效果
  }
  
  /**
   * 处理触摸结束
   */
  private handleTouchEnd(event: GestureEvent): void {
    if (!this.isTouching) {
      return
    }
    
    this.isTouching = false
    
    const deltaX = this.touchMoveX - this.touchStartX
    const threshold = 50 // 滑动阈值
    
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        // 向右滑动 - 上一页
        this.prevPage()
      } else {
        // 向左滑动 - 下一页
        this.nextPage()
      }
    }
  }
}
