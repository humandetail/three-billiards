function createCanvas(width = 400, height = 300, canvas?: HTMLCanvasElement) {
  const c = canvas ?? document.createElement('canvas')

  c.style.width = `${width}px`
  c.style.height = `${height}px`

  const dpr = window.devicePixelRatio ?? 1

  c.width = Math.floor(dpr * width)
  c.height = Math.floor(dpr * height)

  c.getContext('2d')!.scale(dpr, dpr)

  return c
}

export default class PointHelper {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D

  width: number
  height: number

  point = {
    x: 0,
    y: 0,
    isInCircle: true
  }

  ballRadius = 24
  safeRadius = 18
  pointRadius = 4

  isDragging = false

  constructor(el: string | HTMLElement) {
    const oEl = typeof el === 'string'
      ? document.querySelector<HTMLElement>(el)
      : el

    if (!oEl || !('innerHTML' in oEl)) {
      throw new Error('Invalid element')
    }


    const { width, height } = oEl.getBoundingClientRect()
    this.width = width
    this.height = height

    this.canvas = createCanvas(width, height)
    this.ctx = this.canvas.getContext('2d')!

    this.point.x = width / 2
    this.point.y = height / 2

    oEl.appendChild(this.canvas)

    this.initEvent()

    this.draw()
  }

  initEvent() {
    const { canvas } = this
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (this.isPointClicked(x, y)) {
        this.isDragging = true;
        document.body.style.cursor = 'grabbing';
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.updatePointPosition(x, y);
      }

      document.body.style.cursor = this.isDragging ? 'grabbing' : 'default';
    });

    document.addEventListener('mouseup', () => {
      this.isDragging = false;
      document.body.style.cursor = 'default';
    });

    document.addEventListener('mouseleave', () => {
      this.isDragging = false;
      document.body.style.cursor = 'default';
    });
  }

  

  draw() {
    const { ctx, width, height, point } = this
    ctx.clearRect(0, 0, width, height)

    const cx = width / 2
    const cy = height / 2

    // 绘制大圆
    ctx.beginPath()
    ctx.arc(cx, cy, this.ballRadius, 0, Math.PI * 2)
    ctx.strokeStyle = 'red'
    ctx.stroke()

    // 绘制中心点
    ctx.beginPath()
    ctx.arc(cx, cy, this.pointRadius, 0, Math.PI * 2)
    ctx.fillStyle = 'red'
    ctx.fill()

    // 绘制允许的击球区域
    ctx.beginPath()
    ctx.arc(cx, cy, this.safeRadius, 0, Math.PI * 2)
    ctx.strokeStyle = 'blue'
    ctx.stroke()

    // 绘制可拖动点
    ctx.beginPath();
    ctx.arc(point.x, point.y, this.pointRadius, 0, Math.PI * 2);
    ctx.fillStyle = point.isInCircle ? 'green' : 'gray';
    ctx.fill();
  }

  // 检查是否点击了小点
  isPointClicked(x: number, y: number) {
    const { point } = this
    const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
    return distance <= this.pointRadius;
  }

  // 更新点位置
  updatePointPosition(x: number, y: number) {
    const { point, width, height, safeRadius } = this
    const cx = width / 2
    const cy = height / 2

    // 计算极坐标
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    if (angle < 0) angle += 360;

    // 检查是否在圆内
    const isInSafe = r <= safeRadius;
    if (!isInSafe) {
      // 计算缩放比例
      const scale = safeRadius / r;
      // 计算新的坐标
      point.x = cx + dx * scale;
      point.y = cy + dy * scale;
    } else {
      point.x = x
      point.y = y
    }
    this.draw();
  }
}