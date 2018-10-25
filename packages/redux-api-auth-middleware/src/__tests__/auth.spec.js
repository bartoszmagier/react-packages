import moment from 'moment';
import { createStore, combineReducers } from 'redux';
import { apiMiddleware, RSAA } from 'redux-api-middleware';
import configureMockStore from 'redux-mock-store';
import nodeFetch from 'node-fetch';
import fetchMock from 'fetch-mock';

import createAuthMiddleware from '../auth.middleware';
import {
  calculateJWTTokenExpirationDate,
  calculateOauthTokenExpirationDate,
  isTokenExpired,
  parseJWTPayload,
} from '../helpers';
import createAuthReducer, { initialState } from '../store/reducer';
import { setTokenAction, clearTokenAction, refreshTokenAction } from '../store/actions';
import {
  SET_TOKEN,
  CLEAR_TOKEN,
  REFRESH_TOKEN_REQUEST,
  REFRESH_TOKEN_FAILURE,
  REFRESH_TOKEN_SUCCESS,
} from '../store/types';

import { authToken, refreshToken, expiredAuthToken, oAuthToken } from './const';

const refreshEndpoint = 'https://example.com/refresh-token';
const apiEndpoint = 'https://example.com/users';
const failedAction = { type: 'LOGOUT' };
const authReducer = createAuthReducer();

const authMiddleware = createAuthMiddleware({
  refreshConfig: {
    endpoint: refreshEndpoint,
    failedAction,
  },
});

const middlewares = [authMiddleware, apiMiddleware];
const mockStore = configureMockStore(middlewares);
const flushPromises = () => new Promise(resolve => setImmediate(resolve));
let next, store;

