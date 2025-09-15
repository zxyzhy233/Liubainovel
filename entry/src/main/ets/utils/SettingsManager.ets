/*
 * Copyright (c) 2025 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { preferences } from '@kit.ArkData';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { ReaderSettings } from '../common/ReaderSettings';
import { common } from '@kit.AbilityKit';

const TAG: string = 'SettingsManager';
const PREFERENCES_NAME = 'ReaderSettings';

class SettingsManager {
  private prefs: preferences.Preferences | null = null;

  async init(context: common.UIAbilityContext): Promise<void> {
    if (this.prefs) {
      return;
    }
    try {
      this.prefs = await preferences.getPreferences(context, PREFERENCES_NAME);
      hilog.info(0x0000, TAG, 'Preferences init success.');
    } catch (e) {
      hilog.error(0x0000, TAG, `Preferences init failed, error: ${e}`);
    }
  }

  async saveSettings(settings: ReaderSettings): Promise<void> {
    if (!this.prefs) {
      hilog.error(0x0000, TAG, 'Preferences is not initialized.');
      return;
    }
    try {
      await this.prefs.put('fontName', settings.fontName);
      await this.prefs.put('fontPath', settings.fontPath);
      await this.prefs.put('fontSize', settings.fontSize);
      await this.prefs.put('lineHeight', settings.lineHeight);
      await this.prefs.put('theme', settings.theme);
      await this.prefs.put('flipMode', settings.flipMode);
      await this.prefs.flush();
      hilog.info(0x0000, TAG, 'Settings saved successfully.');
    } catch (e) {
      hilog.error(0x0000, TAG, `Save settings failed, error: ${e}`);
    }
  }

  async loadSettings(): Promise<ReaderSettings> {
    const settings = new ReaderSettings();
    if (!this.prefs) {
      hilog.error(0x0000, TAG, 'Preferences is not initialized.');
      return settings;
    }
    try {
      settings.fontName = await this.prefs.get('fontName', 'System Font') as string;
      settings.fontPath = await this.prefs.get('fontPath', '') as string;
      settings.fontSize = await this.prefs.get('fontSize', 18) as number;
      settings.lineHeight = await this.prefs.get('lineHeight', 1.9) as number;
      settings.theme = await this.prefs.get('theme', 'white') as string;
      settings.flipMode = await this.prefs.get('flipMode', '0') as string;
      hilog.info(0x0000, TAG, 'Settings loaded successfully.');
    } catch (e) {
      hilog.error(0x0000, TAG, `Load settings failed, error: ${e}`);
    }
    return settings;
  }
}

export const settingsManager = new SettingsManager();
