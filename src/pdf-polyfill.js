/**
 * Polyfill Map.prototype.getOrInsertComputed (TC39 upsert proposal).
 *
 * pdfjs-dist v5.x calls this on private Map fields ~14 times. It only
 * shipped natively in Chrome 136+, Firefox 144+, Safari 18.4+. Without
 * this polyfill, any older browser crashes with:
 *   this.#t.getOrInsertComputed is not a function
 *
 * Must be imported BEFORE any pdfjs-dist module.
 */

if (!Map.prototype.getOrInsertComputed) {
  Map.prototype.getOrInsertComputed = function (key, compute) {
    if (this.has(key)) return this.get(key);
    const value = compute(key, this);
    this.set(key, value);
    return value;
  };
}

if (!Map.prototype.getOrInsert) {
  Map.prototype.getOrInsert = function (key, value) {
    if (this.has(key)) return this.get(key);
    this.set(key, value);
    return value;
  };
}

if (!WeakMap.prototype.getOrInsertComputed) {
  WeakMap.prototype.getOrInsertComputed = function (key, compute) {
    if (this.has(key)) return this.get(key);
    const value = compute(key, this);
    this.set(key, value);
    return value;
  };
}

if (!WeakMap.prototype.getOrInsert) {
  WeakMap.prototype.getOrInsert = function (key, value) {
    if (this.has(key)) return this.get(key);
    this.set(key, value);
    return value;
  };
}
