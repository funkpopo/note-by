import React, { useCallback, useEffect, useState } from 'react'
import { Button, Form, Toast, Banner, Space, Typography, Progress, Modal, Input, Select, Radio, Card, Divider, Switch } from '@douyinfe/semi-ui'
import { IconUpload, IconDownload, IconSync, IconPlus, IconDelete, IconEdit, IconSafe } from '@douyinfe/semi-icons'
import { IconSettings } from './Icons'
import type { FormApi } from '@douyinfe/semi-ui/lib/es/form'
import { CloudStorageConfig, CloudSyncResult } from '../../../shared/types/cloud-storage'
import { useLanguage } from '../locales'

const { Text, Title } = Typography

interface CloudStorageManagerProps { onSyncComplete?: (r: CloudSyncResult) => void }
type ProviderId = 'webdav' | 'googledrive' | 'dropbox'
interface CloudStorageItem extends CloudStorageConfig { id: string; name?: string }
const genId = (): string => `cs_${Math.random().toString(36).slice(2, 10)}`

const CloudStorageManager: React.FC<CloudStorageManagerProps> = ({ onSyncComplete }) => {
  const { t } = useLanguage()
  const [providers, setProviders] = useState<Array<{ id: string; name: string; description: string }>>([])
  const [items, setItems] = useState<CloudStorageItem[]>([])
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<{ show: boolean; type: 'success' | 'warning' | 'danger'; message: string } | null>(null)
  const [syncProgress, setSyncProgress] = useState<{ total: number; processed: number; action: 'upload' | 'download' | 'compare' } | null>(null)

  // Basic modal (no credential form when adding/editing)
  const [basicVisible, setBasicVisible] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [basicApi, setBasicApi] = useState<FormApi<Partial<CloudStorageItem>> | null>(null)

  // Creds modal (separate)
  const [credsVisible, setCredsVisible] = useState(false)
  const [credsId, setCredsId] = useState<string | null>(null)
  const [credsApi, setCredsApi] = useState<FormApi<Partial<CloudStorageItem>> | null>(null)

  // OAuth modal
  const [authVisible, setAuthVisible] = useState(false)
  const [authId, setAuthId] = useState<string | null>(null)
  const [authCode, setAuthCode] = useState('')

  useEffect(() => { (async () => {
    try { setProviders(await window.api.cloudStorage.getProviders()) } catch {}
    await loadItems()
  })() }, [])

  useEffect(() => { const u = window.api.cloudStorage.onSyncProgress((p) => setSyncProgress(p)); return () => u() }, [])

  const providerName = useCallback((id: string) => providers.find(p => p.id === id)?.name || id, [providers])
  const findItem = useCallback((id: string) => items.find(i => i.id === id), [items])

  const loadItems = useCallback(async () => {
    try {
      const settings = await window.api.settings.getAll()
      const list = (settings as any).cloudStorageList as CloudStorageItem[] | undefined
      if (Array.isArray(list)) { setItems(list); return }
      const legacy = (settings as any).cloudStorage as CloudStorageConfig | undefined
      if (legacy && legacy.provider) {
        const migrated: CloudStorageItem = { ...legacy, id: genId(), name: '默认同步配置' }
        setItems([migrated]); await window.api.settings.set('cloudStorageList', [migrated])
      }
    } catch {}
  }, [])

  const saveItems = useCallback(async (next: CloudStorageItem[]) => {
    setItems(next)
    try { await window.api.settings.set('cloudStorageList', next); await window.api.cloudStorage.notifyConfigChanged() } catch {}
  }, [])

  const getLocalPath = async (): Promise<string> => { try { return await window.api.getNotesPath() } catch { return '' } }

  const openAdd = async (): Promise<void> => {
    setEditingId(null); setBasicVisible(true)
    const localPath = await getLocalPath()
    setTimeout(() => basicApi?.setValues({ id: genId(), name: '', provider: 'webdav', enabled: true, remotePath: '/notes', localPath, syncOnStartup: false, syncDirection: 'bidirectional', auth: {} }), 0)
  }
  const openEdit = (id: string): void => { const it = findItem(id); if (!it) return; setEditingId(id); setBasicVisible(true); setTimeout(() => basicApi?.setValues(it), 0) }
  const remove = async (id: string): Promise<void> => { await saveItems(items.filter(i => i.id !== id)); Toast.success('已删除') }

  const upsertBasic = async (v: Partial<CloudStorageItem>): Promise<void> => {
    // Require name and provider
    if (!v.name || String(v.name).trim() === '') { Toast.error('请输入名称'); return }
    if (!v.provider || String(v.provider).trim() === '') { Toast.error('请选择云存储服务'); return }
    if (!v.id) v.id = genId()
    const idx = items.findIndex(i => i.id === v.id)
    const nextItem: CloudStorageItem = {
      provider: (v.provider || 'webdav') as ProviderId,
      enabled: v.enabled ?? true,
      remotePath: v.remotePath || '/notes',
      localPath: v.localPath || (await getLocalPath()),
      syncOnStartup: v.syncOnStartup ?? false,
      syncDirection: (v.syncDirection as any) || 'bidirectional',
      auth: v.auth || {},
      id: v.id as string,
      name: v.name || ''
    }
    if (idx >= 0) { const next = [...items]; next[idx] = { ...next[idx], ...nextItem }; await saveItems(next); Toast.success('已更新') }
    else { await saveItems([...items, nextItem]); Toast.success('已新增') }
    setBasicVisible(false); setEditingId(null)
  }

  const setEnabled = async (id: string, enabled: boolean) => { await saveItems(items.map(i => i.id === id ? { ...i, enabled } : i)) }
  const setStartup = async (id: string, syncOnStartup: boolean) => { await saveItems(items.map(i => i.id === id ? { ...i, syncOnStartup } : i)) }
  const setDirection = async (id: string, d: 'localToRemote' | 'remoteToLocal' | 'bidirectional') => { await saveItems(items.map(i => i.id === id ? { ...i, syncDirection: d } : i)) }

  const testConnection = async (id: string): Promise<void> => {
    const it = findItem(id); if (!it) return; setTestingId(id)
    try { const r = await window.api.cloudStorage.testConnection(it); if (r.success) { Toast.success(r.message); setSyncStatus({ show: true, type: 'success', message: `${it.name || it.provider}: ${r.message}` }) } else { Toast.error(r.message); setSyncStatus({ show: true, type: 'danger', message: `${it.name || it.provider}: ${r.message}` }) } }
    catch { Toast.error('测试连接失败') }
    finally { setTestingId(null) }
  }

  const authenticate = async (id: string): Promise<void> => { const it = findItem(id); if (!it) return; try { const r = await window.api.cloudStorage.authenticate(it); if (r.success && r.authUrl) { setAuthId(id); setAuthVisible(true); window.open(r.authUrl, '_blank') } else { Toast.error(r.message) } } catch { Toast.error('认证失败') } }
  const submitAuthCode = async (): Promise<void> => { if (!authId) return; const next = items.map(i => i.id === authId ? { ...i, auth: { ...(i.auth || {}), accessToken: authCode } } : i); await saveItems(next); setAuthVisible(false); setAuthCode(''); setAuthId(null); Toast.success('认证成功') }

  const sync = async (id: string, dir: 'upload' | 'download' | 'bidirectional'): Promise<void> => {
    const it = findItem(id); if (!it) return; setLoadingId(id); setSyncProgress(null)
    try {
      let r: CloudSyncResult
      r = dir === 'upload' ? await window.api.cloudStorage.syncLocalToRemote(it) : dir === 'download' ? await window.api.cloudStorage.syncRemoteToLocal(it) : await window.api.cloudStorage.syncBidirectional(it)
      if (r.success) { Toast.success(r.message); setSyncStatus({ show: true, type: 'success', message: `${it.name || it.provider}: ${r.message}` }) } else { Toast.error(r.message); setSyncStatus({ show: true, type: 'danger', message: `${it.name || it.provider}: ${r.message}` }) }
      onSyncComplete?.(r)
    } catch { Toast.error('同步失败') } finally { setLoadingId(null); setSyncProgress(null) }
  }

  const openCreds = (id: string): void => { const it = findItem(id); if (!it) return; setCredsId(id); setCredsVisible(true); setTimeout(() => credsApi?.setValues({ ...it, auth: it.auth || {} }), 0) }
  const saveCreds = async (v: Partial<CloudStorageItem>): Promise<void> => { if (!credsId) return; await saveItems(items.map(i => i.id === credsId ? { ...i, ...v } as CloudStorageItem : i)); setCredsVisible(false); setCredsId(null); Toast.success('配置已保存') }

  const renderCredsForm = (p: ProviderId): React.ReactNode => {
    if (p === 'webdav') return (<>
      <Form.Input field="url" label="WebDAV 地址" placeholder={t('placeholder.webdavUrl')} />
      <Form.Input field="username" label="用户名" placeholder={t('placeholder.webdavUsername')} />
      <Form.Input field="password" label="密码" mode="password" placeholder={t('placeholder.webdavPassword')} />
    </>)
    if (p === 'googledrive') return (<>
      <Form.Input field="auth.clientId" label="Client ID" placeholder={t('placeholder.googleClientId')} />
      <Form.Input field="auth.clientSecret" label="Client Secret" mode="password" placeholder={t('placeholder.googleClientSecret')} />
      <Form.Input field="auth.redirectUri" label="Redirect URI" placeholder={t('placeholder.googleRedirectUri')} initValue="http://localhost:3000/auth/callback" />
    </>)
    if (p === 'dropbox') return (<>
      <Form.Input field="auth.clientId" label="App Key" placeholder={t('placeholder.dropboxAppKey')} />
      <Form.Input field="auth.clientSecret" label="App Secret" mode="password" placeholder={t('placeholder.dropboxAppSecret')} />
      <Form.Input field="auth.redirectUri" label="Redirect URI" placeholder={t('placeholder.dropboxRedirectUri')} initValue="http://localhost:3000/auth/callback" />
    </>)
    return null
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Title heading={6}>云存储同步</Title>
        <Button icon={<IconPlus />} theme="solid" type="primary" onClick={openAdd}>新增同步</Button>
      </div>
      <Space vertical spacing={12} style={{ width: '100%' }}>
        {items.length === 0 && (
          <Card>
            <Text type="tertiary">尚未配置任何云存储同步项。点击“新增同步”开始。</Text>
          </Card>
        )}
        {items.map((it) => (
          <Card key={it.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Title heading={6} style={{ margin: 0 }}>{it.name || providerName(it.provider)}</Title>
                <Text type="tertiary">{providerName(it.provider)} · 远程路径: {it.remotePath || '/notes'}</Text>
              </div>
              <Space>
                {(it.provider === 'googledrive' || it.provider === 'dropbox') && (
                  <Button icon={<IconSafe />} onClick={() => authenticate(it.id)}>授权</Button>
                )}
                <Button icon={<IconSettings />} onClick={() => openCreds(it.id)}>配置凭据</Button>
                <Button icon={<IconEdit />} onClick={() => openEdit(it.id)}>{t('common.edit')}</Button>
                <Button icon={<IconDelete />} type="danger" onClick={() => remove(it.id)}>
                  {t('common.delete')}
                </Button>
              </Space>
            </div>
            <Divider margin={12} />
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
              <div><Text type="tertiary">启用</Text><div><Switch checked={!!it.enabled} onChange={(v) => setEnabled(it.id, !!v)} /></div></div>
              <div><Text type="tertiary">{t('webdav.autoSync')}</Text><div><Switch checked={!!it.syncOnStartup} onChange={(v) => setStartup(it.id, !!v)} /></div></div>
              <div>
                <Text type="tertiary">{t('webdav.syncDirection')}</Text>
                <Form initValues={{ dir: it.syncDirection }}>
                  <Form.RadioGroup field="dir" type="button" onChange={(v) => setDirection(it.id, v as any)}>
                    <Radio value="localToRemote">{t('webdav.uploadOnly')}</Radio>
                    <Radio value="remoteToLocal">{t('webdav.downloadOnly')}</Radio>
                    <Radio value="bidirectional">{t('webdav.bidirectional')}</Radio>
                  </Form.RadioGroup>
                </Form>
              </div>
              <Space>
                <Button theme="solid" type="secondary" loading={testingId === it.id} onClick={() => testConnection(it.id)}>
                  {t('webdav.testConnection')}
                </Button>
                <Button icon={<IconUpload />} loading={loadingId === it.id} onClick={() => sync(it.id, 'upload')} disabled={!it.enabled}>
                  {t('webdav.uploadToCloud')}
                </Button>
                <Button icon={<IconDownload />} loading={loadingId === it.id} onClick={() => sync(it.id, 'download')} disabled={!it.enabled}>
                  {t('webdav.downloadFromCloud')}
                </Button>
                <Button icon={<IconSync />} loading={loadingId === it.id} onClick={() => sync(it.id, 'bidirectional')} disabled={!it.enabled}>
                  {t('webdav.bidirectional')}
                </Button>
              </Space>
            </div>
          </Card>
        ))}
      </Space>

      {syncStatus && syncStatus.show && (<Banner type={syncStatus.type} description={syncStatus.message} closeIcon={null} style={{ marginTop: 16 }} />)}
      {syncProgress && (
        <div style={{ marginTop: 16, padding: 12, background: 'var(--semi-color-fill-0)', borderRadius: 8 }}>
          <Text size="small">{syncProgress.action === 'upload' ? t('webdav.syncProgress.uploading') : syncProgress.action === 'download' ? t('webdav.syncProgress.downloading') : t('webdav.syncProgress.comparing')}</Text>
          <Progress percent={Math.round((syncProgress.processed / Math.max(syncProgress.total || 1, 1)) * 100)} showInfo size="large" style={{ marginTop: 8 }} />
        </div>
      )}

      <Modal title={editingId ? '编辑同步项' : '新增同步项'} visible={basicVisible} onCancel={() => setBasicVisible(false)} onOk={() => basicApi?.submitForm()}>
        <Form getFormApi={(api) => setBasicApi(api)} onSubmit={upsertBasic} labelPosition="left" labelAlign="right" labelWidth={120}>
          <Form.Input field="name" label="名称" placeholder="" />
          <Form.Select field="provider" label="云存储服务" style={{ width: '100%' }}>
            {providers.map((p) => (<Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>))}
          </Form.Select>
          <Form.Input field="remotePath" label="远程路径" placeholder={t('placeholder.remotePath')} initValue="/notes" />
          <Form.Input field="localPath" label="本地路径" placeholder={t('placeholder.localPath')} disabled />
          <Form.Switch field="enabled" label="启用" />
          <Form.Switch field="syncOnStartup" label={t('webdav.autoSync')} />
          <Form.RadioGroup field="syncDirection" label={t('webdav.syncDirection')} initValue="bidirectional">
            <Radio value="localToRemote">{t('webdav.uploadOnly')}</Radio>
            <Radio value="remoteToLocal">{t('webdav.downloadOnly')}</Radio>
            <Radio value="bidirectional">{t('webdav.bidirectional')}</Radio>
          </Form.RadioGroup>
        </Form>
      </Modal>

      <Modal title="配置凭据" visible={credsVisible} onCancel={() => setCredsVisible(false)} onOk={() => credsApi?.submitForm()}>
        {credsId && (
          <Form getFormApi={(api) => setCredsApi(api)} onSubmit={saveCreds} labelPosition="left" labelAlign="right" labelWidth={120}>
            {(() => { const it = findItem(credsId); if (!it) return null; const p = it.provider as ProviderId; return (
              p === 'webdav' ? (<>
                <Form.Input field="url" label="WebDAV 地址" placeholder={t('placeholder.webdavUrl')} />
                <Form.Input field="username" label="用户名" placeholder={t('placeholder.webdavUsername')} />
                <Form.Input field="password" label="密码" mode="password" placeholder={t('placeholder.webdavPassword')} />
              </>) : p === 'googledrive' ? (<>
                <Form.Input field="auth.clientId" label="Client ID" placeholder={t('placeholder.googleClientId')} />
                <Form.Input field="auth.clientSecret" label="Client Secret" mode="password" placeholder={t('placeholder.googleClientSecret')} />
                <Form.Input field="auth.redirectUri" label="Redirect URI" placeholder={t('placeholder.googleRedirectUri')} initValue="http://localhost:3000/auth/callback" />
              </>) : (<>
                <Form.Input field="auth.clientId" label="App Key" placeholder={t('placeholder.dropboxAppKey')} />
                <Form.Input field="auth.clientSecret" label="App Secret" mode="password" placeholder={t('placeholder.dropboxAppSecret')} />
                <Form.Input field="auth.redirectUri" label="Redirect URI" placeholder={t('placeholder.dropboxRedirectUri')} initValue="http://localhost:3000/auth/callback" />
              </>)
            ) })()}
          </Form>
        )}
      </Modal>

      <Modal title="OAuth 验证" visible={authVisible} onCancel={() => setAuthVisible(false)} onOk={submitAuthCode}>
        <div>
          <Text>请在浏览器完成授权，然后粘贴授权码</Text>
          <Input value={authCode} onChange={setAuthCode} placeholder={t('placeholder.authCode')} style={{ marginTop: 12 }} />
        </div>
      </Modal>
    </div>
  )
}

export default CloudStorageManager
