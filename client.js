window.__ModuleLoader__.load({
  id: '@local/dsh-multi-gemini-api',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const STORAGE_KEY = 'dsh-multi-gemini-api:v1';
    const NO_ACTIVE_REF = 'DSH_MULTI_GEMINI_NO_ACTIVE_KEY';

    function readState() {
      try {
        const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
        return {
          keys: Array.isArray(value.keys) ? value.keys.filter(item =>
            item && typeof item.id === 'string' && typeof item.ref === 'string'
            && typeof item.label === 'string' && typeof item.enabled === 'boolean'
          ) : [],
          activeId: typeof value.activeId === 'string' ? value.activeId : null
        };
      } catch {
        return { keys: [], activeId: null };
      }
    }

    function MultiGeminiCard(props) {
      const provider = props.provider;
      const [state, setState] = React.useState(readState);
      const [label, setLabel] = React.useState('');
      const [secret, setSecret] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const [message, setMessage] = React.useState('');
      const [error, setError] = React.useState('');

      React.useEffect(() => {
        try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
        catch { setError('无法保存密钥备注列表：浏览器本地存储不可用。'); }
      }, [state]);

      if (!provider || provider.provider !== 'google' || provider.settingsNs !== 'llm-pi-ai') return null;

      const active = state.keys.find(item => item.id === state.activeId) || null;
      const baseStyle = { display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 6, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-color, #8886)', background: 'var(--background-secondary, transparent)', color: 'inherit' };
      const buttonStyle = { padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border-color, #8886)', background: 'var(--background-tertiary, transparent)', color: 'inherit', cursor: 'pointer' };
      const muted = { opacity: 0.72, fontSize: 12, lineHeight: 1.5 };
      const cardStyle = { marginTop: 12, padding: 14, border: '1px solid var(--border-color, #8886)', borderRadius: 10, background: 'var(--background-primary, transparent)' };

      async function setProfileRef(ref) {
        const path = [...(Array.isArray(provider.settingsPath) ? provider.settingsPath : ['providers', 'google']), 'apiKeyEnv'];
        await window.__dshMultiGeminiContext.remote.settings.mutate(
          provider.settingsNs,
          [{ op: 'set', path, value: ref }],
          undefined
        );
      }

      async function addKey() {
        const value = secret.trim();
        if (!value) { setError('请先输入 Gemini API Key。'); return; }
        setBusy(true); setError(''); setMessage('');
        try {
          const id = (window.crypto && window.crypto.randomUUID)
            ? window.crypto.randomUUID().replace(/-/g, '')
            : (Date.now().toString(16) + Math.random().toString(16).slice(2));
          const ref = 'DSH_MULTI_GEMINI_' + id.toUpperCase();
          await window.__dshMultiGeminiContext.remote.credentials.set(ref, value);
          const item = { id, ref, label: label.trim() || ('Gemini Key ' + (state.keys.length + 1)), enabled: true, savedAt: new Date().toISOString(), lastSelectedAt: null };
          setState(current => ({ ...current, keys: [...current.keys, item] }));
          setSecret(''); setLabel('');
          setMessage('密钥已安全保存。请在下方手动选择要使用的 Key。');
        } catch (e) {
          setError(e && e.message ? e.message : '保存密钥失败。');
        } finally { setBusy(false); }
      }

      async function selectKey(item) {
        if (!item.enabled) return;
        setBusy(true); setError(''); setMessage('');
        try {
          await setProfileRef(item.ref);
          setState(current => ({
            ...current,
            activeId: item.id,
            keys: current.keys.map(key => key.id === item.id ? { ...key, lastSelectedAt: new Date().toISOString() } : key)
          }));
          setMessage('当前 Key 已切换。下一次 Google Gemini 请求将使用该密钥。');
        } catch (e) {
          setError(e && e.message ? e.message : '切换密钥失败。');
        } finally { setBusy(false); }
      }

      async function toggleKey(item) {
        setBusy(true); setError(''); setMessage('');
        try {
          if (item.enabled && state.activeId === item.id) {
            await setProfileRef(NO_ACTIVE_REF);
          }
          setState(current => ({
            ...current,
            activeId: current.activeId === item.id && item.enabled ? null : current.activeId,
            keys: current.keys.map(key => key.id === item.id ? { ...key, enabled: !key.enabled } : key)
          }));
          setMessage(item.enabled && state.activeId === item.id ? '已停用当前 Key；Google 请求将因未选择密钥而明确失败，避免静默回退。' : (item.enabled ? 'Key 已停用。' : 'Key 已启用。'));
        } catch (e) {
          setError(e && e.message ? e.message : '修改 Key 状态失败。');
        } finally { setBusy(false); }
      }

      async function deleteKey(item) {
        if (!window.confirm('确定删除「' + item.label + '」吗？此操作会从 DSH 凭据存储中删除该 Key。')) return;
        setBusy(true); setError(''); setMessage('');
        try {
          if (state.activeId === item.id) await setProfileRef(NO_ACTIVE_REF);
          await window.__dshMultiGeminiContext.remote.credentials.unset(item.ref);
          setState(current => ({
            keys: current.keys.filter(key => key.id !== item.id),
            activeId: current.activeId === item.id ? null : current.activeId
          }));
          setMessage('Key 已删除。');
        } catch (e) {
          setError(e && e.message ? e.message : '删除 Key 失败。');
        } finally { setBusy(false); }
      }

      return h('section', { style: cardStyle },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' } },
          h('strong', null, '多 Gemini API Key'),
          h('span', { style: { fontSize: 11, opacity: 0.7 } }, '手动选择 · 不自动轮换')
        ),
        h('p', { style: muted }, '为 Google 原生 Provider 保存多个密钥。每个密钥独立启用/停用，并可添加备注。密钥值只写入 DSH 凭据存储，不会回显。'),
        h('div', { style: { marginTop: 12 } },
          h('label', { style: { display: 'block', fontSize: 12 } }, '备注名称'),
          h('input', { value: label, onChange: event => setLabel(event.target.value), placeholder: '例如：个人项目 / 备用项目', style: baseStyle, disabled: busy }),
          h('label', { style: { display: 'block', marginTop: 10, fontSize: 12 } }, 'Gemini API Key'),
          h('input', { type: 'password', autoComplete: 'new-password', value: secret, onChange: event => setSecret(event.target.value), placeholder: '粘贴新生成的 Gemini API Key', style: baseStyle, disabled: busy }),
          h('button', { type: 'button', onClick: addKey, disabled: busy || !secret.trim(), style: { ...buttonStyle, marginTop: 10, opacity: busy || !secret.trim() ? 0.5 : 1 } }, busy ? '处理中…' : '安全保存 Key')
        ),
        h('div', { style: { marginTop: 16, borderTop: '1px solid var(--border-color, #8886)', paddingTop: 12 } },
          h('strong', { style: { fontSize: 13 } }, '已保存的密钥（' + state.keys.length + '）'),
          state.keys.length === 0
            ? h('p', { style: muted }, '尚未添加密钥。')
            : state.keys.map(item => h('div', { key: item.id, style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 0', borderBottom: '1px solid var(--border-color, #8884)' } },
                h('div', { style: { flex: '1 1 180px', minWidth: 0 } },
                  h('div', { style: { fontSize: 13, fontWeight: 600, overflowWrap: 'anywhere' } }, item.label),
                  h('div', { style: muted }, (state.activeId === item.id ? '● 当前使用' : '○ 未选中') + ' · ' + (item.enabled ? '已启用' : '已停用')),
                  h('div', { style: muted }, item.lastSelectedAt ? ('最近选择：' + new Date(item.lastSelectedAt).toLocaleString()) : '尚未使用')
                ),
                h('button', { type: 'button', disabled: busy || !item.enabled || state.activeId === item.id, onClick: () => selectKey(item), style: { ...buttonStyle, opacity: busy || !item.enabled || state.activeId === item.id ? 0.45 : 1 } }, state.activeId === item.id ? '当前 Key' : '设为当前'),
                h('button', { type: 'button', disabled: busy, onClick: () => toggleKey(item), style: buttonStyle }, item.enabled ? '停用' : '启用'),
                h('button', { type: 'button', disabled: busy, onClick: () => deleteKey(item), style: { ...buttonStyle, color: 'var(--status-danger, #d55)' } }, '删除')
              ))
        ),
        h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'var(--background-secondary, transparent)' } },
          h('div', { style: { fontSize: 12, fontWeight: 600 } }, '额度与用量'),
          h('p', { style: { ...muted, marginBottom: 0 } }, 'Gemini API 配额通常按 Google Cloud 项目共享，而不是每个 API Key 各有独立额度。API Key 本身不能可靠查询项目剩余额度，因此这里不伪造 Key 级剩余额度。请在 Google AI Studio 或 Google Cloud Console 查看项目级实际用量与限额。')
        ),
        active ? h('p', { style: { ...muted, marginTop: 10 } }, '当前生效：' + active.label + '。Google 原生 Provider 的 apiKeyEnv 已指向该密钥的凭据引用。') : h('p', { style: { ...muted, marginTop: 10 } }, '当前未由本插件选择密钥。选择一个已启用的 Key 后才会切换原生 Provider。'),
        error ? h('p', { role: 'alert', style: { color: 'var(--status-danger, #d55)', fontSize: 12 } }, error) : null,
        message ? h('p', { role: 'status', style: { color: 'var(--status-success, #39875b)', fontSize: 12 } }, message) : null
      );
    }

    return {
      inject: ['slots', 'remote', 'remote.credentials', 'remote.settings'],
      apply(ctx) {
        window.__dshMultiGeminiContext = ctx;
        ctx.effect(() => {
          ctx.slots.inject('settings.models.provider-card', () => ctx.slots.register({
            name: 'settings.models.provider-card',
            id: 'multi-gemini-api',
            entryKey: 'llm-pi-ai',
            order: 20
          }, MultiGeminiCard));
          return () => { delete window.__dshMultiGeminiContext; };
        }, 'dsh-multi-gemini-api: Google provider card');
      }
    };
  }
});
