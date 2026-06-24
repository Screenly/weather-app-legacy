import { html } from 'hono/html'

const Layout = (props) => html`<!DOCTYPE html>
  <html lang="en">
    <head>
      <title>Screenly Weather App - Weather Forecast</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link
        rel="preload"
        href="/static/fonts/fraunces-latin-standard-normal.woff2"
        as="font"
        type="font/woff2"
        crossorigin
      />
      <link
        rel="preload"
        href="/static/fonts/hanken-grotesk-latin-wght-normal.woff2"
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
      <!--
        main.js is bundled by Bun.build, which detects its module.exports test
        hook and emits an ES module (the bundle ends in \`export default ...\`).
        It must therefore be loaded as type="module": a classic script cannot
        contain \`export\` ("Unexpected token 'export'") and, even stripped of
        the error, the lazy module factory would never be invoked. Loading it as
        a module both parses the export and evaluates the factory, running the
        app. Module scripts are deferred by default, so the DOM is ready.
      -->
      <script type="module" src="/static/js/main.js"></script>
    </head>
    <body>
      ${props.children}
    </body>
  </html>`

export default Layout
