import { Request, Response, NextFunction } from 'express';

/**
 * Operator authentication middleware.
 *
 * Protects admin endpoints (approve/revoke for agents and sites) with an
 * API key.  The key is read from the OPERATOR_API_KEY environment variable.
 *
 * The key may be supplied by the caller in one of two ways:
 *   - HTTP header:  X-Operator-Key: <key>
 *   - HTTP header:  Authorization: Bearer <key>
 *
 * Behaviour:
 *   - If OPERATOR_API_KEY is NOT set, the middleware is a no-op (passes through).
 *     This preserves backward compatibility in development and test environments.
 *   - If OPERATOR_API_KEY IS set, any request that does not supply the correct
 *     key is rejected with HTTP 401.
 *
 * To enable operator auth in production:
 *   OPERATOR_API_KEY=<strong-random-secret> npm start
 */
export function operatorAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const operatorKey = process.env.OPERATOR_API_KEY;

  // Auth is not configured — allow all requests (development / test mode)
  if (!operatorKey) {
    next();
    return;
  }

  // Extract the supplied key from either supported header
  const xOperatorKey = req.headers['x-operator-key'];
  const authHeader = req.headers['authorization'];
  const bearerKey =
    typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;

  const provided = typeof xOperatorKey === 'string' ? xOperatorKey : bearerKey;

  if (!provided || provided !== operatorKey) {
    res.status(401).json({
      error: 'Operator authentication required. Provide a valid key via X-Operator-Key header.',
    });
    return;
  }

  next();
}
