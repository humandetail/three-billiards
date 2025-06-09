import type { BilliardsContext } from './Context'
import { PhysicsLoader, Project, THREE } from 'enable3d'

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
  const appPath = import.meta.env.VITE_APP_PATHNAME
  return new Promise<MainScene>((resolve) => {
    PhysicsLoader(`${appPath.replace(/\/$/, '')}/ammo`, () => {
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
  cueSystem.update()

  mainScene.setCueSystem(cueSystem)

  const pointHelper = new PointHelper('#point-helper')
  const forceHelper = new ForceHelper('#force-helper')
  const angleHelper = new AngleDemodulator('#angle-controller')

  // eslint-disable-next-line no-new
  new RegulatorHelper('#horizontal-regulator-helper')

  const releaseBtn = document.querySelector<HTMLElement>('#btn-release')!

  releaseBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    cueSystem.hit()
  })

  const oAccurateRegulatorModal = document.querySelector<HTMLElement>('#accurate-regulator-modal')!

  oAccurateRegulatorModal.addEventListener('click', () => {
    setContext('status', BilliardsStatus.Idle)
  })

  // 场景初始化完毕
  mainScene.init()

  emitter.on(EventTypes.targetPoint, () => {
    cueSystem.update()
  })

  emitter.on(EventTypes.phi, () => {
    cueSystem.update()
    pointHelper.draw()
  })

  emitter.on(EventTypes.force, (force) => {
    cueSystem.update()
    if (force > 0) {
      releaseBtn.style.visibility = 'visible'
    }
    else {
      releaseBtn.style.visibility = 'hidden'
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
        break

      case BilliardsStatus.Advanced:
        moveHelper()
        break

      case BilliardsStatus.Idle:
      default:
        if (context.prevStatus === BilliardsStatus.Advanced) {
          moveHelper()
          return
        }
        cueSystem.show()
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

  window.addEventListener('click', (event) => {
    const mainBall = mainScene.mainBall!

    // 将鼠标点击屏幕坐标转换为归一化设备坐标(NDC)
    const mouse = new THREE.Vector2()
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    // 设置 raycaster
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, mainScene.camera)

    const intersectedObjects = raycaster.intersectObjects(mainScene.scene.children.filter(child => ['pocket', 'cushion', 'table', 'ball'].some(type => child.name.startsWith(type))))

    if (intersectedObjects.length) {
      // 计算相对于球心的方向向量
      const dir = mainBall.getWorldPosition(new THREE.Vector3()).clone().sub(intersectedObjects[0].point)

      // 计算 theta（绕Y轴水平角度，单位：度）
      let newTheta = Math.atan2(dir.z, dir.x) * (180 / Math.PI)
      if (newTheta < 0)
        newTheta += 360

      // 更新 theta，重新设置杆子位置
      setContext('theta', newTheta)
    }
  })
}

// export async function setup() {
//   const mainScene = await loadPhysics()
//   const container = document.querySelector('#main') as HTMLElement
//   container.appendChild(mainScene.renderer.domElement)
//   const handleResize = () => {
//     mainScene.renderer.setSize(container.clientWidth, container.clientHeight)
//     if ((mainScene.camera as any)?.aspect) {
//       ;(mainScene.camera as any).aspect = container.clientWidth / container.clientHeight
//     }
//     ;(mainScene.camera as any).updateProjectionMatrix()
//   }
//   handleResize()
//   window.addEventListener('resize', handleResize)
// }
