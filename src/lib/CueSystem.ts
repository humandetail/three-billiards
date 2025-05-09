import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PARAMETERS } from '../config';

import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getIntersectionPoints } from '../utils';
import emitter, { EventTypes } from '../utils/Emitter';

const setGeometryColor = (geometry: THREE.BufferGeometry, color: THREE.Color) => {
  const colors: Float32Array = new Float32Array(geometry.attributes.position.count * 3)
  for (let i = 0; i < colors.length; i += 3) {
    colors[i] = color.r
    colors[i + 1] = color.g
    colors[i + 2] = color.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

class Cue {
  private config = PARAMETERS.cue
  private segments = 128

  get jointRadius() {
    const {
      config: {
        tipRadius: a,
        shaftLength: b,
        buttLength: e,
        endRadius: d,
      }
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
        poleLength,
      },
    } = this

    const halfPoleLength = poleLength / 2

    const [tipHead, tipBody] = this.createTip()
    const ferrule = this.createFerrule()
    const shaft = this.createShaft()
    const butt = this.createButt()

    tipHead.applyMatrix4(new THREE.Matrix4().makeTranslation(0, halfPoleLength - tipHeadLength / 2, 0))
    tipBody.applyMatrix4(new THREE.Matrix4().makeTranslation(0, halfPoleLength - tipHeadLength - tipBodyLength / 2, 0))
    ferrule.applyMatrix4(new THREE.Matrix4().makeTranslation(0, halfPoleLength - tipHeadLength - tipBodyLength - ferruleLength / 2, 0))
    shaft.applyMatrix4(new THREE.Matrix4().makeTranslation(0, halfPoleLength - tipHeadLength - tipBodyLength - ferruleLength - shaftLength / 2, 0))
    butt.applyMatrix4(new THREE.Matrix4().makeTranslation(0, halfPoleLength - tipHeadLength - tipBodyLength - ferruleLength - shaftLength - buttLength / 2, 0))

    tipHead.rotateX(Math.PI / 2)
    tipBody.rotateX(Math.PI / 2)
    ferrule.rotateX(Math.PI / 2)
    shaft.rotateX(Math.PI / 2)
    butt.rotateX(Math.PI / 2)

    const cue = new THREE.Mesh(
      BufferGeometryUtils.mergeGeometries(
        [tipHead, tipBody, ferrule, shaft, butt,],
        false
      ),
      new THREE.MeshPhongMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
      })
    )

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
  controls: OrbitControls

  private cue = new Cue().createCue()

  /** 垂直角度 (0到π) */
  private phi = Math.PI / 2
  /** 水平角度 (0到2π) */
  private theta = 0
  private ballRadius = PARAMETERS.ballRadius

  /** 力的方向 */
  private forceArrow = new THREE.ArrowHelper(
    new THREE.Vector3(), // 方向
    new THREE.Vector3(), // 位置
    30,
    '#ff0000', // 箭头颜色
  )
  /** 球杆的指向 */
  private rayArrow = new THREE.ArrowHelper(
    new THREE.Vector3(), // 方向
    new THREE.Vector3(), // 位置
    (PARAMETERS.cue.poleLength) / 2,
    '#0000ff', // 箭头颜色
  )

  // #rotationSpeed = 0.005
  #rotationSpeed = 0.1

  keys = new Map<ControlKey, boolean>([
    ['ArrowUp', false],
    ['ArrowRight', false],
    ['ArrowDown', false],
    ['ArrowLeft', false],
  ])

  /** 最大击球力度 */
  private maxForce = 500
  /** 当前拉杆对应的力度 */
  #currentForce = 0
  /** 当前击球的力度 */
  #hitForce = 0

  #reqId = 0
  #shotDuration = 300 / 16
  #reduceStep = 0

  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    private ball: THREE.Mesh,
    private ballBody: CANNON.Body,
    cameraOptions?: Partial<CameraOptions>
  ) {
    this.camera = new THREE.PerspectiveCamera(
      cameraOptions?.fov ?? 75,
      cameraOptions?.aspect ?? 2,
      cameraOptions?.near ?? 0.1,
      cameraOptions?.far ?? 1000
    )
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)

    this.setup()
  }

  get cueBasePosition() {
    return {
      x: 0,
      y: 0,
      z: 0,
    }
  }

  get ballPosition() {
    return this.ball.position
  }

  /** 球杆末端到主球球心的距离 */
  get ballOffset() {
    return 1.2 * this.ballRadius
  }

  /** 相机到主球球心的距离 */
  get cameraDistance() {
    return PARAMETERS.cue.poleLength / 2 + this.ballOffset
  }

  get cameraMinY() {
    return this.ballPosition.y + this.ballRadius
  }

  /** 相机旋转（移动）速度 */
  get rotationSpeed() {
    return this.#rotationSpeed
  }
  set rotationSpeed(speed) {
    this.#rotationSpeed = speed
  }

  get currentForce() {
    return this.#currentForce
  }
  set currentForce(force) {
    const diff = force - this.#currentForce
    this.#currentForce = force
    this.setCuePositionByForce(diff)
  }

  private setup() {
    this.cue.rotation.x = -Math.PI
    this.camera.add(this.cue)
    this.scene.add(this.camera)
    this.renderer.render(this.scene, this.camera)

    this.scene.add(this.forceArrow)
    this.scene.add(this.rayArrow)

    this.cue.visible = false
    // this.rayArrow.visible = false

    this.cue.position.copy(this.cueBasePosition)
    this.updateCameraPosition()

    this.setupEvents()
  }

  private setupEvents() {
    document.addEventListener('keydown', this.onKeydown)
  }

  setCuePosition(x = 0, y = 0, z = 0) {
    this.cue.position.set(x, y, z)
  }

  setCuePositionByForce(diff: number) {
    const direction = new THREE.Vector3(0, 0, 1) // 局部Z轴正方向
    direction.applyQuaternion(this.cue.quaternion) // 转换为世界坐标
    this.cue.position[diff > 0 ? 'add' : 'sub'](
      direction.multiplyScalar(-10 * Math.abs(diff) / this.maxForce)
    )
    return this
  }

  resetCuePosition() {
    this.cue.position.copy(this.ballPosition)
  }

  setControlKey(key: ControlKey, val = false) {
    this.keys.set(key, val)
    return this
  }

  setMaxForce(force: number) {
    this.maxForce = force
    return this
  }

  hit() {
    console.log(this.currentForce)
    if (this.currentForce === 0) return

    emitter.emit(EventTypes.cueStatus, 'shooting')

    this.#hitForce = this.currentForce
    this.#reduceStep = this.currentForce / this.#shotDuration

    // 执行击球动作
    this.takingTheShot()
    return this
  }

  private takingTheShot() {
    console.log(this.#reduceStep)
    this.#reqId = requestAnimationFrame(this.takingTheShot.bind(this))
    if (this.currentForce <= 0) {
      cancelAnimationFrame(this.#reqId)
      this.#reduceStep = 0
      // 给球施加方向力
      this.hitBall()
      return
    }

    this.#reduceStep += this.#shotDuration
    this.currentForce -= this.#reduceStep
  }

  private hitBall() {
    //  1. 获取球杆看向的方向
    const direction = new THREE.Vector3()
    this.cue.getWorldDirection(direction)

    // 2. 转换为Cannon.js向量并标准化
    const forceDirection = new CANNON.Vec3(
      direction.x,
      direction.y,
      direction.z,
    )

    // 3. 乘以力的大小（牛顿）
    forceDirection.scale(1000, forceDirection)

    const applyPoint = getIntersectionPoints(this.cue, this.ball)
    if (!applyPoint) {
      return
    }
    const { x, y, z } = applyPoint
    this.ballBody.applyForce(forceDirection, new CANNON.Vec3(x, y, z))

    // 画出受力点
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 128, 128),
      new THREE.MeshPhongMaterial({ color: 'purple' }),
    )
    // mesh.position.copy(applyPoint)
    mesh.position.set(x, y, z)
    this.scene.add(mesh)

    this.#hitForce = 0
    emitter.emit(EventTypes.cueStatus, 'finished')
  }

  private onKeydown = (e: KeyboardEvent) => {
    this.resetKeys()
    switch (e.code) {
      case 'ArrowUp':
      case 'ArrowRight':
      case 'ArrowDown':
      case 'ArrowLeft':
        this.keys.set(e.code, true)
        break
      case 'Space':
        break
    }
  }

  resetKeys() {
    for (const key of this.keys.keys()) {
      this.keys.set(key, false)
    }
  }

  private updateCameraPosition() {
    const {
      phi,
      theta,
      ballPosition,
      ballRadius,
      cameraDistance,
      cameraMinY,
      camera,
    } = this

    // 计算原始相机位置
    const rawX = ballPosition.x + cameraDistance * Math.sin(phi) * Math.cos(theta)
    const rawY = ballPosition.y + cameraDistance * Math.cos(phi)
    const rawZ = ballPosition.z + cameraDistance * Math.sin(phi) * Math.sin(theta)

    // 调整Y坐标确保不低于最小高度
    const adjustedY = Math.max(cameraMinY, rawY)

    // 如果Y坐标被调整，则需要重新计算XZ位置以保持距离
    if (adjustedY > rawY) {
      // 计算新的phi角度来保持 cameraDistance 单位距离
      const newPhi = Math.acos((adjustedY - ballPosition.y) / cameraDistance)
      this.phi = newPhi

      // 重新计算XZ位置
      const newX = ballPosition.x + cameraDistance * Math.sin(newPhi) * Math.cos(theta)
      const newZ = ballPosition.z + cameraDistance * Math.sin(newPhi) * Math.sin(theta)

      camera.position.set(newX, adjustedY, newZ)
    }
    else {
      camera.position.set(rawX, rawY, rawZ)
    }

    camera.lookAt(ballPosition)
  }

  update() {
    this.controls.update()

    // 处理键盘输入
    if (this.keys.get('ArrowUp')) {
      // this.phi = Math.max(0.1, this.phi - this.rotationSpeed)
      this.phi = 0
    }
    if (this.keys.get('ArrowDown')) {
      // this.phi = Math.min(Math.PI - 0.1, this.phi + this.rotationSpeed)
      this.phi = Math.PI
    }
    if (this.keys.get('ArrowRight')) {
      this.theta -= this.rotationSpeed
    }
    if (this.keys.get('ArrowLeft')) {
      this.theta += this.rotationSpeed
    }
    this.resetKeys()

    this.updateCameraPosition()

    // 更新力的方向
    this.forceArrow.setDirection(this.camera.getWorldDirection(new THREE.Vector3()).normalize())
    this.forceArrow.position.copy(this.ballPosition)

    // // 更新球杆指向
    this.rayArrow.setDirection(this.cue.getWorldDirection(new THREE.Vector3()).normalize())
    this.rayArrow.position.copy(this.cue.getWorldPosition(new THREE.Vector3()))
  }
}
