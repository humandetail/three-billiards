import type { ExtendedMesh } from 'enable3d'
import type { Point } from '../utils'
import CountDown from './CountDown'
import emitter, { EventTypes } from './Emitter'

export enum BilliardsStatus {
  Idle = 'idle',
  /** 拉杆中 */
  Staging = 'staging',
  /** 释放 */
  Release = 'release',
  /** 击球中 */
  Shooting = 'shooting',
  /** 已完成击球 */
  ShotCompleted = 'shot-completed',
  /** 高级模式 */
  Advanced = 'advanced',
}

export interface Player {
  id: string
  name: string
  avatar?: string
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

export interface BilliardsContext {
  status: BilliardsStatus
  prevStatus: BilliardsStatus
  /** 球静止的阈值 */
  speedThreshold: number
  /** 球静止的角速度阈值 */
  angularSpeedThreshold: number
  /** 检测球是否静止的间隔 */
  checkStaticInterval: number
  /** 球袋 */
  inPocketBalls: Set<ExtendedMesh>
  /** 出杆力度 */
  force: number
  targetPoint: Point
  // angle: number

  phi: number
  theta: number

  /** 安全击杆区 */
  safePercent: number

  isAdvanced: () => boolean
  /**
   * 是否可以设置
   * 1. 轮到当前玩家击球
   * 2. 状态为 Idle 或 Advanced
   */
  canIControl: () => boolean

  /** @todo 当前玩家 */
  // player: Player
  /** 所有玩家 */
  players: Player[]
  /** 当前操作玩家 id */
  activePlayer: string
  /** 玩家每一轮操作时间，受连续不击球次数影响， 单位: 秒 */
  operationTime: number
  /** 剩余操作时间 */
  remainingOperationTime: number
  winner: string | null

