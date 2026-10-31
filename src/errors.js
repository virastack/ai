/** Stops a run before anything is written. `key` names a message in `errors`. */
export class RunError extends Error {
  constructor(key, ...params) {
    super(key);
    this.key = key;
    this.params = params;
  }
}
