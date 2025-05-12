// import Cannon from 'cannon'
// import * as Cannon from 'cannon-es'
// import CannonDebugger from 'cannon-es-debugger'
// import * as THREE from 'three'
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
// import CueSystem from './lib/CueSystem'
// import ForceHelper from './lib/helper/ForceHelper'
// import PointHelper from './lib/helper/PointHelper'
// import RegulatorHelper from './lib/helper/RegulatorHelper'
// import { emitter, EventTypes } from './central-control'
import { setup } from './central-control'
import './style.scss'

setup()

// function test() {
//   const canvas = document.querySelector('#main-canvas') as HTMLCanvasElement
//   const { width, height } = canvas.parentElement!.getBoundingClientRect()

//   const scene = new THREE.Scene()

//   const globalCamera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
//   scene.add(globalCamera)
//   globalCamera.position.set(0, 26, 50)

//   const renderer = new THREE.WebGLRenderer({ canvas })
//   renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
//   renderer.setClearColor(0xFFFFFF)
//   renderer.setSize(width, height)

//   const world = new Cannon.World()
//   world.gravity.set(0, -98.2, 0)

//   const globalControls = new OrbitControls(globalCamera, renderer.domElement)

//   // 添加灯光
//   const ambientLight = new THREE.AmbientLight(0x404040)
//   scene.add(ambientLight)

//   const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 5)
//   directionalLight.position.set(100, 100, 80)
//   directionalLight.castShadow = true
//   directionalLight.shadow.mapSize.width = 1024
//   directionalLight.shadow.mapSize.height = 1024
//   scene.add(directionalLight)

//   const axis = new THREE.AxesHelper(500)
//   scene.add(axis)
//   // const grid = new THREE.GridHelper(300, 300)
//   // scene.add(grid)

//   const groundMaterial = new Cannon.Material('ground')
//   const ballMaterial = new Cannon.Material('ball')
//   const wallMaterial = new Cannon.Material('wall')

//   const ballGroundContact = new Cannon.ContactMaterial(ballMaterial, groundMaterial, {
//     friction: 1, // 摩擦系数（0=无摩擦，1=完全摩擦）
//     restitution: 0.8, // 弹性系数（0=完全非弹性，1=完全弹性）
//   })

//   const ballBankContact = new Cannon.ContactMaterial(ballMaterial, wallMaterial, {
//     friction: 0.3, // 摩擦系数（0=无摩擦，1=完全摩擦）
//     restitution: 0.8, // 弹性系数（0=完全非弹性，1=完全弹性）
//   })
//   const ballBallContact = new Cannon.ContactMaterial(ballMaterial, ballMaterial, {
//     friction: 0.02, // 摩擦系数（0=无摩擦，1=完全摩擦）
//     restitution: 0.9, // 弹性系数（0=完全非弹性，1=完全弹性）
//   })
//   world.addContactMaterial(ballGroundContact)
//   world.addContactMaterial(ballBankContact)
//   world.addContactMaterial(ballBallContact)

//   // 创建 Cannon.js 的静态地板（质量 mass=0 表示静态）
//   const floorShape = new Cannon.Plane()
//   const floorBody = new Cannon.Body({
//     mass: 0, // mass=0 表示静态物体（不受重力影响）
//     shape: floorShape,
//     material: wallMaterial,
//   })
//   floorBody.quaternion.setFromAxisAngle(
//     new Cannon.Vec3(1, 0, 0), // 绕 x 轴旋转
//     -Math.PI / 2, // 旋转 -90 度（让平面平铺）
//   )
//   floorBody.position.set(0, 0, 0) // 设置位置
//   world.addBody(floorBody)

//   const cannonDebugger = CannonDebugger(scene, world as any)

//   const ballRadius = 2.86
//   const bankTotalThickness = 3.8
//   const bankContactHeight = 1.5
//   // 增加库边
//   const edge = new THREE.Mesh(
//     new THREE.BoxGeometry(3, bankContactHeight, 40),
//     new THREE.MeshBasicMaterial({ color: 'blue' }),
//   )
//   edge.position.set(50, bankTotalThickness - bankContactHeight / 2, 0)
//   scene.add(edge)

