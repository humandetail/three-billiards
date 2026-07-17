import type { BilliardsContext } from './Context'
import type Player from './Player'
import { BilliardsStatus, setContext } from './Context'
import { setPlayerInfo, switchPlayer } from './Context'
import { removeBallFromPocket } from './Context'

const FULL_BALLS = ['1', '2', '3', '4', '5', '6', '7']
const HALF_BALLS = ['9', '10', '11', '12', '13', '14', '15']

/**
 * 结算当前轮次
 * 从 Context.ts 提取，职责单一：判断进球情况 → 更新目标球 → 切换玩家/结束游戏
 */
export function settleCurrentTurn(context: BilliardsContext) {
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

  // 黑8进袋
  if (currentTurnPocketedBalls.has('8')) {
    console.log('黑8进袋')
    const onlyBlack8Left = activePlayer.targetBalls.length === 1 && activePlayer.targetBalls[0] === '8'

    if (onlyBlack8Left) {
      endGame(activePlayer.id)
    }
    else {
      endGame(freePlayer.id)
    }
    return
  }

  // 白球进袋：犯规
  if (currentTurnPocketedBalls.has('0')) {
    console.log('白球进袋：犯规')
    setPlayerInfo(activePlayer.id, 'consecutiveFouls', activePlayer.consecutiveFouls + 1)
    removeBallFromPocket('0')

    // 已区分球，处理剩余袋中的球
    if (!isBreakShot && !activeHasNoTarget && !freeHasNoTarget) {
      assignTargetBalls(currentTurnBalls, activePlayer, freePlayer, prevPocketedBalls, false)
    }

    switchPlayer(true)
    return
  }

  assignTargetBalls(currentTurnBalls, activePlayer, freePlayer, prevPocketedBalls)
}

/**
 * 分配目标球
 */
function assignTargetBalls(
  currentTurnBalls: string[],
  activePlayer: Player,
  freePlayer: Player,
  prevPocketedBalls: Set<string>,
  needSwitch = true,
) {
  const isBreakShot = activePlayer.strokes === 0 && freePlayer.strokes === 0
  const activeHasNoTarget = activePlayer.targetBalls.length === 0
  const freeHasNoTarget = freePlayer.targetBalls.length === 0

  if (isBreakShot) {
    console.log('break shot')
    needSwitch && switchPlayer(false)
    return
  }

  // --- 分配目标球（第一次确定目标球） ---
  if (activeHasNoTarget && freeHasNoTarget && !isBreakShot) {
    console.log('分配目标球')
    const firstBall = currentTurnBalls.values().next().value
    if (firstBall) {
      const isFull = FULL_BALLS.includes(firstBall)

      setPlayerInfo(activePlayer.id, 'targetBalls', (isFull ? FULL_BALLS : HALF_BALLS).filter(b => ![...currentTurnBalls, ...prevPocketedBalls].includes(b)))
      setPlayerInfo(freePlayer.id, 'targetBalls', (isFull ? HALF_BALLS : FULL_BALLS).filter(b => ![...currentTurnBalls, ...prevPocketedBalls].includes(b)))

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
    const newTargets = activePlayer.targetBalls.filter(b => !activeTargetBalls.includes(b))
    setPlayerInfo(activePlayer.id, 'targetBalls', newTargets)
    setPlayerInfo(activePlayer.id, 'consecutiveHits', activePlayer.consecutiveHits + 1)

    if (newTargets.length === 0) {
      setPlayerInfo(activePlayer.id, 'targetBalls', ['8'])
    }

    needSwitch && switchPlayer(false)
  }
  else {
    console.log('进了对方目标球')
    const newFreeTargets = freePlayer.targetBalls.filter(b => !freeTargetBalls.includes(b))
    setPlayerInfo(freePlayer.id, 'targetBalls', newFreeTargets)

    if (newFreeTargets.length === 0) {
      setPlayerInfo(freePlayer.id, 'targetBalls', ['8'])
    }

    needSwitch && switchPlayer(true)
  }
}

function endGame(winner: string) {
  // eslint-disable-next-line no-console
  console.info(`winner is ${winner}`)
  setContext('status', BilliardsStatus.GameOver)
}
