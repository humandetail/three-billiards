import emitter, { EventTypes } from './Emitter'
import context, { setContext, BilliardsContext, BilliardsStatus } from './Context'
import {
  Layout,
  Table,
  Ball,
  CueSystem,
  PointHelper,
  ForceHelper,
  RegulatorHelper,
} from '../lib'
import { PARAMETERS } from '../config'

export {
  context,
  setContext,
  BilliardsStatus,
  type BilliardsContext,
  
  emitter,
  EventTypes
}

export function setup() {
  const layout = new Layout(document.querySelector('#main-canvas') as HTMLCanvasElement)

  const table = new Table(layout)

  table.makeTable()
  // const ball = new Ball(layout)

  // const cueSystem = new CueSystem(layout.renderer, layout.scene, ball.mainBall, ball.mainBallBody)
  // layout.addCueSystem(cueSystem)

  // const pointHelper = new PointHelper('#point-helper')
  // const forceHelper = new ForceHelper('#force-helper')
  // const horizontalRegulatorHelper = new RegulatorHelper('#horizontal-regulator-helper', 'horizontal')
  // const verticalRegulatorHelper = new RegulatorHelper('#vertical-regulator-helper', 'vertical')

  // emitter.on(EventTypes.point, (point) => {
  //   // 击球安全区是 2/3
  //   cueSystem.setCuePosition(
  //     (2 / 3) * PARAMETERS.ballRadius * point.x,
  //     (2 / 3) * PARAMETERS.ballRadius * point.y,
  //     0,
  //   )
  // })
  // emitter.on(EventTypes.force, (force) => {
  //   cueSystem.currentForce = force
  // })
  // emitter.on(EventTypes.direction, (direction) => {
  //   switch (direction) {
  //     case 'up':
  //       cueSystem.setControlKey('ArrowUp', true, true)
  //       break
  //     case 'down':
  //       cueSystem.setControlKey('ArrowDown', true, true)
  //       break
  //     case 'right':
  //       cueSystem.setControlKey('ArrowRight', true, true)
  //       break
  //     case 'left':
  //       cueSystem.setControlKey('ArrowLeft', true, true)
  //       break
  //   }
  // })

  // emitter.on(EventTypes.status, status => {
  //   switch (status) {
  //     case BilliardsStatus.Staging:
  //       break

  //     case BilliardsStatus.Release:
  //       cueSystem.hit()
  //       break

  //     case BilliardsStatus.Shooting:
  //       break

  //     case BilliardsStatus.ShotCompleted:
  //       cueSystem.hide()
  //       forceHelper.progress = 0
  //       pointHelper.resetTarget()
  //       setContext('canCheckBody', true)
  //       break

  //     case BilliardsStatus.Idle:
  //     default:
  //       console.log('Idle?')
  //       cueSystem.show()
  //       setContext('renderRequested', true)
  //       break
  //   }
  // })

  setTimeout(() => {
    setContext('renderRequested', true)
  })
}
