import hilog from "@ohos:hilog";
import BackupExtensionAbility from "@ohos:application.BackupExtensionAbility";
import type { BundleVersion } from "@ohos:application.BackupExtensionAbility";
export default class EntryBackupAbility extends BackupExtensionAbility {
    async onBackup() {
        hilog.info(0x0000, 'EntryBackupAbility', 'onBackup ok');
    }
    async onRestore(bundleVersion: BundleVersion) {
        hilog.info(0x0000, 'EntryBackupAbility', 'onRestore ok %{public}s', JSON.stringify(bundleVersion));
    }
}
