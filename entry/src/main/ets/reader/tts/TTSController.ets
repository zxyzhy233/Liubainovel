/**
 * TTS 朗读控制器
 * 基于 textToSpeech 引擎实现朗读功能
 * 替代 TextReader 系统面板，实现完全可控的朗读
 */

import { textToSpeech } from '@kit.CoreSpeechKit'
import { BusinessError } from '@kit.BasicServicesKit'
import hilog from '@ohos.hilog'

const TAG: string = 'TTSController'

/**
 * 朗读状态
 */
export enum TTSState {
  IDLE = 0,
  PLAYING = 1,
  PAUSED = 2,
  COMPLETED = 3
}

/**
 * 朗读事件回调
 */
export interface TTSCallbacks {
  onStateChange: (state: TTSState) => void
  onParagraphStart: (index: number) => void
  onParagraphEnd: (index: number) => void
  onError: (message: string) => void
}

export class TTSController {
  private engine: textToSpeech.TextToSpeechEngine | null = null
  private isEngineCreated: boolean = false
  private state: TTSState = TTSState.IDLE
  private callbacks: TTSCallbacks | null = null

  // 朗读内容
  private paragraphs: string[] = []
  private currentParagraphIndex: number = 0
  private isAutoNext: boolean = true  // 自动朗读下一段

  // 朗读参数
  private speed: number = 1
  private volume: number = 2
  private pitch: number = 1

  /**
   * 初始化 TTS 引擎
   */
  async init(): Promise<void> {
    if (this.isEngineCreated && this.engine) {
      return
    }

    return new Promise<void>((resolve, reject) => {
      const extraParam: Record<string, Object> = {
        'style': 'interaction-broadcast',
        'locate': 'CN',
        'name': 'EngineName'
      }
      const initParams: textToSpeech.CreateEngineParams = {
        language: 'zh-CN',
        person: 0,
        online: 1,
        extraParams: extraParam
      }

      try {
        textToSpeech.createEngine(initParams,
          (err: BusinessError, engine: textToSpeech.TextToSpeechEngine) => {
            if (!err) {
              this.engine = engine
              this.isEngineCreated = true
              hilog.info(0x0000, TAG, 'TTS 引擎创建成功')
              resolve()
            } else {
              hilog.error(0x0000, TAG, `TTS 引擎创建失败: ${err.code} - ${err.message}`)
              reject(new Error(`TTS 引擎创建失败: ${err.message}`))
            }
          })
      } catch (error) {
        const e = error as BusinessError
        hilog.error(0x0000, TAG, `TTS 创建异常: ${e.code} - ${e.message}`)
        reject(error)
      }
    })
  }

  /**
   * 设置回调
   */
  setCallbacks(callbacks: TTSCallbacks): void {
    this.callbacks = callbacks
  }

  /**
   * 开始朗读
   * @param paragraphs 段落列表
   * @param startIndex 起始段落索引
   */
  async start(paragraphs: string[], startIndex: number = 0): Promise<void> {
    if (!this.isEngineCreated || !this.engine) {
      await this.init()
      if (!this.engine) {
        this.callbacks?.onError('TTS 引擎未就绪')
        return
      }
    }

    this.paragraphs = paragraphs
    this.currentParagraphIndex = startIndex
    this.isAutoNext = true

    this.speakCurrentParagraph()
  }

  // 暂停标志：防止 pause 时 onComplete 触发自动播放
  private isPausing: boolean = false

  /**
   * 暂停朗读
   */
  pause(): void {
    // textToSpeech 引擎没有原生 pause，通过 stop 模拟
    if (this.engine && this.state === TTSState.PLAYING) {
      try {
        this.isPausing = true
        this.engine.stop()
        this.state = TTSState.PAUSED
        this.callbacks?.onStateChange(TTSState.PAUSED)
      } catch (e) {
        hilog.error(0x0000, TAG, `暂停失败: ${JSON.stringify(e)}`)
        this.isPausing = false
      }
    }
  }

  /**
   * 恢复朗读
   */
  resume(): void {
    if (this.state === TTSState.PAUSED) {
      this.isPausing = false
      this.speakCurrentParagraph()
    }
  }

  /**
   * 停止朗读
   */
  stop(): void {
    this.isPausing = true
    if (this.engine) {
      try {
        this.engine.stop()
      } catch (e) {
        // 忽略
      }
    }
    this.isAutoNext = false
    this.isPausing = false
    this.state = TTSState.IDLE
    this.callbacks?.onStateChange(TTSState.IDLE)
  }

