export abstract class AggregateRoot {
  private _version = 0
  private _uncommitted: any[] = []

  get version() {
    return this._version
  }

  protected apply(event: any, isReplay = false) {
    const handler = (this as any)[`on${event.name}`]
    if (handler) handler.call(this, event.payload)

    if (!isReplay) {
      this._uncommitted.push(event)
    }

    this._version++
  }

  getUncommittedEvents() {
    return this._uncommitted
  }

  markCommitted() {
    this._uncommitted = []
  }

  loadFromHistory(events: any[]) {
    for (const event of events) {
      this.apply(event, true)
    }
  }
}
