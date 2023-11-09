import crypto from 'crypto';
import DOMPurify from 'dompurify';

// TypeNames:
type Auth = { username: string; password: string } | null;

//------------- Helper Functions--------------------------
function generateToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input);
}

function parseBasicAuthHeader(authHeader: string): Auth {
  // Check if the header starts with "Basic"
  if (authHeader.startsWith('Basic ')) {
    // Extract the Base64 encoded portion
    const base64Credentials = authHeader.slice(6);

    // Decode the Base64 string
    const decodedString = Buffer.from(base64Credentials, 'base64').toString(
      'utf-8'
    );

    // Split the decoded string into username and password
    const [username, password] = decodedString.split(':');

    return { username, password };
  }
  return null;
}

function parseBearerAuthHeader(authHeader: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  return token;
}

function getUserInfo(auth: Auth): Auth {
  if (auth) {
    return {
      username: auth.username,
      password: auth.password,
    };
  }
  return null;
}

export {
  generateToken,
  sanitizeInput,
  parseBasicAuthHeader,
  getUserInfo,
  parseBearerAuthHeader,
};
