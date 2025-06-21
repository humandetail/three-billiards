import type { SpatialGrid } from './SpatialGrid' // 导入空间网格类型
import * as THREE from 'three' // 导入Three.js库

// ========================
// 物理常量定义
// ========================
const DEFAULT_RESTITUTION = 0.9 // 默认弹性系数（碰撞后能量保留比例）
const DEFAULT_FRICTION = 0.08 // 默认滑动摩擦系数
const ROLLING_FRICTION = 0.03 // 滚动摩擦系数
const STATIC_FRICTION_THRESHOLD = 0.005 // 静态摩擦阈值（低于此值视为静止）
const DRAG_COEFFICIENT = 0.47 // 空气阻力系数
const COLLISION_SUBSTEPS = 16 // 碰撞检测子步数
const RESTING_THRESHOLD = 0.0005 // 静止状态线速度阈值
const ANGULAR_RESTING_THRESHOLD = 0.0005 // 静止状态角速度阈值
const ENERGY_LOSS_THRESHOLD = 0.005 // 能量损失阈值
const MAX_ANGULAR_VELOCITY = 50 // 最大角速度限制
const POST_COLLISION_DAMPING = 0.7 // 碰撞后速度阻尼系数

// ========================
// 球体接口定义
// ========================
export interface Ball {
  id: number // 唯一标识符
  x: number // X轴位置
  y: number // Y轴位置
  z: number // Z轴位置
  vx: number // X轴速度
  vy: number // Y轴速度
  vz: number // Z轴速度
  angularVelocityX: number // X轴角速度
  angularVelocityY: number // Y轴角速度
  angularVelocityZ: number // Z轴角速度
  radius: number // 半径
  mass: number // 质量
  restitution: number // 弹性系数
  friction: number // 摩擦系数
  dragCoefficient: number // 空气阻力系数
  lastCollisionTime: number // 上次碰撞时间戳
  prevPosition: { x: number, y: number, z: number } // 上一帧位置
  isResting: boolean // 是否处于静止状态
  energyLossCounter: number // 能量损失计数器
  mesh?: THREE.Mesh // 关联的三维模型
  lastCellKey?: string // 空间网格位置标识
}

// ========================
// 台球库边接口定义
// ========================
export interface Cushion {
  mesh: THREE.Mesh // 三维模型
  restitution: number // 弹性系数
  friction: number // 摩擦系数
  rollingFriction: number // 滚动摩擦系数
  worldAABB?: THREE.Box3 // 世界坐标系下的包围盒（缓存）
}

// ========================
// 球体创建函数
// ========================
export function createBall(
  id: number,
  x: number,
  y: number,
  z: number,
  radius: number,
  mass: number,
): Ball {
  return {
    id,
    x,
    y,
    z,
    vx: 0,
    vy: 0,
    vz: 0, // 初始速度为0
    angularVelocityX: 0,
    angularVelocityY: 0,
    angularVelocityZ: 0, // 初始角速度为0
    radius,
    mass,
    restitution: DEFAULT_RESTITUTION, // 使用默认弹性系数
    friction: DEFAULT_FRICTION, // 使用默认摩擦系数
    dragCoefficient: DRAG_COEFFICIENT, // 使用默认空气阻力系数
    lastCollisionTime: 0, // 初始碰撞时间为0
    prevPosition: { x, y, z }, // 初始前一帧位置等于当前位置
    isResting: false, // 初始非静止状态
    energyLossCounter: 0, // 能量损失计数器归零
  }
}

