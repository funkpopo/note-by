import React, { useState } from 'react'
import { Typography, Card, Button, Toast } from '@douyinfe/semi-ui'
import {
  IconRefresh,
  IconAlertCircle,
  IconInfoCircle,
  IconCheckCircleStroked
} from '@douyinfe/semi-icons'
import { useLanguage } from '../../locales'

const { Title, Text } = Typography

interface UpdateResult {
  hasUpdate: boolean
  latestVersion: string
  currentVersion: string
  error?: string
}

const UpdateSettings: React.FC = () => {
  const { t } = useLanguage()
  const [isCheckingUpdates, setIsCheckingUpdates] = useState<boolean>(false)
  const [updateResult, setUpdateResult] = useState<UpdateResult | null>(null)

  const handleCheckUpdates = async (): Promise<void> => {
    try {
      setIsCheckingUpdates(true)
      setUpdateResult(null)

      const result = await window.api.updates.checkForUpdates()

      if (result.error) {
        Toast.error(`检查更新失败: ${result.error}`)
        setUpdateResult({
          hasUpdate: false,
          latestVersion: '',
          currentVersion: result.currentVersion,
          error: result.error
        })
      } else if (result.hasUpdate) {
        Toast.info(`发现新版本: ${result.latestVersion}`)
        setUpdateResult(result)
      } else if (result.latestVersion) {
        Toast.info('当前已是最新版本')
        setUpdateResult(result)
      } else {
        Toast.error('检查更新失败，请检查网络连接')
        setUpdateResult({
          ...result,
          error: '无法连接到更新服务器'
        })
      }
    } catch (error) {
      Toast.error('检查更新出错')
      setUpdateResult({
        hasUpdate: false,
        latestVersion: '',
        currentVersion: '',
        error: error instanceof Error ? error.message : '未知错误'
      })
    } finally {
      setIsCheckingUpdates(false)
    }
  }

  return (
    <Card className="settings-card animated-card">
      <div className="update-settings">
        <div className="settings-item">
          <div className="settings-item-header">
            <div className="settings-item-info">
              <Title heading={6}>{t('settings.autoUpdate.manual')}</Title>
              <Text type="tertiary" size="small">
                {t('settings.autoUpdate.manualDescription')}
              </Text>
            </div>
            <Button
              icon={<IconRefresh spin={isCheckingUpdates} />}
              onClick={handleCheckUpdates}
              loading={isCheckingUpdates}
              theme="light"
              type="primary"
              className="check-update-btn"
            >
              {t('settings.autoUpdate.checkNow')}
            </Button>
          </div>
        </div>

        {updateResult && (
          <div
            className={`update-result ${updateResult.error ? 'error' : updateResult.hasUpdate ? 'available' : 'latest'}`}
          >
            <div className="update-result-header">
              {updateResult.error ? (
                <IconAlertCircle className="update-icon error" />
              ) : updateResult.hasUpdate ? (
                <IconInfoCircle className="update-icon info" />
              ) : (
                <IconCheckCircleStroked className="update-icon success" />
              )}
              <div className="update-result-content">
                <Text strong className="update-result-title">
                  {updateResult.error
                    ? '检查更新失败'
                    : updateResult.hasUpdate
                      ? `发现新版本: ${updateResult.latestVersion}`
                      : '当前已是最新版本'}
                </Text>
                <Text type="tertiary" size="small" className="update-result-desc">
                  {updateResult.error
                    ? `错误信息: ${updateResult.error}`
                    : updateResult.hasUpdate
                      ? `您当前的版本为 ${updateResult.currentVersion}，可以前往 GitHub 下载最新版本`
                      : `当前版本: ${updateResult.currentVersion}`}
                </Text>
              </div>
            </div>
            {updateResult.hasUpdate && !updateResult.error && (
              <Button
                type="primary"
                theme="solid"
                size="small"
                onClick={() =>
                  window.open('https://github.com/funkpopo/note-by/releases', '_blank')
                }
                className="download-btn"
              >
                前往下载
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="card-footer">
        <Text type="tertiary" size="small">
          <IconInfoCircle size="small" /> 更新检查会连接GitHub查询最新版本信息
        </Text>
      </div>
    </Card>
  )
}

export default UpdateSettings
