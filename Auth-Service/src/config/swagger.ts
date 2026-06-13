import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Auth Service API',
      version: '1.0.0',
      description: 'API documentation for the User Authentication Service',
    },
    servers: [
      {
        url: 'http://localhost:3002',
        description: 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        UserRegisterInput: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: { type: 'string', example: 'testbuyer', minLength: 3, maxLength: 20 },
            email: { type: 'string', format: 'email', example: 'testbuyer@example.com' },
            password: { type: 'string', example: 'password123', minLength: 6 },
            role: { type: 'string', enum: ['admin', 'seller', 'buyer'], default: 'buyer', example: 'buyer' },
          },
        },
        UserLoginInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'testbuyer@example.com' },
            password: { type: 'string', example: 'password123' },
          },
        },
        UserUpdateInput: {
          type: 'object',
          properties: {
            username: { type: 'string', example: 'updatedbuyer', minLength: 3, maxLength: 20 },
            email: { type: 'string', format: 'email', example: 'updatedbuyer@example.com' },
            password: { type: 'string', example: 'password123', minLength: 6 },
            role: { type: 'string', enum: ['admin', 'seller', 'buyer'], example: 'buyer' },
          },
        },
        UserResponse: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '60c72b2f9b1d8b2a3c8e4d56' },
            username: { type: 'string', example: 'testbuyer' },
            email: { type: 'string', example: 'testbuyer@example.com' },
            role: { type: 'string', example: 'buyer' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Login successful' },
            data: {
              type: 'object',
              properties: {
                access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsIn...' },
                refresh_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsIn...' },
              },
            },
          },
        },
        GenericResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Success' },
            error: { type: 'string', example: 'Optional error message' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/app.ts', './dist/routes/*.js', './dist/app.js'],
};

export const swaggerSpec = swaggerJSDoc(options);
