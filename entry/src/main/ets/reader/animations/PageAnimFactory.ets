/**
 * 翻页动画工厂
 * 根据翻页模式创建相应的动画实例
 */

import { PageAnimation } from './PageAnimation'
import { SimulationPageAnim } from './SimulationPageAnim'
import { SlidePageAnim } from './SlidePageAnim'
import { CoverPageAnim } from './CoverPageAnim'
import { ScrollPageAnim } from './ScrollPageAnim'
import { NonePageAnim } from './NonePageAnim'
import { PageMode } from '../config/ReadConfig'

/**
 * 翻页动画工厂类
 */
export class PageAnimFactory {
  /**
   * 创建翻页动画实例
   */
  static createPageAnim(pageMode: PageMode, width: number, height: number): PageAnimation {
    switch (pageMode) {
      case PageMode.SIMULATION:
        // 仿真翻页 - 真实书本翻页效果
        return new SimulationPageAnim(width, height)
      
      case PageMode.COVER:
        // 覆盖翻页
        return new CoverPageAnim(width, height)
      
      case PageMode.SLIDE:
        return new SlidePageAnim(width, height)
      
      case PageMode.SCROLL:
        return new ScrollPageAnim(width, height)
      
      case PageMode.NONE:
        return new NonePageAnim(width, height)
      
      default:
        return new SlidePageAnim(width, height)
    }
  }
  
  /**
   * 获取所有翻页模式名称
   */
  static getAllPageModeNames(): string[] {
    return ['仿真', '覆盖', '滑动', '滚动', '无动画']
  }
  
  /**
   * 获取翻页模式名称
   */
  static getPageModeName(pageMode: PageMode): string {
    const names = this.getAllPageModeNames()
    return names[pageMode] || '滑动'
  }
}
