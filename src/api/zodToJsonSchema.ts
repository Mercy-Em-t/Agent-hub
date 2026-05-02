import { z } from 'zod';

/**
 * JSON Schema type as used throughout the OpenAPI spec and /tools endpoint.
 * Covers the subset of JSON Schema 2020-12 that Zod generates for our tool
 * input schemas.  Uses `unknown` for child values so callers can nest freely.
 */
export type JsonSchema = {
  type?: string | string[];
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  minItems?: number;
  format?: string;
  additionalProperties?: boolean | JsonSchema;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

/**
 * Convert a Zod schema to a plain JSON Schema object.
 *
 * Handles the subset of Zod types used by Agent-hub's tool input schemas:
 *   ZodObject, ZodString, ZodNumber, ZodBoolean, ZodEnum, ZodArray,
 *   ZodOptional, ZodDefault, ZodRecord, ZodUnknown, ZodAny.
 *
 * No external dependencies — uses Zod's public `_def` shape.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function zodToJsonSchema(schema: z.ZodTypeAny): JsonSchema {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = (schema as any)._def as Record<string, any>;
  const typeName: string = def.typeName as string;

  // Retrieve the description set via .describe() if any
  const description: string | undefined =
    typeof def.description === 'string' ? def.description : undefined;

  const withDesc = (s: JsonSchema): JsonSchema =>
    description ? { ...s, description } : s;

  switch (typeName) {
    case 'ZodObject': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shape: Record<string, z.ZodTypeAny> = def.shape();
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        const fieldDef = (value as z.ZodTypeAny)._def as Record<string, unknown>;
        const isOptional =
          fieldDef.typeName === 'ZodOptional' || fieldDef.typeName === 'ZodDefault';
        properties[key] = zodToJsonSchema(value as z.ZodTypeAny);
        if (!isOptional) {
          required.push(key);
        }
      }

      return withDesc({
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {}),
      });
    }

    case 'ZodString': {
      const checks: Array<{ kind: string }> = (def.checks as Array<{ kind: string }>) ?? [];
      const s: JsonSchema = { type: 'string' };
      for (const check of checks) {
        if (check.kind === 'url') s.format = 'uri';
        if (check.kind === 'email') s.format = 'email';
        if (check.kind === 'min') s.minLength = (check as { kind: string; value: number }).value;
        if (check.kind === 'regex') {
          s.pattern = ((check as { kind: string; regex: RegExp }).regex).source;
        }
      }
      return withDesc(s);
    }

    case 'ZodNumber': {
      const s: JsonSchema = { type: 'number' };
      const checks: Array<{ kind: string; value?: number }> =
        (def.checks as Array<{ kind: string; value?: number }>) ?? [];
      for (const check of checks) {
        if (check.kind === 'int') s.type = 'integer';
        if (check.kind === 'min') s.minimum = check.value;
        if (check.kind === 'max') s.maximum = check.value;
      }
      return withDesc(s);
    }

    case 'ZodBoolean':
      return withDesc({ type: 'boolean' });

    case 'ZodEnum': {
      const values: unknown[] = def.values as unknown[];
      return withDesc({ type: 'string', enum: values });
    }

    case 'ZodArray': {
      const s: JsonSchema = {
        type: 'array',
        items: zodToJsonSchema(def.type as z.ZodTypeAny),
      };
      if (def.minLength !== null && def.minLength !== undefined) {
        // Zod v3 stores minLength as { value: number; message: string }
        // Guard against both that shape and a raw number for forward-compatibility.
        const raw = def.minLength as { value?: number } | number;
        const minVal = typeof raw === 'number' ? raw : raw.value;
        if (typeof minVal === 'number') s.minItems = minVal;
      }
      return withDesc(s);
    }

    case 'ZodOptional':
      return withDesc(zodToJsonSchema(def.innerType as z.ZodTypeAny));

    case 'ZodDefault':
      return withDesc(zodToJsonSchema(def.innerType as z.ZodTypeAny));

    case 'ZodRecord':
      return withDesc({
        type: 'object',
        additionalProperties:
          def.valueType ? zodToJsonSchema(def.valueType as z.ZodTypeAny) : true,
      });

    case 'ZodUnknown':
    case 'ZodAny':
      return withDesc({});

    default:
      return withDesc({});
  }
}
