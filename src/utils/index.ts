import * as THREE from 'three'

export function getTexturePath(name: string): string {
  const PATHNAME = import.meta.env.VITE_APP_PATHNAME || '/'
  return `${PATHNAME.replace(/\/$/, '')}/textures/${name}`
}

export interface Point {
  x: number
  y: number
}

export function getPoints(x: number, y: number, r: number, startAngle: number, endAngle: number, antiClockwise: boolean, quantity: number): Point[] {
  const points: Point[] = []
  const PI2 = Math.PI * 2

  if (antiClockwise) {
    [startAngle, endAngle] = [endAngle, startAngle]
  }

  if (endAngle - startAngle >= PI2) {
    endAngle = startAngle + PI2
  }
  else {
    if (startAngle !== endAngle) {
      if ((startAngle - endAngle) % PI2 === 0) {
        endAngle = startAngle
      }
      else {
        startAngle = startAngle % PI2
        while (endAngle > startAngle + PI2) {
          endAngle -= PI2
        }
      }
    }
  }

  // 弧的总角度值
  const angleCount = startAngle > endAngle
    ? PI2 - startAngle + endAngle
    : endAngle - startAngle

  function getPoint(t: number): Point {
    if (antiClockwise) {
      t = 1 - t
    }
    const degree = angleCount * t + startAngle
    return {
      x: x + Math.cos(degree) * r,
      y: y + Math.sin(degree) * r,
    }
  }

  for (let i = 0; i < quantity; i++) {
    points.push(getPoint(i / (quantity - 1)))
  }
  return points
}

export function createCanvas(width = 400, height = 300, canvas?: HTMLCanvasElement) {
  const c = canvas ?? document.createElement('canvas')

  c.style.width = `${width}px`
  c.style.height = `${height}px`

  const dpr = window.devicePixelRatio ?? 1

  c.width = Math.floor(dpr * width)
  c.height = Math.floor(dpr * height)

  c.getContext('2d')!.scale(dpr, dpr)

  return c
}

export function getIntersectionPoints(mesh: THREE.Mesh, sphere: THREE.Mesh) {
  const direction = mesh.getWorldDirection(new THREE.Vector3()).normalize()
  // direction.applyQuaternion(mesh.getWorldQuaternion(new THREE.Quaternion()))
  const ray = new THREE.Ray(mesh.getWorldPosition(new THREE.Vector3()), direction);
  // 3. 计算相交点
  const intersectionPoint = new THREE.Vector3();
  const result = ray.intersectSphere(
    new THREE.Sphere(sphere.getWorldPosition(new THREE.Vector3()), (sphere.geometry as any).parameters.radius),
    intersectionPoint
  );

  if (result) {
    return intersectionPoint
  } else {
    return null
  }
}

export function resizeRendererToDisplaySize(renderer: THREE.WebGLRenderer) {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize( width, height, false );
  }

  return needResize;
}
