/**
 * 仿真翻页动画
 * 模拟真实书本翻页效果，包含曲面和阴影
 * 使用矩阵变换实现背面镜像
 */

import { PageAnimation, PageDirection, AnimState } from './PageAnimation'
import { ReadConfig } from '../config/ReadConfig'
import matrix4 from '@ohos.matrix4'

/**
 * 点坐标类
 */
class Point {
  x: number = 0
  y: number = 0
  
  constructor(x: number = 0, y: number = 0) {
    this.x = x
    this.y = y
  }
}

export class SimulationPageAnim extends PageAnimation {
  private config: ReadConfig = ReadConfig.getInstance()
  
  // 翻页的四个角
  private cornerX: number = 0
  private cornerY: number = 0
  
  // 贝塞尔曲线控制点
  private bezierStart1: Point = new Point()
  private bezierControl1: Point = new Point()
  private bezierEnd1: Point = new Point()
  private bezierVertex1: Point = new Point()
  
  private bezierStart2: Point = new Point()
  private bezierControl2: Point = new Point()
  private bezierEnd2: Point = new Point()
  private bezierVertex2: Point = new Point()
  
  private middleX: number = 0
  private middleY: number = 0
  
  // 是否是右上到左下
  private isRT_LB: boolean = false
  
  /**
   * 触摸开始
   */
  onTouchStart(x: number, y: number): void {
    super.onTouchStart(x, y)
    this.calcCornerXY(x, y)
  }
  
  /**
   * 触摸移动
   */
  onTouchMove(x: number, y: number): void {
    super.onTouchMove(x, y)
    
    // 优化触摸点，使翻页更自然
    if (this.startY > this.screenHeight / 3 && this.startY < this.screenHeight * 2 / 3) {
      this.touchY = this.screenHeight
    }
    
    if (this.startY > this.screenHeight / 3 && this.startY < this.screenHeight / 2 
        && this.direction === PageDirection.NEXT) {
      this.touchY = 1
    }
  }
  
  /**
   * 绘制动画帧
   */
  drawFrame(context: CanvasRenderingContext2D): void {
    context.clearRect(0, 0, this.screenWidth, this.screenHeight)
    
    if (this.animState === AnimState.IDLE) {
      this.drawCurrentPage(context, 0, 0)
      return
    }
    
    // 计算当前触摸点
    let touchX = this.touchX
    let touchY = this.touchY
    
    if (this.animState === AnimState.RUNNING) {
      // 动画运行中，根据进度计算位置
      const startTouchX = this.lastX
      const startTouchY = this.lastY
      
      let targetX, targetY
      if (this.isCancel) {
        // 取消动画，回到起始位置
        targetX = this.startX
        targetY = this.startY
      } else {
        // 正常翻页动画
        if (this.direction === PageDirection.NEXT) {
          targetX = -this.screenWidth
          targetY = this.touchY
        } else {
          targetX = this.screenWidth * 2
          targetY = this.touchY
        }
      }
      
      touchX = startTouchX + (targetX - startTouchX) * this.animProgress
      touchY = startTouchY + (targetY - startTouchY) * this.animProgress
    }
    
    // 计算贝塞尔曲线点
    this.calcPoints(touchX, touchY)
    
    // 绘制当前页（被遮挡的部分）
    this.drawCurrentPageClipped(context)
    
    // 绘制下一页
    this.drawNextPageArea(context)
    
    // 绘制翻起页的背面
    this.drawCurledPageBack(context)
    
    // 绘制翻起页的正面
    this.drawCurledPageFront(context)
    
    // 绘制阴影
    this.drawShadows(context)
  }
  
  /**
   * 计算翻页角
   */
  private calcCornerXY(x: number, y: number): void {
    this.cornerX = x <= this.screenWidth / 2 ? 0 : this.screenWidth
    this.cornerY = y <= this.screenHeight / 2 ? 0 : this.screenHeight
    
    this.isRT_LB = (this.cornerX === 0 && this.cornerY === this.screenHeight) ||
                    (this.cornerX === this.screenWidth && this.cornerY === 0)
  }
  
