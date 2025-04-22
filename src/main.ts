// import Cannon from 'cannon'
import * as Cannon from 'cannon-es'
import CannonDebugger from 'cannon-es-debugger'
import * as THREE from 'three'
import Ball from './lib/Ball'
import Cue from './lib/Cue'
import Layout from './lib/Layout'
import Table from './lib/Table'
import './style.css'
import { CueSystem } from './lib/CueSystem'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import PointHelper from './lib/PointHelper'
import ForceHelper from './lib/ForceHelper'
import { getIntersectionPoints } from './utils'

function main() {
  const layout = new Layout(document.querySelector('#main-canvas') as HTMLCanvasElement)

  const table = new Table(layout)

  // eslint-disable-next-line no-new
  new Ball(layout)
  table.makeTable()

  new Cue(layout)

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      layout.hitBall()
    }
  })
}

// main()

function test() {
  const canvas = document.querySelector('#main-canvas') as HTMLCanvasElement
  const { innerWidth, innerHeight } = window

  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000)
  // camera.position.set(0, 26, 50)
  scene.add(camera)

  const globalCamera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000)
  scene.add(globalCamera)
  globalCamera.position.set(0, 26, 50)

  const renderer = new THREE.WebGLRenderer({ canvas })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0xFFFFFF)
  renderer.setSize(innerWidth, innerHeight)
  renderer.render(scene, camera)

  const world = new Cannon.World()
  world.gravity.set(0, -98.2, 0)

  const controls = new OrbitControls(camera, renderer.domElement)
  const globalControls = new OrbitControls(globalCamera, renderer.domElement)

  // const cueSystem = new CueSystem(renderer, scene, world)
  // renderer.render(scene, cueSystem.camera)

  // 添加灯光
  const ambientLight = new THREE.AmbientLight(0x404040)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.8)
  directionalLight.position.set(1, 2, 1)
  directionalLight.castShadow = true
  directionalLight.shadow.mapSize.width = 1024
  directionalLight.shadow.mapSize.height = 1024
  scene.add(directionalLight)

  const axis = new THREE.AxesHelper(500)
  scene.add(axis)
  // const grid = new THREE.GridHelper(300, 300)
  // scene.add(grid)

  // 创建 Cannon.js 的静态地板（质量 mass=0 表示静态）
  const floorShape = new Cannon.Plane()
  const floorBody = new Cannon.Body({
    mass: 0, // mass=0 表示静态物体（不受重力影响）
    shape: floorShape,
  })
  floorBody.quaternion.setFromAxisAngle(
    new Cannon.Vec3(1, 0, 0), // 绕 x 轴旋转
    -Math.PI / 2, // 旋转 -90 度（让平面平铺）
  )
  floorBody.position.set(0, 0, 0) // 设置位置
  world.addBody(floorBody)

  const ballMaterial = new Cannon.Material('ball')
  const wallMaterial = new Cannon.Material('wall')

  const contactMaterial = new Cannon.ContactMaterial(ballMaterial, wallMaterial, {
    friction: 0.1, // 摩擦系数（0=无摩擦，1=完全摩擦）
    restitution: 0.8, // 弹性系数（0=完全非弹性，1=完全弹性）
  })
  const ballBallContact = new Cannon.ContactMaterial(ballMaterial, ballMaterial, {
    friction: 0.02, // 摩擦系数（0=无摩擦，1=完全摩擦）
    restitution: 0.9, // 弹性系数（0=完全非弹性，1=完全弹性）
  })
  world.addContactMaterial(contactMaterial)
  world.addContactMaterial(ballBallContact)

  const cannonDebugger = CannonDebugger(scene, world as any)

  const ballRadius = 2.86
  const bankTotalThickness = 3.8
  const bankContactHeight = 1.5
  // 增加库边
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(3, bankContactHeight, 40),
    new THREE.MeshBasicMaterial({ color: 'blue' }),
  )
  edge.position.set(50, bankTotalThickness - bankContactHeight / 2, 0)
  scene.add(edge)

  const edgeBody = new Cannon.Body({
    mass: 0,
  })
  edgeBody.addShape(new Cannon.Box(new Cannon.Vec3(1.5, bankContactHeight / 2, 20)))
  edgeBody.position.set(50, bankTotalThickness - bankContactHeight / 2, 0)
  edgeBody.material = wallMaterial
  world.addBody(edgeBody)

  const ball = new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 32, 32), new THREE.MeshBasicMaterial({ color: 'gray' }))
  ball.position.set(0, ballRadius, 0)
  scene.add(ball)

  const ballBody = new Cannon.Body({
    mass: 0.2,
    position: new Cannon.Vec3(0, ballRadius, 0),
  })

  const ballShape = new Cannon.Sphere(ballRadius)
  ballBody.addShape(ballShape)
  ballBody.material = ballMaterial
  world.addBody(ballBody)

  // const ball2 = new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 32, 32), new THREE.MeshBasicMaterial({ color: 'red' }))
  // ball2.position.set(30, ballRadius, 2)
  // scene.add(ball2)

  // const ball2Body = new Cannon.Body({
  //   mass: 0.2,
  // })
  // ball2Body.addShape(ballShape)
  // ball2Body.position.set(30, ballRadius, 2)
  // ball2Body.material = ballMaterial
  // world.addBody(ball2Body)

  // const ball3 = new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 32, 32), new THREE.MeshBasicMaterial({ color: 'red' }))
  // ball3.position.set(40, ballRadius, 1)
  // scene.add(ball3)

  // const ball3Body = new Cannon.Body({
  //   mass: 0.2,
  // })
  // ball3Body.addShape(ballShape)
  // ball3Body.position.set(40, ballRadius, 1)
  // ball3Body.material = ballMaterial
  // world.addBody(ball3Body)

  // const arrowHelper = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 5, 'blue', 50, 2)
  // scene.add(arrowHelper)
  // const cue = new THREE.Mesh(
  //   new THREE.CylinderGeometry(0.6, 1, 50, 128),
  //   new THREE.MeshBasicMaterial({ color: 'brown' })
  // )
  // const ballPosition = ball.getWorldPosition(new THREE.Vector3())
  //   // .normalize()
  //   .clone()
  //   .multiplyScalar(1)
  // cue.position.set(ballPosition.x, ballPosition.y, ballPosition.z)
  // cue.rotateX(-Math.PI / 2)
  // scene.add(cue)
  // 相机控制参数
  const cameraDistance = 30;
  let phi = Math.PI / 2; // 垂直角度 (0到π)
  let theta = 0; // 水平角度 (0到2π)
  const rotationSpeed = 0.05;

  const minHeight = ball.position.y + ballRadius; // 相机最低高度(比球高2单位)

  const cue = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 1, 48, 128),
    new THREE.MeshBasicMaterial({ color: 'brown' }),
  )
  cue.rotateX(-Math.PI / 2)
  const cueBasePosition = {
    x: 0,
    y: -2,
    z: -2,
  }
  cue.position.set(cueBasePosition.x, cueBasePosition.y, cueBasePosition.z)
  camera.add(cue)

  const cueAxisHelper = new THREE.AxesHelper(5)
  cue.add(cueAxisHelper)
  ball.add(new THREE.AxesHelper(5))

  const forceArrow = new THREE.ArrowHelper(
    cue.getWorldDirection(new THREE.Vector3()).normalize(), // 归一化方向
    ball.position,
    30,
    '#ff0000', // 箭头颜色
  )
  scene.add(forceArrow)

  function updateCameraPosition() {
    // 计算原始相机位置
    const rawX = ball.position.x + cameraDistance * Math.sin(phi) * Math.cos(theta);
    const rawY = ball.position.y + cameraDistance * Math.cos(phi);
    const rawZ = ball.position.z + cameraDistance * Math.sin(phi) * Math.sin(theta);

    // 调整Y坐标确保不低于最小高度
    const adjustedY = Math.max(minHeight, rawY);

    // 如果Y坐标被调整，则需要重新计算XZ位置以保持距离
    if (adjustedY > rawY) {
      // 计算新的phi角度来保持30单位距离
      const newPhi = Math.acos((adjustedY - ball.position.y) / cameraDistance);

      // 重新计算XZ位置
      const newX = ball.position.x + cameraDistance * Math.sin(newPhi) * Math.cos(theta);
      const newZ = ball.position.z + cameraDistance * Math.sin(newPhi) * Math.sin(theta);

      camera.position.set(newX, adjustedY, newZ);
    } else {
      camera.position.set(rawX, rawY, rawZ);
    }

    const p = ball.position.clone()
    p.y += 2
    camera.lookAt(p);
    // updateClubPosition();

    // 画出力方向
    forceArrow.setDirection(camera.getWorldDirection(new THREE.Vector3()).normalize())
  }
  // 初始相机位置
  updateCameraPosition();


  const pointHelper = new PointHelper('#point-helper')
  const forceHelper = new ForceHelper('#force-helper')

  const rayArrow = new THREE.ArrowHelper(
    cue.getWorldDirection(new THREE.Vector3()).normalize(), // 归一化方向
    cue.getWorldPosition(new THREE.Vector3()),
    30,
    '#0000ff', // 箭头颜色
  )
  rayArrow.applyQuaternion(cue.getWorldQuaternion(new THREE.Quaternion()))
  scene.add(rayArrow)

  // 键盘控制
  const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
  };

  document.addEventListener('keydown', (event) => {
    if (keys.hasOwnProperty(event.key)) {
      keys[event.key] = true;
    }

    if (event.code === 'KeyQ') {
      const point = pointHelper.getPosition(ballRadius)
      console.log(cue.position, point)
      cue.position.x = cueBasePosition.x + pointHelper.getPosition(ballRadius).x
      cue.position.y = cueBasePosition.y - pointHelper.getPosition(ballRadius).y
      cue.position.z -= 4

      // 示例：检测从相机方向与球体的交点
      const intersectionPoint = getIntersectionPoints(cue, ball);
      console.log("交点坐标:", intersectionPoint);
    }

    if (event.code === 'Space') {
      console.log('cueSystem.startCharging()')
      const direction = new THREE.Vector3(0, 1, 0); // 局部Y轴正方向
      direction.applyQuaternion(cue.quaternion); // 转换为世界坐标
      cue.position.add(direction.multiplyScalar(-0.1));
    }
  });

  document.addEventListener('keyup', (event) => {
    if (keys.hasOwnProperty(event.key)) {
      keys[event.key] = false;
    }
    if (event.code === 'Space') {
      // 1. 获取相机看向的方向
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);

      // 2. 转换为Cannon.js向量并标准化
      const forceDirection = new Cannon.Vec3(
        direction.x,
        direction.y,
        direction.z
      );

      // 3. 乘以力的大小（牛顿）
      // const forceMagnitude = 200; // 20牛顿
      forceDirection.scale(1000, forceDirection);
      // forceDirection.scale(forceHelper.currentForce, forceDirection);
      console.log(forceDirection)


      console.log(pointHelper.getPosition(ballRadius))
      // 4. 在球体质心施加力
      const targetPosition = pointHelper.getPosition(ballRadius)
      // camera.lookAt(new THREE.Vector3(targetPosition.x, ballRadius, targetPosition.y))
      // const applyPoint = new Cannon.Vec3(targetPosition.x, ballRadius, targetPosition.y); // 质心
      // const applyPoint = new Cannon.Vec3(0, 0, 10); // 质心
      const applyPoint = getIntersectionPoints(cue, ball);
      if (!applyPoint) {
        return
      }
      ballBody.applyForce(forceDirection, applyPoint as any);

      // const direction = new THREE.Vector3(0, 1, 0); // 局部Y轴正方向
      // direction.applyQuaternion(cue.quaternion); // 转换为世界坐标
      // console.log(d)
      // ballBody.applyForce(direction.clone().normalize().multiplyScalar(1000), ballBody.position); // 在球体上施加力
    }
  });

  const syncPhysics = () => {
    ball.position.copy(ballBody.position)
    // ball2.position.copy(ball2Body.position)
    // ball3.position.copy(ball3Body.position)
  }

  function animate() {
    requestAnimationFrame(animate)
    world.step(1 / 60)

    // cueSystem.update()
    controls.update()


    // 处理键盘输入
    if (keys.ArrowLeft) theta += rotationSpeed;
    if (keys.ArrowRight) theta -= rotationSpeed;
    if (keys.ArrowUp) phi = Math.max(0.1, phi - rotationSpeed);
    if (keys.ArrowDown) phi = Math.min(Math.PI - 0.1, phi + rotationSpeed);
    // if (keys.ArrowUp) phi = Math.max(minPhi, phi - rotationSpeed);
    // if (keys.ArrowDown) phi = Math.min(maxPhi, phi + rotationSpeed);

    // 更新相机位置
    updateCameraPosition();

    syncPhysics()
    // cannonDebugger.update()

    // renderer.render(scene, cueSystem.camera)
    // renderer.render(scene, camera)
    renderer.render(scene, globalCamera)
  }

  // 窗口大小调整
  window.addEventListener('resize', () => {
    // cueSystem.camera.aspect = window.innerWidth / window.innerHeight
    // cueSystem.camera.updateProjectionMatrix()
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  })

  animate()
}

test()
