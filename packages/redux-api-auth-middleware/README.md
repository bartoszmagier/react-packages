# Auth middleware

## Installation

Using [yarn](https://yarnpkg.com/lang/en/):

    $ yarn add @tshio/redux-api-auth-middleware

Using [npm](https://www.npmjs.com/):

    $ npm install --save @tshio/redux-api-auth-middleware

Then, to enable authMiddleware, use [`applyMiddleware`](https://redux.js.org/api-reference/applymiddleware):

```js
import { applyMiddleware, createStore } from 'redux';

import { apiMiddleware } from 'redux-api-middleware';
import { authMiddleware } from '@tshio/redux-api-auth-middleware';

import { appReducer } from 'app/app.reducer';

const middlewares = [authMiddleware, apiMiddleware];

const store = createStore(appReducer, applyMiddleware(...middlewares));
```

and add authReducer to your app:

```js
import { combineReducers } from 'redux'
import { authReducer } from '@tshio/redux-api-auth-middleware';
import ...

export default combineReducers({
  auth: authReducer,
  ...
})
```
