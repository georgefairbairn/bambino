import { httpRouter } from 'convex/server';
import { webhook } from './revenuecat';

const http = httpRouter();

http.route({ path: '/revenuecat', method: 'POST', handler: webhook });

export default http;