describe('Auth middleware', () => {
  const authHeaders = { Authorization: `Bearer ${authToken}` };

  beforeEach(() => {
    global.fetch = nodeFetch;
    next = jest.fn();

    store = {
      dispatch: jest.fn(() => new Promise(resolve => resolve({ error: true }))),
      getState: () => ({ auth: { authToken, refreshToken, expires: 999999999999999 } }),
    };
  });

  afterEach(() => {
    fetchMock.reset();
    fetchMock.restore();
  });

  it('should create an action to set the token', () => {
    const expectedAction = {
      type: SET_TOKEN,
      payload: { authToken, refreshToken },
    };
    expect(setTokenAction({ authToken, refreshToken })).toEqual(expectedAction);
  });

  it('should create an action to clear the token', () => {
    const expectedAction = {
      type: CLEAR_TOKEN,
    };
    expect(clearTokenAction()).toEqual(expectedAction);
  });

  it('should create an action to refresh the token', () => {
    const [refreshToken, endpoint] = ['refreshToken', '/endpoint'];
    expect(refreshTokenAction({ refreshToken, endpoint })).toEqual({
      [RSAA]: {
        body: `{"token":"${refreshToken}"}`,
        endpoint,
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
        types: [REFRESH_TOKEN_REQUEST, REFRESH_TOKEN_SUCCESS, REFRESH_TOKEN_FAILURE],
        skipAuth: true,
      },
    });
  });

  it('should handle set token action', () => {
    expect(authReducer({}, { type: SET_TOKEN, payload: { authToken, refreshToken } })).toEqual({
      authToken,
      refreshToken,
      expires: calculateJWTTokenExpirationDate({ authToken }),
    });
  });

  it('should handle clear token action', () => {
    expect(authReducer({}, { type: CLEAR_TOKEN })).toEqual({
      authToken: null,
      refreshToken: null,
      expires: 0,
    });
  });

  it('should handle refresh token success action', () => {
    expect(authReducer({}, { type: REFRESH_TOKEN_SUCCESS, payload: { authToken, refreshToken } })).toEqual({
      authToken,
      refreshToken,
      expires: calculateJWTTokenExpirationDate({ authToken }),
    });
  });

  it('should handle refresh token failure action', () => {
    expect(authReducer({}, { type: REFRESH_TOKEN_FAILURE })).toEqual({
      authToken: null,
      refreshToken: null,
      expires: 0,
    });
  });

  it('should handle default action', () => {
    expect(authReducer(undefined, { type: 'FOO' })).toEqual(initialState);
  });

  it('should throw an error if reducer is not set correctly', () => {
    const badStore = createStore(combineReducers({ badKey: () => null }));
    const middleware = () => authMiddleware(badStore)(next)({ type: 'FOO' });
    expect(middleware).toThrowErrorMatchingSnapshot();
  });

  it('should throw an error if refresh token url is not specified', () => {
    expect(() => createAuthMiddleware({ refreshConfig: { endpoint: null } })).toThrowErrorMatchingSnapshot();
  });

  it('should not throw an error if refresh config is not specified', () => {
    expect(() => createAuthMiddleware()).not.toThrow();
  });

  it('should calculate JWT token expiration properly', () => {
    expect(isTokenExpired()).toBeTruthy();
    expect(isTokenExpired(calculateJWTTokenExpirationDate({ authToken }))).toBeFalsy();
    expect(isTokenExpired(calculateJWTTokenExpirationDate({ authToken: expiredAuthToken }))).toBeTruthy();
    expect(isTokenExpired('Not Valid Token')).toBeFalsy();
  });

  it('should parse JWT', () => {
    expect(parseJWTPayload(authToken)).toEqual({ exp: 3600, iat: 4133980799 });
    expect(parseJWTPayload()).toEqual(null);
  });

  it('should calculate JWT expiration date', () => {
    const badToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE1MTYyMzkwMjJ9.tbDepxpstvGdW8TC3G8zg4B6rUYAOvfzdceoH48wgRQ';
    expect(calculateJWTTokenExpirationDate({ authToken })).toEqual(4133980799 + 3600);
    expect(calculateJWTTokenExpirationDate({ authToken: badToken })).toEqual(0);
    expect(calculateJWTTokenExpirationDate('foo')).toEqual(0);
    expect(calculateJWTTokenExpirationDate()).toEqual(0);
  });

  it('should calculate OAuth expiration date', () => {
    expect(calculateOauthTokenExpirationDate(oAuthToken)).toEqual(moment().unix() + 3600);
    expect(calculateOauthTokenExpirationDate()).toEqual(0);
  });

  it('should handle only RSAA', () => {
    const action = {
      type: 'FOO',
    };
    authMiddleware(store)(next)(action);
    expect(next).toHaveBeenCalledWith(action);
  });

  it('should add auth headers when there is no skipToken flag', () => {
    const action = {
      [RSAA]: {
        body: {
          foo: 'bar',
        },
      },
    };
    authMiddleware(store)(next)(action);
    expect(next).toHaveBeenCalledWith({
      [RSAA]: {
        ...action[RSAA],
        headers: authHeaders,
      },
    });
  });

  it('should skip auth headers when there is skipAuth flag', () => {
    const action = {
      [RSAA]: {
        body: {
          foo: 'bar',
        },
      },
    };
    authMiddleware(store)(next)({
      [RSAA]: {
        ...action[RSAA],
        skipAuth: true,
      },
    });

    expect(next).toHaveBeenCalledWith(action);
  });

  it('should skip auth headers when they are a function', () => {
    const action = {
      [RSAA]: {
        body: {
          foo: 'bar',
        },
        headers: () => null,
      },
    };
    authMiddleware(store)(next)(action);
    expect(next).toHaveBeenCalledWith(action);
  });

  it('should skip auth headers when there is no authToken', () => {
    const store = mockStore({ auth: { authToken: null, refreshToken: null, expires: 0 } });
    const action = {
      [RSAA]: {
        body: {
          foo: 'bar',
        },
      },
    };
    authMiddleware(store)(next)(action);
    expect(next).toHaveBeenCalledWith(action);
  });

  it('should dispatch API request when token is valid', async () => {
    const store = mockStore({ auth: { authToken, refreshToken, expires: 4133984399 } });
    const action = {
      [RSAA]: {
        endpoint: apiEndpoint,
        method: 'GET',
        types: ['API_REQUEST', 'API_SUCCESS', 'API_FAILURE'],
      },
    };
    fetchMock.mock(refreshEndpoint, {
      authToken,
      refreshToken,
    });
    fetchMock.mock(apiEndpoint, 200);
    await store.dispatch(action);
    expect(store.getActions()[0]).toEqual({ type: action[RSAA].types[0] });
  });

  it('should dispatch failed action when there is 401 response status for token refresh endpoint', async () => {
    const store = mockStore({ auth: { authToken: expiredAuthToken, refreshToken, expires: 1516325422 } });
    const action = {
      [RSAA]: {
        endpoint: apiEndpoint,
        method: 'GET',
        types: ['API_REQUEST', 'API_SUCCESS', 'API_FAILURE'],
      },
    };
    fetchMock.mock(refreshEndpoint, 401);
    fetchMock.mock(apiEndpoint, 200);
    await store.dispatch(action);
    expect(store.getActions()).toEqual(expect.arrayContaining([failedAction]));
  });

  it('should dispatch failed action when there is 401 response status for token refresh endpoint', async () => {
    const store = mockStore({ auth: { authToken: expiredAuthToken, refreshToken, expires: 1516325422 } });
    const action = {
      [RSAA]: {
        endpoint: apiEndpoint,
        method: 'GET',
        types: ['API_REQUEST', 'API_SUCCESS', 'API_FAILURE'],
      },
    };
    fetchMock.mock(refreshEndpoint, {
      authToken,
      refreshToken,
    });
    fetchMock.mock(apiEndpoint, 200);
    await store.dispatch(action);
    expect(store.getActions()[0]).toEqual({ type: REFRESH_TOKEN_REQUEST });
    expect(store.getActions()[2]).toEqual({ type: action[RSAA].types[0] });
  });
});
