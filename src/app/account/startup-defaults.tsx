'use client';

import { useState, type FormEvent } from 'react';
import type { PreferenceSnapshot, StartupPreferences } from '../../shared/preference-contracts';
import { browserMutation } from '../../workspace/browser-request';

const endpoint = '/api/account/preferences';

export function StartupDefaults({ initial }: { initial: PreferenceSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [formGeneration, setFormGeneration] = useState(0);
  const [busy, setBusy] = useState(false);
  const [reviewRequired, setReviewRequired] = useState(false);
  const [message, setMessage] = useState('');

  async function current() {
    const response = await fetch(endpoint, { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not read defaults');
    return await response.json() as PreferenceSnapshot;
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || reviewRequired) return;
    const form = new FormData(event.currentTarget);
    const values = {
      units: form.get('units'), listUnits: form.get('listUnits'), temperature: form.get('temperature'),
      fractions: form.has('fractions'),
    };
    setBusy(true);
    setMessage('');
    let conflict = false;
    try {
      const response = await browserMutation(endpoint, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ expectedVersion: snapshot.version, values }),
      });
      if (response.ok) {
        setSnapshot(await response.json() as PreferenceSnapshot);
        setMessage('Defaults saved for new workspaces.');
        return;
      }
      conflict = response.status === 409;
    } catch {
      // The server may have committed the save before the response was lost.
    } finally {
      setBusy(false);
    }

    setReviewRequired(true);
    setBusy(true);
    try {
      const saved = await current();
      setSnapshot(saved);
      setMessage(conflict
        ? 'Defaults changed in another session. Review the currently saved defaults before saving again.'
        : 'The save was not confirmed. Review the currently saved defaults before saving again.');
    } catch {
      setMessage('The save was not confirmed and saved defaults could not be loaded. Try loading them again.');
    } finally {
      setBusy(false);
    }
  }

  const options: { key: Exclude<keyof StartupPreferences, 'fractions'>; label: string; values: string[] }[] = [
    { key: 'units', label: 'Units', values: ['Metric', 'Imperial'] },
    { key: 'listUnits', label: 'List units', values: ['Inches', 'Millimetres'] },
    { key: 'temperature', label: 'Temperature', values: ['Celsius', 'Fahrenheit'] },
  ];

  return <section aria-labelledby="startup-defaults">
    <h2 id="startup-defaults">New workspace defaults</h2>
    <form method="post" key={snapshot.version + ':' + formGeneration} onSubmit={save}>
      <fieldset disabled={busy || reviewRequired}>
        {options.map(option => <div key={option.key}><label htmlFor={option.key}>{option.label}</label>
          <select id={option.key} name={option.key} defaultValue={snapshot.values[option.key]}>
            {option.values.map(value => <option key={value}>{value}</option>)}
          </select>
        </div>)}
        <label><input name="fractions" type="checkbox" defaultChecked={snapshot.values.fractions} /> Show fractions</label>
        <button type="submit">Save defaults for new workspaces</button>
      </fieldset>
    </form>
    {reviewRequired && <button type="button" disabled={busy} onClick={async () => {
      setBusy(true);
      try {
        setSnapshot(await current());
        setFormGeneration(generation => generation + 1);
        setReviewRequired(false);
        setMessage('Saved defaults loaded. Review them before making changes.');
      } catch {
        setMessage('Saved defaults could not be loaded. Try again.');
      } finally {
        setBusy(false);
      }
    }}>Load saved defaults</button>}
    {message && <p role="status">{message}</p>}
  </section>;
}
