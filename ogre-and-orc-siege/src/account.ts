import type { SaveData } from './save';

export interface AccountHooks {
  getSave(): SaveData;
  applySave(data: SaveData): void;
  toast(message: string, kind?: 'good' | 'bad' | ''): void;
  onProgress(listener: (data: SaveData) => void): void;
}

interface SessionResponse {
  ok: boolean;
  name?: string;
  save?: SaveData | null;
  error?: string;
}

const el = <T extends HTMLElement>(id: string): T => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`missing #${id}`);
  return found as T;
};

/** The API lives on the hosted build only: no dev server, no file://, no APK. */
function apiAvailable(): boolean {
  if (!location.protocol.startsWith('http')) return false;
  if (document.querySelector('script[src="/@vite/client"]')) return false;
  if ('Capacitor' in window) return false;
  return true;
}

async function call(path: string, init?: RequestInit): Promise<{ status: number; body: SessionResponse }> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  let body: SessionResponse = { ok: false };
  try {
    body = (await response.json()) as SessionResponse;
  } catch {
    body = { ok: false, error: 'Unexpected reply from the server.' };
  }
  return { status: response.status, body };
}

export function initAccount(hooks: AccountHooks): void {
  if (!apiAvailable()) {
    // standalone file and native shell have no API: no dead button
    document.getElementById('accountBtn')?.classList.add('hidden');
    return;
  }

  const modal = el('accountModal');
  const btn = el<HTMLButtonElement>('accountBtn');
  const btnLabel = el('accountBtnLabel');
  const form = el<HTMLFormElement>('accountForm');
  const nameInput = el<HTMLInputElement>('accountNameInput');
  const pinInput = el<HTMLInputElement>('accountPin');
  const submit = el<HTMLButtonElement>('accountSubmit');
  const createBtn = el<HTMLButtonElement>('accountCreate');
  const errorEl = el('accountError');
  const signedIn = el('accountSignedIn');
  const who = el('accountWho');
  const sync = el('accountSync');
  const signOut = el<HTMLButtonElement>('accountSignOut');
  const close = el<HTMLButtonElement>('accountClose');
  const resetBtn = el<HTMLButtonElement>('accountReset');

  let name: string | null = null;
  let uploadTimer = 0;
  let pending: SaveData | null = null;
  let resetArmed = false;
  let resetTimer = 0;

  const setError = (message: string): void => {
    errorEl.textContent = message;
    errorEl.classList.toggle('hidden', !message);
  };

  const setSync = (message: string): void => {
    sync.textContent = message;
  };

  /** The wipe takes two taps: the first only arms the button, so a stray tap cannot destroy a save. */
  const disarmReset = (): void => {
    window.clearTimeout(resetTimer);
    resetArmed = false;
    resetBtn.classList.remove('armed');
    resetBtn.textContent = 'Reset progress';
  };

  const render = (): void => {
    disarmReset();
    const active = Boolean(name);
    signedIn.classList.toggle('hidden', !active);
    form.classList.toggle('hidden', active);
    btn.classList.toggle('on', active);
    btnLabel.textContent = active ? String(name) : 'Sign in';
    if (active) who.textContent = String(name);
  };

  const upload = async (data: SaveData): Promise<void> => {
    if (!name) return;
    setSync('Saving…');
    const { status, body } = await call('/api/save', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (status === 200 && body.ok) {
      setSync('Progress saved to your account.');
      return;
    }
    if (status === 401) {
      name = null;
      render();
      setError('Your session expired. Sign in again.');
      return;
    }
    setSync('Could not save right now — kept on this device.');
  };

  const adopt = (save: SaveData | null | undefined): void => {
    // The account's own progress is authoritative. A new account starts empty
    // rather than inheriting whatever the previous player left on this device.
    if (!save) {
      const blank: SaveData = { prestige: 0, stored: [] };
      hooks.applySave(blank);
      setSync('Fresh account — starting from wave 1-1.');
      hooks.toast('Fresh account — starting from wave 1-1', 'good');
      void upload(blank);
      return;
    }
    hooks.applySave(save);
    setSync('Your saved progress was loaded.');
    hooks.toast('Account progress loaded', 'good');
  };

  // drop any debounced upload left over from the previous account before adopting a new one
  const forgetPendingUpload = (): void => {
    window.clearTimeout(uploadTimer);
    pending = null;
  };

  const afterAuth = (body: SessionResponse): void => {
    forgetPendingUpload();
    name = body.name ?? null;
    setError('');
    pinInput.value = '';
    render();
    adopt(body.save ?? null);
  };

  const submitAuth = async (mode: 'login' | 'register'): Promise<void> => {
    const accountName = nameInput.value.trim();
    const pin = pinInput.value.trim();
    if (accountName.length < 2) {
      setError('Enter a name with at least 2 characters.');
      return;
    }
    if (!/^\d{4,6}$/.test(pin)) {
      setError('PIN must be 4 to 6 digits.');
      return;
    }
    submit.disabled = true;
    createBtn.disabled = true;
    setError('');
    try {
      const { status, body } = await call(`/api/${mode}`, {
        method: 'POST',
        body: JSON.stringify({ name: accountName, pin }),
      });
      if (status === 200 && body.ok) {
        afterAuth(body);
        hooks.toast(mode === 'register' ? 'Account created' : `Welcome back, ${body.name}`, 'good');
      } else {
        setError(body.error ?? 'That did not work. Try again.');
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      submit.disabled = false;
      createBtn.disabled = false;
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void submitAuth('login');
  });
  createBtn.addEventListener('click', () => void submitAuth('register'));

  signOut.addEventListener('click', async () => {
    await call('/api/logout', { method: 'POST', body: '{}' }).catch(() => null);
    forgetPendingUpload();
    name = null;
    render();
    setError('');
    setSync('');
    hooks.toast('Signed out — progress stays on this device', '');
  });

  resetBtn.addEventListener('click', async () => {
    if (!name) return;
    if (!resetArmed) {
      resetArmed = true;
      window.clearTimeout(resetTimer);
      resetBtn.classList.add('armed');
      resetBtn.textContent = 'Tap again to wipe this account';
      resetTimer = window.setTimeout(disarmReset, 5000);
      return;
    }

    disarmReset();
    resetBtn.disabled = true;
    let result: { status: number; body: SessionResponse } = { status: 0, body: { ok: false } };
    try {
      result = await call('/api/save', { method: 'DELETE' });
    } catch {
      result = { status: 0, body: { ok: false } };
    }
    resetBtn.disabled = false;

    if (result.status === 200 && result.body.ok) {
      hooks.applySave({ prestige: 0, stored: [] });
      setSync('Progress reset — back to 1-1 with no prestige and an empty bin.');
      hooks.toast('Account progress wiped', 'good');
      return;
    }
    if (result.status === 401) {
      name = null;
      render();
      setError('Your session expired. Sign in again.');
      return;
    }
    setError(result.body.error ?? 'Could not reset the save right now.');
  });

  btn.addEventListener('click', () => {
    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden')) {
      setError('');
      if (!name) nameInput.focus();
    }
  });
  close.addEventListener('click', () => modal.classList.add('hidden'));

  hooks.onProgress((data) => {
    if (!name) return;
    pending = data;
    window.clearTimeout(uploadTimer);
    uploadTimer = window.setTimeout(() => {
      if (pending) void upload(pending);
    }, 700);
  });

  render();

  // pick up an existing session and its save on boot
  void (async () => {
    try {
      const { status, body } = await call('/api/me');
      if (status === 200 && body.ok) {
        name = body.name ?? null;
        render();
        if (body.save) {
          hooks.applySave(body.save);
          setSync('Your saved progress was loaded.');
        } else {
          hooks.applySave({ prestige: 0, stored: [] });
          setSync('No save on this account yet.');
        }
      }
    } catch {
      // offline or blocked: the game still runs on local progress
    }
  })();
}
