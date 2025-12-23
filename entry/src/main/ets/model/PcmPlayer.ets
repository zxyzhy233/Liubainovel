import { avSession } from '@kit.AVSessionKit';
import { audio } from '@kit.AudioKit';
import { fileIo as fs } from '@kit.CoreFileKit';
import hilog from '@ohos.hilog';
import { common } from '@kit.AbilityKit';

const TAG = 'PCM_audio';

class Options {
  offset?: number;
  length?: number;
}

/**
 * PCM音频播放器，使用AVSession Kit进行会话管理
 */
export default class PcmPlayer {
  public file: fs.File | undefined;
  
  // AVSession相关属性
  private avSessionInstance: avSession.AVSession | null = null;
  private avSessionController: avSession.AVSessionController | null = null;
  
  private writeDataCallback = (buffer: ArrayBuffer) => {
    let options: Options = {
      offset: this.bufferSize,
      length: buffer.byteLength
    };

    try {
      fs.readSync(this.file?.fd, buffer, options);
      this.bufferSize += buffer.byteLength;
      if (this.audioDataSize < this.bufferSize) {
        this.renderModel?.off('writeData');
        this.stop()
      }
      hilog.info(0x0000, TAG, 'reading file success');
      // 系统会判定buffer有效，正常播放。
      return audio.AudioDataCallbackResult.VALID;
    } catch (error) {
      hilog.error(0x0000, TAG, 'Error reading file: ' + JSON.stringify(error));
      // 系统会判定buffer无效，不播放。
      return audio.AudioDataCallbackResult.INVALID;
    }
  };

  /**
   * 缓存大小
   */
  private bufferSize: number = 0;
  /**
   * 音频总大小
   */
  private audioDataSize: number = 0;
  /**
   * 播放器
   */
  private renderModel: audio.AudioRenderer | null = null;
  /**
   * 播放状态
   */
  private audioStreamInfo: audio.AudioStreamInfo = {
    samplingRate: audio.AudioSamplingRate.SAMPLE_RATE_16000, // 采样率
    channels: audio.AudioChannel.CHANNEL_1, // 通道
    sampleFormat: audio.AudioSampleFormat.SAMPLE_FORMAT_S16LE, // 采样格式
    encodingType: audio.AudioEncodingType.ENCODING_TYPE_RAW // 编码格式
  }
  private audioRendererInfo: audio.AudioRendererInfo = {
    usage: audio.StreamUsage.STREAM_USAGE_ACCESSIBILITY, // 音频流使用类型
    rendererFlags: 0 // 音频渲染器标志
  }
  private audioRendererOptions: audio.AudioRendererOptions = {
    streamInfo: this.audioStreamInfo,
    rendererInfo: this.audioRendererInfo
  }

  constructor() {}

  /**
   * 初始化AVSession会话
   */
  private async initAVSession(context: common.Context): Promise<void> {
    try {
      hilog.info(0x0000, TAG, 'Initializing AVSession...');
      
      // 创建AVSession实例
      this.avSessionInstance = await avSession.createAVSession(context, 'ReaderTTS', 'audio');
      hilog.info(0x0000, TAG, 'AVSession created successfully');
      
      // 激活会话
      await this.avSessionInstance.activate();
      hilog.info(0x0000, TAG, 'AVSession activated successfully');
      
      // 设置会话元数据 - 简化元数据，避免mediaImage导致的错误
      const metadata: avSession.AVMetadata = {
        assetId: 'reader_tts_audio',
        title: '智能朗读',
        artist: 'ReaderKit',
        album: '语音朗读'
      };
      await this.avSessionInstance.setAVMetadata(metadata);
      hilog.info(0x0000, TAG, 'AVSession metadata set successfully');
      
      // 设置播放状态
      const playbackState: avSession.AVPlaybackState = {
        state: avSession.PlaybackState.PLAYBACK_STATE_STOP,
        speed: 1.0,
        position: {
          elapsedTime: 0,
          updateTime: Date.now()
        },
        bufferedTime: 0,
        loopMode: avSession.LoopMode.LOOP_MODE_SEQUENCE,
        isFavorite: false
      };
      await this.avSessionInstance.setAVPlaybackState(playbackState);
      hilog.info(0x0000, TAG, 'AVSession playback state set successfully');
      
      // 注册控制命令监听器
      this.registerAVSessionListeners();
      
    } catch (error) {
      hilog.error(0x0000, TAG, 'Failed to initialize AVSession: ' + JSON.stringify(error));
      // 不抛出异常，允许音频播放继续工作，只是没有AVSession控制
      hilog.warn(0x0000, TAG, 'AVSession initialization failed, audio playback will continue without session control');
    }
  }

