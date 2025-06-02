import type { ExtendedMesh } from 'enable3d'
import type { Point } from '../utils'
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

export interface BilliardsContext {
  status: BilliardsStatus
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
}

const initialContext: BilliardsContext = {
  status: BilliardsStatus.Idle,
  speedThreshold: 0.1,
  angularSpeedThreshold: 10,
  checkStaticInterval: 100,
  inPocketBalls: new Set(),
  force: 0,
}

const context: BilliardsContext = {
  ...initialContext,
}

export function setContext<T extends keyof BilliardsContext>(key: T, value: BilliardsContext[T]) {
  context[key] = value

  if (key === 'status') {
    emitter.emit(EventTypes.status, value as BilliardsStatus)
  } else if (key === 'force') {
    context.force = value as number
    emitter.emit(EventTypes.force, value as number)
  }
}

export function addBallToPocket(ball: ExtendedMesh) {
  context.inPocketBalls.add(ball)
}

export function removeBallFromPocket(ball: ExtendedMesh) {
  context.inPocketBalls.delete(ball)
}

export default context
