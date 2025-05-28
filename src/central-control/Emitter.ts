import type { Point } from '../utils'
import type { BilliardsContext } from './Context'
import mitt from 'mitt'

export enum EventTypes {
  point = 'point',
  force = 'force',
  direction = 'direction',

  hit = 'hit',

  status = 'status',
}

const emitter = mitt<{
  [EventTypes.point]: Point
  [EventTypes.force]: number
  [EventTypes.direction]: 'up' | 'down' | 'right' | 'left'
  [EventTypes.status]: BilliardsContext['status']
}>()

export default emitter
