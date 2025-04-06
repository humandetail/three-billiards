import * as CANNON from 'cannon'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { PARAMETERS } from '../config'
import { getTexturePath } from '../utils'

export default class Layout {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls!: OrbitControls

  world!: CANNON.World

  showHelper = true
  helpers: (THREE.PointLightHelper | any)[] = []

  renderRequested = false

  #sceneObjects = new Map<string, THREE.Object3D>()

  balls: THREE.Object3D[] = []
  ballsBody: CANNON.Body[] = []
  ballMaterial = new CANNON.Material('ball')

  boxs: THREE.Object3D[] = []
  boxsBody: CANNON.Body[] = []

  tableMaterial = new CANNON.Material('table')
  rubberMaterial = new CANNON.Material('rubber')

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

    this.requestRenderIfNotRequested()
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
    world.gravity.set(0, -9.82, 0)
    world.broadphase = new CANNON.NaiveBroadphase() // 使用默认碰撞检测
    world.solver.iterations = 10 // 提高碰撞精度

    // 设置摩擦系数和弹性系数
    const ballBallContact = new CANNON.ContactMaterial(this.ballMaterial, this.ballMaterial, {
      friction: 0.05, // 摩擦系数（0=无摩擦，1=完全摩擦）
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
  }

  initEvents() {
    this.controls.addEventListener('change', () => {
      this.requestRenderIfNotRequested()
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

  initGround() {
    const texture = new THREE.TextureLoader().load(getTexturePath('ground.jpg'))
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 2)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      // new THREE.MeshPhongMaterial({
      //   map: texture,
      // }),
      new THREE.MeshBasicMaterial({
        color: 'gray',
      }),
    )
    ground.position.y = -2
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
    floorBody.position.set(0, -2, 0) // 设置位置
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

    this.boxs.push(object)
  }

  contactMaterial(body: CANNON.Body) {
    this.ballsBody.forEach((ballBody) => {
      const contactMaterial = new CANNON.ContactMaterial(body.material, ballBody.material, {
        friction: 0.15, // 摩擦系数（0=无摩擦，1=完全摩擦）
        restitution: 0, // 弹性系数（0=完全非弹性，1=完全弹性）
      })
      this.world.addContactMaterial(contactMaterial)
    })
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

    // this.boxs.forEach((box, index) => {
    //   const body = this.boxsBody[index]
    //   box.position.copy(body.position) // 同步位置
    //   box.quaternion.copy(body.quaternion) // 同步旋转
    // })
  }

  render() {
    this.renderRequested = false
    this.syncPhysicsToGraphics()
    this.world.step(1 / 60) // 60fps
    this.renderer.render(this.scene, this.camera)
    requestAnimationFrame(this.render.bind(this))
  }

  requestRenderIfNotRequested() {
    if (!this.renderRequested) {
      this.renderRequested = true
      requestAnimationFrame(this.render.bind(this))
    }
  }

  handleResize(width: number, height: number) {
    this.renderer.setSize(width, height)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }
}
