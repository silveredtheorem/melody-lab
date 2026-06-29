import './EmptyState.css'

interface EmptyStateProps {
  icon?:   React.ReactNode
  title:   string
  body?:   string
  action?: React.ReactNode
  size?:   'page' | 'section'
}

export function EmptyState({ icon, title, body, action, size = 'section' }: EmptyStateProps) {
  return (
    <div className={`empty-state empty-state-${size}`}>
      {icon && (
        <div className="empty-state-icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="empty-state-title">{title}</p>
      {body && <p className="empty-state-body">{body}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  )
}