// ========================
// 冲量应用函数
// ========================
export function applyImpulse(
  ball: Ball,
  directionVec3: THREE.Vector3, // 作用力方向
  force: number, // 作用力大小
  spinVec3: THREE.Vector3, // 旋转分量
  contactPoint?: THREE.Vector3, // 接触点（用于计算扭矩）
): void {
  // 计算力向量
  const forceVec = directionVec3.clone().normalize().multiplyScalar(force)

  // 如果有接触点，计算扭矩产生的角加速度
  if (contactPoint) {
    const torque = new THREE.Vector3().crossVectors(contactPoint, forceVec)
    const I = computeMomentOfInertia(ball.mass, ball.radius) // 计算转动惯量
    const angularAccel = torque.divideScalar(I) // 计算角加速度

    // 限制角加速度不超过最大值
    if (angularAccel.length() > MAX_ANGULAR_VELOCITY) {
      angularAccel.normalize().multiplyScalar(MAX_ANGULAR_VELOCITY)
    }

    // 更新角速度
    ball.angularVelocityX += angularAccel.x
    ball.angularVelocityY += angularAccel.y
    ball.angularVelocityZ += angularAccel.z
  }

  // 更新线速度（牛顿第二定律 F=ma）
  ball.vx += forceVec.x / ball.mass
  ball.vy += forceVec.y / ball.mass
  ball.vz += forceVec.z / ball.mass

  // 添加旋转分量
  ball.angularVelocityX += spinVec3.x
  ball.angularVelocityY += spinVec3.y
  ball.angularVelocityZ += spinVec3.z

  // 重置静止状态和能量损失计数器
  ball.isResting = false
  ball.energyLossCounter = 0
}

// ========================
// 物理更新主函数
// ========================
export function physicsUpdate(
  balls: Ball[], // 所有球体
  cushions: Cushion[], // 所有库边
  dt: number, // 时间增量（秒）
  scene: THREE.Scene, // Three.js场景
  spatialGrid: SpatialGrid, // 空间网格
): void {
  // 1. 清空空间网格
  spatialGrid.clear()

  // 2. 更新球体状态
  let maxSpeed = 0 // 记录最大速度用于子步计算
  for (const ball of balls) {
    ball.prevPosition = { x: ball.x, y: ball.y, z: ball.z } // 保存上一帧位置

    if (!checkRestingState(ball)) {
      spatialGrid.update(ball) // 更新空间网格

      // 计算当前速度并更新最大速度
      const { vx, vy, vz } = ball
      const speed = Math.sqrt(vx * vx + vy * vy + vz * vz)
      if (speed > maxSpeed)
        maxSpeed = speed

      applyForces(ball, dt) // 应用物理力（重力/摩擦力等）
    }
  }

  // 3. 计算碰撞检测所需的子步数
  const minSubsteps = COLLISION_SUBSTEPS
  const maxSubsteps = COLLISION_SUBSTEPS * 4
  const ballRadiusHalf = balls[0]?.radius * 0.5 || 1

  // 基于最大速度计算所需子步数（避免穿透）
  let requiredSubsteps = Math.ceil((maxSpeed * dt) / ballRadiusHalf)
  requiredSubsteps = Math.min(Math.max(requiredSubsteps, minSubsteps), maxSubsteps)

  const subDt = dt / requiredSubsteps // 子步时间增量

  // 4. 子步循环处理碰撞
  for (let step = 0; step < requiredSubsteps; step++) {
    const ballPrevPositions = new Map<number, THREE.Vector3>()

    // 保存子步开始前的位置
    for (const ball of balls) {
      ballPrevPositions.set(ball.id, new THREE.Vector3(ball.x, ball.y, ball.z))
    }

    // 更新球体位置
    for (const ball of balls) {
      if (ball.isResting)
        continue
      ball.x += ball.vx * subDt
      ball.y += ball.vy * subDt
      ball.z += ball.vz * subDt
    }

    // 球与球碰撞检测
    for (let i = 0; i < balls.length; i++) {
      const ball = balls[i]
      if (ball.isResting)
        continue

      // 获取附近球体进行碰撞检测
      const nearbyBalls = spatialGrid.getNearbyBalls(ball)
      for (const otherBall of nearbyBalls) {
        if (otherBall.isResting || ball.id >= otherBall.id)
          continue

        // 使用连续碰撞检测(CCD)
        const prevPos1 = ballPrevPositions.get(ball.id)!
        const prevPos2 = ballPrevPositions.get(otherBall.id)!
        collideBallsWithCCD(ball, otherBall, prevPos1, prevPos2, subDt)
      }
    }

    // 球与库边碰撞检测
    for (const ball of balls) {
      if (ball.isResting)
        continue
      for (const cushion of cushions) {
        resolveCushionCollisionWithCCD(ball, cushion)
      }
    }

    // 应用能量衰减
    applyEnergyDecay(balls, subDt)
  }

  // 5. 更新场景和检测静止状态
  for (const ball of balls) {
    checkRestingState(ball) // 检测是否进入静止状态

    if (ball.isResting) {
      // 静止状态：重置所有速度
      ball.vx = 0
      ball.vy = 0
      ball.vz = 0
      ball.angularVelocityX = 0
      ball.angularVelocityY = 0
      ball.angularVelocityZ = 0
      continue
    }

    // 更新三维模型位置
    const ballMesh = ball.mesh
    if (ballMesh) {
      ballMesh.position.set(ball.x, ball.y, ball.z)
      updateBallRotation(ball, dt) // 更新旋转
    }

    // 处理桌面碰撞（Y轴方向）
    if (ball.y - ball.radius < 0) {
      handleTableCollision(ball)
    }
  }
}