  /**
   * 注册AVSession控制命令监听器
   */
  private registerAVSessionListeners(): void {
    if (!this.avSessionInstance) {
      return;
    }

    try {
      // 注册播放命令监听器
      this.avSessionInstance.on('play', () => {
        hilog.info(0x0000, TAG, 'AVSession play command received');
        this.handlePlayCommand();
      });

      // 注册暂停命令监听器
      this.avSessionInstance.on('pause', () => {
        hilog.info(0x0000, TAG, 'AVSession pause command received');
        this.handlePauseCommand();
      });

      // 注册停止命令监听器
      this.avSessionInstance.on('stop', () => {
        hilog.info(0x0000, TAG, 'AVSession stop command received');
        this.handleStopCommand();
      });

      // 注册下一个命令监听器
      this.avSessionInstance.on('playNext', () => {
        hilog.info(0x0000, TAG, 'AVSession playNext command received');
        this.handleNextCommand();
      });

      // 注册上一个命令监听器
      this.avSessionInstance.on('playPrevious', () => {
        hilog.info(0x0000, TAG, 'AVSession playPrevious command received');
        this.handlePreviousCommand();
      });

      hilog.info(0x0000, TAG, 'AVSession listeners registered successfully');
    } catch (error) {
      hilog.error(0x0000, TAG, 'Failed to register AVSession listeners: ' + JSON.stringify(error));
    }
  }

  /**
   * 处理播放命令
   */
  private async handlePlayCommand(): Promise<void> {
    try {
      if (this.renderModel && this.renderModel.state === audio.AudioState.STATE_PAUSED) {
        await this.renderModel.start();
        await this.updateAVSessionState(avSession.PlaybackState.PLAYBACK_STATE_PLAY);
        hilog.info(0x0000, TAG, 'Audio resumed from AVSession play command');
      }
    } catch (error) {
      hilog.error(0x0000, TAG, 'Failed to handle play command: ' + JSON.stringify(error));
    }
  }

  /**
   * 处理暂停命令
   */
  private async handlePauseCommand(): Promise<void> {
    try {
      if (this.renderModel && this.renderModel.state === audio.AudioState.STATE_RUNNING) {
        await this.renderModel.pause();
        await this.updateAVSessionState(avSession.PlaybackState.PLAYBACK_STATE_PAUSE);
        hilog.info(0x0000, TAG, 'Audio paused from AVSession pause command');
      }
    } catch (error) {
      hilog.error(0x0000, TAG, 'Failed to handle pause command: ' + JSON.stringify(error));
    }
  }

  /**
   * 处理停止命令
   */
  private async handleStopCommand(): Promise<void> {
    try {
      await this.stop();
      hilog.info(0x0000, TAG, 'Audio stopped from AVSession stop command');
    } catch (error) {
      hilog.error(0x0000, TAG, 'Failed to handle stop command: ' + JSON.stringify(error));
    }
  }

  /**
   * 处理下一个命令
   */
  private handleNextCommand(): void {
    hilog.info(0x0000, TAG, 'Next command received - should be handled by parent component');
    // 这里可以通过回调通知父组件处理下一章逻辑
  }

  /**
   * 处理上一个命令
   */
  private handlePreviousCommand(): void {
    hilog.info(0x0000, TAG, 'Previous command received - should be handled by parent component');
    // 这里可以通过回调通知父组件处理上一章逻辑
  }

  /**
   * 更新AVSession播放状态
   */
  private async updateAVSessionState(state: avSession.PlaybackState): Promise<void> {
    if (!this.avSessionInstance) {
      return;
    }

    try {
      const playbackState: avSession.AVPlaybackState = {
        state: state,
        speed: 1.0,
        position: {
          elapsedTime: 0, // 可以根据实际播放进度更新
          updateTime: Date.now()
        },
        bufferedTime: 0,
        loopMode: avSession.LoopMode.LOOP_MODE_SEQUENCE,
        isFavorite: false
      };
      
      await this.avSessionInstance.setAVPlaybackState(playbackState);
      hilog.info(0x0000, TAG, `AVSession state updated to: ${state}`);
    } catch (error) {
      hilog.error(0x0000, TAG, 'Failed to update AVSession state: ' + JSON.stringify(error));
    }
  }

