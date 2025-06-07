import type { Point } from '../utils'
import type { BilliardsContext } from './Context'
import mitt from 'mitt'

type ForcePercent = number

export enum EventTypes {
  targetPoint = 'targetPoint',
  // angle = 'angle',
  phi = 'phi',
  theta = 'theta',
  force = 'force',
  // direction = 'direction',

  hit = 'hit',

  status = 'status',
}

const emitter = mitt<{
  [EventTypes.targetPoint]: Point
  [EventTypes.force]: ForcePercent
  // [EventTypes.angle]: number
  // [EventTypes.direction]: 'up' | 'down' | 'right' | 'left'
  [EventTypes.phi]: number
  [EventTypes.theta]: number
  [EventTypes.status]: BilliardsContext['status']
}>()

export default emitter