  /**
   * 上一段
   */
  prevParagraph(): void {
    if (this.currentParagraphIndex > 0) {
      this.isPausing = true
      if (this.state === TTSState.PLAYING) {
        try { this.engine?.stop() } catch (e) { /* ignore */ }
      }
      this.currentParagraphIndex--
      this.isPausing = false
      this.speakCurrentParagraph()
    }
  }

  /**
   * 下一段
   */
  nextParagraph(): void {
    if (this.currentParagraphIndex < this.paragraphs.length - 1) {
      this.isPausing = true
      if (this.state === TTSState.PLAYING) {
        try { this.engine?.stop() } catch (e) { /* ignore */ }
      }
      this.currentParagraphIndex++
      this.isPausing = false
      this.speakCurrentParagraph()
    }
  }

  /**
   * 设置朗读速度
   */
  setSpeed(speed: number): void {
    this.speed = speed
    // 如果正在朗读，重新开始当前段落
    if (this.state === TTSState.PLAYING) {
      try { this.engine?.stop() } catch (e) { /* ignore */ }
      setTimeout(() => {
        this.speakCurrentParagraph()
      }, 300)
    }
  }

  /**
   * 获取当前状态
   */
  getState(): TTSState {
    return this.state
  }

  /**
   * 获取当前段落索引
   */
  getCurrentParagraphIndex(): number {
    return this.currentParagraphIndex
  }

  /**
   * 释放资源
   */
  release(): void {
    this.stop()
    if (this.engine) {
      try {
        this.engine.shutdown()
      } catch (e) {
        // 忽略
      }
      this.engine = null
      this.isEngineCreated = false
    }
  }

  // ========== 内部方法 ==========

  /**
   * 朗读当前段落
   */
  private speakCurrentParagraph(): void {
    if (!this.engine || this.currentParagraphIndex >= this.paragraphs.length) {
      this.state = TTSState.COMPLETED
      this.callbacks?.onStateChange(TTSState.COMPLETED)
      return
    }

    const text = this.paragraphs[this.currentParagraphIndex]
    if (!text || text.trim().length === 0) {
      // 空段落，跳到下一段
      if (this.isAutoNext && this.currentParagraphIndex < this.paragraphs.length - 1) {
        this.currentParagraphIndex++
        this.speakCurrentParagraph()
      }
      return
    }

    const listener: textToSpeech.SpeakListener = {
      onStart: (_requestId: string, _response: textToSpeech.StartResponse) => {
        this.state = TTSState.PLAYING
        this.callbacks?.onStateChange(TTSState.PLAYING)
        this.callbacks?.onParagraphStart(this.currentParagraphIndex)
      },
      onComplete: (_requestId: string, _response: textToSpeech.CompleteResponse) => {
        // 如果是暂停/停止/切换段落触发的 stop，不自动播放下一段
        // 注意：TTS 引擎 stop 后会触发两次 onComplete（synthesis complete + speak complete）
        if (this.isPausing) {
          return
        }

        this.callbacks?.onParagraphEnd(this.currentParagraphIndex)

        // 自动朗读下一段
        if (this.isAutoNext && this.currentParagraphIndex < this.paragraphs.length - 1) {
          this.currentParagraphIndex++
          setTimeout(() => {
            this.speakCurrentParagraph()
          }, 200)
        } else {
          this.state = TTSState.COMPLETED
          this.callbacks?.onStateChange(TTSState.COMPLETED)
        }
      },
      onStop: (_requestId: string, _response: textToSpeech.StopResponse) => {
        // stop 由 pause/stop/切换段落触发，不自动继续
      },
      onData: (_requestId: string, _audio: ArrayBuffer, _response: textToSpeech.SynthesisResponse) => {
        // PCM 数据回调，当前不需要处理
      },
      onError: (_requestId: string, errorCode: number, errorMessage: string) => {
        hilog.error(0x0000, TAG, `TTS 错误: ${errorCode} - ${errorMessage}`)
        this.state = TTSState.IDLE
        this.callbacks?.onError(errorMessage)

        if (errorCode === 1002300007) {
          this.isEngineCreated = false
        }
      }
    }

    this.engine.setListener(listener)

    const extraParam: Record<string, Object> = {
      'queueMode': 0,
      'speed': this.speed,
      'volume': this.volume,
      'pitch': this.pitch,
      'languageContext': 'zh-CN',
      'audioType': 'pcm',
      'soundChannel': 3,
      'playType': 1
    }
    const speakParams: textToSpeech.SpeakParams = {
      requestId: `tts_${Date.now()}`,
      extraParams: extraParam
    }

    this.engine.speak(text, speakParams)
  }
}