// ========================
// 桌面碰撞处理
// ========================
function handleTableCollision(ball: Ball): void {
  // 修正球体位置（避免陷入桌面）
  ball.y = ball.radius

  // 垂直方向碰撞响应
  if (ball.vy < 0) {
    // 应用弹性系数反弹
    ball.vy = -ball.vy * ball.restitution
    ball.energyLossCounter++ // 增加能量损失计数

    // 多次碰撞或速度过小时停止
    if (ball.energyLossCounter > 3 || Math.abs(ball.vy) < ENERGY_LOSS_THRESHOLD) {
      ball.vy = 0
    }
  }
}

// ========================
// 静止状态检测
// ========================
function checkRestingState(ball: Ball): boolean {
  // 计算线速度大小
  const speed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2 + ball.vz ** 2)

  // 计算旋转能量（影响滚动）
  const rotationalEnergy = Math.sqrt(
    ball.angularVelocityX ** 2 + ball.angularVelocityZ ** 2,
  ) * ball.radius

  // 组合能量计算
  const combinedEnergy = speed + rotationalEnergy

  // 当组合能量低于阈值时判定为静止
  ball.isResting = combinedEnergy < RESTING_THRESHOLD

  return ball.isResting
}

// ========================
// 转动惯量计算（实心球体）
// ========================
function computeMomentOfInertia(mass: number, radius: number): number {
  return (2 / 5) * mass * radius * radius
}

// ========================
// 空气阻力应用
// ========================
function applyAirResistance(ball: Ball, dt: number): void {
  const speedSquared = ball.vx ** 2 + ball.vy ** 2 + ball.vz ** 2
  if (speedSquared < 0.0001)
    return // 忽略微小速度

  // 计算阻力（F = 0.5 * ρ * v² * Cd * A）
  const area = Math.PI * ball.radius ** 2
  const dragMagnitude = 0.5 * 1.2 * speedSquared * ball.dragCoefficient * area
  const dragForce = -dragMagnitude / Math.sqrt(speedSquared) // 阻力方向与速度相反

  // 应用阻力
  ball.vx += (dragForce * ball.vx) / ball.mass * dt
  ball.vy += (dragForce * ball.vy) / ball.mass * dt
  ball.vz += (dragForce * ball.vz) / ball.mass * dt
}

