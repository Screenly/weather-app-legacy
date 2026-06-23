import { html } from 'hono/html'

const Header = () => html`
  <header class="masthead">
    <span class="place anim" style="--d: 0ms">
      <img src="/static/images/icons/map-pin.svg" alt="" width="24" height="24" />
      <span id="city"></span>
    </span>
    <span class="clock anim" style="--d: 80ms">
      <span id="time"></span><span class="clock-sep">·</span><span class="date" id="date"></span>
    </span>
  </header>
  `

export default Header
