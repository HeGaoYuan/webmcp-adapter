# WebMCP Website

WebMCP Adapter documentation website built with React + Vite.

## Development

```bash
npm install      # Install dependencies
npm run dev      # Start development server (http://localhost:5173)
npm run lint     # Run ESLint
```

## Build

```bash
npm run build    # Build for production (outputs to dist/)
npm run preview  # Preview production build locally
```

## Deployment to Nginx

1. Build the project:
```bash
npm run build
```

2. Copy `dist/` folder to your Nginx directory:
```bash
cp -r dist/* /path/to/nginx/html/
```

3. Configure Nginx to support client-side routing:
```nginx
location / {
    root /path/to/nginx/html;
    index index.html;
    try_files $uri $uri/ /index.html;
}
```

4. Reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Tech Stack

- React 19
- Vite
- React Router (client-side routing)
- Tailwind CSS
- React Markdown
