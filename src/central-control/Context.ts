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
  angle: number

  /** 安全击杆区 */
  safePercent: number

  isAdvanced: () => boolean
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
  angle: 0,
  safePercent: 2 / 3,

  isAdvanced() {
    return this.status === BilliardsStatus.Advanced
  },
}

const context: BilliardsContext = {
  ...initialContext,
}

export function setContext<T extends keyof BilliardsContext>(key: T, value: BilliardsContext[T]) {
  if (key === 'status') {
    context.prevStatus = context.status
  }
  context[key] = value

  switch (key) {
    case 'status':
      console.log('status', value)
      emitter.emit(EventTypes.status, value as BilliardsStatus)
      break
    case 'force':
      emitter.emit(EventTypes.force, value as number)
      break
    case 'targetPoint':
      emitter.emit(EventTypes.targetPoint, value as Point)
      break
    case 'angle':
      emitter.emit(EventTypes.angle, value as number)
      break
  }
}

export function addBallToPocket(ball: ExtendedMesh) {
  context.inPocketBalls.add(ball)
}

export function removeBallFromPocket(ball: ExtendedMesh) {
  context.inPocketBalls.delete(ball)
}

export default context
