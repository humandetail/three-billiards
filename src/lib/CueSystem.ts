import type MainScene from '../central-control/MainScene'
import { ExtendedMesh } from 'enable3d'

import * as THREE from 'three'
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js'
import { BilliardsStatus, context, setContext } from '../central-control'
import config from '../config'
import { getIntersectionPoints, setGeometryColor } from '../utils'

export class Cue {
  private config = config.cue
  private segments = 128

  constructor() {}

  get jointRadius() {
    const {
      config: {
        tipRadius: a,
        shaftLength: b,
        buttLength: e,
        endRadius: d,
      },
    } = this
    const x = e * (d - a) / (b + e)
    return d - x
  }

  createCue() {
    const {
      config: {
        tipHeadLength,
        tipBodyLength,
        ferruleLength,
        shaftLength,
        buttLength,
      },
    } = this

    const [tipHead, tipBody] = this.createTip()
    const ferrule = this.createFerrule()
    const shaft = this.createShaft()
    const butt = this.createButt()

    let currentOffset = 0

    tipHead.applyMatrix4(new THREE.Matrix4().makeTranslation(0, currentOffset - tipHeadLength / 2, 0))
    currentOffset -= tipHeadLength

    tipBody.applyMatrix4(new THREE.Matrix4().makeTranslation(0, currentOffset - tipBodyLength / 2, 0))
    currentOffset -= tipBodyLength

    ferrule.applyMatrix4(new THREE.Matrix4().makeTranslation(0, currentOffset - ferruleLength / 2, 0))
    currentOffset -= ferruleLength

    shaft.applyMatrix4(new THREE.Matrix4().makeTranslation(0, currentOffset - shaftLength / 2, 0))
    currentOffset -= shaftLength

    butt.applyMatrix4(new THREE.Matrix4().makeTranslation(0, currentOffset - buttLength / 2, 0))

    const geometry = BufferGeometryUtils.mergeGeometries(
      [tipHead, tipBody, ferrule, shaft, butt],
      false,
    )

    geometry.rotateX(Math.PI / 2)
    const cue = new ExtendedMesh(
      geometry,
      new THREE.MeshPhongMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
      }),
    )

    cue.name = 'cue'

    return cue
  }

  private createTip() {
    const {
      config: {
        tipRadius,
        tipHeadLength,
        tipBodyLength,
      },
      segments,
    } = this

    const headGeo = new THREE.CylinderGeometry(tipRadius * 0.8, tipRadius, tipHeadLength, segments)
    const bodyGeo = new THREE.CylinderGeometry(tipRadius, tipRadius, tipBodyLength, segments)

    const color = new THREE.Color(0x0088FF)
    setGeometryColor(headGeo, color)
    setGeometryColor(bodyGeo, color)
    headGeo.name = 'tip-head'
    bodyGeo.name = 'tip-body'

    return [headGeo, bodyGeo]
  }

  private createFerrule() {
    const {
      config: {
        ferruleLength,
        tipRadius,
      },
      segments,
    } = this

    const ferruleGeo = new THREE.CylinderGeometry(tipRadius, tipRadius, ferruleLength, segments)
    setGeometryColor(ferruleGeo, new THREE.Color(0xFFFEFA))
    ferruleGeo.name = 'ferrule'

    return ferruleGeo
  }

  private createShaft() {
    const {
      config: {
        tipRadius: startRadius,
        shaftLength,
        jointRadius,
      },
      segments,
    } = this

    const shaftGeo = new THREE.CylinderGeometry(startRadius, jointRadius, shaftLength, segments)
    shaftGeo.name = 'shaft'
    setGeometryColor(shaftGeo, new THREE.Color(0xFBCB79))

    return shaftGeo
  }

  private createButt() {
    const {
      config: {
        buttLength,
        jointRadius,
        endRadius,
      },
      segments,
    } = this

    const buttGeo = new THREE.CylinderGeometry(jointRadius, endRadius, buttLength, segments)
    buttGeo.name = 'butt'
    setGeometryColor(buttGeo, new THREE.Color(0x282C38))
    return buttGeo
  }
}

export interface CameraOptions {
  fov: number
  aspect: number
  near: number
  far: number
}