//   const edgeBody = new Cannon.Body({
//     mass: 0,
//   })
//   edgeBody.addShape(new Cannon.Box(new Cannon.Vec3(1.5, bankContactHeight / 2, 20)))
//   edgeBody.position.set(50, bankTotalThickness - bankContactHeight / 2, 0)
//   edgeBody.material = wallMaterial
//   world.addBody(edgeBody)

//   const ball = new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 32, 32), new THREE.MeshBasicMaterial({ color: 'gray' }))
//   ball.position.set(0, ballRadius, 0)
//   scene.add(ball)

//   const ballBody = new Cannon.Body({
//     mass: 0.2,
//     position: new Cannon.Vec3(0, ballRadius, 0),
//   })

//   const ballShape = new Cannon.Sphere(ballRadius)
//   ballBody.addShape(ballShape)
//   ballBody.material = ballMaterial
//   world.addBody(ballBody)

//   const ball2 = new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 32, 32), new THREE.MeshBasicMaterial({ color: 'red' }))
//   ball2.position.set(30, ballRadius, 2)
//   scene.add(ball2)

//   const ball2Body = new Cannon.Body({
//     mass: 0.2,
//   })
//   ball2Body.addShape(ballShape)
//   ball2Body.position.set(30, ballRadius, 2)
//   ball2Body.material = ballMaterial
//   world.addBody(ball2Body)

//   const ball3 = new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 32, 32), new THREE.MeshBasicMaterial({ color: 'red' }))
//   ball3.position.set(40, ballRadius, 1)
//   scene.add(ball3)

//   const ball3Body = new Cannon.Body({
//     mass: 0.2,
//   })
//   ball3Body.addShape(ballShape)
//   ball3Body.position.set(40, ballRadius, 1)
//   ball3Body.material = ballMaterial
//   world.addBody(ball3Body)

//   const cueSystem =new CueSystem(renderer, scene, ball, ballBody)

//   const pointHelper = new PointHelper('#point-helper')
//   const forceHelper = new ForceHelper('#force-helper')
//   const horizontalRegulatorHelper = new RegulatorHelper('#horizontal-regulator-helper', 'horizontal')
//   const verticalRegulatorHelper = new RegulatorHelper('#vertical-regulator-helper', 'vertical')

//   emitter.on(EventTypes.point, (point) => {
//     console.log('point change', point)
//     // 击球安全区是 2/3
//     cueSystem.setCuePosition(
//       (2 / 3) * ballRadius * point.x,
//       (2 / 3) * ballRadius * point.y,
//       0,
//     )
//   })

//   emitter.on(EventTypes.force, (force) => {
//     cueSystem.currentForce = force
//   })
//   emitter.on(EventTypes.direction, (direction) => {
//     console.log('direction', direction)
//     switch (direction) {
//       case 'up':
//         cueSystem.setControlKey('ArrowUp', true, true)
//         break
//       case 'down':
//         cueSystem.setControlKey('ArrowDown', true, true)
//         break
//       case 'right':
//         cueSystem.setControlKey('ArrowRight', true, true)
//         break
//       case 'left':
//         cueSystem.setControlKey('ArrowLeft', true, true)
//         break
//     }
//   })

//   const syncPhysics = () => {
//     ball.position.copy(ballBody.position)
//     ball2.position.copy(ball2Body.position)
//     ball3.position.copy(ball3Body.position)
//   }

//   document.addEventListener('keydown', e => {
//     if (e.code === 'Space') {
//       cueSystem.currentForce += 30
//     }
//   })
//   document.addEventListener('keyup', e => {
//     if (e.code === 'Space') {
//       cueSystem.hit()
//     }
//   })

//   function animate() {
//     requestAnimationFrame(animate)
//     world.step(1 / 60, 3)

//     cueSystem.update()

//     syncPhysics()
//     cannonDebugger.update()

//     globalControls.update()
//     if (ballBody.velocity.length() < 0.1 && ballBody.angularVelocity.length() < 0.1) {
//       ballBody.sleep(); // 强制休眠
//     }

//     renderer.render(scene, globalCamera)
//   }

//   // // 窗口大小调整
//   // window.addEventListener('resize', () => {
//   //   const { width, height } = canvas.parentElement!.getBoundingClientRect()
//   //   camera.aspect = width / height
//   //   camera.updateProjectionMatrix()
//   //   renderer.setSize(width, height)
//   // })

//   animate()
// }

// test()
