import { calculateJWTTokenExpirationDate } from '../helpers';
import { CLEAR_TOKEN, REFRESH_TOKEN_FAILURE, REFRESH_TOKEN_SUCCESS, SET_TOKEN } from './types';
import type { GetExpirationTimestamp, SetTokenAction, State } from '../types';

export const initialState: State = {
  authToken: null,
  refreshToken: null,
  expires: 0,
};

export default function({
  getExpirationTimestamp = calculateJWTTokenExpirationDate,
}: GetExpirationTimestamp<number> = {}) {
  return function authReducer(
    state: State = initialState,
    action: SetTokenAction,
    tokenExpiration: GetExpirationTimestamp<number> = getExpirationTimestamp
  ) {
    switch (action.type) {
      case SET_TOKEN:
        return {
          ...state,
          authToken: action.payload?.authToken,
          refreshToken: action.payload?.refreshToken,
          expires: tokenExpiration(action.payload),
        };
      case REFRESH_TOKEN_SUCCESS:
        return {
          ...state,
          authToken: action.payload?.authToken,
          refreshToken: action.payload?.refreshToken,
          expires: tokenExpiration(action.payload),
        };
      case CLEAR_TOKEN:
        return initialState;
      case REFRESH_TOKEN_FAILURE:
        return initialState;
      default:
        return state;
    }
  };
}
