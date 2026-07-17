import type { Point } from '../utils'
import type Player from './Player'
import CountDown from './CountDown'
import emitter, { EventTypes } from './Emitter'
import { settleCurrentTurn } from './TurnSettlement'

export enum BilliardsStatus {
  Idle = 'idle',
  /** 拉杆中 */
  Staging = 'staging',
  /** 释放 */
  Release = 'release',
  /** 击球中 */
  Shooting = 'shooting',
  /** 已完成击球，进入当前轮结算 */
  ShotCompleted = 'shot-completed',
  /** 高级模式 */
  Advanced = 'advanced',
  /** 游戏结束 */
  GameOver = 'game-over',
}

export const SETTINGS = {
  /** 球静止的阈值 */
  speedThreshold: 0.1,
  /** 球静止的角速度阈值 */
  angularSpeedThreshold: 10,
  /** 检测球是否静止的间隔 */
  checkStaticInterval: 100,
  /** 安全击杆区 */
  safePointPercent: 2 / 3,
}

export interface CueStatus {
  visible: boolean
  force: number
  targetPoint: Point
  phi: number
  theta: number
}

export interface BilliardsContext {
  status: BilliardsStatus
  prevStatus: BilliardsStatus

  cueStatus: CueStatus

  /** 球袋中的球 */
  pocketedBalls: Set<string>
  /** 上一轮球袋中的球 */
  prevPocketedBalls: Set<string>

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

const initialCueStatus: CueStatus = {
  visible: false,
  force: 0,
  targetPoint: { x: 0, y: 0 },
  phi: 0,
  theta: 180,
}

const initialContext: BilliardsContext = {
  status: BilliardsStatus.Idle,
  prevStatus: BilliardsStatus.Idle,

  cueStatus: { ...initialCueStatus },

  pocketedBalls: new Set(),
  prevPocketedBalls: new Set(),

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

export function setContext<T extends keyof Exclude<BilliardsContext, 'cueStatus'>>(key: T, value: BilliardsContext[T]): void
export function setContext<T extends 'cueStatus', K extends keyof BilliardsContext['cueStatus']>(key: T, subKey: K, value: BilliardsContext[T][K]): void
export function setContext(key: keyof BilliardsContext, ...restArgs: [value: BilliardsContext[keyof BilliardsContext]] | [subKey: keyof BilliardsContext['cueStatus'], value: BilliardsContext['cueStatus'][keyof BilliardsContext['cueStatus']]]): void {
  if (key === 'cueStatus') {
    const [subKey, value] = restArgs as [subKey: keyof BilliardsContext['cueStatus'], value: BilliardsContext['cueStatus'][keyof BilliardsContext['cueStatus']]]
    context.cueStatus = {
      ...context.cueStatus,
      [subKey]: value,
    }
    emitter.emit(EventTypes.cueStatus, context.cueStatus)
    return
  }

  if (key === 'status') {
    context.prevStatus = context.status
  }

  const value = restArgs[0]

  switch (key) {
    case 'status':
      context.status = value as BilliardsStatus
      emitter.emit(EventTypes.status, value as BilliardsStatus)
      break
    case 'remainingOperationTime':
      context.remainingOperationTime = value as number
      emitter.emit(EventTypes.remainingOperationTime, value as number)
      break
  }
}

// =============== 副作用通过事件监听处理 ===============

/** 状态变更副作用 */
emitter.on(EventTypes.status, (status) => {
  switch (status) {
    case BilliardsStatus.Shooting:
      emitter.emit(EventTypes.remainingOperationTime, 0)
      countDown.stop()
      break
    case BilliardsStatus.ShotCompleted:
      settleCurrentTurn(context)
      break
  }
})

/** 倒计时归零 → 超时处理 */
emitter.on(EventTypes.remainingOperationTime, (time) => {
  if (time <= 0 && context.status !== BilliardsStatus.Shooting) {
    setPlayerInfo(context.activePlayer, 'consecutiveMisses', context.players.find(p => p.id === context.activePlayer)!.consecutiveMisses + 1)
    switchPlayer()
  }
})

function resetCueStatus() {
  context.cueStatus = { ...initialCueStatus }
  emitter.emit(EventTypes.cueStatus, context.cueStatus)
}

/**
 * 添加球到球袋
 */
export function addBallToPocket(name: string) {
  context.pocketedBalls.add(name)
}

/**
 * 从球袋中移除球
 */
export function removeBallFromPocket(name: string) {
  context.pocketedBalls.delete(name)

  // @todo - 移球
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
  emitter.emit(EventTypes.activePlayer, id)
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
        player.strokes++
        break
      case 'targetBalls':
        emitter.emit(EventTypes.targetBalls, player)
        break
      default:
        break
    }
  }
}

/**
 * 切换玩家
 * @param needSwitch 是否需要切换
 */
export function switchPlayer(needSwitch = true) {
  let activePlayer = context.activePlayer
  let nextPlayer = context.players.find(p => p.id !== activePlayer)?.id

  if (!activePlayer || !nextPlayer) {
    activePlayer = context.players[0].id
    nextPlayer = context.players[1].id
  }

  if (!needSwitch) {
    ;[activePlayer, nextPlayer] = [nextPlayer, activePlayer]
  }

  if (nextPlayer) {
    setActivePlayer(nextPlayer)
    const remainingOperationTime = getPlayerOperationTime(nextPlayer)

    // 启动倒计时
    countDown.start(remainingOperationTime, (time: number) => {
      setContext('remainingOperationTime', time)
    })

    context.prevPocketedBalls = new Set([...context.prevPocketedBalls, ...context.pocketedBalls])
  }

  emitter.emit(EventTypes.switchPlayer)
  resetCueStatus()
  setContext('status', BilliardsStatus.Idle)
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
