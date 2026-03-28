/**
 * 滑动翻页动画
 * 页面像PPT一样左右滑动
 */

import { PageAnimation, PageDirection, AnimState } from './PageAnimation'
import { ReadConfig } from '../config/ReadConfig'

export class SlidePageAnim extends PageAnimation {
  private config: ReadConfig = ReadConfig.getInstance()
  
  /**
   * 绘制动画帧
   */
  drawFrame(context: CanvasRenderingContext2D): void {
    context.clearRect(0, 0, this.screenWidth, this.screenHeight)
    
    if (this.animState === AnimState.IDLE) {
      // 空闲状态，绘制当前页
      this.drawCurrentPage(context, 0)
      return
    }
    
    // 计算偏移量
    let offset = 0
    
    if (this.animState === AnimState.RUNNING) {
      // 动画运行中
      if (this.isCancel) {
        // 取消动画，回弹
        offset = this.getCancelOffset()
      } else {
        // 正常翻页动画
        offset = this.getAnimOffset()
      }
    } else if (this.isMoving) {
      // 手指拖动中
      offset = this.touchX - this.startX
    }
    
    // 绘制页面
    if (this.direction === PageDirection.NEXT) {
      // 翻到下一页
      this.drawCurrentPage(context, offset)
      if (this.nextPage && offset < 0) {
        this.drawNextPage(context, offset)
      }
    } else if (this.direction === PageDirection.PREV) {
      // 翻到上一页
      this.drawCurrentPage(context, offset)
      if (this.prevPage && offset > 0) {
        this.drawPrevPage(context, offset)
      }
    } else {
      this.drawCurrentPage(context, 0)
    }
  }
  
  /**
   * 获取动画偏移量
   */
  private getAnimOffset(): number {
    const totalOffset = this.direction === PageDirection.NEXT 
      ? -this.screenWidth 
      : this.screenWidth
    
    return totalOffset * this.animProgress
  }
  
  /**
   * 获取取消动画的偏移量
   */
  private getCancelOffset(): number {
    const startOffset = this.touchX - this.startX
    return startOffset * (1 - this.animProgress)
  }
  
  /**
   * 绘制当前页
   */
  private drawCurrentPage(context: CanvasRenderingContext2D, offset: number): void {
    context.save()
    context.translate(offset, 0)
    
    // 绘制背景
    context.fillStyle = this.config.getBgColor()
    context.fillRect(0, 0, this.screenWidth, this.screenHeight)
    
    // 绘制文本内容
    if (this.curPage) {
      this.drawPageContent(context, this.curPage)
    }
    
    context.restore()
  }
  
  /**
   * 绘制下一页
   */
  private drawNextPage(context: CanvasRenderingContext2D, offset: number): void {
    context.save()
    context.translate(this.screenWidth + offset, 0)
    
    // 绘制背景
    context.fillStyle = this.config.getBgColor()
    context.fillRect(0, 0, this.screenWidth, this.screenHeight)
    
    // 绘制文本内容
    if (this.nextPage) {
      this.drawPageContent(context, this.nextPage)
    }
    
    context.restore()
  }
  
  /**
   * 绘制上一页
   */
  private drawPrevPage(context: CanvasRenderingContext2D, offset: number): void {
    context.save()
    context.translate(-this.screenWidth + offset, 0)
    
    // 绘制背景
    context.fillStyle = this.config.getBgColor()
    context.fillRect(0, 0, this.screenWidth, this.screenHeight)
    
    // 绘制文本内容
    if (this.prevPage) {
      this.drawPageContent(context, this.prevPage)
    }
    
    context.restore()
  }
  
  /**
   * 绘制页面内容
   */
  private drawPageContent(context: CanvasRenderingContext2D, page: any): void {
    context.font = `${this.config.getTextSize()}px ${this.config.getFontFamily()}`
    context.fillStyle = this.config.getTextColor()
    context.textBaseline = 'top'
    
    // 绘制文本行
    if (page.txtLines) {
      for (let line of page.txtLines) {
        for (let char of line.txtChars) {
          context.fillText(char.charData, char.topLeftX, char.topLeftY)
        }
      }
    }
  }
}
