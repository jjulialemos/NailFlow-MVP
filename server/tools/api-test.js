import fetch from 'node-fetch';

const API_URL = 'http://localhost:4000';

async function login(email, password) {
  const res = await fetch(\`\${API_URL}/auth/login\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Login failed');
  const data = await res.json();
  return data.token;
}

async function getClients(token) {
  const res = await fetch(\`\${API_URL}/clients\`, {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!res.ok) throw new Error('Get clients failed');
  return await res.json();
}

async function runTests() {
  try {
    console.log('Logging in...');
    const token = await login('demo@nailflow.app', '123456');
    console.log('Token:', token);

    console.log('Fetching clients...');
    const clients = await getClients(token);
    console.log('Clients:', clients);

    console.log('All tests passed.');
  } catch (err) {
    console.error('Test failed:', err.message);
  }
}

runTests();
