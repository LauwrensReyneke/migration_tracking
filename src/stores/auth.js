import { defineStore } from 'pinia';
import { initDB, getUserCount, createUser, verifyLogin, userExists } from '../utils/sqlite';

const SESSION_KEY = 'mt_auth_session_v1';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    ready: false,
    loggedIn: false,
    username: null,
    needsBootstrapUser: false,
    loading: false,
    error: null
  }),
  actions: {
    async init(){
      if (this.ready) return;
      this.loading = true; this.error = null;
      try {
        await initDB();
        const count = await getUserCount();
        this.needsBootstrapUser = count === 0;
        // Restore session if present, but only if username exists in DB
        try {
          const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null;
          if (raw) {
            const sess = JSON.parse(raw);
            if (sess && sess.username && await userExists(sess.username)) {
              this.loggedIn = true;
              this.username = String(sess.username);
            } else {
              if (typeof localStorage !== 'undefined') localStorage.removeItem(SESSION_KEY);
            }
          }
        } catch {}
      } catch (e) {
        this.error = e.message || String(e);
      } finally {
        this.ready = true; this.loading = false;
      }
    },
    async bootstrap(username, password){
      if (!this.needsBootstrapUser) return false;
      this.loading = true; this.error = null;
      try {
        await createUser(username, password);
        this.needsBootstrapUser = false;
        this.loggedIn = true; this.username = username;
        if (typeof localStorage !== 'undefined') localStorage.setItem(SESSION_KEY, JSON.stringify({ username }));
        return true;
      } catch(e){
        this.error = e.message || String(e);
        return false;
      } finally { this.loading = false; }
    },
    async login(username, password){
      this.loading = true; this.error = null;
      try {
        // If no users exist yet, treat login as first-user initialization to ensure a blob write.
        const count = await getUserCount();
        if (count === 0) {
          try {
            await createUser(username, password);
            this.needsBootstrapUser = false;
            this.loggedIn = true; this.username = username;
            if (typeof localStorage !== 'undefined') localStorage.setItem(SESSION_KEY, JSON.stringify({ username }));
            return true;
          } catch (e) {
            // Race condition: another client created the user just now; fallback to normal verify
            if (String(e.message||e).toLowerCase().includes('already exists')) {
              const okAfter = await verifyLogin(username, password);
              if (okAfter) {
                this.needsBootstrapUser = false;
                this.loggedIn = true; this.username = username;
                if (typeof localStorage !== 'undefined') localStorage.setItem(SESSION_KEY, JSON.stringify({ username }));
                return true;
              }
              this.error = 'Invalid credentials';
              return false;
            }
            throw e;
          }
        }

        const ok = await verifyLogin(username, password);
        if (ok){
          this.loggedIn = true; this.username = username;
          if (typeof localStorage !== 'undefined') localStorage.setItem(SESSION_KEY, JSON.stringify({ username }));
          return true;
        }
        this.error = 'Invalid credentials';
        return false;
      } catch(e){
        this.error = e.message || String(e);
        return false;
      } finally { this.loading = false; }
    },
    logout(){
      this.loggedIn = false; this.username = null;
      if (typeof localStorage !== 'undefined') localStorage.removeItem(SESSION_KEY);
    }
  }
});