// ========================
// 物理力综合应用
// ========================
function applyForces(ball: Ball, dt: number): void {
  // 重力 (F = mg)
  ball.vy -= 9.81 * dt

  // 空气阻力
  applyAirResistance(ball, dt)

  // 计算法向力（接触面压力）
  const normalForce = ball.mass * 9.81
  const frictionCoefficient = ball.friction

  // 计算接触点相对速度（滑动速度）
  const surfaceVelocityX = -ball.angularVelocityZ * ball.radius
  const surfaceVelocityZ = ball.angularVelocityX * ball.radius
  const relativeVelX = ball.vx - surfaceVelocityX
  const relativeVelZ = ball.vz - surfaceVelocityZ
  const slipSpeed = Math.sqrt(relativeVelX ** 2 + relativeVelZ ** 2)

  // 静态摩擦处理（速度低于阈值）
  if (slipSpeed < STATIC_FRICTION_THRESHOLD) {
    if (Math.abs(ball.vx) < STATIC_FRICTION_THRESHOLD
      && Math.abs(ball.vz) < STATIC_FRICTION_THRESHOLD) {
      // 停止运动和旋转
      ball.vx = 0
      ball.vz = 0
      ball.angularVelocityX = 0
      ball.angularVelocityZ = 0
      return
    }
  }

  // 滑动摩擦处理
  if (slipSpeed > 0.001) {
    // 计算滑动摩擦力大小
    const frictionMagnitude = normalForce * frictionCoefficient
    const frictionDirX = -relativeVelX / (slipSpeed + 1e-6) // 避免除零
    const frictionDirZ = -relativeVelZ / (slipSpeed + 1e-6)

    // 计算摩擦力向量
    const fx = frictionDirX * frictionMagnitude
    const fz = frictionDirZ * frictionMagnitude

    // 应用摩擦力到线速度
    ball.vx += fx / ball.mass * dt
    ball.vz += fz / ball.mass * dt

    // 计算并应用扭矩
    const I = computeMomentOfInertia(ball.mass, ball.radius)
    const torqueX = -frictionDirZ * frictionMagnitude * ball.radius
    const torqueZ = frictionDirX * frictionMagnitude * ball.radius

    ball.angularVelocityX += torqueX / I * dt
    ball.angularVelocityZ += torqueZ / I * dt
  }
  else {
    // 滚动摩擦处理
    const rollingFrictionMagnitude = normalForce * ROLLING_FRICTION
    const speed = Math.hypot(ball.vx, ball.vz)

    if (speed > 0) {
      // 计算滚动摩擦方向
      const frictionDirX = -ball.vx / speed
      const frictionDirZ = -ball.vz / speed

      // 应用滚动摩擦
      ball.vx += frictionDirX * rollingFrictionMagnitude / ball.mass * dt
      ball.vz += frictionDirZ * rollingFrictionMagnitude / ball.mass * dt
    }

    // 角速度衰减（模拟能量损失）
    const angularDamping = 1 - (0.1 * dt)
    ball.angularVelocityX *= angularDamping
    ball.angularVelocityZ *= angularDamping

    // 角速度归零处理
    if (Math.abs(ball.angularVelocityX) < ANGULAR_RESTING_THRESHOLD)
      ball.angularVelocityX = 0
    if (Math.abs(ball.angularVelocityZ) < ANGULAR_RESTING_THRESHOLD)
      ball.angularVelocityZ = 0
  }
}

// ========================
// 能量衰减应用
// ========================
function applyEnergyDecay(balls: Ball[], dt: number): void {
  const LINEAR_DECAY = 0.98 // 线速度衰减系数
  const ANGULAR_DECAY = 0.92 // 角速度衰减系数

  // 根据时间增量调整衰减强度
  const linearDecay = LINEAR_DECAY ** dt
  const angularDecay = ANGULAR_DECAY ** dt

  for (const ball of balls) {
    if (ball.isResting)
      continue

    // 应用线速度衰减
    ball.vx *= linearDecay
    ball.vy *= linearDecay
    ball.vz *= linearDecay

    // 应用角速度衰减
    ball.angularVelocityX *= angularDecay
    ball.angularVelocityY *= angularDecay
    ball.angularVelocityZ *= angularDecay

    // 清除微小数值
    if (Math.abs(ball.vx) < 1e-6)
      ball.vx = 0
    if (Math.abs(ball.vy) < 1e-6)
      ball.vy = 0
    if (Math.abs(ball.vz) < 1e-6)
      ball.vz = 0
    if (Math.abs(ball.angularVelocityX) < 1e-6)
      ball.angularVelocityX = 0
    if (Math.abs(ball.angularVelocityY) < 1e-6)
      ball.angularVelocityY = 0
    if (Math.abs(ball.angularVelocityZ) < 1e-6)
      ball.angularVelocityZ = 0
  }
}

