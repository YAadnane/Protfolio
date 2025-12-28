const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/track/visit',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, res => {
  console.log(`Visit statusCode: ${res.statusCode}`);
});

req.on('error', error => {
  console.error(error);
});

req.end();

const eventOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/track/event',
  method: 'POST',
  headers: {
      'Content-Type': 'application/json'
  }
};

const req2 = http.request(eventOptions, res => {
    console.log(`Event statusCode: ${res.statusCode}`);
});
req2.write(JSON.stringify({ type: 'click_project', id: 999 }));
req2.end();
