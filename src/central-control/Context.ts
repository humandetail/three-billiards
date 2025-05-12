import emitter, { EventTypes } from "./Emitter"

export enum BilliardsStatus {
  Idle = 'idle',
  /** 拉杆中 */
  Staging = 'staging',
  /** 释放 */
  Release = 'release',
  /** 击球中 */
  Shooting = 'shooting',
  /** 已完成击球 */
  ShotCompleted = 'shot-completed'
}

export interface BilliardsContext {
  status: BilliardsStatus
  canCheckBody: boolean
  renderRequested: boolean
}

const initialContext: BilliardsContext = {
  status: BilliardsStatus.Idle,
  canCheckBody: false,
  renderRequested: false,
}

const context: BilliardsContext = {
  ...initialContext,
}


export function setContext<T extends keyof BilliardsContext>(key: T, value: BilliardsContext[T]) {
  context[key] = value

  if (key === 'status') {
    emitter.emit(EventTypes.status, value as BilliardsStatus)
  }
}

export default context
