import express from 'express';

const router = express.Router();

// Middleware de autenticación básica
export const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Autenticación requerida' });
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  const validUsername = process.env.USERNAME || 'admin';
  const validPassword = process.env.PASSWORD || 'admin123';

  if (username !== validUsername || password !== validPassword) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  next();
};

// Endpoint para verificar autenticación
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  const validUsername = process.env.USERNAME || 'admin';
  const validPassword = process.env.PASSWORD || 'admin123';

  if (username === validUsername && password === validPassword) {
    // En una aplicación real, aquí generarías un JWT
    const token = Buffer.from(`${username}:${password}`).toString('base64');
    res.json({ 
      success: true, 
      token,
      message: 'Autenticación exitosa' 
    });
  } else {
    res.status(401).json({ 
      success: false, 
      error: 'Credenciales inválidas' 
    });
  }
});

export default router;
