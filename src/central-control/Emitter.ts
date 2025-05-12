import type { Point } from '../utils'
import mitt from 'mitt'
import { BilliardsContext } from './Context'

export enum EventTypes {
  point = 'point',
  force = 'force',
  direction = 'direction',

  // cueStatus = 'cue-status',
  hit = 'hit',

  status = 'status'
}

const emitter = mitt<{
  [EventTypes.point]: Point
  [EventTypes.force]: number
  [EventTypes.direction]: 'up' | 'down' | 'right' | 'left'
  // [EventTypes.cueStatus]: 'idle' | 'exec-shot' | 'shooting' | 'finished'
  [EventTypes.status]: BilliardsContext['status']
}>()

export default emitter
