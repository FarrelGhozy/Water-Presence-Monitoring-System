import { Button } from './Button'
import { Icon } from './Icon'

interface EmptyStateProps {
  icon?: string
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon = 'chart', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon name={icon as any} className="text-4xl mb-4 text-gray-400" />
      <h3 className="text-lg font-medium text-gray-200 mb-2">{title}</h3>
      <p className="text-sm text-gray-400 max-w-md mb-4">{description}</p>
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
