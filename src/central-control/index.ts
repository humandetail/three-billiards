import type { BilliardsContext } from './Context'
import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import { getConfig, PARAMETERS } from '../config'

import {
  Ball,
  CueSystem,
  ForceHelper,
  Layout,
  PointHelper,
  RegulatorHelper,
  Table,
} from '../lib'
import context, { BilliardsStatus, setContext } from './Context'
import emitter, { EventTypes } from './Emitter'

export {
  type BilliardsContext,
  BilliardsStatus,
  context,
  emitter,

  EventTypes,
  setContext,
}

export function setup() {
  const layout = new Layout(document.querySelector('#main-canvas') as HTMLCanvasElement)

  const config = getConfig()

  const table = new Table(layout)
  table.init()

  const ball = new Ball(layout)
  ball.init()

  const cueSystem = new CueSystem(layout.renderer, layout.scene, ball.mainBall, ball.mainBallBody)
  layout.addCueSystem(cueSystem)

  const pointHelper = new PointHelper('#point-helper')
  const forceHelper = new ForceHelper('#force-helper')
  const horizontalRegulatorHelper = new RegulatorHelper('#horizontal-regulator-helper', 'horizontal')
  const verticalRegulatorHelper = new RegulatorHelper('#vertical-regulator-helper', 'vertical')

  emitter.on(EventTypes.point, (point) => {
    // 击球安全区是 2/3
    cueSystem.setCuePosition(
      (2 / 3) * config.ball.radius * point.x,
      (2 / 3) * config.ball.radius * point.y,
      0,
    )
  })
  emitter.on(EventTypes.force, (force) => {
    cueSystem.currentForce = force
  })
  emitter.on(EventTypes.direction, (direction) => {
    switch (direction) {
      case 'up':
        cueSystem.setControlKey('ArrowUp', true, true)
        break
      case 'down':
        cueSystem.setControlKey('ArrowDown', true, true)
        break
      case 'right':
        cueSystem.setControlKey('ArrowRight', true, true)
        break
      case 'left':
        cueSystem.setControlKey('ArrowLeft', true, true)
        break
    }
  })

  emitter.on(EventTypes.status, (status) => {
    switch (status) {
      case BilliardsStatus.Staging:
        break

      case BilliardsStatus.Release:
        cueSystem.hit()
        break

      case BilliardsStatus.Shooting:
        break

      case BilliardsStatus.ShotCompleted:
        cueSystem.hide()
        forceHelper.progress = 0
        pointHelper.resetTarget()
        setContext('canCheckBody', true)
        break

      case BilliardsStatus.Idle:
      default:
        console.log('Idle?')
        cueSystem.show()
        setContext('renderRequested', true)
        break
    }
  })

  setTimeout(() => {
    setContext('renderRequested', true)
  })
}

// export function setup() {
//   const layout = new Layout(document.querySelector('#main-canvas') as HTMLCanvasElement)
//   setTimeout(() => {
//     setContext('renderRequested', true)
//   })

//   const table = new Table(layout)
//   table.init()

//   const ball = new Ball(layout)
//   ball.init()
// }
