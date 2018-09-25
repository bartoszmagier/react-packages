import { createStore } from 'redux';
import { RSAA } from 'redux-api-middleware';
import authReducer from '../reducer';
import authMiddleware from '../middleware';
import { SET_TOKEN } from '../const';
import { setAuthToken } from '../action';

describe('Auth middleware', () => {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQifQ.w8piG6mIk3XwZJRjdsCUxfIcNw33OwQMrM06ZVOzESE';
  const authHeaders = { Authorization: `Bearer ${token}` };

  let next, store;

  beforeEach(() => {
    next = jest.fn();
    store = createStore(authReducer, ['Use Redux']);
  });

  it('should handle only RSAA', () => {
    authMiddleware()(next)({
      type: 'FOO',
    });

    expect(next).toHaveBeenCalledWith({
      type: 'FOO',
    });
  });

  it('should create an action to set the token', () => {
    const expectedAction = {
      type: SET_TOKEN,
      payload: { token },
    };
    expect(setAuthToken(token)).toEqual(expectedAction);
  });

  it('should add auth headers when there is a token in the store', () => {
    store.dispatch(setAuthToken(token));
    authMiddleware(store)(next)({
      [RSAA]: {
        foo: 'bar',
        body: {
          foo: 'bar',
        },
      },
    });

    expect(next).toHaveBeenCalledWith({
      [RSAA]: {
        foo: 'bar',
        body: {
          foo: 'bar',
        },
        headers: authHeaders,
      },
    });
  });

  it('should skip auth headers when there is no token in the store', () => {
    authMiddleware(store)(next)({
      [RSAA]: {
        foo: 'bar',
        body: {
          foo: 'bar',
        },
      },
    });

    expect(next).toHaveBeenCalledWith({
      [RSAA]: {
        foo: 'bar',
        body: {
          foo: 'bar',
        }
      },
    });
  });
});