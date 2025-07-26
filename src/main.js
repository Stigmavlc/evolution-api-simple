const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Mock WhatsApp instances storage
const instances = new Map();

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Evolution API is running',
    version: '2.3.0',
    endpoints: {
      manager: '/manager',
      instances: '/instance',
      webhook: '/webhook'
    }
  });
});

app.get('/manager', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Evolution API Manager</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 20px; 
                background: #f5f5f5; 
            }
            .container { 
                max-width: 800px; 
                margin: 0 auto; 
                background: white; 
                padding: 30px; 
                border-radius: 10px; 
                box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            }
            h1 { 
                color: #25D366; 
                text-align: center; 
                margin-bottom: 30px; 
            }
            .status { 
                background: #e8f5e8; 
                padding: 15px; 
                border-radius: 5px; 
                margin: 20px 0; 
                border-left: 4px solid #25D366; 
            }
            .info { 
                background: #f0f8ff; 
                padding: 15px; 
                border-radius: 5px; 
                margin: 20px 0; 
                border-left: 4px solid #007acc; 
            }
            .instances { 
                margin: 20px 0; 
            }
            .instance-card { 
                background: #f9f9f9; 
                padding: 15px; 
                margin: 10px 0; 
                border-radius: 5px; 
                border: 1px solid #ddd; 
            }
            .btn { 
                background: #25D366; 
                color: white; 
                padding: 10px 20px; 
                border: none; 
                border-radius: 5px; 
                cursor: pointer; 
                margin: 5px; 
            }
            .btn:hover { 
                background: #1ea853; 
            }
            .btn-danger { 
                background: #dc3545; 
            }
            .btn-danger:hover { 
                background: #c82333; 
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 Evolution API Manager</h1>
            
            <div class="status">
                <strong>✅ Status:</strong> Evolution API is running successfully<br>
                <strong>🌐 Server:</strong> ${req.get('host')}<br>
                <strong>📱 Instances:</strong> ${instances.size} active
            </div>
            
            <div class="info">
                <h3>📋 Quick Setup Guide</h3>
                <ol>
                    <li>Create a WhatsApp instance below</li>
                    <li>Scan the QR code with WhatsApp</li>
                    <li>Configure webhook URL for n8n integration</li>
                    <li>Test message sending</li>
                </ol>
            </div>
            
            <div class="instances">
                <h3>📱 WhatsApp Instances</h3>
                <button class="btn" onclick="createInstance()">+ Create New Instance</button>
                <div id="instance-list">
                    ${Array.from(instances.entries()).map(([id, instance]) => `
                        <div class="instance-card">
                            <strong>Instance:</strong> ${id}<br>
                            <strong>Status:</strong> ${instance.status}<br>
                            <strong>Phone:</strong> ${instance.phone || 'Not connected'}<br>
                            <button class="btn" onclick="connectInstance('${id}')">Connect</button>
                            <button class="btn btn-danger" onclick="deleteInstance('${id}')">Delete</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        
        <script>
            function createInstance() {
                const name = prompt('Enter instance name:') || 'gymbuddy-coordinator';
                fetch('/instance/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ instanceName: name })
                })
                .then(res => res.json())
                .then(data => {
                    alert('Instance created: ' + name);
                    location.reload();
                })
                .catch(err => alert('Error: ' + err.message));
            }
            
            function connectInstance(id) {
                fetch('/instance/connect/' + id, { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    if (data.qr) {
                        const win = window.open('', '_blank');
                        win.document.write('<h2>Scan this QR code with WhatsApp:</h2><img src="' + data.qr + '" style="max-width: 400px;">');
                    }
                })
                .catch(err => alert('Error: ' + err.message));
            }
            
            function deleteInstance(id) {
                if (confirm('Delete instance ' + id + '?')) {
                    fetch('/instance/delete/' + id, { method: 'DELETE' })
                    .then(() => location.reload());
                }
            }
        </script>
    </body>
    </html>
  `);
});

// Instance management endpoints
app.post('/instance/create', (req, res) => {
  const { instanceName } = req.body;
  const id = instanceName || 'default';
  
  instances.set(id, {
    id,
    status: 'disconnected',
    phone: null,
    webhook: null
  });
  
  res.json({
    status: 'success',
    instance: {
      instanceName: id,
      status: 'created'
    }
  });
});

app.post('/instance/connect/:id', async (req, res) => {
  const { id } = req.params;
  const instance = instances.get(id);
  
  if (!instance) {
    return res.status(404).json({ error: 'Instance not found' });
  }
  
  try {
    // Generate a mock QR code for demo purposes
    const qrData = `whatsapp://connect/${id}/${Date.now()}`;
    const qrCode = await QRCode.toDataURL(qrData);
    
    instance.status = 'connecting';
    instances.set(id, instance);
    
    res.json({
      status: 'success',
      qr: qrCode,
      message: 'Scan QR code with WhatsApp'
    });
    
    // Simulate connection after 10 seconds
    setTimeout(() => {
      instance.status = 'connected';
      instance.phone = '+1234567890';
      instances.set(id, instance);
    }, 10000);
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

app.delete('/instance/delete/:id', (req, res) => {
  const { id } = req.params;
  instances.delete(id);
  res.json({ status: 'deleted' });
});

app.get('/instance/list', (req, res) => {
  res.json({
    instances: Array.from(instances.values())
  });
});

// Webhook endpoints
app.post('/webhook/:instance', (req, res) => {
  const { instance } = req.params;
  console.log(`Webhook received for ${instance}:`, req.body);
  res.json({ status: 'received' });
});

// Message sending endpoint
app.post('/message/sendText/:instance', (req, res) => {
  const { instance } = req.params;
  const { number, textMessage } = req.body;
  
  console.log(`Sending message to ${number} via ${instance}: ${textMessage.text}`);
  
  res.json({
    status: 'success',
    key: {
      id: 'mock_message_id_' + Date.now(),
      remoteJid: number + '@s.whatsapp.net'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Evolution API running on port ${PORT}`);
  console.log(`📱 Manager: http://localhost:${PORT}/manager`);
});