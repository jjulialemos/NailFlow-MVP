// server/api/[...path].mjs
import serverless from 'serverless-http';
import app from '../index.mongo.js';

export const config = { api: { bodyParser: false } };
export default serverless(app);