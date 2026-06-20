import { html } from 'hono/html'

const Layout = (props) => html`<!DOCTYPE html>
  <html>
    <head>
      <title>Screenly Weather App - Weather Forecast</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link
        rel="preload"
        href="/static/fonts/inter-latin-400-normal.woff2"
        as="font"
        type="font/woff2"
        crossorigin
      />
      <link rel="stylesheet" href="/static/styles/main.css" />
      <script
        src="https://js.sentry-cdn.com/${props.sentryId}.min.js"
        crossorigin="anonymous"
      ></script>
      <!-- Google tag (gtag.js) -->
      <script async src="https://www.googletagmanager.com/gtag/js?id=${props.gaId}"></script>
      <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());

        gtag('config', '${props.gaId}');
      </script>
      <script src="/static/js/main.js" async defer></script>
    </head>
    <body>
      ${props.children}
    </body>
  </html>`

export default Layout
