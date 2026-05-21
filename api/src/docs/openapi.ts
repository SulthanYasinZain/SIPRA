export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "SIPRA API",
    version: "1.0.0",
    description: "API documentation for authentication and seed endpoints",
  },
  servers: [{ url: "http://localhost:3000" }],
  tags: [
    { name: "Auth" },
    { name: "Seed" },
  ],
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["nim", "password", "role"],
                properties: {
                  nim: { type: "string", example: "220001" },
                  password: { type: "string", example: "12345678" },
                  role: { type: "string", enum: ["STUDENT", "TEACHER", "ADMIN"], example: "STUDENT" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Register successful" },
          "400": { description: "Bad request" },
          "409": { description: "NIM already registered" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["nim", "password"],
                properties: {
                  nim: { type: "string", example: "admin" },
                  password: { type: "string", example: "12345678" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Login successful" },
          "400": { description: "Bad request" },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/seed/users": {
      post: {
        tags: ["Seed"],
        summary: "Seed default users (admin, student, teacher)",
        responses: {
          "200": { description: "Seed completed" },
          "500": { description: "Seed failed" },
        },
      },
    },
  },
} as const;
