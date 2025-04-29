import * as THREE from 'three'
export interface HollowRoundedBoxConfig {
  /** 方通外宽度 */
  width: number
  /** 方通外高度 */
  height: number
  /** 壁厚 */
  thickness: number
  /** 外圆角半径 */
  radius: number
  /** 方通长度 */
  depth: number
  /** 圆角分段数 */
  segments: number
}

const initialConfig: HollowRoundedBoxConfig = {
  width: 4,
  height: 2,
  thickness: 0.3,
  radius: 0.4,
  depth: 3,
  segments: 8,
}

export function createHollowRoundedBoxGeometry(config: Partial<HollowRoundedBoxConfig> = {}) {
  const cfg: HollowRoundedBoxConfig = {
    ...initialConfig,
    ...config,
  }

  // 创建外轮廓
  const outerShape = createRoundedRectShape(
    cfg.width,
    cfg.height,
    cfg.radius
  );

  // 创建内轮廓（孔洞）
  const innerWidth = cfg.width - 2 * cfg.thickness;
  const innerHeight = cfg.height - 2 * cfg.thickness;
  const innerRadius = Math.max(0, cfg.radius - cfg.thickness * 0.5);
  
  const innerPath = createRoundedRectPath(
    innerWidth,
    innerHeight,
    innerRadius
  );
  outerShape.holes.push(innerPath);

  // 拉伸成3D
  const extrudeSettings = {
    depth: cfg.depth,
    bevelEnabled: false
  };

  const geometry = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);
  geometry.center(); // 几何体居中

  return geometry
}

// 创建外轮廓形状
function createRoundedRectShape(width: number, height: number, radius: number) {
  const shape = new THREE.Shape();
  const x = -width / 2, y = -height / 2;

  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.absarc(x + width - radius, y + radius, radius, -Math.PI/2, 0);
  shape.lineTo(x + width, y + height - radius);
  shape.absarc(x + width - radius, y + height - radius, radius, 0, Math.PI/2);
  shape.lineTo(x + radius, y + height);
  shape.absarc(x + radius, y + height - radius, radius, Math.PI/2, Math.PI);
  shape.lineTo(x, y + radius);
  shape.absarc(x + radius, y + radius, radius, Math.PI, Math.PI*1.5);

  return shape;
}

// 创建内轮廓路径（逆时针方向）
function createRoundedRectPath(width: number, height: number, radius: number) {
  const path = new THREE.Path();
  const x = -width / 2, y = -height / 2;

  path.moveTo(x + radius, y);
  path.lineTo(x + width - radius, y);
  path.absarc(x + width - radius, y + radius, radius, -Math.PI/2, 0);
  path.lineTo(x + width, y + height - radius);
  path.absarc(x + width - radius, y + height - radius, radius, 0, Math.PI/2);
  path.lineTo(x + radius, y + height);
  path.absarc(x + radius, y + height - radius, radius, Math.PI/2, Math.PI);
  path.lineTo(x, y + radius);
  path.absarc(x + radius, y + radius, radius, Math.PI, Math.PI*1.5);

  return path;
}
