export default class CountDown {
  private reqId: number = 0
  private lastTime = performance.now()

  private duration: number = 0
  private callback: (time: number) => void = () => {}

  constructor() {}

  start(duration: number, callback: (time: number) => void) {
    this.duration = duration
    this.lastTime = performance.now()
    this.callback = callback
    this.reqId = requestAnimationFrame(this.update.bind(this))
  }

  stop() {
    cancelAnimationFrame(this.reqId)
  }

  private update() {
    const currentTime = performance.now()
    const deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime
    this.duration -= deltaTime / 1000
    this.callback(this.duration)

    if (this.duration > 0) {
      this.reqId = requestAnimationFrame(this.update.bind(this))
    }
    else {
      this.stop()
    }
  }
}
