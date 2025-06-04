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
  const mainScene = await loadPhysics()

  const container = document.querySelector('#main') as HTMLElement
  container.appendChild(mainScene.renderer.domElement)
  const handleResize = () => {
    mainScene.renderer.setSize(container.clientWidth, container.clientHeight)
    if ((mainScene.camera as any)?.aspect) {
      ;(mainScene.camera as any).aspect = container.clientWidth / container.clientHeight
    }
    ;(mainScene.camera as any).updateProjectionMatrix()
  }
  handleResize()
  window.addEventListener('resize', handleResize)

  const table = new Table(mainScene)
  table.init()

  const ball = new Ball(mainScene)
  ball.init()

  const cueSystem = new CueSystem(mainScene, ball.mainBall)
  cueSystem.init()

  mainScene.setCueSystem(cueSystem)

  const pointHelper = new PointHelper('#point-helper')
  const forceHelper = new ForceHelper('#force-helper')
  const angleHelper = new AngleDemodulator('#angle-controller')

  new RegulatorHelper('#horizontal-regulator-helper')

  const releaseBtn = document.querySelector<HTMLElement>('#btn-release')!

  releaseBtn.addEventListener('click', e => {
    e.stopPropagation()
    // @todo - 击球
  })

  const oAccurateRegulatorModal = document.querySelector<HTMLElement>('#accurate-regulator-modal')!

  oAccurateRegulatorModal.addEventListener('click', () => {
    setContext('status', BilliardsStatus.Idle)
  })

  // 场景初始化完毕
  mainScene.init()

  // setTimeout(() => {
  //   mainScene.setBallPosition(mainScene.mainBall!, { x: 0, z: 0 })
  // }, 1000)

  emitter.on(EventTypes.targetPoint, (point) => {
    // 击球安全区是 2/3
    cueSystem.setCuePosition(
      context.safePercent * config.ball.radius * point.x,
      context.safePercent * config.ball.radius * point.y,
      0,
    )
  })
  emitter.on(EventTypes.force, (force) => {
    cueSystem.currentForce = force
    if (force > 0) {
      releaseBtn.style.visibility = 'visible'
    }
    else {
      releaseBtn.style.visibility = 'hidden'
    }
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

  function moveHelper() {
    if (context.isAdvanced()) {
      oAccurateRegulatorModal.style.display = 'flex'
      angleHelper.el.style.visibility = 'visible'

      const pointController = document.querySelector<HTMLElement>('#point-controller')!
      const forceController = document.querySelector<HTMLElement>('#force-controller')!

      pointController.appendChild(pointHelper.el)
      forceController.appendChild(forceHelper.el)

      const pointRect = pointController.getBoundingClientRect()
      pointHelper.handleResize(pointRect.width, pointRect.height)
      angleHelper.handleResize()
    }
    else {
      oAccurateRegulatorModal.style.display = 'none'
      const oRightSizeHelper = document.querySelector('#right-side-helper')!
      const rect = oRightSizeHelper.getBoundingClientRect()

      oRightSizeHelper.appendChild(pointHelper.el)
      oRightSizeHelper.appendChild(forceHelper.el)

      pointHelper.handleResize(rect.width, rect.width)
    }
  }

  emitter.on(EventTypes.status, (status) => {
    console.log('status', status)
    switch (status) {
      case BilliardsStatus.Staging:
        break

      case BilliardsStatus.Release:
        // cueSystem.hit()
        break

      case BilliardsStatus.Shooting:
        break

      case BilliardsStatus.ShotCompleted:
        // cueSystem.hide()
        break

      case BilliardsStatus.Advanced:
        console.log('1')
        moveHelper()
        break

      case BilliardsStatus.Idle:
      default:
        if (context.prevStatus === BilliardsStatus.Advanced) {
          moveHelper()
        }
        // cueSystem.show()
        forceHelper.progress = 0
        pointHelper.resetTarget()
        releaseBtn.style.visibility = 'hidden'

        if (context.inPocketBalls.has(mainScene.mainBall!)) {
          mainScene.setBallPosition(mainScene.mainBall!, mainScene.mainBallInitialPosition)
        }

        if (context.inPocketBalls.size === 15) {
          // 游戏结束
          // eslint-disable-next-line no-alert
          alert('游戏结束')
        }
        break
    }
  })
}
