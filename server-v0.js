const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Environment variables you need to set in Render
const CLIENT_ID = process.env.HF_CLIENT_ID;
const CLIENT_SECRET = process.env.HF_CLIENT_SECRET;
const REDIRECT_URI = process.env.HF_REDIRECT_URI; // https://your-app.onrender.com/auth/callback
const ANDROID_SCHEME = process.env.ANDROID_SCHEME || 'aiEdgeGallery'; // Your Android app scheme

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'OAuth server running',
    endpoints: ['/auth/callback']
  });
});

// OAuth callback endpoint - this is where Hugging Face redirects after login
app.get('/auth/callback', async (req, res) => {
  console.log('Received callback with query:', req.query);
  
  const { code, state, error } = req.query;
  
  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error);
    return res.redirect(`${ANDROID_SCHEME}://oauth-error?error=${encodeURIComponent(error)}`);
  }
  
  // Check if authorization code is present
  if (!code) {
    console.error('No authorization code received');
    return res.redirect(`${ANDROID_SCHEME}://oauth-error?error=no_code`);
  }
  
  try {
    console.log('Exchanging code for token...');
    
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://huggingface.co/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI
      })
    });
    
    const tokenData = await tokenResponse.json();
    console.log('Token response:', tokenData);
    
    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenData.error_description || tokenData.error}`);
    }
    
    const accessToken = tokenData.access_token;
    
    if (!accessToken) {
      throw new Error('No access token received');
    }
    
    // Get user info (optional, for verification)
    const userResponse = await fetch('https://huggingface.co/api/whoami-v2', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const userData = await userResponse.json();
    console.log('User data:', userData.name);
    
    // Redirect back to Android app with the access token
    const redirectUrl = `${ANDROID_SCHEME}://oauth-success?token=${encodeURIComponent(accessToken)}&user=${encodeURIComponent(userData.name || 'unknown')}`;
    
    console.log('Redirecting to:', redirectUrl);
    
    // Show a success page that will redirect to the app
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Successful</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #28a745; }
            .loading { color: #6c757d; }
          </style>
        </head>
        <body>
          <h1 class="success">✅ Authentication Successful!</h1>
          <p class="loading">Redirecting back to AI Edge Gallery...</p>
          <p>If you're not redirected automatically, <a href="${redirectUrl}">click here</a></p>
          
          <script>
            // Try to redirect to the app
            setTimeout(() => {
              window.location.href = '${redirectUrl}';
            }, 1000);
            
            // Fallback: show manual redirect after 3 seconds
            setTimeout(() => {
              document.querySelector('.loading').innerHTML = 
                'Please return to the AI Edge Gallery app or <a href="${redirectUrl}">click here</a>';
            }, 3000);
          </script>
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('Error during token exchange:', error);
    res.redirect(`${ANDROID_SCHEME}://oauth-error?error=${encodeURIComponent(error.message)}`);
  }
});

// Error endpoint for debugging
app.get('/debug', (req, res) => {
  res.json({
    env: {
      CLIENT_ID: CLIENT_ID ? 'Set' : 'Missing',
      CLIENT_SECRET: CLIENT_SECRET ? 'Set' : 'Missing',
      REDIRECT_URI: REDIRECT_URI || 'Missing',
      ANDROID_SCHEME: ANDROID_SCHEME
    }
  });
});

app.listen(PORT, () => {
  console.log(`OAuth server running on port ${PORT}`);
  console.log(`Callback URL: ${REDIRECT_URI}`);
});

module.exports = app;
