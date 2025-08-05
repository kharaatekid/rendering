const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'OAuth server running',
    endpoints: ['/auth/callback']
  });
});

// OAuth callback endpoint - sends code to parent window via postMessage
app.get('/auth/callback', (req, res) => {
  console.log('Received callback with query:', req.query);
  
  const { code, state, error } = req.query;
  
  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error);
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>OAuth Error</title></head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'oauth-error',
                error: '${error}'
              }, '*');
              window.close();
            } else {
              document.body.innerHTML = '<p>OAuth error: ${error}</p>';
            }
          </script>
        </body>
      </html>
    `);
  }
  
  // Send authorization code to parent window
  if (code) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>OAuth Success</title></head>
        <body>
          <p>Authorization successful. Closing window...</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'oauth-success',
                code: '${code}',
                state: '${state || ''}'
              }, '*');
              window.close();
            } else {
              document.body.innerHTML = '<p>Authorization code received. Please close this window.</p>';
            }
          </script>
        </body>
      </html>
    `);
  }
  
  // No code received
  return res.send(`
    <!DOCTYPE html>
    <html>
      <head><title>OAuth Error</title></head>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: 'oauth-error',
              error: 'no_code'
            }, '*');
            window.close();
          } else {
            document.body.innerHTML = '<p>No authorization code received.</p>';
          }
        </script>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`OAuth server running on port ${PORT}`);
});

module.exports = app;
