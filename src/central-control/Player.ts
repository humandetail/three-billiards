export interface PlayerOptions {
  id: string
  name: string
  avatar: string
  score: number
  targetBalls: (string | number)[]

  /** 出杆次数 */
  strokes: number
  /** 连续击中目标球的次数 */
  consecutiveHits: number
  /** 连续犯规次数 */
  consecutiveFouls: number
  /** 连续不击球次数，操作时间减半 */
  consecutiveMisses: number
}

export default class Player {
  avatar: string = ''
  /** 比分 */
  #score: number = 0
  /** 玩家需要击打的目标球 */
  #targetBalls: string[] = []

  /** 出杆次数 */
  #strokes: number = 0
  /** 连续击中目标球的次数（连杆次数） */
  #consecutiveHits: number = 0
  /** 连续犯规次数 */
  #consecutiveFouls: number = 0
  /** 连续不击球次数，操作时间受影响 */
  #consecutiveMisses: number = 0

  constructor(public id: string, public name: string) {}

  get score() {
    return this.#score
  }

  set score(score: number) {
    this.#score = score
  }

  get targetBalls() {
    return this.#targetBalls
  }

  set targetBalls(targetBalls: string[]) {
    this.#targetBalls = targetBalls
  }

  get strokes() {
    return this.#strokes
  }

  set strokes(strokes: number) {
    this.#strokes = strokes
  }

  get consecutiveHits() {
    return this.#consecutiveHits
  }

  set consecutiveHits(consecutiveHits: number) {
    this.#consecutiveHits = consecutiveHits
  }

  get consecutiveFouls() {
    return this.#consecutiveFouls
  }

  set consecutiveFouls(consecutiveFouls: number) {
    this.#consecutiveFouls = consecutiveFouls
  }

  get consecutiveMisses() {
    return this.#consecutiveMisses
  }

  set consecutiveMisses(consecutiveMisses: number) {
    this.#consecutiveMisses = consecutiveMisses
  }

  /**
   * 记录犯规次数
   * 当连续犯规次数大于 2 时，游戏结束
   */
  recordFouls() {
    this.consecutiveFouls = this.consecutiveFouls > 0
      ? this.consecutiveFouls + 1
      : 1
  }

  /**
   * 记录连杆数
   */
  recordHits() {
    this.consecutiveHits++
  }

  /**
   * 记录超时不击球次数
   */
  recordMisses() {
    this.consecutiveMisses++
    this.recordFouls()
  }

  /**
   * 获取玩家操作时间
   * @param initOperationTime 初始操作时间
   */
  getOperationTime(initOperationTime: number) {
    return Math.ceil(initOperationTime / (this.consecutiveMisses + 1))
  }
}
