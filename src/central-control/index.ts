import type { BilliardsContext } from './Context'
import { PhysicsLoader, Project } from 'enable3d'

import config from '../config'
import {
  Ball,
  CueSystem,
  ForceHelper,
  PointHelper,
  RegulatorHelper,
  Table,
} from '../lib'
import AngleDemodulator from '../lib/helper/AngleDemodulator'
import context, { BilliardsStatus, setContext } from './Context'

import emitter, { EventTypes } from './Emitter'
import MainScene from './MainScene'

export {
  type BilliardsContext,
  BilliardsStatus,
  context,
  emitter,

  EventTypes,
  setContext,
}

async function loadPhysics() {
  return new Promise<MainScene>((resolve) => {
    PhysicsLoader('/ammo', () => {
      const project = new Project({ scenes: [MainScene] })
      const mainScene = project.scenes.values().next().value as MainScene
      resolve(mainScene)
    })
  })
}

export async function setup() {
  // const mainScene = await loadPhysics()

  // const container = document.querySelector('#main') as HTMLElement
  // container.appendChild(mainScene.renderer.domElement)
  // const handleResize = () => {
  //   mainScene.renderer.setSize(container.clientWidth, container.clientHeight)
  //   if ((mainScene.camera as any)?.aspect) {
  //     ;(mainScene.camera as any).aspect = container.clientWidth / container.clientHeight
  //   }
  //   ;(mainScene.camera as any).updateProjectionMatrix()
  // }
  // handleResize()
  // window.addEventListener('resize', handleResize)

  // const table = new Table(mainScene)
  // table.init()

  // const ball = new Ball(mainScene)
  // ball.init()

  // const cueSystem = new CueSystem(mainScene, ball.mainBall)
  // cueSystem.init()

  // mainScene.setCueSystem(cueSystem)

  // const pointHelper = new PointHelper('#point-helper')
  // const forceHelper = new ForceHelper('#force-helper')
  // // eslint-disable-next-line no-new
  // new RegulatorHelper('#horizontal-regulator-helper', 'horizontal')
  // // eslint-disable-next-line no-new
  // new RegulatorHelper('#vertical-regulator-helper', 'vertical')

  // new AngleDemodulator('#angle-demodulator')
  // new PointHelper('#point-controller-container')
  new ForceHelper('#force-controller-container')

  // // 场景初始化完毕
  // mainScene.init()

  // // setTimeout(() => {
  // //   mainScene.setBallPosition(mainScene.mainBall!, { x: 0, z: 0 })
  // // }, 1000)

  // emitter.on(EventTypes.point, (point) => {
  //   // 击球安全区是 2/3
  //   cueSystem.setCuePosition(
  //     (2 / 3) * config.ball.radius * point.x,
  //     (2 / 3) * config.ball.radius * point.y,
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

  // emitter.on(EventTypes.status, (status) => {
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
  //       break

  //     case BilliardsStatus.Idle:
  //     default:
  //       cueSystem.show()
  //       break
  //   }
  // })
}
