/**
 * 无动画翻页
 * 直接切换页面，无过渡效果
 */

import { PageAnimation, PageDirection, AnimState } from './PageAnimation'
import { ReadConfig } from '../config/ReadConfig'

export class NonePageAnim extends PageAnimation {
  private config: ReadConfig = ReadConfig.getInstance()
  
  /**
   * 触摸结束（重写，直接触发翻页）
   */
  onTouchEnd(x: number, y: number): void {
    this.touchX = x
    this.touchY = y
    
    if (this.isMoving && this.shouldChangePage()) {
      // 直接触发翻页，不需要动画
      if (this.onPageChange) {
        this.onPageChange(this.direction)
      }
    }
    
    this.reset()
  }
  
  /**
   * 绘制动画帧
   */
  drawFrame(context: CanvasRenderingContext2D): void {
    context.clearRect(0, 0, this.screenWidth, this.screenHeight)
    
    // 绘制背景
    context.fillStyle = this.config.getBgColor()
    context.fillRect(0, 0, this.screenWidth, this.screenHeight)
    
    // 只绘制当前页
    if (this.curPage) {
      this.drawPageContent(context, this.curPage)
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
   * 更新动画（重写，无动画直接返回false）
   */
  updateAnimation(): boolean {
    return false
  }
}
