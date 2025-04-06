import Ball from './lib/Ball'
import Layout from './lib/Layout'

import Table from './lib/Table'
import './style.css'

function main() {
  const layout = new Layout(document.querySelector('#main-canvas') as HTMLCanvasElement)

  const table = new Table(layout)
  // eslint-disable-next-line no-new
  new Ball(layout)
  table.makeTable()
}

main()