// ========================
// 球与球连续碰撞检测(CCD)
// ========================
function collideBallsWithCCD(
  b1: Ball,
  b2: Ball,
  prevPos1: THREE.Vector3, // 球1前一位置
  prevPos2: THREE.Vector3, // 球2前一位置
  dt: number, // 时间增量
): void {
  // 计算相对位置和速度
  const relPos = new THREE.Vector3().subVectors(b2, b1)
  const relVel = new THREE.Vector3(b2.vx - b1.vx, b2.vy - b1.vy, b2.vz - b1.vz)
  const radiusSum = b1.radius + b2.radius

  // 解二次方程求碰撞时间 (a*t² + b*t + c = 0)
  const a = relVel.dot(relVel)
  const b = 2 * relVel.dot(relPos)
  const c = relPos.dot(relPos) - radiusSum * radiusSum
  const discriminant = b * b - 4 * a * c

  if (discriminant < 0 || a === 0)
    return // 无实数解

  // 计算碰撞时间
  const sqrtDisc = Math.sqrt(discriminant)
  const t = (-b - sqrtDisc) / (2 * a)
  if (t < 0 || t > dt)
    return // 碰撞时间不在本帧内

  // 插值计算碰撞点位置
  const t1 = t / dt
  const b1Pos = new THREE.Vector3().lerpVectors(prevPos1, new THREE.Vector3(b1.x, b1.y, b1.z), t1)
  const b2Pos = new THREE.Vector3().lerpVectors(prevPos2, new THREE.Vector3(b2.x, b2.y, b2.z), t1)

  // 计算碰撞法线
  const normal = new THREE.Vector3().subVectors(b2Pos, b1Pos).normalize()
  const relVelocity = new THREE.Vector3(b2.vx - b1.vx, b2.vy - b1.vy, b2.vz - b1.vz)
  const velocityAlongNormal = relVelocity.dot(normal)
  if (velocityAlongNormal > 0)
    return // 球体正在分离

  // 计算恢复系数（取两个球中的较小值）
  const restitution = Math.min(b1.restitution, b2.restitution)
  const invMass1 = 1 / b1.mass
  const invMass2 = 1 / b2.mass

  // 计算冲量标量
  const impulseScalar = -(1 + restitution) * velocityAlongNormal / (invMass1 + invMass2)
  const impulse = normal.clone().multiplyScalar(impulseScalar)

  // 应用冲量改变速度
  b1.vx -= impulse.x * invMass1
  b1.vy -= impulse.y * invMass1
  b1.vz -= impulse.z * invMass1
  b2.vx += impulse.x * invMass2
  b2.vy += impulse.y * invMass2
  b2.vz += impulse.z * invMass2

  // 碰撞后阻尼处理
  b1.vx *= POST_COLLISION_DAMPING
  b1.vz *= POST_COLLISION_DAMPING
  b2.vx *= POST_COLLISION_DAMPING
  b2.vz *= POST_COLLISION_DAMPING

  b1.angularVelocityX *= POST_COLLISION_DAMPING
  b1.angularVelocityZ *= POST_COLLISION_DAMPING
  b2.angularVelocityX *= POST_COLLISION_DAMPING
  b2.angularVelocityZ *= POST_COLLISION_DAMPING

  // 位置修正（防止球体重叠）
  const penetration = radiusSum - b1Pos.distanceTo(b2Pos)
  const correction = normal.clone().multiplyScalar(penetration * 0.8)
  const totalMass = b1.mass + b2.mass
  const weight1 = b2.mass / totalMass // 根据质量分配修正量
  const weight2 = b1.mass / totalMass

  b1.x -= correction.x * weight1
  b1.y -= correction.y * weight1
  b1.z -= correction.z * weight1
  b2.x += correction.x * weight2
  b2.y += correction.y * weight2
  b2.z += correction.z * weight2

  // 更新碰撞状态
  b1.lastCollisionTime = performance.now()
  b2.lastCollisionTime = performance.now()
  b1.isResting = false
  b2.isResting = false
}

