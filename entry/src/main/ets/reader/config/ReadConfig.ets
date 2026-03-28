/**
 * 阅读配置管理类
 */

/**
 * 翻页模式枚举
 */
export enum PageMode {
  SIMULATION = 0,  // 仿真翻页
  COVER = 1,       // 覆盖翻页
  SLIDE = 2,       // 滑动翻页
  SCROLL = 3,      // 滚动翻页
  NONE = 4         // 无动画
}

/**
 * 阅读配置类
 */
export class ReadConfig {
  // 单例实例
  private static instance: ReadConfig | null = null
  
  // 文本设置
  private textSize: number = 20                    // 字体大小
  private textColor: string = '#333333'            // 字体颜色
  private lineSpacing: number = 1.5                // 行间距
  private paragraphSpacing: number = 10            // 段落间距
  private fontFamily: string = 'sans-serif'        // 字体
  
  // 页面边距
  private paddingLeft: number = 20                 // 左边距
  private paddingRight: number = 20                // 右边距
  private paddingTop: number = 40                  // 上边距
  private paddingBottom: number = 40               // 下边距
  
  // 背景设置
  private bgColor: string = '#FFFFFF'              // 背景颜色
  private bgImagePath: string = ''                 // 背景图片路径
  
  // 翻页设置
  private pageMode: PageMode = PageMode.SIMULATION // 翻页模式
  
  // 其他设置
  private showStatusBar: boolean = true            // 显示状态栏
  private showTime: boolean = true                 // 显示时间
  private showBattery: boolean = true              // 显示电量
  private showProgress: boolean = true             // 显示进度
  private brightnessMode: number = 0               // 亮度模式 0:跟随系统 1:自定义
  private brightness: number = 0.5                 // 自定义亮度
  
  /**
   * 获取单例实例
   */
  static getInstance(): ReadConfig {
    if (!ReadConfig.instance) {
      ReadConfig.instance = new ReadConfig()
    }
    return ReadConfig.instance
  }
  
  private constructor() {}
  
  // Getter和Setter方法
  
  getTextSize(): number {
    return this.textSize
  }
  
  setTextSize(size: number): void {
    this.textSize = Math.max(12, Math.min(40, size))
  }
  
  getTextColor(): string {
    return this.textColor
  }
  
  setTextColor(color: string): void {
    this.textColor = color
  }
  
  getLineSpacing(): number {
    return this.lineSpacing
  }
  
  setLineSpacing(spacing: number): void {
    this.lineSpacing = Math.max(1.0, Math.min(3.0, spacing))
  }
  
  getParagraphSpacing(): number {
    return this.paragraphSpacing
  }
  
  setParagraphSpacing(spacing: number): void {
    this.paragraphSpacing = Math.max(0, Math.min(50, spacing))
  }
  
  getFontFamily(): string {
    return this.fontFamily
  }
  
  setFontFamily(family: string): void {
    this.fontFamily = family
  }
  
  getPaddingLeft(): number {
    return this.paddingLeft
  }
  
  setPaddingLeft(padding: number): void {
    this.paddingLeft = Math.max(0, Math.min(100, padding))
  }
  
  getPaddingRight(): number {
    return this.paddingRight
  }
  
  setPaddingRight(padding: number): void {
    this.paddingRight = Math.max(0, Math.min(100, padding))
  }
  
  getPaddingTop(): number {
    return this.paddingTop
  }
  
  setPaddingTop(padding: number): void {
    this.paddingTop = Math.max(0, Math.min(100, padding))
  }
  
  getPaddingBottom(): number {
    return this.paddingBottom
  }
  
  setPaddingBottom(padding: number): void {
    this.paddingBottom = Math.max(0, Math.min(100, padding))
  }
  
  getBgColor(): string {
    return this.bgColor
  }
  
  setBgColor(color: string): void {
    this.bgColor = color
  }
  
  getBgImagePath(): string {
    return this.bgImagePath
  }
  
  setBgImagePath(path: string): void {
    this.bgImagePath = path
  }
  
  getPageMode(): PageMode {
    return this.pageMode
  }
  
  setPageMode(mode: PageMode): void {
    this.pageMode = mode
  }
  
  getShowStatusBar(): boolean {
    return this.showStatusBar
  }
  
  setShowStatusBar(show: boolean): void {
    this.showStatusBar = show
  }
  
  getShowTime(): boolean {
    return this.showTime
  }
  
  setShowTime(show: boolean): void {
    this.showTime = show
  }
  
  getShowBattery(): boolean {
    return this.showBattery
  }
  
  setShowBattery(show: boolean): void {
    this.showBattery = show
  }
  
  getShowProgress(): boolean {
    return this.showProgress
  }
  
  setShowProgress(show: boolean): void {
    this.showProgress = show
  }
  
  getBrightnessMode(): number {
    return this.brightnessMode
  }
  
  setBrightnessMode(mode: number): void {
    this.brightnessMode = mode
  }
  
  getBrightness(): number {
    return this.brightness
  }
  
  setBrightness(brightness: number): void {
    this.brightness = Math.max(0, Math.min(1, brightness))
  }
  
  /**
   * 获取预设主题
   */
  static getPresetThemes(): Array<ThemeConfig> {
    return [
      {
        name: '默认',
        textColor: '#333333',
        bgColor: '#FFFFFF'
      },
      {
        name: '护眼',
        textColor: '#3E3E3E',
        bgColor: '#C4EDCC'
      },
      {
        name: '夜间',
        textColor: '#7A7A7A',
        bgColor: '#000000'
      },
      {
        name: '羊皮纸',
        textColor: '#5B4A3C',
        bgColor: '#F5DEB3'
      }
    ]
  }
  
  /**
   * 应用主题
   */
  applyTheme(theme: ThemeConfig): void {
    this.textColor = theme.textColor
    this.bgColor = theme.bgColor
  }
}

/**
 * 主题配置接口
 */
export interface ThemeConfig {
  name: string
  textColor: string
  bgColor: string
}
