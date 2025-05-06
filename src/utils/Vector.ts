export default class Vector {
  constructor(public x: number, public y: number) {}

  add(v: Vector) {
    return new Vector(
      this.x + v.x,
      this.y + v.y,
    )
  }

  addTo(v: Vector) {
    this.x += v.x
    this.y += v.y
  }

  sub(v: Vector) {
    return new Vector(
      this.x - v.x,
      this.y - v.y,
    )
  }

  subFrom(v: Vector) {
    this.x -= v.x
    this.y -= v.y
  }

  multiple(n: number) {
    return new Vector(this.x * n, this.y * n)
  }

  div(n: number) {
    return new Vector(this.x / n, this.y / n)
  }

  setAngle(angle: number) {
    const length = this.getLength()
    this.x = Math.cos(angle) * length
    this.y = Math.sin(angle) * length
    return this
  }

  setLength(length: number) {
    const angle = this.getAngle()
    this.x = Math.cos(angle) * length
    this.y = Math.sin(angle) * length
    return this
  }

  getAngle() {
    return Math.atan2(this.y, this.x)
  }

  getLength() {
    return Math.hypot(this.x, this.y)
  }

  getLengthSq() {
    return this.x * this.x + this.y * this.y
  }

  distanceTo(v: Vector) {
    return this.sub(v).getLength()
  }

  distanceToSq(v: Vector) {
    return this.sub(v).getLengthSq()
  }

  copy() {
    return new Vector(this.x, this.y)
  }

  rotate(angle: number) {
    return new Vector(this.x * Math.cos(angle) - this.y * Math.sin(angle), this.x * Math.sin(angle) + this.y * Math.cos(angle))
  }

  rotateAround(v: Vector, angle: number) {
    const x = (this.x - v.x) * Math.cos(angle) - (v.y - this.y) * Math.sin(angle) + v.x
    const y = (v.y - this.y) * Math.cos(angle) + (this.x - v.x) * Math.sin(angle) + v.y
    return new Vector(x, y)
  }

  lerp(v: Vector, t: number) {
    const delta = v.sub(this).multiple(t)
    return this.add(delta)
  }

  lerpTo(v: Vector, t: number) {
    const delta = v.sub(this).multiple(t)
    this.addTo(delta)
  }

  moveTowards(v: Vector, length: number) {
    const delta = v.sub(this).setLength(length)
    return this.add(delta)
  }

  equals(v: Vector) {
    return this.x === v.x && this.y === v.y
  }
}
