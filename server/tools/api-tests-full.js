import fetch from 'node-fetch';

const API_URL = 'http://localhost:4000';

async function request(path, options = {}) {
  const res = await fetch(\`\${API_URL}\${path}\`, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function login(email, password) {
  const { status, data } = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (status !== 200) throw new Error('Login failed');
  return data.token;
}

async function testEndpoints(token) {
  const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };

  // Test clients
  let res = await request('/clients', { headers });
  console.log('GET /clients', res.status, res.data);

  // Test create client
  res = await request('/clients', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'Test Client' }),
  });
  console.log('POST /clients', res.status, res.data);
  const clientId = res.data._id;

  // Test update client
  res = await request(\`/clients/\${clientId}\`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ phone: '123456789' }),
  });
  console.log('PUT /clients/:id', res.status, res.data);

  // Test delete client
  res = await request(\`/clients/\${clientId}\`, {
    method: 'DELETE',
    headers,
  });
  console.log('DELETE /clients/:id', res.status, res.data);

  // Add more endpoint tests as needed...

  // Test availability
  res = await request('/availability', { headers });
  console.log('GET /availability', res.status, res.data);

  // Test blocked
  res = await request('/blocked', { headers });
  console.log('GET /blocked', res.status, res.data);

  // Test services
  res = await request('/services', { headers });
  console.log('GET /services', res.status, res.data);

  // Test appointments
  res = await request('/appointments', { headers });
  console.log('GET /appointments', res.status, res.data);

  // Test reports
  res = await request('/reports/monthly?year=2023&month=9', { headers });
  console.log('GET /reports/monthly', res.status, res.data);
}

async function run() {
  try {
    console.log('Logging in...');
    const token = await login('demo@nailflow.app', '123456');
    console.log('Login successful, token:', token);

    await testEndpoints(token);

    console.log('All tests completed.');
  } catch (err) {
    console.error('Test error:', err.message);
  }
}

run();
