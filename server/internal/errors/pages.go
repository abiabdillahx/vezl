package errors

const ForbiddenPage = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>403 Forbidden</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <style>
        body { background-color: #09090b; color: #fafafa; font-family: Outfit, sans-serif; display: flex; height: 100vh; margin: 0; align-items: center; justify-content: center; text-align: center; }
        .container { max-width: 400px; padding: 2rem; }
        h1 { color: #f31260; margin-bottom: 1rem; }
        p { color: #a1a1aa; margin-bottom: 1.5rem; }
        a { color: #006FEE; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
<div class="container">
    <h1>403 Forbidden</h1>
    <p>Access to this link is blocked due to security policy.</p>
    <p>If you believe this is a mistake, please contact the administrator.</p>
</div>
</body>
</html>`

const GonePage = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>410 Gone</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <style>
        body { background-color: #09090b; color: #fafafa; font-family: Outfit, sans-serif; display: flex; height: 100vh; margin: 0; align-items: center; justify-content: center; text-align: center; }
        .container { max-width: 400px; padding: 2rem; }
        h1 { color: #f5a524; margin-bottom: 1rem; }
        p { color: #a1a1aa; margin-bottom: 1.5rem; }
        a { color: #006FEE; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
<div class="container">
    <h1>410 Gone</h1>
    <p>This link has expired or reached its usage limit.</p>
    <p>If you believe this is a mistake, please contact the administrator.</p>
</div>
</body>
</html>`