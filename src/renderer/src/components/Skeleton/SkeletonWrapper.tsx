import React from 'react'
import { Skeleton } from '@douyinfe/semi-ui'
import './skeleton.css'

interface SkeletonWrapperProps {
  loading: boolean
  children: React.ReactNode
  placeholder?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

const SkeletonWrapper: React.FC<SkeletonWrapperProps> = ({
  loading,
  children,
  placeholder,
  className = '',
  style = {}
}) => {
  if (loading) {
    return (
      <div className={`skeleton-wrapper ${className}`} style={style}>
        {placeholder || (
          <Skeleton
            placeholder={
              <div>
                <Skeleton.Title style={{ width: '60%', marginBottom: 12 }} />
                <Skeleton.Paragraph rows={3} />
              </div>
            }
            loading={true}
          />
        )}
      </div>
    )
  }

  return <>{children}</>
}

export default SkeletonWrapper