  /**
   * 计算贝塞尔曲线控制点
   */
  private calcPoints(touchX: number, touchY: number): void {
    this.middleX = (touchX + this.cornerX) / 2
    this.middleY = (touchY + this.cornerY) / 2
    
    // 计算第一条贝塞尔曲线的控制点
    const dx = this.cornerX - this.middleX
    const dy = this.cornerY - this.middleY
    
    if (dx !== 0) {
      this.bezierControl1.x = this.middleX - (dy * dy) / dx
    } else {
      this.bezierControl1.x = this.middleX
    }
    this.bezierControl1.y = this.cornerY
    
    // 计算第二条贝塞尔曲线的控制点
    this.bezierControl2.x = this.cornerX
    if (dy !== 0) {
      this.bezierControl2.y = this.middleY - (dx * dx) / dy
    } else {
      this.bezierControl2.y = this.middleY - (dx * dx) / 0.1
    }
    
    // 计算贝塞尔曲线起始点
    this.bezierStart1.x = this.bezierControl1.x - (this.cornerX - this.bezierControl1.x) / 2
    this.bezierStart1.y = this.cornerY
    
    this.bezierStart2.x = this.cornerX
    this.bezierStart2.y = this.bezierControl2.y - (this.cornerY - this.bezierControl2.y) / 2
    
    // 计算贝塞尔曲线顶点（简化计算）
    this.bezierVertex1.x = (this.bezierStart1.x + 2 * this.bezierControl1.x + touchX) / 4
    this.bezierVertex1.y = (this.bezierStart1.y + 2 * this.bezierControl1.y + touchY) / 4
    
    this.bezierVertex2.x = (this.bezierStart2.x + 2 * this.bezierControl2.x + touchX) / 4
    this.bezierVertex2.y = (this.bezierStart2.y + 2 * this.bezierControl2.y + touchY) / 4
  }
  
  /**
   * 绘制当前页（裁剪后）
   */
  private drawCurrentPageClipped(context: CanvasRenderingContext2D): void {
    context.save()
    
    // 创建裁剪路径
    context.beginPath()
    context.moveTo(this.bezierStart1.x, this.bezierStart1.y)
    context.quadraticCurveTo(
      this.bezierControl1.x, this.bezierControl1.y,
      this.touchX, this.touchY
    )
    context.lineTo(this.touchX, this.touchY)
    context.quadraticCurveTo(
      this.bezierControl2.x, this.bezierControl2.y,
      this.bezierStart2.x, this.bezierStart2.y
    )
    context.lineTo(this.cornerX, this.cornerY)
    context.closePath()
    
    // 反向裁剪
    context.rect(0, 0, this.screenWidth, this.screenHeight)
    context.clip('evenodd')
    
    // 绘制当前页
    this.drawCurrentPage(context, 0, 0)
    
    context.restore()
  }
  
  /**
   * 绘制下一页区域
   */
  private drawNextPageArea(context: CanvasRenderingContext2D): void {
    context.save()
    
    // 创建裁剪路径
    context.beginPath()
    context.moveTo(this.bezierStart1.x, this.bezierStart1.y)
    context.lineTo(this.bezierVertex1.x, this.bezierVertex1.y)
    context.lineTo(this.bezierVertex2.x, this.bezierVertex2.y)
    context.lineTo(this.bezierStart2.x, this.bezierStart2.y)
    context.lineTo(this.cornerX, this.cornerY)
    context.closePath()
    context.clip()
    
    // 绘制下一页
    if (this.direction === PageDirection.NEXT && this.nextPage) {
      this.drawPageContent(context, this.nextPage)
    } else if (this.direction === PageDirection.PREV && this.prevPage) {
      this.drawPageContent(context, this.prevPage)
    }
    
    context.restore()
  }
  
