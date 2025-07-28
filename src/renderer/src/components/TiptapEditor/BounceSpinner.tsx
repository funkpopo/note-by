import React from 'react'

interface BounceSpinnerProps {
  className?: string
}

const BounceSpinner: React.FC<BounceSpinnerProps> = ({ className = '' }) => {
  return (
    <div className={`flex items-center justify-center gap-0.5 ${className}`}>
      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '-0.3s' }} />
      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '-0.15s' }} />
      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" />
    </div>
  )
}

export default BounceSpinner