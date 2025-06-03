import { BilliardsStatus, emitter, EventTypes } from '../../central-control';
import ArrowButton from './ArrowButton';

export default class Helper {
  btns = new Set<ArrowButton | HTMLElement>()

  constructor() {
    emitter.on(EventTypes.status, (status) => {
      if (status === BilliardsStatus.Advanced) {
        this.showBtns()
      } else {
        this.hideBtns()
      }
    })
  }

  hideBtns() {
    this.btns.forEach(btn => {
      if (btn instanceof ArrowButton) {
        btn.hide()
      } else {
        btn.style.visibility = 'hidden'
      }
    })
  }

  showBtns() {
    this.btns.forEach(btn => {
      if (btn instanceof ArrowButton) {
        btn.show()
      } else {
        btn.style.visibility = 'visible'
      }
    })
  }
}