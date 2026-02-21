// src/infrastructure/deployment/rolling-upgrade.ts

export class RollingUpgradeManager {
  private currentVersion: string
  private nextVersion: string | null = null

  constructor(version: string) {
    this.currentVersion = version
  }

  prepareUpgrade(version: string) {
    this.nextVersion = version
  }

  routeTraffic(requestVersion?: string) {
    if (this.nextVersion && requestVersion === this.nextVersion) {
      return this.nextVersion
    }
    return this.currentVersion
  }

  finalizeUpgrade() {
    if (this.nextVersion) {
      this.currentVersion = this.nextVersion
      this.nextVersion = null
    }
  }
}
