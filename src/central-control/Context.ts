import type { ExtendedMesh } from 'enable3d'
import type { Point } from '../utils'
import type Player from './Player'
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

      switch (value) {
        case BilliardsStatus.Shooting:
          emitter.emit(EventTypes.remainingOperationTime, 0)
          countDown.stop()
          break
        case BilliardsStatus.ShotCompleted:
          settleCurrentTurn()
          break
        default:
          break
      }
      break
    case 'winner':
      endGame(value as string)
      break
    case 'remainingOperationTime':
      context.remainingOperationTime = value as number

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
 * 结算当前轮
 */
export function settleCurrentTurn() {
  // eslint-disable-next-line no-console
  console.log('结算')

  const activePlayer = context.players.find(p => p.id === context.activePlayer)!
  const freePlayer = context.players.find(p => p.id !== context.activePlayer)!

  const { prevPocketedBalls, pocketedBalls } = context

  const currentTurnPocketedBalls = new Set(
    [...pocketedBalls].filter(ball => !prevPocketedBalls.has(ball)),
  )
  const currentTurnBalls = [...currentTurnPocketedBalls]
  const total = currentTurnBalls.length

  const isBreakShot = activePlayer.strokes === 0 && freePlayer.strokes === 0
  const activeHasNoTarget = activePlayer.targetBalls.length === 0
  const freeHasNoTarget = freePlayer.targetBalls.length === 0

  setPlayerInfo(activePlayer.id, 'strokes', 0)

  if (total === 0) {
    // 未进球：切换回合
    console.log('未进球：切换回合')
    switchPlayer(true)
    return
  }

  const fullBalls = ['1', '2', '3', '4', '5', '6', '7']
  const halfBalls = ['9', '10', '11', '12', '13', '14', '15']

  // 黑8进袋
  if (currentTurnPocketedBalls.has('8')) {
    console.log('黑8进袋')
    const onlyBlack8Left = activePlayer.targetBalls.length === 1 && activePlayer.targetBalls[0] === '8'

    if (onlyBlack8Left) {
      // 正确击黑8赢得比赛
      endGame(activePlayer.id)
    }
    else {
      // 黑8未到击球时机，直接输
      endGame(freePlayer.id)
    }
    return
  }

  // 白球进袋：犯规
  if (currentTurnPocketedBalls.has('0')) {
    console.log('白球进袋：犯规')
    setPlayerInfo(activePlayer.id, 'consecutiveFouls', activePlayer.consecutiveFouls + 1)
    removeBallFromPocket('0')

    // 处理剩余袋中的球
    if (!isBreakShot) {
      setTargetBalls(false)
    }

    switchPlayer(true)
    return
  }

  setTargetBalls()

  function setTargetBalls(needSwitch = true) {
    if (isBreakShot) {
      console.log('break shot')
      needSwitch && switchPlayer(false)
      return
    }

    // --- 分配目标球（第一次确定目标球） ---
    if (activeHasNoTarget && freeHasNoTarget && !isBreakShot) {
      console.log('分配目标球')
      const firstBall = currentTurnBalls.find(ball => fullBalls.includes(ball) || halfBalls.includes(ball))
      if (firstBall) {
        const isFull = fullBalls.includes(firstBall)

        setPlayerInfo(activePlayer.id, 'targetBalls', (isFull ? fullBalls : halfBalls).filter(b => b !== firstBall && !prevPocketedBalls.has(b)))
        setPlayerInfo(freePlayer.id, 'targetBalls', (isFull ? halfBalls : fullBalls).filter(b => !prevPocketedBalls.has(b)))

        // 当前玩家击中目标，继续击球
        needSwitch && switchPlayer(false)
        return
      }
    }

    // --- 判断是否进了自己的目标球 ---
    const activeTargetBalls = currentTurnBalls.filter(ball => activePlayer.targetBalls.includes(ball))
    const freeTargetBalls = currentTurnBalls.filter(ball => freePlayer.targetBalls.includes(ball))

    if (activeTargetBalls.length > 0) {
      console.log('进了自己的目标球')
      // 更新目标球状态
      const newTargets = activePlayer.targetBalls.filter(b => !activeTargetBalls.includes(b))
      setPlayerInfo(activePlayer.id, 'targetBalls', newTargets)
      setPlayerInfo(activePlayer.id, 'consecutiveHits', activePlayer.consecutiveHits + 1)

      // 若只剩下黑8，目标改为黑8
      if (newTargets.length === 0) {
        setPlayerInfo(activePlayer.id, 'targetBalls', ['8'])
      }

      needSwitch && switchPlayer(false)
    }
    else {
      console.log('进了对方目标球')
      // 更新目标球状态
      const newFreeTargets = freePlayer.targetBalls.filter(b => !freeTargetBalls.includes(b))
      setPlayerInfo(freePlayer.id, 'targetBalls', newFreeTargets)

      // 若只剩下黑8
      if (newFreeTargets.length === 0) {
        setPlayerInfo(freePlayer.id, 'targetBalls', ['8'])
      }

      needSwitch && switchPlayer(true)
    }
  }
}

function endGame(winner: string) {
  // eslint-disable-next-line no-console
  console.info(`winner is ${context.players.find(p => p.id === winner as string)!.name}`)
  // @todo 通知所有玩家
  // emitter.emit(EventTypes.winner, value as string)
  setContext('status', BilliardsStatus.GameOver)
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