  /**
   * 准备音频播放器
   */
  public async prepare(sampleRate: number, soundChannel: number, sampleBit?: number, compressRate?: number, context?: common.Context): Promise<void> {
    try {
      // 初始化AVSession（如果提供了context）
      if (context && !this.avSessionInstance) {
        await this.initAVSession(context);
      }

      this.audioRendererOptions.streamInfo.samplingRate = sampleRate;
      this.audioRendererOptions.rendererInfo.usage = audio.StreamUsage.STREAM_USAGE_MUSIC;
      
      if (this.renderModel != null) {
        await this.renderModel.release();
      }
      
      let renderModel = await audio.createAudioRenderer(this.audioRendererOptions);
      if (!renderModel) {
        hilog.error(0x0000, TAG, 'failed to create audio renderer');
        throw new Error('Failed to create audio renderer');
      }
      
      hilog.info(0x0000, TAG, "creating AudioRenderer success");
      this.renderModel = renderModel;
      this.bufferSize = await this.renderModel.getBufferSize();
      
      // 注册音频渲染器状态监听器
      this.renderModel.on('stateChange', (state: audio.AudioState) => {
        hilog.info(0x0000, TAG, `AudioRenderer state changed to: ${state}`);
        this.handleAudioStateChange(state);
      });
      
    } catch (error) {
      hilog.error(0x0000, TAG, 'Failed to prepare audio: ' + JSON.stringify(error));
      throw new Error('Failed to prepare audio: ' + JSON.stringify(error));
    }
  }

  /**
   * 处理音频状态变化
   */
  private async handleAudioStateChange(state: audio.AudioState): Promise<void> {
    try {
      switch (state) {
        case audio.AudioState.STATE_RUNNING:
          await this.updateAVSessionState(avSession.PlaybackState.PLAYBACK_STATE_PLAY);
          break;
        case audio.AudioState.STATE_PAUSED:
          await this.updateAVSessionState(avSession.PlaybackState.PLAYBACK_STATE_PAUSE);
          break;
        case audio.AudioState.STATE_STOPPED:
          await this.updateAVSessionState(avSession.PlaybackState.PLAYBACK_STATE_STOP);
          break;
        default:
          break;
      }
    } catch (error) {
      hilog.error(0x0000, TAG, 'Failed to handle audio state change: ' + JSON.stringify(error));
    }
  }

  /**
   * 播放音频数据
   */
  public async play(data: ArrayBuffer): Promise<number> {
    try {
      this.audioDataSize = data.byteLength;
      
      if (this.renderModel != null) {
        this.renderModel.on('writeData', this.writeDataCallback);
        // 启动渲染
        await this.renderModel.start();
        hilog.info(0x0000, TAG, "start AudioRenderer success");
        
        // 更新AVSession状态为播放中
        await this.updateAVSessionState(avSession.PlaybackState.PLAYBACK_STATE_PLAY);
      }
      
      return 0;
    } catch (error) {
      hilog.error(0x0000, TAG, 'Failed to play audio: ' + JSON.stringify(error));
      return -1;
    }
  }

  /**
   * 停止音频播放
   */
  public async stop(): Promise<void> {
    try {
      hilog.info(0x0000, TAG, 'Renderer begin stop');
      
      if (this.renderModel == null) {
        return;
      }

      // 只有渲染器状态为running或paused的时候才可以停止
      if (this.renderModel.state !== audio.AudioState.STATE_RUNNING
        && this.renderModel.state !== audio.AudioState.STATE_PAUSED) {
        hilog.error(0x0000, TAG, 'Renderer is not running or paused');
        return;
      }
      
      await this.renderModel.stop(); // 停止渲染
      hilog.info(0x0000, TAG, 'Renderer stopped');
      
      // 更新AVSession状态为停止
      await this.updateAVSessionState(avSession.PlaybackState.PLAYBACK_STATE_STOP);
      
    } catch (error) {
      hilog.error(0x0000, TAG, 'Failed to stop audio: ' + JSON.stringify(error));
    }
  }

