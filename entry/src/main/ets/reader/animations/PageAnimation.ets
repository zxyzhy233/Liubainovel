/**
 * 翻页动画基类
 * 参考Android PageAnimation实现
 */

import { TxtPage } from '../models/BookModels'

/**
 * 翻页方向枚举
 */
export enum PageDirection {
  NONE = 0,    // 无方向
  NEXT = 1,    // 下一页
  PREV = 2     // 上一页
}

/**
 * 动画状态
 */
export enum AnimState {
  IDLE = 0,      // 空闲
  READY = 1,     // 准备中
  RUNNING = 2,   // 运行中
  FINISH = 3     // 完成
}

/**
 * 翻页动画抽象类
 */
export abstract class PageAnimation {
  protected screenWidth: number = 0
  protected screenHeight: number = 0
  protected startX: number = 0
  protected startY: number = 0
  protected touchX: number = 0
  protected touchY: number = 0
  protected lastX: number = 0
  protected lastY: number = 0
  
  protected direction: PageDirection = PageDirection.NONE
  protected animState: AnimState = AnimState.IDLE
  protected isMoving: boolean = false
  protected isCancel: boolean = false
  
  // 动画参数
  protected readonly ANIM_DURATION: number = 300  // 动画时长(ms)
  protected animProgress: number = 0              // 动画进度 0-1
  protected animStartTime: number = 0
  
  // 页面内容
  protected curPage: TxtPage | null = null
  protected nextPage: TxtPage | null = null
  protected prevPage: TxtPage | null = null
  
  // 回调
  protected onPageChange?: (direction: PageDirection) => void
  
  /**
   * 构造函数
   */
  constructor(width: number, height: number) {
    this.screenWidth = width
    this.screenHeight = height
  }
  
  /**
   * 设置页面尺寸
   */
  setScreenSize(width: number, height: number): void {
    this.screenWidth = width
    this.screenHeight = height
  }
  
  /**
   * 设置页面内容
   */
  setPages(cur: TxtPage | null, next: TxtPage | null, prev: TxtPage | null): void {
    this.curPage = cur
    this.nextPage = next
    this.prevPage = prev
  }
  
  /**
   * 设置翻页回调
   */
  setOnPageChangeListener(callback: (direction: PageDirection) => void): void {
    this.onPageChange = callback
  }
  
  /**
   * 触摸开始
   */
  onTouchStart(x: number, y: number): void {
    this.startX = x
    this.startY = y
    this.touchX = x
    this.touchY = y
    this.lastX = x
    this.lastY = y
    this.isMoving = false
    this.isCancel = false
    this.animState = AnimState.READY
  }
  
  /**
   * 触摸移动
   */
  onTouchMove(x: number, y: number): void {
    this.lastX = this.touchX
    this.lastY = this.touchY
    this.touchX = x
    this.touchY = y
    
    if (!this.isMoving) {
      const dx = Math.abs(x - this.startX)
      const dy = Math.abs(y - this.startY)
      
      // 判断是否开始移动
      if (dx > 10 || dy > 10) {
        this.isMoving = true
        
        // 判断方向
        if (Math.abs(dx) > Math.abs(dy)) {
          // 水平滑动
          if (x > this.startX) {
            this.direction = PageDirection.PREV
          } else {
            this.direction = PageDirection.NEXT
          }
        }
      }
    }
  }
  
  /**
   * 触摸结束
   */
  onTouchEnd(x: number, y: number): void {
    this.touchX = x
    this.touchY = y
    
    if (this.isMoving) {
      // 判断是否需要翻页
      if (this.shouldChangePage()) {
        this.startAnimation()
      } else {
        this.cancelAnimation()
      }
    } else {
      this.animState = AnimState.IDLE
    }
  }
  
  /**
   * 判断是否应该翻页
   */
  protected shouldChangePage(): boolean {
    const dx = this.touchX - this.startX
    const threshold = this.screenWidth * 0.3  // 30%的屏幕宽度
    
    if (this.direction === PageDirection.NEXT) {
      return Math.abs(dx) > threshold && dx < 0
    } else if (this.direction === PageDirection.PREV) {
      return Math.abs(dx) > threshold && dx > 0
    }
    
    return false
  }
  
  /**
   * 开始动画
   */
  protected startAnimation(): void {
    this.animState = AnimState.RUNNING
    this.animStartTime = Date.now()
    this.animProgress = 0
    this.isCancel = false
  }
  
  /**
   * 取消动画
   */
  protected cancelAnimation(): void {
    this.animState = AnimState.RUNNING
    this.animStartTime = Date.now()
    this.animProgress = 0
    this.isCancel = true
  }
  
  /**
   * 更新动画
   */
  updateAnimation(): boolean {
    if (this.animState !== AnimState.RUNNING) {
      return false
    }
    
    const elapsed = Date.now() - this.animStartTime
    this.animProgress = Math.min(elapsed / this.ANIM_DURATION, 1.0)
    
    if (this.animProgress >= 1.0) {
      this.animState = AnimState.FINISH
      
      // 动画完成，触发翻页回调
      if (!this.isCancel && this.onPageChange) {
        this.onPageChange(this.direction)
      }
      
      // 重置状态
      this.direction = PageDirection.NONE
      this.isMoving = false
      return false
    }
    
    return true
  }
  
  /**
   * 是否正在运行
   */
  isRunning(): boolean {
    return this.animState === AnimState.RUNNING || this.isMoving
  }
  
  /**
   * 获取动画状态
   */
  getAnimState(): AnimState {
    return this.animState
  }
  
  /**
   * 绘制动画帧（子类实现）
   */
  abstract drawFrame(context: CanvasRenderingContext2D): void
  
  /**
   * 重置
   */
  reset(): void {
    this.animState = AnimState.IDLE
    this.direction = PageDirection.NONE
    this.isMoving = false
    this.isCancel = false
    this.animProgress = 0
  }
}
