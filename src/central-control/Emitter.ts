import type { BilliardsContext } from './Context'
import type Player from './Player'
import mitt from 'mitt'

export enum EventTypes {
  status = 'status',
  cueStatus = 'cueStatus',
  switchPlayer = 'switchPlayer',

  remainingOperationTime = 'remainingOperationTime',
  players = 'players',
  activePlayer = 'activePlayer',
  targetBalls = 'targetBalls',
}

const emitter = mitt<{
  [EventTypes.status]: BilliardsContext['status']
  [EventTypes.cueStatus]: BilliardsContext['cueStatus']
  [EventTypes.remainingOperationTime]: number
  [EventTypes.players]: Player[]
  [EventTypes.activePlayer]: string
  [EventTypes.targetBalls]: Player
  [EventTypes.switchPlayer]: void
}>()

export default emitter
