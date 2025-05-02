import mitt from 'mitt'
import { Point } from '.'

export enum EventTypes {
  point = 'point',
  force = 'force',
  direction = 'direction'
}

const emitter =  mitt<{
  [EventTypes.point]: Point
  [EventTypes.force]: number
  [EventTypes.direction]: 'up' | 'down' | 'right' | 'left'
}>()

export default emitter