  /**
   * 绘制翻起页的背面
   * 使用矩阵变换实现镜像效果
   */
  private drawCurledPageBack(context: CanvasRenderingContext2D): void {
    context.save()
    
    // 创建裁剪路径 - 背面三角形区域
    context.beginPath()
    context.moveTo(this.bezierVertex2.x, this.bezierVertex2.y)
    context.lineTo(this.bezierVertex1.x, this.bezierVertex1.y)
    context.lineTo(this.touchX, this.touchY)
    context.lineTo(this.bezierVertex2.x, this.bezierVertex2.y)
    context.closePath()
    
    // 先裁剪到当前页区域
    const path0 = new Path2D()
    path0.moveTo(this.bezierStart1.x, this.bezierStart1.y)
    path0.quadraticCurveTo(
      this.bezierControl1.x, this.bezierControl1.y,
      this.touchX, this.touchY
    )
    path0.lineTo(this.touchX, this.touchY)
    path0.quadraticCurveTo(
      this.bezierControl2.x, this.bezierControl2.y,
      this.bezierStart2.x, this.bezierStart2.y
    )
    path0.lineTo(this.cornerX, this.cornerY)
    path0.closePath()
    
    context.clip(path0)
    context.clip()
    
    // 计算镜像变换矩阵
    const dis = Math.sqrt(
      Math.pow(this.cornerX - this.bezierControl1.x, 2) +
      Math.pow(this.bezierControl2.y - this.cornerY, 2)
    )
    
    const f8 = (this.cornerX - this.bezierControl1.x) / dis
    const f9 = (this.bezierControl2.y - this.cornerY) / dis
    
    // 创建反射矩阵
    // [1-2*f9*f9,  2*f8*f9,    0, 0]
    // [2*f8*f9,    1-2*f8*f8,  0, 0]
    // [0,          0,          1, 0]
    // [0,          0,          0, 1]
    const m = matrix4.identity()
      .copy(matrix4.identity())
    
    // 设置反射矩阵值
    const matrixArray = [
      1 - 2 * f9 * f9, 2 * f8 * f9, 0, 0,
      2 * f8 * f9, 1 - 2 * f8 * f8, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]
    
    // 应用变换：先平移到控制点，应用反射，再平移回来
    context.translate(this.bezierControl1.x, this.bezierControl1.y)
    context.transform(
      matrixArray[0], matrixArray[4], 
      matrixArray[1], matrixArray[5],
      0, 0
    )
    context.translate(-this.bezierControl1.x, -this.bezierControl1.y)
    
    // 绘制镜像的页面内容（带暗化效果）
    context.globalAlpha = 0.6  // 背面稍暗
    
    if (this.curPage) {
      this.drawPageContent(context, this.curPage)
    }
    
    context.restore()
  }
  
  /**
   * 绘制翻起页的正面
   */
  private drawCurledPageFront(context: CanvasRenderingContext2D): void {
    context.save()
    
    // 创建路径
    context.beginPath()
    context.moveTo(this.bezierStart1.x, this.bezierStart1.y)
    context.quadraticCurveTo(
      this.bezierControl1.x, this.bezierControl1.y,
      this.touchX, this.touchY
    )
    context.lineTo(this.touchX, this.touchY)
    context.quadraticCurveTo(
      this.bezierControl2.x, this.bezierControl2.y,
      this.bezierStart2.x, this.bezierStart2.y
    )
    context.lineTo(this.cornerX, this.cornerY)
    context.closePath()
    context.clip()
    
    // 绘制当前页内容
    if (this.curPage) {
      this.drawPageContent(context, this.curPage)
    }
    
    context.restore()
  }
  
  /**
   * 绘制阴影
   */
  private drawShadows(context: CanvasRenderingContext2D): void {
    // 绘制翻页阴影
    context.save()
    
    // 创建渐变阴影
    const shadowWidth = 60
    const gradient = context.createLinearGradient(
      this.bezierVertex1.x,
      this.bezierVertex1.y,
      this.bezierVertex1.x + (this.isRT_LB ? shadowWidth : -shadowWidth),
      this.bezierVertex1.y
    )
    
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)')
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    
    context.fillStyle = gradient
    context.beginPath()
    context.moveTo(this.bezierStart1.x, this.bezierStart1.y)
    context.quadraticCurveTo(
      this.bezierControl1.x, this.bezierControl1.y,
      this.touchX, this.touchY
    )
    context.lineTo(this.touchX + (this.isRT_LB ? shadowWidth : -shadowWidth), this.touchY)
    context.quadraticCurveTo(
      this.bezierControl1.x + (this.isRT_LB ? shadowWidth : -shadowWidth),
      this.bezierControl1.y,
      this.bezierStart1.x + (this.isRT_LB ? shadowWidth : -shadowWidth),
      this.bezierStart1.y
    )
    context.closePath()
    context.fill()
    
    context.restore()
  }
  
  /**
   * 绘制当前页
   */
  private drawCurrentPage(context: CanvasRenderingContext2D, offsetX: number, offsetY: number): void {
    context.save()
    context.translate(offsetX, offsetY)
    
    context.fillStyle = this.config.getBgColor()
    context.fillRect(0, 0, this.screenWidth, this.screenHeight)
    
    if (this.curPage) {
      this.drawPageContent(context, this.curPage)
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
    
    if (page.txtLines) {
      for (let line of page.txtLines) {
        for (let char of line.txtChars) {
          context.fillText(char.charData, char.topLeftX, char.topLeftY)
        }
      }
    }
  }
  
  /**
   * 调整颜色亮度
   */
  private adjustColor(color: string, factor: number): string {
    // 简化处理，返回带透明度的黑色
    const alpha = 1 - factor
    return `rgba(0, 0, 0, ${alpha})`
  }
}
