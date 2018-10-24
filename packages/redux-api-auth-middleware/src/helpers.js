// @flow
import moment from 'moment';

type AnyObject = {
  [key: string]: any,
};

export function parseJWTPayload(token: string): AnyObject | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch (e) {
    return null;
  }
}

export function calculateJWTTokenExpirationDate(payload: AnyObject): number {
  if (!payload) return 0;
  const token = parseJWTPayload(payload.authToken);
  if (!token) return 0;
  const { iat, exp } = token;
  return iat && exp ? Number(iat) + Number(exp) : 0;
}

export function calculateOauthTokenExpirationDate(payload: AnyObject): number {
  if (!payload) return 0;
  const { expires_in } = payload;
  return moment().unix() + expires_in;
}

export function isTokenExpired(expires: number): boolean {
  return expires ? expires - moment().unix() < 0 : true;
}
