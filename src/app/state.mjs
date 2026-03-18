export function createMutableState(initialState) {
  let state = Object.assign({}, initialState || {});

  return {
    get(key) {
      return state[key];
    },
    set(key, value) {
      state[key] = value;
      return value;
    },
    patch(nextState) {
      state = Object.assign({}, state, nextState || {});
      return Object.assign({}, state);
    },
    snapshot() {
      return Object.assign({}, state);
    }
  };
}
