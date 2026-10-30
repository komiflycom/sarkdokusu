/* Şark Dokusu — vitrin için hafif Supabase istemcisi (~1 KB).
   Vitrin yalnızca okuma yapar; 100+ KB'lık supabase-js yerine doğrudan
   PostgREST'e fetch atar. Yönetim paneli (admin.html) gerçek kitaplığı kullanır. */
(function () {
  'use strict';
  function createClient(url, key) {
    url = String(url).replace(/\/+$/, '');
    var headers = { apikey: key, Authorization: 'Bearer ' + key };
    function Query(table) {
      this.table = table; this.cols = '*'; this.params = []; this._limit = null;
    }
    Query.prototype.select = function (c) { this.cols = c || '*'; return this; };
    Query.prototype.eq = function (col, val) { this.params.push(col + '=eq.' + encodeURIComponent(val)); return this; };
    Query.prototype.order = function (col, o) {
      this.params.push('order=' + col + '.' + (o && o.ascending === false ? 'desc' : 'asc')); return this;
    };
    Query.prototype.limit = function (n) { this._limit = n; return this; };
    Query.prototype.then = function (ok, fail) {
      var q = ['select=' + encodeURIComponent(this.cols)].concat(this.params);
      if (this._limit != null) q.push('limit=' + this._limit);
      return fetch(url + '/rest/v1/' + this.table + '?' + q.join('&'), { headers: headers })
        .then(function (r) {
          return r.text().then(function (txt) {
            var body = null; try { body = txt ? JSON.parse(txt) : null; } catch (e) {}
            if (!r.ok) return { data: null, error: body && (body.code || body.message) ? body : { message: 'HTTP ' + r.status, code: String(r.status) } };
            return { data: body, error: null };
          });
        })
        .catch(function (e) { return { data: null, error: { message: e && e.message || 'Ağ hatası' } }; })
        .then(ok, fail);
    };
    return {
      from: function (t) { return new Query(t); },
      storage: { from: function (bucket) {
        return { getPublicUrl: function (path) {
          return { data: { publicUrl: url + '/storage/v1/object/public/' + bucket + '/' + String(path).split('/').map(encodeURIComponent).join('/') } };
        } };
      } }
    };
  }
  window.supabase = { createClient: createClient };
})();