export type ControlKey =
  | 'ArrowUp'
  | 'ArrowRight'
  | 'ArrowDown'
  | 'ArrowLeft'

export default class CueSystem {
  camera: THREE.PerspectiveCamera

  private cue = new Cue().createCue()

  impulseDirection = new THREE.Vector3()
  contactPoint = new THREE.Vector3()

  private ballRadius = config.ball.radius

  /** 力的方向 */
  private forceArrow = new THREE.ArrowHelper(
    new THREE.Vector3(), // 方向
    new THREE.Vector3(), // 位置
    0.5,
    '#ff0000', // 箭头颜色
  )

  /** 最大击球力度 */
  maxForce = 500
  /** 当前拉杆对应的力度 */
  #currentForce = 0
  /** 当前击球的力度 */
  #hitForce = 0

  #reqId = 0
  #shotDuration = 0.03
  #reduceStep = 0

  constructor(
    private mainScene: MainScene,
    private ball: ExtendedMesh,
    cameraOptions?: Partial<CameraOptions>,
  ) {
    this.camera = new THREE.PerspectiveCamera(
      cameraOptions?.fov ?? 75,
      cameraOptions?.aspect ?? 2,
      cameraOptions?.near ?? 0.1,
      cameraOptions?.far ?? 1000,
    )
    this.camera.name = 'cueCamera'
    this.cue.add(this.camera)
    this.cue.name = 'cue'
    this.cue.castShadow = true
    this.cue.receiveShadow = true
    this.mainScene.add.existing(this.cue)

    this.mainScene.add.existing(this.forceArrow)
  }

  get cueBasePosition() {
    return {
      x: 0,
      y: 0,
      z: 0,
    }
  }

  get ballPosition() {
    return this.ball.getWorldPosition(new THREE.Vector3())
  }

  /** 球杆末端到主球球心的距离 */
  get ballOffset() {
    return 1.2 * this.ballRadius
  }

  init() {
    // this.cue.visible = false
    this.forceArrow.visible = true

    this.cue.position.copy(this.cueBasePosition)

    this.setupEvents()
  }

  private setupEvents() {
    // window.addEventListener('click', (event) => {
    //   // 1. 将鼠标点击屏幕坐标转换为归一化设备坐标(NDC)
    //   const mouse = new THREE.Vector2()
    //   mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    //   mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    //   // 2. 设置 raycaster
    //   const raycaster = new THREE.Raycaster()
    //   raycaster.setFromCamera(mouse, this.camera)

    //   // 3. 定义球所在水平面（桌面）
    //   const planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), this.ball.getWorldPosition(new THREE.Vector3()).y - this.ballRadius)

    //   // 4. 计算射线与平面交点
    //   const intersectPoint = new THREE.Vector3()
    //   const intersects = raycaster.ray.intersectPlane(planeY, intersectPoint)

    //   if (intersects) {
    //     // 5. 计算相对于球心的方向向量
    //     const dir = this.ball.getWorldPosition(new THREE.Vector3()).clone().sub(intersectPoint)

    //     // 6. 计算 theta（绕Y轴水平角度，单位：度）
    //     // Math.atan2(z, x) 返回的是弧度
    //     let newTheta = Math.atan2(dir.z, dir.x) * (180 / Math.PI)
    //     // 你可以调整角度范围，比如保持 0-360
    //     if (newTheta < 0)
    //       newTheta += 360

    //     // 7. 更新 theta，重新设置杆子位置
    //     setContext('theta', newTheta)
    //   }
    // })

    // @todo 使用鼠标点击射线设置
    window.addEventListener('keydown', (e) => {
      if (!context.canIControl())
        return

      switch (e.key) {
        case 'ArrowLeft':
          setContext('theta', context.theta + 1)
          break
        case 'ArrowRight':
          setContext('theta', context.theta - 1)
          break
      }
    })
  }

  setMaxForce(force: number) {
    this.maxForce = force
    return this
  }

  hit() {
    if (context.force === 0)
      return

    this.#hitForce = context.force
    setContext('status', BilliardsStatus.Shooting)

    this.#reduceStep = this.#shotDuration

    // 执行击球动作
    this.takingTheShot()
    return this
  }

