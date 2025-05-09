import type { Point } from '.'
import mitt from 'mitt'

export enum EventTypes {
  point = 'point',
  force = 'force',
  direction = 'direction',

  cueStatus = 'cue-status'
}

const emitter = mitt<{
  [EventTypes.point]: Point
  [EventTypes.force]: number
  [EventTypes.direction]: 'up' | 'down' | 'right' | 'left'
  [EventTypes.cueStatus]: 'idle' | 'shooting' | 'finished'
}>()

export default emitter