  /** 当前轮进了目标球 */
  isCatchTarget: boolean
}

const initialContext: BilliardsContext = {
  status: BilliardsStatus.Idle,
  prevStatus: BilliardsStatus.Idle,
  speedThreshold: 0.1,
  angularSpeedThreshold: 10,
  checkStaticInterval: 100,
  inPocketBalls: new Set(),
  force: 0,
  targetPoint: { x: 0, y: 0 },
  theta: 180,
  phi: 0,
  safePercent: 2 / 3,

  isAdvanced() {
    return this.status === BilliardsStatus.Advanced
  },

  canIControl() {
    // @todo 当前玩家才允许操作
    return [BilliardsStatus.Idle, BilliardsStatus.Advanced].includes(this.status)
  },

  players: [],
  activePlayer: '',
  operationTime: 30,
  remainingOperationTime: 30,
  isCatchTarget: false,

  winner: null,
}

const context: BilliardsContext = {
  ...initialContext,
}

const countDown = new CountDown()

/**
 * 设置上下文
 * @param key 上下文 key
 * @param value 上下文 value
 */
export function setContext<T extends keyof BilliardsContext>(key: T, value: BilliardsContext[T]) {
  if (key === 'status') {
    context.prevStatus = context.status
  }
  context[key] = value

  switch (key) {
    case 'status':
      emitter.emit(EventTypes.status, value as BilliardsStatus)
      break
    case 'force':
      emitter.emit(EventTypes.force, value as number)
      break
    case 'targetPoint':
      emitter.emit(EventTypes.targetPoint, value as Point)
      break
    case 'phi':
      emitter.emit(EventTypes.phi, value as number)
      break
    case 'theta':
      emitter.emit(EventTypes.theta, value as number)
      break
    case 'winner':
      // eslint-disable-next-line no-alert
      alert(`winner is ${context.players.find(p => p.id === value as string)!.name}`)
      // @todo 通知所有玩家
      // emitter.emit(EventTypes.winner, value as string)
      break
    case 'remainingOperationTime':
      emitter.emit(EventTypes.remainingOperationTime, value as number)

      if ((value as number) <= 0) {
        // 给当前玩家计一次超时
        setPlayerInfo(context.activePlayer, 'consecutiveMisses', context.players.find(p => p.id === context.activePlayer)!.consecutiveMisses + 1)
        // 倒计时结束，切换玩家
        switchPlayer()
      }

      break
  }
}

/**
 * 添加球到球袋
 * @param ball 球
 */
export function addBallToPocket(ball: ExtendedMesh) {
  context.inPocketBalls.add(ball)

  const total = context.inPocketBalls.size

  const idx = context.players.findIndex(player => player.id === context.activePlayer)
  const activePlayer = context.players[idx]
  const freePlayer = context.players[idx === 0 ? 1 : 0]
  const isEmpty = activePlayer.targetBalls.length === 0 && freePlayer.targetBalls.length === 0 && total < 14
  const isFirstShot = activePlayer.strokes === 0 && freePlayer.strokes === 0
  const num = Number(ball.name.split('-').pop())

  // 如果当前玩家还没有区分目标球，则区分目标球
  // 第一杆不区分
  if (isEmpty && !isFirstShot) {
    if (num === 8 || num === 0) {
      // @todo - 目标球未区分时，进8号不犯规，取8号球出来重新放置
      return
    }
    if (num <= 7) {
      setPlayerInfo(activePlayer.id, 'targetBalls', [1, 2, 3, 4, 5, 6, 7].filter(i => i !== num))
      setPlayerInfo(freePlayer.id, 'targetBalls', [9, 10, 11, 12, 13, 14, 15])
    }
    else {
      setPlayerInfo(activePlayer.id, 'targetBalls', [9, 10, 11, 12, 13, 14, 15].filter(i => i !== num))
      setPlayerInfo(freePlayer.id, 'targetBalls', [1, 2, 3, 4, 5, 6, 7])
    }
    context.isCatchTarget = true
    return
  }

  // 目标球区分后，进8号犯规，判输
  if (num === 8) {
    // eslint-disable-next-line no-alert
    alert(`winner is ${freePlayer.name}`)
    return
  }

  // 进白球，记录犯规
  if (num === 0) {
    setPlayerInfo(activePlayer.id, 'consecutiveFouls', activePlayer.consecutiveFouls + 1)
    context.inPocketBalls.delete(ball)
    return
  }

  if (activePlayer.targetBalls.includes(num)) {
    activePlayer.targetBalls = activePlayer.targetBalls.filter(i => i !== num)
    context.isCatchTarget = true
  }
  else {
    freePlayer.targetBalls = freePlayer.targetBalls.filter(i => i !== num)
  }

  setPlayerInfo(activePlayer.id, 'consecutiveFouls', 0)
}

/**
 * 从球袋中移除球
 * @param ball 球
 */
export function removeBallFromPocket(ball: ExtendedMesh) {
  context.inPocketBalls.delete(ball)
}

/**
 * 设置玩家
 * @param player 玩家
 */
export function setPlayer(player: Player) {
  if (context.players.length === 2) {
    console.warn('玩家数量已达上限')
    return
  }
  context.players.push(player)
  emitter.emit(EventTypes.players, context.players)
}

/**
 * 设置当前操作玩家
 * @param id 玩家 id
 */
export function setActivePlayer(id: string) {
  context.activePlayer = id
}

/**
 * 设置玩家信息
 * @param id 玩家 id
 * @param key 玩家信息 key
 * @param value 玩家信息 value
 */
export function setPlayerInfo<K extends keyof Player>(id: string, key: K, value: Player[K]) {
  const player = context.players.find(p => p.id === id)
  if (player) {
    player[key] = value

    switch (key) {
      case 'score':
        break
      case 'consecutiveHits':
        break
      case 'consecutiveFouls':
        if (value === 3) {
          // 犯规次数达到上限，对方赢
          setContext('winner', context.players.filter(p => p.id !== id)[0].id)
        }
        break
      case 'consecutiveMisses':
        setPlayerInfo(id, 'consecutiveFouls', player.consecutiveFouls + 1)
        break
      case 'strokes':
        countDown.stop()
        break
      case 'targetBalls':
        emitter.emit(EventTypes.targetBalls, player)
        break
    }
  }
}

/**
 * 切换玩家
 */
export function switchPlayer() {
  const activePlayer = context.activePlayer!
  const nextPlayer = context.players.find(p => p.id !== activePlayer)
  if (nextPlayer) {
    setActivePlayer(context.isCatchTarget ? activePlayer : nextPlayer.id)
    const remainingOperationTime = getPlayerOperationTime(context.isCatchTarget ? activePlayer : nextPlayer.id)

    // 启动倒计时
    countDown.start(remainingOperationTime, (time: number) => {
      setContext('remainingOperationTime', time)
    })
  }
  context.isCatchTarget = false
}

/**
 * 获取玩家可操作的时间
 */
export function getPlayerOperationTime(id: string) {
  const player = context.players.find(p => p.id === id)
  if (!player) {
    throw new Error(`Player ${id} not found`)
  }
  return Math.ceil(context.operationTime / (player.consecutiveMisses + 1))
}

export default context
