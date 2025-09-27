const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3005;

const routes = require('./routes');

// Configure CORS to allow requests from the frontend
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://localhost:3000',
  'https://127.0.0.1:3000'
];

// Add environment-specific origins
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    console.log('🔍 CORS Debug - Origin:', origin);
    console.log('🔍 CORS Debug - NODE_ENV:', process.env.NODE_ENV);
    console.log('🔍 CORS Debug - Allowed Origins:', allowedOrigins);
    
    // Allow requests with no origin (like mobile apps, Postman, curl requests)
    if (!origin) {
      console.log('✅ CORS Debug - No origin, allowing');
      return callback(null, true);
    }
    
    // For production/deployment, be more permissive
    if (process.env.NODE_ENV === 'production') {
      console.log('✅ CORS Debug - Production mode, allowing origin:', origin);
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS Debug - Origin in allowed list:', origin);
      return callback(null, true);
    }
    
    // Allow any localhost or 127.0.0.1 origin for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      console.log('✅ CORS Debug - Localhost origin allowed:', origin);
      return callback(null, true);
    }
    
    // Allow Vercel deployments
    if (origin.includes('vercel.app')) {
      console.log('✅ CORS Debug - Vercel deployment allowed:', origin);
      return callback(null, true);
    }
    
    // If none of the above, allow it anyway (for now)
    console.log('✅ CORS Debug - Fallback allowing origin:', origin);
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Handle preflight requests explicitly with debugging
app.use((req, res, next) => {
  console.log(`🌐 Request: ${req.method} ${req.url}`);
  console.log('🌐 Origin:', req.headers.origin);
  console.log('🌐 Headers:', JSON.stringify(req.headers, null, 2));
  
  if (req.method === 'OPTIONS') {
    console.log('🚀 OPTIONS request detected - handling preflight');
    console.log('🚀 Setting CORS headers for preflight');
    
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '3600');
    
    console.log('🚀 Preflight response headers set, sending 200');
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use('/', routes);

app.get('/', (req, res) => {
  console.log('🏠 Root endpoint hit from origin:', req.headers.origin);
  res.send('Backend is running!');
});

// Add a test endpoint without authentication
app.get('/test-cors', (req, res) => {
  console.log('🧪 Test CORS endpoint hit from origin:', req.headers.origin);
  res.json({ 
    message: 'CORS test successful!', 
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
});