  /**
   * 暂停音频播放
   */
  public async pause(): Promise<void> {
    try {
      if (this.renderModel && this.renderModel.state === audio.AudioState.STATE_RUNNING) {
        await this.renderModel.pause();
        hilog.info(0x0000, TAG, 'Audio paused');
        
        // 更新AVSession状态为暂停
        await this.updateAVSessionState(avSession.PlaybackState.PLAYBACK_STATE_PAUSE);
      }
    } catch (error) {
      hilog.error(0x0000, TAG, 'Failed to pause audio: ' + JSON.stringify(error));
    }
  }

  /**
   * 恢复音频播放
   */
  public async resume(): Promise<void> {
    try {
      if (this.renderModel && this.renderModel.state === audio.AudioState.STATE_PAUSED) {
        await this.renderModel.start();
        hilog.info(0x0000, TAG, 'Audio resumed');
        
        // 更新AVSession状态为播放中
        await this.updateAVSessionState(avSession.PlaybackState.PLAYBACK_STATE_PLAY);
      }
    } catch (error) {
      hilog.error(0x0000, TAG, 'Failed to resume audio: ' + JSON.stringify(error));
    }
  }

  /**
   * 释放资源
   */
  public async release(): Promise<void> {
    try {
      // 释放音频渲染器
      if (this.renderModel != null) {
        if (this.renderModel.state === audio.AudioState.STATE_RELEASED) {
          hilog.error(0x0000, TAG, 'Renderer already released');
          return;
        }
        await this.renderModel.release(); // 释放资源
        this.renderModel = null;
        hilog.info(0x0000, TAG, 'Renderer released');
      }

      // 释放AVSession
      if (this.avSessionInstance) {
        try {
          await this.avSessionInstance.deactivate();
          await this.avSessionInstance.destroy();
          this.avSessionInstance = null;
          hilog.info(0x0000, TAG, 'AVSession released');
        } catch (error) {
          hilog.error(0x0000, TAG, 'Failed to release AVSession: ' + JSON.stringify(error));
        }
      }

      // 释放AVSession控制器
      if (this.avSessionController) {
        try {
          await this.avSessionController.destroy();
          this.avSessionController = null;
          hilog.info(0x0000, TAG, 'AVSession controller released');
        } catch (error) {
          hilog.error(0x0000, TAG, 'Failed to release AVSession controller: ' + JSON.stringify(error));
        }
      }
      
    } catch (error) {
      hilog.error(0x0000, TAG, 'Failed to release resources: ' + JSON.stringify(error));
    }
  }

  /**
   * 判断当前渲染状态
   *
   * @returns running返回true，否则返回false
   */
  public isPlaying(): boolean {
    if (this.renderModel != null) {
      hilog.info(0x0000, TAG, "player.state:" + this.renderModel.state);
      return this.renderModel.state == audio.AudioState.STATE_RUNNING;
    } else {
      return false;
    }
  }

  /**
   * 获取当前渲染状态
   *
   * @returns 返回当前音频状态
   */
  public getRenderState(): number {
    if (this.renderModel != null) {
      hilog.info(0x0000, TAG, "player.state:" + this.renderModel.state);
      return this.renderModel.state;
    } else {
      return audio.AudioState.STATE_INVALID;
    }
  }

  /**
   * 获取音频渲染器的最小缓冲区大小
   */
  public getBufferSize(): number {
    return this.bufferSize;
  }

  /**
   * 更新AVSession元数据
   */
  public async updateMetadata(title: string, artist?: string, album?: string, duration?: number): Promise<void> {
    if (!this.avSessionInstance) {
      return;
    }

    try {
      const metadata: avSession.AVMetadata = {
        assetId: 'reader_tts_audio',
        title: title,
        artist: artist || 'ReaderKit',
        album: album || '语音朗读',
        duration: duration || 0,
        mediaImage: undefined
      };
      
      await this.avSessionInstance.setAVMetadata(metadata);
      hilog.info(0x0000, TAG, `AVSession metadata updated: ${title}`);
    } catch (error) {
      hilog.error(0x0000, TAG, 'Failed to update AVSession metadata: ' + JSON.stringify(error));
    }
  }

  /**
   * 获取AVSession实例（供外部使用）
   */
  public getAVSession(): avSession.AVSession | null {
    return this.avSessionInstance;
  }
}