// ========================
// 球与库边碰撞处理
// ========================
export function resolveCushionCollisionWithCCD(ball: Ball, cushion: Cushion): void {
  // 缓存库边包围盒（首次计算）
  if (!cushion.worldAABB) {
    cushion.mesh.geometry.computeBoundingBox()
    cushion.worldAABB = cushion.mesh.geometry.boundingBox!
      .clone()
      .applyMatrix4(cushion.mesh.matrixWorld)
      .expandByScalar(ball.radius) // 扩展包围盒包含球体半径
  }

  // 球体包围盒检测
  const ballBox = new THREE.Box3(
    new THREE.Vector3(ball.x - ball.radius, ball.y - ball.radius, ball.z - ball.radius),
    new THREE.Vector3(ball.x + ball.radius, ball.y + ball.radius, ball.z + ball.radius),
  )
  if (!cushion.worldAABB.intersectsBox(ballBox))
    return // 快速排除

  // 创建射线检测器（从上一帧位置到当前位置）
  const from = new THREE.Vector3(ball.prevPosition.x, ball.prevPosition.y, ball.prevPosition.z)
  const to = new THREE.Vector3(ball.x, ball.y, ball.z)
  const direction = new THREE.Vector3().subVectors(to, from)
  const length = direction.length()
  if (length < 1e-6)
    return
  direction.normalize()

  // 执行射线检测
  const raycaster = new THREE.Raycaster(from, direction, 0, length + ball.radius)
  const intersects = raycaster.intersectObject(cushion.mesh, true)
  if (intersects.length === 0)
    return

  const hit = intersects[0] // 获取第一个碰撞点
  const hitPoint = hit.point // 碰撞点坐标
  // 转换法线到世界坐标系
  const hitNormal = hit.face!.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(cushion.mesh.matrixWorld)).normalize()

  // 检查球体是否正在离开表面
  const velocity = new THREE.Vector3(ball.vx, ball.vy, ball.vz)
  const velocityAlongNormal = velocity.dot(hitNormal)
  if (velocityAlongNormal >= 0)
    return

  // 弹性碰撞响应
  velocity.addScaledVector(hitNormal, -(1 + ball.restitution) * velocityAlongNormal)

  // 摩擦处理
  const tangent = velocity.clone().sub(hitNormal.clone().multiplyScalar(velocity.dot(hitNormal)))
  const tangentSpeed = tangent.length()
  if (tangentSpeed > 1e-3) {
    const frictionImpulse = tangent.normalize().multiplyScalar(-ball.friction * tangentSpeed)
    velocity.add(frictionImpulse)
  }

  // 更新球体速度
  ball.vx = velocity.x
  ball.vy = velocity.y
  ball.vz = velocity.z

  // 位置修正（防止穿透）
  const contactToBall = new THREE.Vector3(ball.x, ball.y, ball.z).sub(hitPoint)
  const penetration = ball.radius - contactToBall.dot(hitNormal)
  if (penetration > 0) {
    ball.x += hitNormal.x * penetration
    ball.y += hitNormal.y * penetration
    ball.z += hitNormal.z * penetration
  }

  // 更新碰撞状态
  ball.lastCollisionTime = performance.now()
  ball.isResting = false
}

// ========================
// 球体旋转更新
// ========================
export function updateBallRotation(ball: Ball, dt: number): void {
  if (!ball.mesh)
    return

  // 计算角速度大小
  const angularSpeed = Math.hypot(
    ball.angularVelocityX,
    ball.angularVelocityY,
    ball.angularVelocityZ,
  )
  if (angularSpeed < 0.001)
    return // 忽略微小旋转

  // 创建旋转轴和旋转量
  const axis = new THREE.Vector3(
    ball.angularVelocityX,
    ball.angularVelocityY,
    ball.angularVelocityZ,
  ).normalize()
  const angle = angularSpeed * dt // 本帧旋转角度

  // 应用旋转
  const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle)
  ball.mesh.quaternion.multiply(quaternion).normalize() // 累加旋转并归一化
}

// ========================
// 库边创建函数
// ========================
export function createCushion(
  mesh: THREE.Mesh,
  restitution = 0.8, // 默认弹性系数
  friction = 0.2, // 默认摩擦系数
  rollingFriction = 0.05, // 默认滚动摩擦系数
): Cushion {
  mesh.updateMatrixWorld(true) // 确保世界矩阵更新
  return {
    mesh,
    restitution,
    friction,
    rollingFriction,
  }
}

// ========================
// 球袋碰撞检测
// ========================
export function checkPocketCollision(
  balls: Ball[],
  pockets: THREE.Vector3[], // 球袋位置数组
  pocketRadius = 0.1, // 球袋半径
): number[] {
  const pocketedBalls: number[] = [] // 落袋球体ID列表
  const pocketRadiusSq = pocketRadius * pocketRadius // 半径平方（优化计算）

  for (const ball of balls) {
    if (ball.isResting)
      continue // 跳过静止球

    for (const pocket of pockets) {
      // 计算距离平方
      const dx = ball.x - pocket.x
      const dy = ball.y - pocket.y
      const dz = ball.z - pocket.z
      const distSq = dx * dx + dy * dy + dz * dz

      // 检测落袋
      if (distSq < pocketRadiusSq) {
        pocketedBalls.push(ball.id)
        ball.isResting = true // 标记为静止
        // 重置所有运动状态
        ball.vx = ball.vy = ball.vz = 0
        ball.angularVelocityX = ball.angularVelocityY = ball.angularVelocityZ = 0
        break // 退出球袋循环
      }
    }
  }

  return pocketedBalls
}
