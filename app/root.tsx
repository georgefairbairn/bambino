import type { MetaFunction, LinksFunction } from '@remix-run/node';
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react';
import Layout from './components/layout';
import tailwind from './tailwind.css';
import styles from './styles/global.css';

export const meta: MetaFunction = () => ({
  charset: 'utf-8',
  title: 'bambino',
  viewport: 'width=device-width,initial-scale=1',
});

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: tailwind },
  { rel: 'stylesheet', href: styles },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Sanchez&display=fallback',
  },
];

export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body className="bg-sky-200">
        <Layout>
          <Outlet />
        </Layout>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
