import serverless from 'serverless-http';
import app from '../index.mongo.js';

export const config = { api: { bodyParser: false } }; // Express faz o parse

export default serverless(app);