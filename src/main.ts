// import * as THREE from 'three'
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

import { setup } from './central-control'
import './style.scss'

setup()

// import config, { toRadians } from './config'
// import { Cue } from './lib/CueSystem'
// import { getIntersectionPoints } from './utils'
// import './style.scss'

// const scene = new THREE.Scene()
// const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
// camera.position.set(0, 0, 0.5)
// scene.add(camera)

// const renderer = new THREE.WebGLRenderer({ antialias: true })
// renderer.setPixelRatio(window.devicePixelRatio)
// renderer.setClearColor(0xFFFFFF)
// renderer.setSize(window.innerWidth, window.innerHeight)
// document.body.appendChild(renderer.domElement)

// const axes = new THREE.AxesHelper(10)
// scene.add(axes)

// const ballRadius = config.ball.radius
// const material = new THREE.MeshBasicMaterial({ color: 0x00FF00 })
// const ball = new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 32, 32), material)
// ball.position.set(0, 0, 0)
// scene.add(ball)

// const controls = new OrbitControls(camera, renderer.domElement)

// const phi = 0
// let theta = 0
// const targetPoint = { x: 0, y: 1 }
// const force = 0.001
// const safePercent = 2 / 3

// const cue = new Cue().createCue()
// scene.add(cue)
// // cue.add(new THREE.AxesHelper(0.2))

// const cueCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 100)
// cueCamera.name = 'cue-camera'
// const poleLength = config.cue.poleLength
// cueCamera.position.set(0, 0.1, -poleLength * 0.1)
// cueCamera.lookAt(0, 0, 0)
// cue.add(cueCamera)

// // const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.1, 1), new THREE.MeshBasicMaterial({ color: 0x0000FF }))
// // scene.add(cylinder)

// const impulseDirection = new THREE.Vector3()
// const contactPoint = new THREE.Vector3()

// const v = setPosition(cue, ball, ballRadius, force, phi, theta, targetPoint.y * safePercent)
// console.log('v', v)

// /**
//  * 设置杆子的位置
//  * @param cue 杆子
//  * @param ball 球
//  * @param ballRadius 球半径
//  * @param force 力
//  * @param phi 杆子与 Z 轴的夹角
//  * @param theta 杆子与 X 轴的夹角
//  * @param offset 偏移量 targetPoint.y * safePercent
//  */
// function setPosition(cue: THREE.Mesh, ball: THREE.Mesh, ballRadius: number, force: number, phi: number, theta: number, offset: number) {
//   const distance = ballRadius * 1.3 + force

//   const thetaRad = THREE.MathUtils.degToRad(theta)
//   const phiRad = THREE.MathUtils.degToRad(90 - phi)

//   const ballPosition = ball.getWorldPosition(new THREE.Vector3()).clone()

//   // 杆子指向方向向量 v
//   const dx = Math.sin(phiRad) * Math.cos(thetaRad)
//   const dy = Math.cos(phiRad)
//   const dz = Math.sin(phiRad) * Math.sin(thetaRad)
//   const v = new THREE.Vector3(dx, dy, dz).normalize()

//   // y 轴方向
//   const globalY = new THREE.Vector3(0, 1, 0)

//   // 计算切面 z 轴方向 (在垂直v的平面上)
//   let zAxis = globalY.clone().sub(v.clone().multiplyScalar(globalY.dot(v)))
//   if (zAxis.lengthSq() < 1e-6) {
//     zAxis = new THREE.Vector3(1, 0, 0).sub(v.clone().multiplyScalar(v.dot(new THREE.Vector3(1, 0, 0))))
//   }
//   zAxis.normalize()

//   // 计算点 B
//   const B = ballPosition.add(zAxis.clone().multiplyScalar(ballRadius * offset))

//   // 计算杆子中心点 A
//   const A = B.clone().add(v.clone().multiplyScalar(distance))
//   cue.position.copy(A)

//   // 设置杆子方向，使Z轴指向杆子方向（杆头朝向球心方向）
//   const defaultDir = new THREE.Vector3(0, 0, 1)
//   const direction = v.clone().negate()
//   const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultDir, direction)
//   cue.quaternion.copy(quaternion)

//   impulseDirection.copy(direction).multiplyScalar(force)

//   const contactPoint = getIntersectionPoints(cue, ball)
//   if (!contactPoint) {
//     throw new Error('未命中球体，cue 方向可能对准错了')
//   }

//   // 显示冲量方向
//   const arrow = new THREE.ArrowHelper(cue.getWorldDirection(new THREE.Vector3()).clone(), cue.getWorldPosition(new THREE.Vector3()).clone(), 1, 'purple')
//   scene.add(arrow)

//   // 显示作用点
//   const marker = new THREE.Mesh(
//     new THREE.SphereGeometry(0.003),
//     new THREE.MeshBasicMaterial({ color: 0xFF0000 }),
//   )
//   marker.position.copy(contactPoint)
//   scene.add(marker)
// }

// const raycaster = new THREE.Raycaster()
// const mouse = new THREE.Vector2()

// window.addEventListener('click', (event) => {
//   // 1. 将鼠标点击屏幕坐标转换为归一化设备坐标(NDC)
//   mouse.x = (event.clientX / window.innerWidth) * 2 - 1
//   mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

//   // 2. 设置 raycaster
//   raycaster.setFromCamera(mouse, camera)

//   // 3. 定义球所在水平面（比如 y=ballRadius 平面）
//   const planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), config.ball.radius)

//   // 4. 计算射线与平面交点
//   const intersectPoint = new THREE.Vector3()
//   const intersects = raycaster.ray.intersectPlane(planeY, intersectPoint)

//   if (intersects) {
//     // 5. 计算相对于球心的方向向量
//     // const dir = intersectPoint.clone().sub(ball.position)
//     const dir = ball.getWorldPosition(new THREE.Vector3()).clone().sub(intersectPoint)

//     // 6. 计算 theta（绕Y轴水平角度，单位：度）
//     // Math.atan2(z, x) 返回的是弧度
//     let newTheta = Math.atan2(dir.z, dir.x) * (180 / Math.PI)
//     // 你可以调整角度范围，比如保持 0-360
//     if (newTheta < 0)
//       newTheta += 360

//     // 7. 更新 theta，重新设置杆子位置
//     theta = newTheta
//     setPosition(cue, ball, ballRadius, force, phi, theta, targetPoint.y * safePercent)
//   }
// })

// // 切换镜头
// let useCueCam = false
// document.addEventListener('keydown', (e) => {
//   if (e.key === 'c') {
//     useCueCam = !useCueCam
//   }
// })

// function animate() {
//   requestAnimationFrame(animate)
//   controls.update()

//   if (useCueCam) {
//     const cueCam = cue.getObjectByName('cue-camera') as THREE.Camera
//     renderer.render(scene, cueCam)
//   }
//   else {
//     renderer.render(scene, camera)
//   }
// }
// animate()