  private takingTheShot() {
    this.#reqId = requestAnimationFrame(this.takingTheShot.bind(this))

    if (context.force <= 0) {
      cancelAnimationFrame(this.#reqId)
      this.#reduceStep = 0
      // 给球施加方向力
      this.hitBall()
      return
    }

    this.#reduceStep += this.#shotDuration
    this.#currentForce -= this.#reduceStep
    setContext('force', context.force - this.#reduceStep)
  }

  private hitBall() {
    const { cue, ball } = this
    const contactPoint = getIntersectionPoints(cue, ball)
    if (!contactPoint) {
      // throw new Error('未命中球体，cue 方向可能对准错了')
      return
    }

    // // 显示冲量方向
    // const arrow = new THREE.ArrowHelper(cue.getWorldDirection(new THREE.Vector3()).clone(), cue.getWorldPosition(new THREE.Vector3()).clone(), 1, 'purple')
    // this.mainScene.add(arrow)

    // // 显示作用点
    // const marker = new THREE.Mesh(
    //   new THREE.SphereGeometry(0.003),
    //   new THREE.MeshBasicMaterial({ color: 0xFF0000 }),
    // )
    // marker.position.copy(contactPoint)
    // scene.add(marker)

    const impulseDirection = this.impulseDirection.clone().multiplyScalar(this.#hitForce * 500 / this.maxForce)

    const { x, y, z } = contactPoint
    this.ball.body.applyImpulse(impulseDirection, new THREE.Vector3(x, y, z))

    setContext('status', BilliardsStatus.ShotCompleted)
  }

  hide() {
    this.cue.visible = false
    this.forceArrow.visible = false
  }

  show() {
    this.update()
    this.cue.visible = true
    this.forceArrow.visible = true
  }

  /**
   * 设置杆子的位置
   * @param cue 杆子
   * @param ball 球
   * @param ballRadius 球半径
   * @param force 力
   * @param phi 杆子与 Z 轴的夹角
   * @param theta 杆子与 X 轴的夹角
   * @param offset 偏移量 targetPoint.y * safePercent
   */
  private setPosition(cue: THREE.Mesh, ball: THREE.Mesh, ballRadius: number, force: number, phi: number, theta: number, offset: number) {
    const distance = ballRadius * 1.3 + force / 5

    const thetaRad = THREE.MathUtils.degToRad(theta)
    const phiRad = THREE.MathUtils.degToRad(90 - phi)

    const ballPosition = ball.getWorldPosition(new THREE.Vector3()).clone()

    // 杆子指向方向向量 v
    const dx = Math.sin(phiRad) * Math.cos(thetaRad)
    const dy = Math.cos(phiRad)
    const dz = Math.sin(phiRad) * Math.sin(thetaRad)
    const v = new THREE.Vector3(dx, dy, dz).normalize()

    // y 轴方向
    const globalY = new THREE.Vector3(0, 1, 0)

    // 计算切面 z 轴方向 (在垂直v的平面上)
    let zAxis = globalY.clone().sub(v.clone().multiplyScalar(globalY.dot(v)))
    if (zAxis.lengthSq() < 1e-6) {
      zAxis = new THREE.Vector3(1, 0, 0).sub(v.clone().multiplyScalar(v.dot(new THREE.Vector3(1, 0, 0))))
    }
    zAxis.normalize()

    // 计算点 B
    const B = ballPosition.add(zAxis.clone().multiplyScalar(ballRadius * offset))

    // 计算杆子中心点 A
    const A = B.clone().add(v.clone().multiplyScalar(distance))
    cue.position.copy(A)

    // 设置杆子方向，使Z轴指向杆子方向（杆头朝向球心方向）
    const defaultDir = new THREE.Vector3(0, 0, 1)
    const direction = v.clone().negate()
    const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultDir, direction)
    cue.quaternion.copy(quaternion)

    this.impulseDirection.copy(direction)

    this.forceArrow.setDirection(cue.getWorldDirection(new THREE.Vector3()).clone())
    this.forceArrow.position.copy(ball.getWorldPosition(new THREE.Vector3()).clone())
  }

  update() {
    this.setPosition(
      this.cue,
      this.ball,
      this.ballRadius,
      context.force,
      context.phi,
      context.theta,
      -1 * context.targetPoint.y * context.safePercent,
    )
  }
}
