/**
 * 覆盖翻页动画
 * 下一页从右侧覆盖当前页
 */

import { PageAnimation, PageDirection, AnimState } from './PageAnimation'
import { ReadConfig } from '../config/ReadConfig'

export class CoverPageAnim extends PageAnimation {
  private config: ReadConfig = ReadConfig.getInstance()
  
  /**
   * 绘制动画帧
   */
  drawFrame(context: CanvasRenderingContext2D): void {
    context.clearRect(0, 0, this.screenWidth, this.screenHeight)
    
    // 先绘制当前页（固定不动）
    this.drawCurrentPage(context)
    
    if (this.animState === AnimState.IDLE || (!this.isMoving && this.animState !== AnimState.RUNNING)) {
      return
    }
    
    // 计算覆盖页的偏移
    let offset = 0
    
    if (this.animState === AnimState.RUNNING) {
      if (this.isCancel) {
        offset = this.getCancelOffset()
      } else {
        offset = this.getAnimOffset()
      }
    } else if (this.isMoving) {
      offset = this.touchX - this.startX
    }
    
    // 绘制覆盖页
    if (this.direction === PageDirection.NEXT && this.nextPage) {
      this.drawCoverPage(context, this.nextPage, offset, false)
    } else if (this.direction === PageDirection.PREV && this.prevPage) {
      this.drawCoverPage(context, this.prevPage, offset, true)
    }
  }
  
  /**
   * 获取动画偏移量
   */
  private getAnimOffset(): number {
    if (this.direction === PageDirection.NEXT) {
      return (this.touchX - this.startX) + (0 - (this.touchX - this.startX)) * this.animProgress
    } else {
      return (this.touchX - this.startX) + (0 - (this.touchX - this.startX)) * this.animProgress
    }
  }
  
  /**
   * 获取取消动画偏移量
   */
  private getCancelOffset(): number {
    const startOffset = this.touchX - this.startX
    if (this.direction === PageDirection.NEXT) {
      return startOffset + (this.screenWidth - startOffset) * this.animProgress
    } else {
      return startOffset + (-this.screenWidth - startOffset) * this.animProgress
    }
  }
  
  /**
   * 绘制当前页
   */
  private drawCurrentPage(context: CanvasRenderingContext2D): void {
    context.fillStyle = this.config.getBgColor()
    context.fillRect(0, 0, this.screenWidth, this.screenHeight)
    
    if (this.curPage) {
      this.drawPageContent(context, this.curPage)
    }
  }
  
  /**
   * 绘制覆盖页
   */
  private drawCoverPage(context: CanvasRenderingContext2D, page: any, offset: number, isPrev: boolean): void {
    context.save()
    
    let x = isPrev ? offset - this.screenWidth : this.screenWidth + offset
    
    // 限制范围
    if (isPrev) {
      x = Math.max(-this.screenWidth, Math.min(0, x))
    } else {
      x = Math.max(0, Math.min(this.screenWidth, x))
    }
    
    context.translate(x, 0)
    
    // 绘制阴影效果
    const shadowWidth = 10
    const gradient = context.createLinearGradient(0, 0, shadowWidth, 0)
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, shadowWidth, this.screenHeight)
    
    // 绘制页面背景
    context.fillStyle = this.config.getBgColor()
    context.fillRect(0, 0, this.screenWidth, this.screenHeight)
    
    // 绘制页面内容
    this.drawPageContent(context, page)
    
    context.restore()
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
}
