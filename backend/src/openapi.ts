export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "AquaWatch NG API",
    version: "1.0.0",
    description:
      "Satellite-detected standing water -> AI-predicted malaria risk -> automated alerts. " +
      "This API serves ward risk data, manages role-scoped access, dispatches multi-channel alerts, " +
      "and exposes a full audit trail. All endpoints except /health and /public/* require a Supabase " +
      "bearer token in the Authorization header.",
  },
  servers: [
    { url: "http://localhost:4000", description: "Local development" },
    { url: "https://REPLACE-WITH-YOUR-RENDER-URL.onrender.com", description: "Production (update after deploy)" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "Supabase JWT",
        description: "The access_token from a Supabase Auth session.",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string", example: "unauthorized" },
          message: { type: "string", example: "missing bearer token" },
        },
      },
      Ward: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "Adankolo" },
          lgaId: { type: "string", format: "uuid" },
          lgaName: { type: "string", example: "Lokoja" },
          state: { type: "string", example: "Kogi" },
          satelliteImageUrl: { type: "string", nullable: true },
          satelliteImageUpdatedAt: { type: "string", format: "date-time", nullable: true },
          cachedRiskScore: { type: "number", nullable: true, example: 0.72 },
          cachedRiskLabel: { type: "string", nullable: true, enum: ["low", "moderate", "high", null] },
          cachedContributingFactors: { type: "object", nullable: true },
          cachedRiskUpdatedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      RiskAssessment: {
        type: "object",
        properties: {
          wardId: { type: "string", format: "uuid" },
          riskScore: { type: "number", example: 0.72 },
          riskLabel: { type: "string", enum: ["low", "moderate", "high"] },
          contributingFactors: { type: "object", additionalProperties: { type: "number" } },
        },
      },
      Alert: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          wardId: { type: "string", format: "uuid" },
          healthWorkerId: { type: "string", format: "uuid" },
          channel: { type: "string", enum: ["sms", "whatsapp", "email"] },
          riskScore: { type: "number" },
          riskLabel: { type: "string", enum: ["low", "moderate", "high"] },
          message: { type: "string" },
          status: { type: "string", enum: ["sent", "failed"] },
          providerMessageId: { type: "string", nullable: true },
          errorMessage: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      UserProfile: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          fullName: { type: "string" },
          role: { type: "string", enum: ["government", "lga_official", "ward_official"] },
          lgaId: { type: "string", format: "uuid", nullable: true },
          wardId: { type: "string", format: "uuid", nullable: true },
          alertThreshold: { type: "number", nullable: true },
          phoneNumber: { type: "string", nullable: true },
          isWhatsappCapable: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      HealthWorker: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          wardId: { type: "string", format: "uuid" },
          fullName: { type: "string" },
          role: { type: "string", enum: ["chew", "lga_coordinator", "state_official"] },
          phoneNumber: { type: "string" },
          email: { type: "string", nullable: true },
          whatsappCapable: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      AuditLogEntry: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          actorId: { type: "string", format: "uuid", nullable: true },
          actorEmail: { type: "string", nullable: true },
          action: { type: "string", example: "threshold.updated" },
          targetType: { type: "string", example: "ward" },
          targetId: { type: "string", nullable: true },
          metadata: { type: "object" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: "Public", description: "No authentication required" },
    { name: "Users", description: "Profile, role, and threshold management" },
    { name: "Wards", description: "Ward data and risk scores" },
    { name: "Alerts", description: "Alert history, stats, and triggering" },
    { name: "Health Workers", description: "Alert recipient registration" },
    { name: "Audit Log", description: "Government-only system activity log" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Public"],
        summary: "Service health check",
        security: [],
        responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { status: { type: "string" } } } } } } },
      },
    },
    "/public/wards": {
      get: {
        tags: ["Public"],
        summary: "List all wards (unauthenticated - used to populate signup dropdowns)",
        security: [],
        responses: {
          "200": {
            description: "OK",
            content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Ward" } } } } } },
          },
        },
      },
    },
    "/users/profile": {
      post: {
        tags: ["Users"],
        summary: "Create or update the caller's profile",
        description:
          "For ward_official or lga_official roles with a phoneNumber, this also auto-registers the caller " +
          "as a health worker (recipient of alerts) for their ward, or every ward in their LGA.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["fullName", "role"],
                properties: {
                  fullName: { type: "string" },
                  role: { type: "string", enum: ["government", "lga_official", "ward_official"] },
                  lgaId: { type: "string", format: "uuid", nullable: true, description: "Required for lga_official" },
                  wardId: { type: "string", format: "uuid", nullable: true, description: "Required for ward_official" },
                  phoneNumber: { type: "string", nullable: true, description: "Required for lga_official/ward_official" },
                  isWhatsappCapable: { type: "boolean", default: true },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Created/updated", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/UserProfile" } } } } } },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/users/me": {
      get: {
        tags: ["Users"],
        summary: "Get the caller's own profile",
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/UserProfile" } } } } } },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/users/threshold": {
      patch: {
        tags: ["Users"],
        summary: "Update the caller's personal alert threshold override",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["alertThreshold"], properties: { alertThreshold: { type: "number", nullable: true, minimum: 0, maximum: 1 } } },
            },
          },
        },
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/UserProfile" } } } } } },
          "400": { description: "Validation error" },
        },
      },
    },
    "/wards": {
      get: {
        tags: ["Wards"],
        summary: "List wards in the caller's scope",
        description: "Government sees all wards. lga_official sees wards in their LGA. ward_official sees only their own ward.",
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Ward" } } } } } } },
        },
      },
    },
    "/wards/risk/refresh-cache": {
      post: {
        tags: ["Wards"],
        summary: "Refresh cached risk scores for every ward (government only)",
        description: "Long-running - intended for cron/manual full refresh, not for a browser waiting on the response. Use /wards/risk/refresh-batch for a UI-driven refresh with progress.",
        responses: {
          "200": { description: "OK" },
          "403": { description: "Not a government account" },
        },
      },
    },
    "/wards/risk/refresh-batch": {
      post: {
        tags: ["Wards"],
        summary: "Refresh cached risk scores for a small batch of wards (government only)",
        description: "Designed to be called repeatedly with small batches (max 50 ward ids) so the frontend can show live progress.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["wardIds"], properties: { wardIds: { type: "array", items: { type: "string", format: "uuid" }, minItems: 1, maxItems: 50 } } },
            },
          },
        },
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: { type: "object", properties: { data: { type: "object", properties: { wardsChecked: { type: "integer" }, wardsUpdated: { type: "integer" }, wardsFailed: { type: "integer" } } } } },
              },
            },
          },
          "400": { description: "Validation error" },
          "403": { description: "Not a government account" },
        },
      },
    },
    "/wards/alerts/stats": {
      get: {
        tags: ["Alerts"],
        summary: "Aggregated sent/failed alert counts across the caller's scoped wards",
        responses: { "200": { description: "OK" } },
      },
    },
    "/wards/alerts/analytics": {
      get: {
        tags: ["Alerts"],
        summary: "14-day alert analytics - channel breakdown and daily volume",
        responses: { "200": { description: "OK" } },
      },
    },
    "/wards/alerts/recent": {
      get: {
        tags: ["Alerts"],
        summary: "10 most recent alerts across the caller's scoped wards, enriched with ward name",
        responses: { "200": { description: "OK" } },
      },
    },
    "/wards/alerts": {
      get: {
        tags: ["Alerts"],
        summary: "Paginated, filterable alert history across the caller's scoped wards",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
          { name: "channel", in: "query", schema: { type: "string", enum: ["sms", "whatsapp", "email"] } },
          { name: "status", in: "query", schema: { type: "string", enum: ["sent", "failed"] } },
          { name: "wardId", in: "query", schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { allOf: [{ $ref: "#/components/schemas/Alert" }, { type: "object", properties: { wardName: { type: "string" } } }] } },
                    meta: { type: "object", properties: { total: { type: "integer" }, page: { type: "integer" }, pageSize: { type: "integer" } } },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/wards/{wardId}": {
      get: {
        tags: ["Wards"],
        summary: "Get a single ward",
        parameters: [{ name: "wardId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Ward" } } } } } },
          "403": { description: "Ward is outside the caller's scope" },
          "404": { description: "Ward not found" },
        },
      },
    },
    "/wards/{wardId}/risk": {
      get: {
        tags: ["Wards"],
        summary: "Live risk assessment for one ward (calls ml-service directly, not cached)",
        parameters: [{ name: "wardId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/RiskAssessment" } } } } } },
          "422": { description: "Ward is missing required environmental features" },
        },
      },
    },
    "/wards/{wardId}/alerts/trigger": {
      post: {
        tags: ["Alerts"],
        summary: "Evaluate a ward's current risk and dispatch alerts if it crosses the threshold",
        parameters: [{ name: "wardId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        wardId: { type: "string" },
                        riskAssessment: { $ref: "#/components/schemas/RiskAssessment" },
                        triggered: { type: "boolean" },
                        thresholdUsed: { type: "number" },
                        alerts: { type: "array", items: { $ref: "#/components/schemas/Alert" } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/wards/{wardId}/alerts": {
      get: {
        tags: ["Alerts"],
        summary: "Full alert history for a single ward",
        parameters: [{ name: "wardId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "OK" } },
      },
    },
    "/health-workers": {
      post: {
        tags: ["Health Workers"],
        summary: "Register a health worker as an alert recipient for a ward",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["wardId", "fullName", "role", "phoneNumber"],
                properties: {
                  wardId: { type: "string", format: "uuid" },
                  fullName: { type: "string" },
                  role: { type: "string", enum: ["chew", "lga_coordinator", "state_official"] },
                  phoneNumber: { type: "string" },
                  email: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Created", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/HealthWorker" } } } } } },
          "400": { description: "Validation error" },
        },
      },
    },
    "/health-workers/ward/{wardId}": {
      get: {
        tags: ["Health Workers"],
        summary: "List registered health workers for a ward",
        parameters: [{ name: "wardId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/HealthWorker" } } } } } } },
        },
      },
    },
    "/audit-logs": {
      get: {
        tags: ["Audit Log"],
        summary: "Paginated, filterable system activity log (government only)",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
          { name: "action", in: "query", schema: { type: "string" } },
          { name: "actorId", in: "query", schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/AuditLogEntry" } },
                    meta: { type: "object", properties: { total: { type: "integer" }, page: { type: "integer" }, pageSize: { type: "integer" } } },
                  },
                },
              },
            },
          },
          "403": { description: "Not a government account" },
        },
      },
    },
  },
};
