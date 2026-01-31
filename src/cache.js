/**
 * CacheMap - LRU cache implementation
 * Doubles the size of keys (for index) so might not be the best option for large cache,
 * but for small it's worth it.
 * Adds index that keeps track of size and chronologically removes old things from the cache.
 */
class CacheMap extends Map {
  #maxSize;
  #index = [];

  constructor(maxSize = 256, iterable = []) {
    super(iterable);
    this.#maxSize = maxSize;
  }

  unshift(key, value) {
    if (this.#index.indexOf(key) > -1) {
      this.#index.splice(this.#index.indexOf(key), 1);
    }
    this.#index.unshift(key);
    this.set(key, value);

    if (this.#index.length >= this.#maxSize) {
      this.delete(this.#index[this.#maxSize - 1]);
      this.#index.splice(this.#maxSize - 1);
    }
  }

  /**
   * Puts called key at the top of the cache
   * @param {*} key
   */
  get(key) {
    let returnValue = super.get(key);
    if (this.#index.indexOf(key) > -1) {
      this.#index.splice(this.#index.indexOf(key), 1);
      this.#index.unshift(key);
    }
    return returnValue;
  }

  clear() {
    super.clear();
    this.#index = [];
  }
}

module.exports = { CacheMap };
