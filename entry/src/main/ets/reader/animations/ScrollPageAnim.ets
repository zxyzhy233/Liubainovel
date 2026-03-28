/**
 * 滚动翻页动画
 * 页面垂直滚动
 */

import { PageAnimation, PageDirection, AnimState } from './PageAnimation'
import { ReadConfig } from '../config/ReadConfig'

export class ScrollPageAnim extends PageAnimation {
  private config: ReadConfig = ReadConfig.getInstance()
  private scrollY: number = 0
  
  /**
   * 触摸移动（重写为垂直滚动）
   */
  onTouchMove(x: number, y: number): void {
    this.lastY = this.touchY
    this.touchY = y
    
    if (!this.isMoving) {
      const dy = Math.abs(y - this.startY)
      if (dy > 10) {
        this.isMoving = true
        this.direction = y > this.startY ? PageDirection.PREV : PageDirection.NEXT
      }
    }
  }
  
  /**
   * 绘制动画帧
   */
  drawFrame(context: CanvasRenderingContext2D): void {
    context.clearRect(0, 0, this.screenWidth, this.screenHeight)
    
    // 绘制背景
    context.fillStyle = this.config.getBgColor()
    context.fillRect(0, 0, this.screenWidth, this.screenHeight)
    
    // 计算滚动偏移
    let offset = 0
    if (this.isMoving) {
      offset = this.touchY - this.startY
    } else if (this.animState === AnimState.RUNNING) {
      if (this.isCancel) {
        offset = (this.touchY - this.startY) * (1 - this.animProgress)
      } else {
        const targetOffset = this.direction === PageDirection.NEXT ? -this.screenHeight : this.screenHeight
        offset = (this.touchY - this.startY) + (targetOffset - (this.touchY - this.startY)) * this.animProgress
      }
    }
    
    // 绘制内容
    context.save()
    context.translate(0, offset)
    
    if (this.curPage) {
      this.drawPageContent(context, this.curPage)
    }
    
    context.restore()
    
    // 绘制相邻页
    if (this.direction === PageDirection.NEXT && this.nextPage && offset < 0) {
      context.save()
      context.translate(0, this.screenHeight + offset)
      this.drawPageContent(context, this.nextPage)
      context.restore()
    } else if (this.direction === PageDirection.PREV && this.prevPage && offset > 0) {
      context.save()
      context.translate(0, -this.screenHeight + offset)
      this.drawPageContent(context, this.prevPage)
      context.restore()
    }
  }
  
  /**
   * 绘制页面内容
   */
  private drawPageContent(context: CanvasRenderingContext2D, page: any): void {
    context.font = `${this.config.getTextSize()}px ${this.config.getFontFamily()}`
    context.fillStyle = this.config.getTextColor()
    context.textBaseline = 'top'
    
    if (page.txtLines) {
      for (let line of page.txtLines) {
        for (let char of line.txtChars) {
          context.fillText(char.charData, char.topLeftX, char.topLeftY)
        }
      }
    }
  }
  
  /**
   * 判断是否应该翻页（重写为垂直判断）
   */
  protected shouldChangePage(): boolean {
    const dy = this.touchY - this.startY
    const threshold = this.screenHeight * 0.3
    
    if (this.direction === PageDirection.NEXT) {
      return Math.abs(dy) > threshold && dy < 0
    } else if (this.direction === PageDirection.PREV) {
      return Math.abs(dy) > threshold && dy > 0
    }
    
    return false
  }
}
