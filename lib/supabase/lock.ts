import { navigatorLock, processLock } from '@supabase/supabase-js'

type LockFn = <R>(name: string, acquireTimeout: number, fn: () => Promise<R>) => Promise<R>

// Some browsers (Chrome with corrupt or blocked site storage, in-app webviews)
// expose navigator.locks but hand back a null lock for every request. auth-js
// then runs the callback unlocked and logs a warning on each token refresh.
// Probe once: if the LockManager is broken, serialize auth calls within the
// tab instead.
let navigatorLocksWork: Promise<boolean> | undefined

function probeNavigatorLocks(): Promise<boolean> {
  if (!navigatorLocksWork) {
    const locks = globalThis.navigator?.locks
    navigatorLocksWork = locks
      ? locks
          .request('cpf-lock-probe', { mode: 'exclusive' }, lock => lock !== null)
          .catch(() => false)
      : Promise.resolve(false)
  }
  return navigatorLocksWork
}

export const authLock: LockFn = async (name, acquireTimeout, fn) => {
  const lock = (await probeNavigatorLocks()) ? navigatorLock : processLock
  return lock(name, acquireTimeout, fn)
}
