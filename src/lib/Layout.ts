import * as CANNON from 'cannon'
import CannonDebugger from 'cannon-es-debugger'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { getTexturePath } from '../utils'

export default class Layout {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls!: OrbitControls

  world!: CANNON.World
  cannonDebugger!: any

  showHelper = true
  helpers: (THREE.PointLightHelper | any)[] = []

  isCameraMoving = false

  #sceneObjects = new Map<string, THREE.Object3D>()

  balls: THREE.Object3D[] = []
  ballsBody: CANNON.Body[] = []
  ballMaterial = new CANNON.Material('ball')

  boxes: THREE.Object3D[] = []
  boxesBody: CANNON.Body[] = []

  tableMaterial = new CANNON.Material('table')
  rubberMaterial = new CANNON.Material('rubber')

  cue?: THREE.Object3D

  constructor(protected canvas: HTMLCanvasElement) {
    const rect = this.canvas.getBoundingClientRect()
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(75, rect.width / rect.height, 0.1, 1000)
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    })
    this.camera.position.set(-200, 200, 0)
    // this.camera.position.set(0, 200, 0)
    this.camera.lookAt(0, 0, 0)

    this.renderer.setClearColor(0xFFFFFF)
    this.renderer.setPixelRatio(window.devicePixelRatio)

    this.init()

    this.render()
  }

  init() {
    this.initWorld()

    this.initObserver()
    this.initLight()
    this.initControls()
    this.initGround()

    this.initEvents()

    if (this.showHelper) {
      this.scene.add(...this.helpers)

      this.scene.add(new THREE.AxesHelper(10))
      // this.scene.add(new THREE.GridHelper(this.renderer.domElement.width, this.renderer.domElement.height))
    }
  }

  initWorld() {
    const world = new CANNON.World()
    // 设置重力
    world.gravity.set(0, -9.82 * 10, 0)
    world.broadphase = new CANNON.NaiveBroadphase() // 使用默认碰撞检测
    world.solver.iterations = 10 // 提高碰撞精度

    // 设置摩擦系数和弹性系数
    const ballBallContact = new CANNON.ContactMaterial(this.ballMaterial, this.ballMaterial, {
      friction: 0.02, // 摩擦系数（0=无摩擦，1=完全摩擦）
      restitution: 0.9, // 弹性系数（0=完全非弹性，1=完全弹性）
    })

    const ballTableContact = new CANNON.ContactMaterial(this.ballMaterial, this.tableMaterial, {
      friction: 0.2, // 摩擦系数（0=无摩擦，1=完全摩擦）
      restitution: 0.5, // 弹性系数（0=完全非弹性，1=完全弹性）
    })

    const ballRubberContact = new CANNON.ContactMaterial(this.ballMaterial, this.rubberMaterial, {
      friction: 0.1, // 摩擦系数（0=无摩擦，1=完全摩擦）
      restitution: 0.8, // 弹性系数（0=完全非弹性，1=完全弹性）
    })

    world.addContactMaterial(ballBallContact)
    world.addContactMaterial(ballTableContact)
    world.addContactMaterial(ballRubberContact)

    this.world = world

    this.cannonDebugger = CannonDebugger(this.scene, this.world as any)
  }

  initEvents() {
    this.controls.addEventListener('change', () => {
      this.isCameraMoving = true
      setTimeout(() => {
        this.isCameraMoving = false
      }, 200)
    })
  }

  initObserver() {
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry.target === this.canvas) {
        const { width, height } = entry.contentRect
        this.handleResize(width, height)
      }
    })
    observer.observe(this.canvas)
  }

  initLight() {
    const light = new THREE.PointLight(0xFFFFFF, 10000)
    light.position.set(0, 180, 0)

    light.castShadow = true

    this.scene.add(light)

    this.helpers.push(new THREE.PointLightHelper(light))

    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.5)
    this.scene.add(ambientLight)
  }

  /**
   * 地板最顶面所在位置就是 y = 0
   */
  initGround() {
    const texture = new THREE.TextureLoader().load(getTexturePath('ground.jpg'))
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 2)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshPhongMaterial({
        map: texture,
      }),
      // new THREE.MeshBasicMaterial({
      //   color: 'gray',
      // }),
    )
    ground.position.y = 0
    ground.rotation.x = THREE.MathUtils.degToRad(-90)

    ground.receiveShadow = true

    this.scene.add(ground)

    // 创建 Cannon.js 的静态地板（质量 mass=0 表示静态）
    const floorShape = new CANNON.Plane()
    const floorBody = new CANNON.Body({
      mass: 0, // mass=0 表示静态物体（不受重力影响）
      shape: floorShape,
    })
    floorBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0), // 绕 x 轴旋转
      -Math.PI / 2, // 旋转 -90 度（让平面平铺）
    )
    floorBody.position.set(0, 0, 0) // 设置位置
    this.world.addBody(floorBody)
  }

  getSceneObject(name: string) {
    return this.#sceneObjects.get(name)
  }

  makeSceneObject(name: string, parent: THREE.Object3D = this.scene) {
    const object = new THREE.Object3D()
    this.#sceneObjects.set(name, object)
    parent.add(object)
    return object
  }

  addObject(name: 'root' | string, object: THREE.Object3D) {
    if (name === 'root') {
      this.scene.add(object)
    }
    else {
      if (!this.#sceneObjects.has(name)) {
        this.makeSceneObject(name)
      }
      this.#sceneObjects.get(name)!.add(object)
    }

    object.castShadow = true
    object.receiveShadow = true

    // this.boxes.push(object)
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.maxDistance = 500
    this.controls.minDistance = 100
  }

  syncPhysicsToGraphics() {
    this.balls.forEach((ball, index) => {
      const ballBody = this.ballsBody[index]
      ball.position.set(
        Number.parseFloat(ballBody.position.x.toFixed(4)),
        Number.parseFloat(ballBody.position.y.toFixed(4)),
        Number.parseFloat(ballBody.position.z.toFixed(4)),
      ) // 同步位置

      ball.quaternion.copy(ballBody.quaternion) // 同步旋转
    })

    // this.boxes.forEach((box, index) => {
    //   const body = this.boxesBody[index]
    //   box.position.copy(body.position) // 同步位置
    //   box.quaternion.copy(body.quaternion) // 同步旋转
    // })
  }



  updateCuePosition() {
    const cue = this.cue
    const camera = this.camera
    const whiteBall = this.balls.find(ball => ball.name === 'ball-0')!

    if (!cue || !whiteBall) return

    const cueDistance = 1.2; // 球杆与白球的初始距离
    const angle = Math.atan2(camera.position.x - whiteBall.position.x, camera.position.z - whiteBall.position.z);

    cue.position.x = whiteBall.position.x - Math.sin(angle) * cueDistance;
    cue.position.z = whiteBall.position.z - Math.cos(angle) * cueDistance;
    cue.rotation.y = -angle; // 球杆朝向白球
    // cue.lookAt(whiteBall.position);
  }

  hitBall(power = 10) {
    const cue = this.cue
    const camera = this.camera
    const whiteBallIndex = this.balls.findIndex(ball => ball.name === 'ball-0')
    if (!cue || whiteBallIndex === -1) return

    const whiteBall = this.balls[whiteBallIndex]
    const whiteBallBody = this.ballsBody[whiteBallIndex]

    // 1. 计算击球方向（从球杆指向白球）
    const direction = new CANNON.Vec3(
        whiteBall.position.x - cue.position.x,
        0,
        whiteBall.position.z - cue.position.z
    );

    console.log(direction)

    // 2. 施加力
    whiteBallBody.applyImpulse(
        new CANNON.Vec3(direction.x * power, 0, direction.z * power),
        new CANNON.Vec3(0, 0, 0) // 作用点（球心）
    );

    // 3. 球杆后坐动画（可选）
    cue.position.x -= direction.x * 0.2;
    cue.position.z -= direction.z * 0.2;
}

  render() {
    this.world.step(this.isCameraMoving ? 1 / 120 : 1 / 60) // 60fps
    this.syncPhysicsToGraphics()
    // this.world.step(1 / 60)
    // this.cannonDebugger.update()
    this.updateCuePosition()
    this.renderer.render(this.scene, this.camera)
    requestAnimationFrame(this.render.bind(this))
  }

  handleResize(width: number, height: number) {
    this.renderer.setSize(width, height)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }
}
