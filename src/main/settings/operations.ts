import type { SettingsOverview } from '../../shared/settings'
import type { AppDatabase } from '../db/database'
import { readThemePreference } from '../db/settings'
import {
  backupDirectoryOf,
  readLastBackup,
  readLastSnapshot,
  snapshotDirectoryOf
} from '../data/backup'
import { readReadingPreferences } from '../reading/queries'

export type OverviewOptions = {
  appVersion: string
  electronVersion: string
  dataDirectory: string
}

/** 设置页一次读到的全部值。 */
export function readSettingsOverview(
  database: AppDatabase,
  options: OverviewOptions
): SettingsOverview {
  return {
    reading: readReadingPreferences(database),
    theme: readThemePreference(database),
    appVersion: options.appVersion,
    electronVersion: options.electronVersion,
    dataDirectory: options.dataDirectory,
    lastBackup: readLastBackup(database),
    lastSnapshot: readLastSnapshot(database),
    backupDirectory: backupDirectoryOf(options.dataDirectory),
    snapshotDirectory: snapshotDirectoryOf(options.dataDirectory)
  }
}
